"""
HealthWeave – Consent API
Patients manage which doctors can access their health records (DPDP 2023).
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User, UserProfile, UserRole
from app.models.organization import (
    PatientConsent, ConsentStatus,
    Notification, NotificationType,
)

router = APIRouter(prefix="/consent", tags=["Consent Management"])


class GrantConsentRequest(BaseModel):
    doctor_email: EmailStr
    share_full_history: bool = False
    share_biomarkers: bool = True
    share_prescriptions: bool = True
    share_lab_reports: bool = True
    share_scans: bool = False
    share_mental_health: bool = False
    valid_days: int | None = None  # None = indefinite
    purpose: str | None = None


class RevokeConsentRequest(BaseModel):
    consent_id: str


@router.post("/grant", status_code=status.HTTP_201_CREATED)
async def grant_consent(
    payload: GrantConsentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Patient grants a doctor access to their health records."""
    # Verify caller is patient
    me_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    me = me_result.scalar_one_or_none()
    if not me:
        raise HTTPException(status_code=404, detail="User not found")

    # Find doctor by email
    doc_result = await db.execute(
        select(User).where(User.email == payload.doctor_email, User.role == UserRole.DOCTOR)
    )
    doctor = doc_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=404,
            detail=f"No doctor account found with email {payload.doctor_email}",
        )

    # Revoke any existing consent to same doctor
    await db.execute(
        update(PatientConsent)
        .where(
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.doctor_id == doctor.id,
            PatientConsent.status == ConsentStatus.ACTIVE,
        )
        .values(status=ConsentStatus.REVOKED, revoked_at=datetime.now(timezone.utc))
    )

    valid_until = None
    if payload.valid_days:
        from datetime import timedelta
        valid_until = date.today() + timedelta(days=payload.valid_days)

    consent = PatientConsent(
        patient_id=uuid.UUID(user_id),
        doctor_id=doctor.id,
        share_full_history=payload.share_full_history,
        share_biomarkers=payload.share_biomarkers,
        share_prescriptions=payload.share_prescriptions,
        share_lab_reports=payload.share_lab_reports,
        share_scans=payload.share_scans,
        share_mental_health=payload.share_mental_health,
        valid_until=valid_until,
        purpose=payload.purpose,
    )
    db.add(consent)

    # Notify doctor
    notif = Notification(
        user_id=doctor.id,
        type=NotificationType.CONSENT_GRANTED,
        title="Patient shared health records",
        body=f"A patient has granted you access to their health records.",
        action_url="/doctor/patients",
    )
    db.add(notif)

    await db.commit()
    return {
        "consent_id": str(consent.id),
        "doctor_email": payload.doctor_email,
        "status": "active",
        "valid_until": str(valid_until) if valid_until else None,
    }


@router.get("/")
async def list_my_consents(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Patient lists all their active consents."""
    result = await db.execute(
        select(PatientConsent, User, UserProfile)
        .join(User, User.id == PatientConsent.doctor_id, isouter=True)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.status == ConsentStatus.ACTIVE,
        )
        .order_by(desc(PatientConsent.granted_at))
    )
    rows = result.all()

    return [
        {
            "consent_id": str(c.id),
            "doctor_id": str(u.id) if u else None,
            "doctor_name": f"Dr. {p.first_name} {p.last_name}" if p else (u.email if u else "Unknown"),
            "doctor_email": u.email if u else None,
            "granted_at": str(c.granted_at),
            "valid_until": str(c.valid_until) if c.valid_until else None,
            "purpose": c.purpose,
            "share_full_history": c.share_full_history,
            "share_biomarkers": c.share_biomarkers,
            "share_lab_reports": c.share_lab_reports,
            "share_prescriptions": c.share_prescriptions,
            "share_scans": c.share_scans,
        }
        for c, u, p in rows
    ]


@router.post("/revoke")
async def revoke_consent(
    payload: RevokeConsentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Patient revokes a previously granted consent."""
    result = await db.execute(
        select(PatientConsent).where(
            PatientConsent.id == uuid.UUID(payload.consent_id),
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.status == ConsentStatus.ACTIVE,
        )
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    consent.status = ConsentStatus.REVOKED
    consent.revoked_at = datetime.now(timezone.utc)

    # Notify doctor
    if consent.doctor_id:
        notif = Notification(
            user_id=consent.doctor_id,
            type=NotificationType.CONSENT_REVOKED,
            title="Patient revoked health record access",
            body="A patient has revoked your access to their health records.",
            action_url="/doctor/patients",
        )
        db.add(notif)

    await db.commit()
    return {"status": "revoked", "consent_id": payload.consent_id}
