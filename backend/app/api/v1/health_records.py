"""
HealthWeave – Health Records API
Upload, process, query, and manage health documents.
"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.health_record import (
    BiomarkerValue,
    DocumentStatus,
    HealthDocument,
    HealthRecord,
    RecordType,
    TimelineEvent,
)
from app.services.ocr.ocr_pipeline import OCRPipeline
from app.services.ai.llm_client import get_llm_client
from app.services.analytics.timeline_service import TimelineService
from app.core.config import settings

router = APIRouter(prefix="/records", tags=["Health Records"])
ocr_pipeline = OCRPipeline()


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_health_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    record_type: RecordType = Form(RecordType.OTHER),
    title: str = Form(""),
    record_date: Optional[str] = Form(None),
    hospital_name: Optional[str] = Form(None),
    doctor_name: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Validate file
    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB",
        )
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}",
        )

    file_bytes = await file.read()
    import hashlib
    checksum = hashlib.sha256(file_bytes).hexdigest()

    # Create health record
    rec_date = date.fromisoformat(record_date) if record_date else date.today()
    record = HealthRecord(
        user_id=uuid.UUID(user_id),
        record_type=record_type,
        title=title or file.filename or "Untitled",
        record_date=rec_date,
        hospital_name=hospital_name,
        doctor_name=doctor_name,
    )
    db.add(record)
    await db.flush()

    # Stub storage key (real implementation uses S3)
    storage_key = f"users/{user_id}/records/{record.id}/{file.filename}"

    doc = HealthDocument(
        record_id=record.id,
        user_id=uuid.UUID(user_id),
        file_name=file.filename,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type,
        storage_key=storage_key,
        checksum_sha256=checksum,
        status=DocumentStatus.PROCESSING,
    )
    db.add(doc)
    await db.commit()

    # Process in background
    background_tasks.add_task(
        _process_document_background,
        file_bytes=file_bytes,
        mime_type=file.content_type,
        record_id=str(record.id),
        doc_id=str(doc.id),
        user_id=user_id,
    )

    return {
        "record_id": str(record.id),
        "document_id": str(doc.id),
        "status": "processing",
        "message": "Document uploaded and queued for AI processing",
    }


async def _process_document_background(
    file_bytes: bytes,
    mime_type: str,
    record_id: str,
    doc_id: str,
    user_id: str,
):
    """Background task: OCR → AI extraction → embedding → timeline event."""
    from app.core.database import get_db_context

    async with get_db_context() as db:
        try:
            # OCR extraction
            extraction = await ocr_pipeline.process_document(file_bytes, mime_type)

            # Update health record with extracted data
            updates: dict = {
                "structured_data": extraction,
                "ai_summary": extraction.get("summary"),
                "ai_tags": extraction.get("diagnoses_tags", []),
                "ai_risk_flags": extraction.get("risk_flags", []),
                "ai_extracted_biomarkers": {
                    bm["canonical_name"]: {
                        "value": bm.get("value_numeric"),
                        "unit": bm.get("unit"),
                        "status": bm.get("status"),
                        "reference": bm.get("reference_range"),
                    }
                    for bm in extraction.get("biomarkers", [])
                    if bm.get("canonical_name")
                },
            }

            # Auto-fill extracted metadata
            if extraction.get("document_date"):
                try:
                    updates["record_date"] = date.fromisoformat(extraction["document_date"])
                except ValueError:
                    pass
            if extraction.get("hospital_name"):
                updates["hospital_name"] = extraction["hospital_name"]
            if extraction.get("doctor_name"):
                updates["doctor_name"] = extraction["doctor_name"]
            if extraction.get("document_type"):
                type_map = {
                    "lab_report": RecordType.LAB_REPORT,
                    "prescription": RecordType.PRESCRIPTION,
                    "scan_report": RecordType.SCAN,
                    "discharge_summary": RecordType.DISCHARGE_SUMMARY,
                    "vaccination": RecordType.VACCINATION,
                    "health_package": RecordType.HEALTH_PACKAGE,
                }
                if extraction["document_type"] in type_map:
                    updates["record_type"] = type_map[extraction["document_type"]]

            await db.execute(
                update(HealthRecord)
                .where(HealthRecord.id == uuid.UUID(record_id))
                .values(**updates)
            )

            # Create biomarker values
            record_uuid = uuid.UUID(record_id)
            user_uuid = uuid.UUID(user_id)
            for bm in extraction.get("biomarkers", []):
                if not bm.get("canonical_name"):
                    continue
                bv = BiomarkerValue(
                    record_id=record_uuid,
                    user_id=user_uuid,
                    name=bm.get("name", bm["canonical_name"]),
                    canonical_name=bm["canonical_name"],
                    value_numeric=bm.get("value_numeric"),
                    value_text=bm.get("value_text"),
                    unit=bm.get("unit"),
                    reference_range_low=bm.get("reference_low"),
                    reference_range_high=bm.get("reference_high"),
                    reference_range_text=bm.get("reference_range"),
                    status=bm.get("status"),
                    measured_at=updates.get("record_date", date.today()),
                    source_lab=updates.get("hospital_name"),
                )
                db.add(bv)

            # Generate content embedding for semantic search
            llm = get_llm_client()
            embed_text = f"{updates.get('ai_summary', '')} {extraction.get('clinical_notes', '')}"
            if embed_text.strip():
                try:
                    embedding = await llm.embed(embed_text)
                    await db.execute(
                        update(HealthRecord)
                        .where(HealthRecord.id == record_uuid)
                        .values(content_embedding=embedding)
                    )
                except Exception:
                    pass

            # Update document status
            await db.execute(
                update(HealthDocument)
                .where(HealthDocument.id == uuid.UUID(doc_id))
                .values(
                    status=DocumentStatus.PROCESSED,
                    ocr_raw_text=extraction.get("raw_llm_response", ""),
                    ocr_confidence=extraction.get("extraction_confidence", 0.5),
                )
            )

            # Create timeline event
            result = await db.execute(
                select(HealthRecord).where(HealthRecord.id == record_uuid)
            )
            record = result.scalar_one_or_none()
            if record:
                timeline_svc = TimelineService(db)
                await timeline_svc.create_timeline_event_from_record(record)

            await db.commit()

        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Document processing failed: %s", exc, exc_info=True)
            await db.execute(
                update(HealthDocument)
                .where(HealthDocument.id == uuid.UUID(doc_id))
                .values(status=DocumentStatus.FAILED)
            )
            await db.commit()


@router.get("/")
async def list_records(
    record_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import and_, desc
    conditions = [HealthRecord.user_id == uuid.UUID(user_id), HealthRecord.is_archived == False]

    if record_type:
        conditions.append(HealthRecord.record_type == record_type)
    if from_date:
        conditions.append(HealthRecord.record_date >= date.fromisoformat(from_date))
    if to_date:
        conditions.append(HealthRecord.record_date <= date.fromisoformat(to_date))

    total_q = await db.execute(
        select(HealthRecord.id).where(and_(*conditions))
    )
    total = len(total_q.all())

    result = await db.execute(
        select(HealthRecord)
        .where(and_(*conditions))
        .order_by(desc(HealthRecord.record_date))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    records = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "records": [
            {
                "id": str(r.id),
                "record_type": r.record_type,
                "title": r.title,
                "record_date": str(r.record_date),
                "hospital_name": r.hospital_name,
                "doctor_name": r.doctor_name,
                "ai_summary": r.ai_summary,
                "ai_tags": r.ai_tags,
                "ai_risk_flags": r.ai_risk_flags,
            }
            for r in records
        ],
    }


@router.get("/{record_id}")
async def get_record(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Fetch biomarkers
    bv_result = await db.execute(
        select(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id))
    )
    biomarkers = bv_result.scalars().all()

    return {
        "id": str(record.id),
        "record_type": record.record_type,
        "title": record.title,
        "description": record.description,
        "record_date": str(record.record_date),
        "hospital_name": record.hospital_name,
        "doctor_name": record.doctor_name,
        "doctor_specialization": record.doctor_specialization,
        "icd10_codes": record.icd10_codes,
        "ai_summary": record.ai_summary,
        "ai_tags": record.ai_tags,
        "ai_risk_flags": record.ai_risk_flags,
        "ai_extracted_biomarkers": record.ai_extracted_biomarkers,
        "structured_data": record.structured_data,
        "biomarkers": [
            {
                "name": bv.name,
                "canonical_name": bv.canonical_name,
                "value_numeric": bv.value_numeric,
                "unit": bv.unit,
                "status": bv.status,
                "reference_range": bv.reference_range_text,
                "measured_at": str(bv.measured_at),
            }
            for bv in biomarkers
        ],
        "created_at": str(record.created_at),
    }


@router.get("/biomarkers/trends")
async def get_biomarker_trends(
    biomarker_name: str = Query(...),
    months: int = Query(24, ge=1, le=120),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get trend data for a specific biomarker over time."""
    from sqlalchemy import and_, asc
    from datetime import timedelta

    cutoff = date.today() - timedelta(days=months * 30)
    result = await db.execute(
        select(BiomarkerValue)
        .where(
            and_(
                BiomarkerValue.user_id == uuid.UUID(user_id),
                BiomarkerValue.canonical_name == biomarker_name,
                BiomarkerValue.measured_at >= cutoff,
            )
        )
        .order_by(asc(BiomarkerValue.measured_at))
    )
    values = result.scalars().all()

    return {
        "biomarker": biomarker_name,
        "data_points": [
            {
                "date": str(bv.measured_at),
                "value": bv.value_numeric,
                "unit": bv.unit,
                "status": bv.status,
                "reference_range": bv.reference_range_text,
            }
            for bv in values
        ],
        "count": len(values),
    }
