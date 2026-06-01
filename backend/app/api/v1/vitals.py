"""HealthWeave – Manual Vitals API"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.vitals import ManualVitalEntry

router = APIRouter(prefix="/vitals", tags=["Vitals"])

PRESET_VITALS = [
    {"biomarker_name": "blood_glucose",            "display_name": "Blood Sugar",        "unit": "mg/dL",  "reference_range_min": 70,   "reference_range_max": 100},
    {"biomarker_name": "blood_pressure_systolic",  "display_name": "BP Systolic",        "unit": "mmHg",   "reference_range_min": 90,   "reference_range_max": 120},
    {"biomarker_name": "blood_pressure_diastolic", "display_name": "BP Diastolic",       "unit": "mmHg",   "reference_range_min": 60,   "reference_range_max": 80},
    {"biomarker_name": "weight",                   "display_name": "Weight",             "unit": "kg",     "reference_range_min": None, "reference_range_max": None},
    {"biomarker_name": "heart_rate",               "display_name": "Heart Rate",         "unit": "bpm",    "reference_range_min": 60,   "reference_range_max": 100},
    {"biomarker_name": "oxygen_saturation",        "display_name": "SpO2",               "unit": "%",      "reference_range_min": 95,   "reference_range_max": 100},
    {"biomarker_name": "temperature",              "display_name": "Body Temperature",   "unit": "°C",     "reference_range_min": 36.1, "reference_range_max": 37.2},
    {"biomarker_name": "blood_glucose_pp",         "display_name": "Blood Sugar (PP)",   "unit": "mg/dL",  "reference_range_min": 70,   "reference_range_max": 140},
]


class VitalEntryCreate(BaseModel):
    biomarker_name: str = Field(..., min_length=1, max_length=100)
    value_numeric: float
    unit: str = Field(..., min_length=1, max_length=50)
    entry_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)


class VitalEntryUpdate(BaseModel):
    value_numeric: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=500)


@router.get("/presets")
async def get_presets():
    return {"presets": PRESET_VITALS}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vital_entry(
    data: VitalEntryCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    entry = ManualVitalEntry(
        user_id=uuid.UUID(user_id),
        biomarker_name=data.biomarker_name,
        value_numeric=data.value_numeric,
        unit=data.unit,
        entry_date=data.entry_date or date.today(),
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    return _entry_dict(entry)


@router.get("/")
async def list_vital_entries(
    biomarker_name: Optional[str] = Query(None),
    days: int = Query(90, ge=1, le=730),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    since = date.today() - timedelta(days=days)
    conditions = [
        ManualVitalEntry.user_id == uuid.UUID(user_id),
        ManualVitalEntry.entry_date >= since,
    ]
    if biomarker_name:
        conditions.append(ManualVitalEntry.biomarker_name == biomarker_name)
    result = await db.execute(
        select(ManualVitalEntry)
        .where(and_(*conditions))
        .order_by(desc(ManualVitalEntry.entry_date))
    )
    entries = result.scalars().all()
    return {"entries": [_entry_dict(e) for e in entries]}


@router.get("/summary")
async def get_vitals_summary(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Latest reading for each biomarker."""
    result = await db.execute(
        select(ManualVitalEntry)
        .where(ManualVitalEntry.user_id == uuid.UUID(user_id))
        .order_by(desc(ManualVitalEntry.entry_date))
    )
    all_entries = result.scalars().all()
    seen: set[str] = set()
    latest: list = []
    for e in all_entries:
        if e.biomarker_name not in seen:
            seen.add(e.biomarker_name)
            latest.append(_entry_dict(e))
    return {"summary": latest}


@router.put("/{entry_id}")
async def update_vital_entry(
    entry_id: str,
    data: VitalEntryUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ManualVitalEntry).where(
            ManualVitalEntry.id == uuid.UUID(entry_id),
            ManualVitalEntry.user_id == uuid.UUID(user_id),
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if data.value_numeric is not None:
        entry.value_numeric = data.value_numeric
    if data.notes is not None:
        entry.notes = data.notes
    await db.commit()
    return _entry_dict(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vital_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ManualVitalEntry).where(
            ManualVitalEntry.id == uuid.UUID(entry_id),
            ManualVitalEntry.user_id == uuid.UUID(user_id),
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)
    await db.commit()


def _entry_dict(e: ManualVitalEntry) -> dict:
    return {
        "id": str(e.id),
        "biomarker_name": e.biomarker_name,
        "value_numeric": e.value_numeric,
        "unit": e.unit,
        "entry_date": str(e.entry_date),
        "notes": e.notes,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
