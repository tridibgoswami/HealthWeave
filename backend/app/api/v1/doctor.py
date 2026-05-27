"""
HealthWeave – Doctor API
Doctor views consented patient data, writes clinical notes, requests labs.
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User, UserProfile, UserRole
from app.models.organization import (
    PatientConsent, ConsentStatus,
    ClinicalNote, LabRequest, DoctorProfile,
)
from app.models.health_record import HealthRecord, BiomarkerValue
from app.models.intelligence import HealthScore, PredictiveAlert

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


async def _require_doctor(user_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or user.role not in (UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Doctor access required")
    return user


async def _check_consent(doctor_id: uuid.UUID, patient_id: uuid.UUID, db: AsyncSession):
    """Raises 403 if doctor does not have active consent from patient."""
    result = await db.execute(
        select(PatientConsent).where(
            and_(
                PatientConsent.patient_id == patient_id,
                PatientConsent.doctor_id == doctor_id,
                PatientConsent.status == ConsentStatus.ACTIVE,
            )
        )
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(
            status_code=403,
            detail="No active consent from this patient. Ask patient to share their records with you.",
        )
    return consent


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClinicalNoteCreate(BaseModel):
    visit_date: str | None = None
    chief_complaint: str | None = None
    clinical_findings: str | None = None
    diagnosis: str | None = None
    icd10_codes: list[str] = []
    treatment_plan: str | None = None
    medications_prescribed: list[dict] = []
    follow_up_date: str | None = None
    follow_up_notes: str | None = None


class LabRequestCreate(BaseModel):
    tests_requested: list[str]
    urgency: str = "routine"
    clinical_notes: str | None = None


class DoctorProfileUpdate(BaseModel):
    medical_registration_number: str | None = None
    specialization: str | None = None
    sub_specialization: str | None = None
    qualifications: list[str] = []
    experience_years: int | None = None
    bio: str | None = None
    available_days: list[str] = []
    available_hours: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_doctor_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_doctor(user_id, db)

    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(user_id)))
    profile = result.scalar_one_or_none()

    user_result = await db.execute(
        select(User, UserProfile)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(User.id == uuid.UUID(user_id))
    )
    row = user_result.first()
    user, user_profile = row if row else (None, None)

    return {
        "user_id": user_id,
        "email": user.email if user else None,
        "name": f"{user_profile.first_name} {user_profile.last_name}" if user_profile else None,
        "medical_registration_number": profile.medical_registration_number if profile else None,
        "specialization": profile.specialization if profile else None,
        "sub_specialization": profile.sub_specialization if profile else None,
        "qualifications": profile.qualifications if profile else [],
        "experience_years": profile.experience_years if profile else None,
        "bio": profile.bio if profile else None,
        "available_days": profile.available_days if profile else [],
        "available_hours": profile.available_hours if profile else None,
    }


@router.put("/profile")
async def update_doctor_profile(
    payload: DoctorProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_doctor(user_id, db)

    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(user_id)))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = DoctorProfile(user_id=uuid.UUID(user_id))
        db.add(profile)

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, val)

    await db.commit()
    return {"status": "updated"}


@router.get("/patients")
async def list_my_patients(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all patients who have granted consent to this doctor."""
    await _require_doctor(user_id, db)

    result = await db.execute(
        select(PatientConsent, User, UserProfile)
        .join(User, User.id == PatientConsent.patient_id)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(
            PatientConsent.doctor_id == uuid.UUID(user_id),
            PatientConsent.status == ConsentStatus.ACTIVE,
        )
        .order_by(desc(PatientConsent.granted_at))
    )
    rows = result.all()

    return [
        {
            "consent_id": str(c.id),
            "patient_id": str(u.id),
            "name": f"{p.first_name} {p.last_name}" if p else u.email,
            "email": u.email,
            "blood_group": p.blood_group if p else None,
            "date_of_birth": str(p.date_of_birth) if p and p.date_of_birth else None,
            "chronic_conditions": p.chronic_conditions if p else [],
            "consent_granted": str(c.granted_at),
            "share_full_history": c.share_full_history,
        }
        for c, u, p in rows
    ]


@router.get("/patients/{patient_id}/summary")
async def get_patient_summary(
    patient_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a patient's health overview (consent required)."""
    doctor = await _require_doctor(user_id, db)
    consent = await _check_consent(doctor.id, uuid.UUID(patient_id), db)

    # Patient profile
    pat_result = await db.execute(
        select(User, UserProfile)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(User.id == uuid.UUID(patient_id))
    )
    row = pat_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient, profile = row

    # Latest health score
    score_result = await db.execute(
        select(HealthScore)
        .where(HealthScore.user_id == uuid.UUID(patient_id))
        .order_by(desc(HealthScore.scored_date))
        .limit(1)
    )
    score = score_result.scalar_one_or_none()

    # Active alerts
    alert_result = await db.execute(
        select(PredictiveAlert)
        .where(
            PredictiveAlert.user_id == uuid.UUID(patient_id),
            PredictiveAlert.is_dismissed == False,
        )
        .order_by(desc(PredictiveAlert.generated_at))
        .limit(5)
    )
    alerts = alert_result.scalars().all()

    # Recent records (based on consent)
    record_types = []
    if consent.share_lab_reports:
        record_types.append("lab_report")
    if consent.share_prescriptions:
        record_types.append("prescription")
    if consent.share_scans:
        record_types.append("scan")

    from sqlalchemy import or_
    records_q = select(HealthRecord).where(HealthRecord.user_id == uuid.UUID(patient_id))
    if record_types and not consent.share_full_history:
        records_q = records_q.where(HealthRecord.record_type.in_(record_types))
    records_q = records_q.order_by(desc(HealthRecord.record_date)).limit(10)

    rec_result = await db.execute(records_q)
    records = rec_result.scalars().all()

    return {
        "patient": {
            "id": str(patient.id),
            "name": f"{profile.first_name} {profile.last_name}" if profile else patient.email,
            "email": patient.email,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "chronic_conditions": profile.chronic_conditions if profile else [],
            "known_allergies": profile.known_allergies if profile else [],
            "current_medications": profile.current_medications if profile else [],
        },
        "health_score": {
            "overall": score.overall_score if score else None,
            "heart": score.heart_score if score else None,
            "kidney": score.kidney_score if score else None,
            "liver": score.liver_score if score else None,
            "metabolic": score.metabolic_score if score else None,
            "ai_narrative": score.ai_narrative if score else None,
            "date": str(score.scored_date) if score else None,
        },
        "alerts": [
            {
                "title": a.title,
                "risk_level": a.risk_level,
                "summary": a.summary,
                "category": a.category,
            }
            for a in alerts
        ],
        "recent_records": [
            {
                "id": str(r.id),
                "type": r.record_type,
                "title": r.title,
                "date": str(r.record_date),
                "hospital": r.hospital_name,
                "ai_summary": r.ai_summary,
                "ai_tags": r.ai_tags,
            }
            for r in records
        ],
        "consent": {
            "share_full_history": consent.share_full_history,
            "share_biomarkers": consent.share_biomarkers,
            "valid_until": str(consent.valid_until) if consent.valid_until else None,
        },
    }


@router.get("/patients/{patient_id}/biomarkers")
async def get_patient_biomarkers(
    patient_id: str,
    months: int = Query(12, ge=1, le=120),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _require_doctor(user_id, db)
    consent = await _check_consent(doctor.id, uuid.UUID(patient_id), db)

    if not consent.share_biomarkers:
        raise HTTPException(status_code=403, detail="Patient has not consented to share biomarkers")

    from datetime import timedelta
    cutoff = date.today() - timedelta(days=months * 30)

    result = await db.execute(
        select(BiomarkerValue)
        .where(
            BiomarkerValue.user_id == uuid.UUID(patient_id),
            BiomarkerValue.measured_at >= cutoff,
        )
        .order_by(BiomarkerValue.canonical_name, BiomarkerValue.measured_at)
    )
    bvs = result.scalars().all()

    # Group by canonical name
    grouped: dict = {}
    for bv in bvs:
        key = bv.canonical_name or bv.name
        if key not in grouped:
            grouped[key] = []
        grouped[key].append({
            "date": str(bv.measured_at),
            "value": bv.value_numeric,
            "unit": bv.unit,
            "status": bv.status,
            "reference_range": bv.reference_range_text,
        })

    return {"biomarkers": grouped, "months": months}


@router.post("/patients/{patient_id}/notes")
async def add_clinical_note(
    patient_id: str,
    payload: ClinicalNoteCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _require_doctor(user_id, db)
    await _check_consent(doctor.id, uuid.UUID(patient_id), db)

    visit = date.fromisoformat(payload.visit_date) if payload.visit_date else date.today()
    note = ClinicalNote(
        patient_id=uuid.UUID(patient_id),
        doctor_id=doctor.id,
        organization_id=doctor.organization_id,
        visit_date=visit,
        chief_complaint=payload.chief_complaint,
        clinical_findings=payload.clinical_findings,
        diagnosis=payload.diagnosis,
        icd10_codes=payload.icd10_codes,
        treatment_plan=payload.treatment_plan,
        medications_prescribed=payload.medications_prescribed,
        follow_up_date=date.fromisoformat(payload.follow_up_date) if payload.follow_up_date else None,
        follow_up_notes=payload.follow_up_notes,
    )
    db.add(note)

    # Notify patient
    notif = Notification(
        user_id=uuid.UUID(patient_id),
        type=NotificationType.REPORT_READY,
        title="Doctor added a clinical note",
        body=f"Dr. added a consultation note for your visit on {visit}",
        action_url="/timeline",
    )
    db.add(notif)
    await db.commit()

    return {"id": str(note.id), "status": "created"}


@router.get("/patients/{patient_id}/notes")
async def list_clinical_notes(
    patient_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _require_doctor(user_id, db)
    await _check_consent(doctor.id, uuid.UUID(patient_id), db)

    result = await db.execute(
        select(ClinicalNote, User, UserProfile)
        .join(User, User.id == ClinicalNote.doctor_id)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(ClinicalNote.patient_id == uuid.UUID(patient_id))
        .order_by(desc(ClinicalNote.visit_date))
    )
    rows = result.all()

    return [
        {
            "id": str(n.id),
            "visit_date": str(n.visit_date),
            "doctor": f"Dr. {p.first_name} {p.last_name}" if p else "Doctor",
            "chief_complaint": n.chief_complaint,
            "diagnosis": n.diagnosis,
            "treatment_plan": n.treatment_plan,
            "follow_up_date": str(n.follow_up_date) if n.follow_up_date else None,
        }
        for n, u, p in rows
    ]


@router.post("/patients/{patient_id}/lab-requests")
async def request_labs(
    patient_id: str,
    payload: LabRequestCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _require_doctor(user_id, db)
    await _check_consent(doctor.id, uuid.UUID(patient_id), db)

    req = LabRequest(
        patient_id=uuid.UUID(patient_id),
        doctor_id=doctor.id,
        organization_id=doctor.organization_id,
        tests_requested=payload.tests_requested,
        urgency=payload.urgency,
        clinical_notes=payload.clinical_notes,
    )
    db.add(req)

    notif = Notification(
        user_id=uuid.UUID(patient_id),
        type=NotificationType.REPORT_READY,
        title="Lab tests requested",
        body=f"Your doctor has requested: {', '.join(payload.tests_requested)}",
        action_url="/upload",
    )
    db.add(notif)
    await db.commit()

    return {"id": str(req.id), "tests": payload.tests_requested, "urgency": payload.urgency}
