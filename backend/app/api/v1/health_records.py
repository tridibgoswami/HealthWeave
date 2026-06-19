"""
HealthWeave – Health Records API
Upload, process, query, and manage health documents.
"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status, BackgroundTasks
from pydantic import BaseModel, Field
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
from app.models.vitals import DocumentComment
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

    # Persist file to object storage (non-blocking — failure logged, not raised)
    from app.services.storage_service import upload_file as storage_upload
    await storage_upload(file_bytes, storage_key, file.content_type)

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
    """Background task: OCR → biomarker save (committed first) → timeline → score recompute."""
    import logging
    from app.core.database import get_db_context

    _log = logging.getLogger(__name__)
    processing_succeeded = False
    biomarker_count = 0

    async with get_db_context() as db:
        try:
            # Step 1: OCR extraction
            extraction = await ocr_pipeline.process_document(file_bytes, mime_type)

            # Step 2: Build record update payload
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

            # Step 3: Persist biomarker values with explicit type coercion
            record_uuid = uuid.UUID(record_id)
            user_uuid = uuid.UUID(user_id)
            record_date = updates.get("record_date", date.today())
            source_lab = updates.get("hospital_name")

            for bm in extraction.get("biomarkers", []):
                if not bm.get("canonical_name"):
                    continue
                # Coerce to float — LLMs sometimes emit strings despite instructions
                value_numeric = bm.get("value_numeric")
                if isinstance(value_numeric, str):
                    try:
                        value_numeric = float(value_numeric)
                    except (ValueError, TypeError):
                        value_numeric = None
                ref_low = bm.get("reference_low")
                if isinstance(ref_low, str):
                    try:
                        ref_low = float(ref_low)
                    except (ValueError, TypeError):
                        ref_low = None
                ref_high = bm.get("reference_high")
                if isinstance(ref_high, str):
                    try:
                        ref_high = float(ref_high)
                    except (ValueError, TypeError):
                        ref_high = None

                bv = BiomarkerValue(
                    record_id=record_uuid,
                    user_id=user_uuid,
                    name=bm.get("name", bm["canonical_name"]),
                    canonical_name=bm["canonical_name"],
                    value_numeric=value_numeric,
                    value_text=bm.get("value_text"),
                    unit=bm.get("unit"),
                    reference_range_low=ref_low,
                    reference_range_high=ref_high,
                    reference_range_text=bm.get("reference_range"),
                    status=bm.get("status"),
                    measured_at=record_date,
                    source_lab=source_lab,
                )
                db.add(bv)
                biomarker_count += 1

            # Step 4: Flush so the auto-compare query below can see prior records
            await db.flush()

            # Step 5: Auto-compare with previous readings for the same biomarkers
            new_biomarkers = extraction.get("biomarkers", [])
            if new_biomarkers:
                from sqlalchemy import desc as _desc
                changes: dict = {}
                for bm in new_biomarkers:
                    cname = bm.get("canonical_name")
                    new_val = bm.get("value_numeric")
                    if isinstance(new_val, str):
                        try:
                            new_val = float(new_val)
                        except (ValueError, TypeError):
                            new_val = None
                    if not cname or new_val is None:
                        continue
                    prev_result = await db.execute(
                        select(BiomarkerValue)
                        .where(
                            BiomarkerValue.user_id == user_uuid,
                            BiomarkerValue.canonical_name == cname,
                            BiomarkerValue.record_id != record_uuid,
                        )
                        .order_by(_desc(BiomarkerValue.measured_at))
                        .limit(1)
                    )
                    prev = prev_result.scalar_one_or_none()
                    if prev and prev.value_numeric is not None:
                        delta = new_val - prev.value_numeric
                        pct = (delta / prev.value_numeric * 100) if prev.value_numeric != 0 else 0
                        changes[cname] = {
                            "name": bm.get("name", cname),
                            "previous_value": prev.value_numeric,
                            "new_value": new_val,
                            "unit": bm.get("unit", ""),
                            "delta": round(delta, 3),
                            "delta_pct": round(pct, 1),
                            "previous_date": str(prev.measured_at),
                            "new_status": bm.get("status", ""),
                            "previous_status": prev.status or "",
                        }
                if changes:
                    await db.execute(
                        update(HealthRecord)
                        .where(HealthRecord.id == record_uuid)
                        .values(biomarker_changes=changes)
                    )

            # Step 6: Content embedding (optional — failure is safe)
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

            # Step 7: Mark document as processed
            await db.execute(
                update(HealthDocument)
                .where(HealthDocument.id == uuid.UUID(doc_id))
                .values(
                    status=DocumentStatus.PROCESSED,
                    ocr_raw_text=extraction.get("raw_llm_response", ""),
                    ocr_confidence=extraction.get("extraction_confidence", 0.5),
                )
            )

            # ── COMMIT CORE DATA HERE ────────────────────────────────────────
            # Biomarkers, record updates, and document status are durable now.
            # Timeline creation runs AFTER this point — its failure cannot
            # roll back the data we just saved.
            await db.commit()
            processing_succeeded = True
            _log.info(
                "Record %s processed: %d biomarkers extracted (doc=%s)",
                record_id, biomarker_count, doc_id,
            )

        except Exception as exc:
            _log.error("Document processing failed for record %s: %s", record_id, exc, exc_info=True)
            try:
                await db.execute(
                    update(HealthDocument)
                    .where(HealthDocument.id == uuid.UUID(doc_id))
                    .values(status=DocumentStatus.FAILED)
                )
                await db.commit()
            except Exception:
                pass

    if not processing_succeeded:
        return

    # Step 8: Timeline event (separate session — failure here cannot lose biomarker data)
    async with get_db_context() as db:
        try:
            result = await db.execute(
                select(HealthRecord).where(HealthRecord.id == uuid.UUID(record_id))
            )
            record = result.scalar_one_or_none()
            if record:
                timeline_svc = TimelineService(db)
                await timeline_svc.create_timeline_event_from_record(record)
                await db.commit()
        except Exception as exc:
            _log.warning(
                "Timeline event creation failed for record %s (biomarkers already saved): %s",
                record_id, exc,
            )

    # Step 9: Recompute health scores and alerts with the new biomarker data
    from app.api.v1.intelligence import _compute_scores_background, _generate_alerts_background
    try:
        await _compute_scores_background(user_id)
    except Exception as exc:
        _log.warning("Post-upload score computation failed: %s", exc)
    try:
        await _generate_alerts_background(user_id)
    except Exception as exc:
        _log.warning("Post-upload alert generation failed: %s", exc)


@router.get("/")
async def list_records(
    request: Request,
    record_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from app.services.audit_service import log_event
    await log_event(db, action="records.list", resource="health_record",
                    user_id=user_id, request=request,
                    extra={"record_type": record_type, "page": page})
    from sqlalchemy import and_, desc
    conditions = [HealthRecord.user_id == uuid.UUID(user_id), HealthRecord.is_archived == False]

    if record_type:
        conditions.append(HealthRecord.record_type == record_type)
    if from_date:
        try:
            conditions.append(HealthRecord.record_date >= date.fromisoformat(from_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format, expected YYYY-MM-DD")
    if to_date:
        try:
            conditions.append(HealthRecord.record_date <= date.fromisoformat(to_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format, expected YYYY-MM-DD")

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

    # Fetch document status for all records in one query (avoid N+1)
    record_ids = [r.id for r in records]
    status_by_record: dict = {}
    if record_ids:
        doc_result = await db.execute(
            select(HealthDocument.record_id, HealthDocument.status)
            .where(HealthDocument.record_id.in_(record_ids))
        )
        for rid, doc_status in doc_result.all():
            status_by_record[rid] = doc_status.value

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
                "document_status": status_by_record.get(r.id, "processing"),
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

    # Fetch biomarkers and document status in parallel
    bv_result = await db.execute(
        select(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id))
    )
    biomarkers = bv_result.scalars().all()

    doc_result = await db.execute(
        select(HealthDocument)
        .where(HealthDocument.record_id == uuid.UUID(record_id))
        .limit(1)
    )
    doc = doc_result.scalar_one_or_none()

    structured = record.structured_data or {}
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
        "key_findings": structured.get("key_findings", []),
        "ai_extracted_biomarkers": record.ai_extracted_biomarkers,
        "structured_data": structured,
        "biomarker_changes": record.biomarker_changes or {},
        "document_status": doc.status.value if doc else "processing",
        "visit_id": str(record.visit_id) if record.visit_id else None,
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


@router.get("/{record_id}/file")
async def get_document_download_url(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Return a short-lived presigned URL to download the original uploaded file."""
    from app.services.storage_service import get_presigned_url

    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Record not found")

    doc_result = await db.execute(
        select(HealthDocument).where(
            HealthDocument.record_id == uuid.UUID(record_id),
            HealthDocument.user_id == uuid.UUID(user_id),
        ).limit(1)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="No file attached to this record")

    url = await get_presigned_url(doc.storage_key, expires_in=3600)
    if not url:
        raise HTTPException(status_code=503, detail="File storage not configured or unavailable")

    return {
        "url": url,
        "file_name": doc.file_name,
        "mime_type": doc.mime_type,
        "expires_in_seconds": 3600,
    }


@router.post("/{record_id}/reprocess", status_code=status.HTTP_202_ACCEPTED)
async def reprocess_record(
    record_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Re-run AI extraction on an existing record.
    Tries S3 first; falls back to re-extracting from structured_data already in the DB.
    Use this to fix records where biomarkers weren't saved due to earlier processing errors.
    """
    from sqlalchemy import delete as sa_delete

    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Try to get the original file from object storage
    doc_result = await db.execute(
        select(HealthDocument)
        .where(HealthDocument.record_id == uuid.UUID(record_id))
        .limit(1)
    )
    doc = doc_result.scalar_one_or_none()

    file_bytes: bytes | None = None
    if doc:
        from app.services.storage_service import get_file_bytes
        file_bytes = await get_file_bytes(doc.storage_key)

    if file_bytes:
        # Full re-OCR from original file
        await db.execute(
            sa_delete(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id))
        )
        if doc:
            doc.status = DocumentStatus.PROCESSING
        await db.commit()

        background_tasks.add_task(
            _process_document_background,
            file_bytes=file_bytes,
            mime_type=doc.mime_type if doc else "application/pdf",
            record_id=record_id,
            doc_id=str(doc.id) if doc else record_id,
            user_id=user_id,
        )
        return {"status": "reprocessing", "method": "full_ocr", "record_id": record_id}

    elif record.structured_data and record.structured_data.get("biomarkers"):
        # Re-extract biomarkers from structured_data saved by previous OCR run
        extraction = record.structured_data
        await db.execute(
            sa_delete(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id))
        )

        record_uuid = uuid.UUID(record_id)
        user_uuid = uuid.UUID(user_id)
        saved = 0
        for bm in extraction.get("biomarkers", []):
            if not bm.get("canonical_name"):
                continue
            value_numeric = bm.get("value_numeric")
            if isinstance(value_numeric, str):
                try:
                    value_numeric = float(value_numeric)
                except (ValueError, TypeError):
                    value_numeric = None
            bv = BiomarkerValue(
                record_id=record_uuid,
                user_id=user_uuid,
                name=bm.get("name", bm["canonical_name"]),
                canonical_name=bm["canonical_name"],
                value_numeric=value_numeric,
                value_text=bm.get("value_text"),
                unit=bm.get("unit"),
                reference_range_low=bm.get("reference_low"),
                reference_range_high=bm.get("reference_high"),
                reference_range_text=bm.get("reference_range"),
                status=bm.get("status"),
                measured_at=record.record_date or date.today(),
                source_lab=record.hospital_name,
            )
            db.add(bv)
            saved += 1

        await db.commit()

        # Trigger score recompute
        from app.api.v1.intelligence import _compute_scores_background, _generate_alerts_background
        background_tasks.add_task(_compute_scores_background, user_id)
        background_tasks.add_task(_generate_alerts_background, user_id)

        return {
            "status": "reprocessed",
            "method": "structured_data",
            "biomarkers_extracted": saved,
            "record_id": record_id,
        }

    else:
        if not doc:
            reason = "No document record found for this report."
        elif not record.structured_data:
            reason = "The original file could not be retrieved from storage, and no prior extraction exists to fall back on."
        else:
            reason = (
                "The original file could not be retrieved from storage, and the previous "
                "extraction for this report found no usable test results to re-save."
            )
        raise HTTPException(
            status_code=422,
            detail=f"{reason} Please delete this record and re-upload the file.",
        )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete a health record and all associated data.
    Also removes the file from object storage.
    """
    from sqlalchemy import delete as sa_delete
    from app.services.storage_service import delete_file

    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Fetch storage key before deleting
    doc_result = await db.execute(
        select(HealthDocument).where(HealthDocument.record_id == uuid.UUID(record_id)).limit(1)
    )
    doc = doc_result.scalar_one_or_none()
    storage_key = doc.storage_key if doc else None

    # Delete child rows in dependency order
    await db.execute(sa_delete(BiomarkerValue).where(BiomarkerValue.record_id == uuid.UUID(record_id)))
    await db.execute(sa_delete(TimelineEvent).where(TimelineEvent.record_id == uuid.UUID(record_id)))
    await db.execute(sa_delete(HealthDocument).where(HealthDocument.record_id == uuid.UUID(record_id)))
    await db.delete(record)

    # Attempt S3 deletion (non-blocking — failure does not abort the DB delete)
    if storage_key:
        try:
            await delete_file(storage_key)
        except Exception as exc:
            logger.warning("Could not delete file %s from storage: %s", storage_key, exc)


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


# ── Comments ─────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1, max_length=2000)


class CommentUpdate(BaseModel):
    comment_text: str = Field(..., min_length=1, max_length=2000)


@router.post("/{record_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    record_id: str,
    data: CommentCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify record belongs to user
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Record not found")
    comment = DocumentComment(
        record_id=uuid.UUID(record_id),
        user_id=uuid.UUID(user_id),
        comment_text=data.comment_text,
    )
    db.add(comment)
    await db.commit()
    return _comment_dict(comment)


@router.get("/{record_id}/comments")
async def list_comments(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify record belongs to user
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Record not found")
    c_result = await db.execute(
        select(DocumentComment)
        .where(DocumentComment.record_id == uuid.UUID(record_id))
        .order_by(DocumentComment.created_at)
    )
    return {"comments": [_comment_dict(c) for c in c_result.scalars().all()]}


@router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    data: CommentUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentComment).where(
            DocumentComment.id == uuid.UUID(comment_id),
            DocumentComment.user_id == uuid.UUID(user_id),
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.comment_text = data.comment_text
    await db.commit()
    return _comment_dict(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentComment).where(
            DocumentComment.id == uuid.UUID(comment_id),
            DocumentComment.user_id == uuid.UUID(user_id),
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.delete(comment)
    await db.commit()


def _comment_dict(c: DocumentComment) -> dict:
    return {
        "id": str(c.id),
        "record_id": str(c.record_id),
        "comment_text": c.comment_text,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
