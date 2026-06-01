"""HealthWeave – Patient Visits API"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.vitals import PatientVisit
from app.models.health_record import HealthRecord

router = APIRouter(prefix="/visits", tags=["Visits"])


class VisitCreate(BaseModel):
    visit_date: date
    doctor_name: Optional[str] = Field(None, max_length=200)
    hospital_name: Optional[str] = Field(None, max_length=200)
    specialization: Optional[str] = Field(None, max_length=100)
    chief_complaint: Optional[str] = Field(None, max_length=1000)
    diagnosis: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=2000)
    follow_up_date: Optional[date] = None


class VisitUpdate(BaseModel):
    visit_date: Optional[date] = None
    doctor_name: Optional[str] = Field(None, max_length=200)
    hospital_name: Optional[str] = Field(None, max_length=200)
    specialization: Optional[str] = Field(None, max_length=100)
    chief_complaint: Optional[str] = Field(None, max_length=1000)
    diagnosis: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=2000)
    follow_up_date: Optional[date] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_visit(
    data: VisitCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    visit = PatientVisit(
        user_id=uuid.UUID(user_id),
        visit_date=data.visit_date,
        doctor_name=data.doctor_name,
        hospital_name=data.hospital_name,
        specialization=data.specialization,
        chief_complaint=data.chief_complaint,
        diagnosis=data.diagnosis,
        notes=data.notes,
        follow_up_date=data.follow_up_date,
    )
    db.add(visit)
    await db.flush()
    await db.commit()
    return _visit_dict(visit, records=[])


@router.get("/")
async def list_visits(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatientVisit)
        .where(PatientVisit.user_id == uuid.UUID(user_id))
        .order_by(desc(PatientVisit.visit_date))
    )
    visits = result.scalars().all()
    visit_ids = [v.id for v in visits]

    # Load records for all visits at once
    records_by_visit: dict = {v.id: [] for v in visits}
    if visit_ids:
        rec_result = await db.execute(
            select(HealthRecord).where(
                HealthRecord.visit_id.in_(visit_ids),
                HealthRecord.is_archived == False,
            )
        )
        for r in rec_result.scalars().all():
            if r.visit_id in records_by_visit:
                records_by_visit[r.visit_id].append(_record_snippet(r))

    return {"visits": [_visit_dict(v, records_by_visit[v.id]) for v in visits]}


@router.get("/{visit_id}")
async def get_visit(
    visit_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    visit = await _get_visit_or_404(visit_id, user_id, db)
    rec_result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.visit_id == visit.id,
            HealthRecord.is_archived == False,
        )
    )
    records = [_record_snippet(r) for r in rec_result.scalars().all()]
    return _visit_dict(visit, records)


@router.put("/{visit_id}")
async def update_visit(
    visit_id: str,
    data: VisitUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    visit = await _get_visit_or_404(visit_id, user_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(visit, field, value)
    await db.commit()
    return _visit_dict(visit, records=[])


@router.delete("/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visit(
    visit_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    visit = await _get_visit_or_404(visit_id, user_id, db)
    # Unlink records before deleting
    await db.execute(
        update(HealthRecord)
        .where(HealthRecord.visit_id == visit.id)
        .values(visit_id=None)
    )
    await db.delete(visit)
    await db.commit()


@router.post("/{visit_id}/records/{record_id}")
async def link_record_to_visit(
    visit_id: str,
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _get_visit_or_404(visit_id, user_id, db)
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    record.visit_id = uuid.UUID(visit_id)
    await db.commit()
    return {"message": "Record linked to visit"}


@router.delete("/{visit_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_record_from_visit(
    visit_id: str,
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == uuid.UUID(record_id),
            HealthRecord.user_id == uuid.UUID(user_id),
            HealthRecord.visit_id == uuid.UUID(visit_id),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found in this visit")
    record.visit_id = None
    await db.commit()


async def _get_visit_or_404(visit_id: str, user_id: str, db: AsyncSession) -> PatientVisit:
    result = await db.execute(
        select(PatientVisit).where(
            PatientVisit.id == uuid.UUID(visit_id),
            PatientVisit.user_id == uuid.UUID(user_id),
        )
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


def _visit_dict(v: PatientVisit, records: list) -> dict:
    return {
        "id": str(v.id),
        "visit_date": str(v.visit_date),
        "doctor_name": v.doctor_name,
        "hospital_name": v.hospital_name,
        "specialization": v.specialization,
        "chief_complaint": v.chief_complaint,
        "diagnosis": v.diagnosis,
        "notes": v.notes,
        "follow_up_date": str(v.follow_up_date) if v.follow_up_date else None,
        "records": records,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


def _record_snippet(r: HealthRecord) -> dict:
    return {
        "id": str(r.id),
        "title": r.title,
        "record_type": r.record_type,
        "record_date": str(r.record_date),
        "hospital_name": r.hospital_name,
        "ai_summary": r.ai_summary,
    }
