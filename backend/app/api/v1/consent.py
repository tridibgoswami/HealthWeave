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


class SendReportRequest(BaseModel):
    target_type: str           # "doctor" | "hospital"
    doctor_email: str | None = None
    organization_id: str | None = None
    department: str | None = None
    patient_message: str       # patient's description of current issues
    share_full_history: bool = False
    share_biomarkers: bool = True
    share_prescriptions: bool = True
    share_lab_reports: bool = True
    share_scans: bool = False
    valid_days: int = 30


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

    # Cancel any existing pending/active consent to same doctor
    await db.execute(
        update(PatientConsent)
        .where(
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.doctor_id == doctor.id,
            PatientConsent.status.in_([ConsentStatus.ACTIVE, ConsentStatus.PENDING]),
        )
        .values(status=ConsentStatus.REVOKED, revoked_at=datetime.now(timezone.utc))
    )

    valid_until = None
    if payload.valid_days:
        from datetime import timedelta
        valid_until = date.today() + timedelta(days=payload.valid_days)

    patient_name = me.email
    p_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == uuid.UUID(user_id))
    )
    p = p_result.scalar_one_or_none()
    if p and p.first_name:
        patient_name = f"{p.first_name} {p.last_name}"

    consent = PatientConsent(
        patient_id=uuid.UUID(user_id),
        doctor_id=doctor.id,
        status=ConsentStatus.PENDING,
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

    # Notify doctor — they must accept before gaining access
    notif = Notification(
        user_id=doctor.id,
        type=NotificationType.DOCTOR_ACCESS_REQUEST,
        title="Patient requesting connection",
        body=f"{patient_name} would like to connect and share their health records with you.",
        action_url="/doctor/requests",
        extra_data={"patient_id": user_id, "consent_id": str(consent.id)},
    )
    db.add(notif)

    await db.commit()
    return {
        "consent_id": str(consent.id),
        "doctor_email": payload.doctor_email,
        "status": "pending",
        "message": "Connection request sent. Your records will be shared once the doctor accepts.",
        "valid_until": str(valid_until) if valid_until else None,
    }


@router.get("/")
async def list_my_consents(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Patient lists all their pending and active consents."""
    result = await db.execute(
        select(PatientConsent, User, UserProfile)
        .join(User, User.id == PatientConsent.doctor_id, isouter=True)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.status.in_([ConsentStatus.PENDING, ConsentStatus.ACTIVE]),
        )
        .order_by(desc(PatientConsent.granted_at))
    )
    rows = result.all()

    return [
        {
            "consent_id": str(c.id),
            "status": c.status.value,
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


@router.post("/send-report", status_code=status.HTTP_201_CREATED)
async def send_report_to_doctor_or_hospital(
    payload: SendReportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Patient sends their health report to a specific doctor or hospital department,
    with a personal message about their current issues.
    Grants temporary consent and notifies the recipient.
    """
    from datetime import timedelta

    me_result = await db.execute(select(User, UserProfile)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(User.id == uuid.UUID(user_id)))
    me_row = me_result.first()
    if not me_row:
        raise HTTPException(status_code=404, detail="User not found")
    me, me_profile = me_row
    patient_name = f"{me_profile.first_name} {me_profile.last_name}" if me_profile else me.email

    valid_until = date.today() + timedelta(days=payload.valid_days)
    doctor_id = None
    org_id = uuid.UUID(payload.organization_id) if payload.organization_id else None

    if payload.target_type == "doctor":
        if not payload.doctor_email:
            raise HTTPException(status_code=422, detail="doctor_email required")
        doc_result = await db.execute(
            select(User).where(User.email == payload.doctor_email, User.role == UserRole.DOCTOR)
        )
        doctor = doc_result.scalar_one_or_none()
        if not doctor:
            raise HTTPException(status_code=404, detail=f"No doctor found with email {payload.doctor_email}")
        doctor_id = doctor.id
        org_id = doctor.organization_id

    # Revoke existing consent to same recipient
    await db.execute(
        update(PatientConsent)
        .where(
            PatientConsent.patient_id == uuid.UUID(user_id),
            PatientConsent.doctor_id == doctor_id if doctor_id else PatientConsent.organization_id == org_id,
            PatientConsent.status == ConsentStatus.ACTIVE,
        )
        .values(status=ConsentStatus.REVOKED, revoked_at=datetime.now(timezone.utc))
    )

    consent = PatientConsent(
        patient_id=uuid.UUID(user_id),
        doctor_id=doctor_id,
        organization_id=org_id,
        share_full_history=payload.share_full_history,
        share_biomarkers=payload.share_biomarkers,
        share_prescriptions=payload.share_prescriptions,
        share_lab_reports=payload.share_lab_reports,
        share_scans=payload.share_scans,
        valid_until=valid_until,
        purpose=payload.patient_message,
    )
    db.add(consent)

    # Notify doctor if sending to specific doctor
    if doctor_id:
        dept_info = f" ({payload.department})" if payload.department else ""
        notif = Notification(
            user_id=doctor_id,
            type=NotificationType.CONSENT_GRANTED,
            title=f"Patient {patient_name} shared their health report",
            body=f"Message from patient: {payload.patient_message[:200]}",
            action_url="/doctor/patients",
            extra_data={"department": payload.department, "patient_id": user_id},
        )
        db.add(notif)

    await db.commit()
    return {
        "status": "sent",
        "consent_id": str(consent.id),
        "valid_until": str(valid_until),
        "message": "Your report has been shared successfully.",
    }


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
