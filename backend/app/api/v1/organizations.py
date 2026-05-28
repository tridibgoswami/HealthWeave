"""
HealthWeave – Organizations API
Hospital/clinic registration, doctor invitations, admin dashboard.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User, UserProfile, UserRole
from app.models.organization import (
    Organization, OrganizationMember, DoctorProfile,
    Invitation, InvitationStatus, OrganizationType,
    Notification, NotificationType,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])

HOSPITAL_DEPARTMENTS = [
    "General Medicine", "General Surgery", "Emergency & Trauma",
    "Cardiology", "Cardiothoracic Surgery", "Neurology", "Neurosurgery",
    "Orthopedics", "Orthopedic Surgery", "Gastroenterology", "Hepatology",
    "Nephrology", "Urology", "Pulmonology", "Critical Care / ICU",
    "Oncology", "Radiation Oncology", "Hematology", "Endocrinology",
    "Diabetology", "Rheumatology", "Dermatology", "Psychiatry",
    "Obstetrics & Gynecology", "Pediatrics", "Neonatology",
    "Ophthalmology", "ENT", "Dental & Oral Surgery", "Radiology",
    "Pathology & Lab Medicine", "Anesthesiology", "Palliative Care",
    "Physiotherapy & Rehabilitation", "Nutrition & Dietetics", "Other",
]


@router.get("/search")
async def search_organizations(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Patient searches for a hospital/clinic by name or city."""
    from sqlalchemy import or_, func as sa_func
    result = await db.execute(
        select(Organization)
        .where(
            Organization.is_active == True,
            or_(
                sa_func.lower(Organization.name).contains(q.lower()),
                sa_func.lower(Organization.city).contains(q.lower()),
            ),
        )
        .limit(10)
    )
    orgs = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "name": o.name,
            "org_type": o.org_type,
            "city": o.city,
            "state": o.state,
        }
        for o in orgs
    ]


@router.get("/departments")
async def list_departments(user_id: str = Depends(get_current_user_id)):
    """Return the standard list of hospital departments."""
    return {"departments": HOSPITAL_DEPARTMENTS}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _require_role(user_id: str, db: AsyncSession, *roles: UserRole) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or user.role not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


async def _require_org_admin(user_id: str, org_id: uuid.UUID, db: AsyncSession) -> User:
    user = await _require_role(user_id, db, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
    if user.role == UserRole.SUPER_ADMIN:
        return user
    if str(user.organization_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Not an admin of this organization")
    return user


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateOrgRequest(BaseModel):
    name: str
    org_type: OrganizationType = OrganizationType.HOSPITAL
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    website: str | None = None
    registration_number: str | None = None


class InviteDoctorRequest(BaseModel):
    email: EmailStr
    role: str = "doctor"


class AcceptInviteRequest(BaseModel):
    token: str
    # If the invitee is already registered, just their password to verify
    # If new, full registration data
    password: str
    first_name: str | None = None
    last_name: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: CreateOrgRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Register a new hospital/clinic. The caller becomes the hospital_admin."""
    user = await _require_role(user_id, db, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN)

    slug = payload.name.lower().replace(" ", "-").replace(".", "")[:50] + "-" + secrets.token_hex(3)

    org = Organization(
        name=payload.name,
        slug=slug,
        org_type=payload.org_type,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        phone=payload.phone,
        email=payload.email,
        website=payload.website,
        registration_number=payload.registration_number,
        created_by=uuid.UUID(user_id),
    )
    db.add(org)
    await db.flush()

    # Link the creator as admin member
    member = OrganizationMember(
        organization_id=org.id,
        user_id=uuid.UUID(user_id),
        role="hospital_admin",
    )
    db.add(member)

    # Set org on user record
    from sqlalchemy import update
    await db.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(organization_id=org.id)
    )

    await db.commit()
    return {"id": str(org.id), "name": org.name, "slug": org.slug}


@router.get("/me")
async def get_my_organization(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the organization the current user belongs to."""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.organization_id:
        raise HTTPException(status_code=404, detail="Not part of any organization")

    org_result = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Member count
    cnt = await db.execute(
        select(sa_func.count(OrganizationMember.id))
        .where(OrganizationMember.organization_id == org.id, OrganizationMember.is_active == True)
    )
    member_count = cnt.scalar() or 0

    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "org_type": org.org_type,
        "address": org.address,
        "city": org.city,
        "state": org.state,
        "phone": org.phone,
        "email": org.email,
        "website": org.website,
        "is_verified": org.is_verified,
        "member_count": member_count,
    }


@router.get("/{org_id}/members")
async def list_members(
    org_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(user_id, uuid.UUID(org_id), db)

    result = await db.execute(
        select(OrganizationMember, User, UserProfile)
        .join(User, User.id == OrganizationMember.user_id)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(
            OrganizationMember.organization_id == uuid.UUID(org_id),
            OrganizationMember.is_active == True,
        )
    )
    rows = result.all()

    return [
        {
            "member_id": str(m.id),
            "user_id": str(u.id),
            "email": u.email,
            "name": f"{p.first_name} {p.last_name}" if p else u.email,
            "role": m.role,
            "department": m.department,
            "joined_at": str(m.joined_at),
        }
        for m, u, p in rows
    ]


@router.post("/{org_id}/invite")
async def invite_doctor(
    org_id: str,
    payload: InviteDoctorRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(user_id, uuid.UUID(org_id), db)

    token = secrets.token_urlsafe(32)
    invite = Invitation(
        organization_id=uuid.UUID(org_id),
        invited_by=uuid.UUID(user_id),
        email=payload.email,
        role=payload.role,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.commit()

    return {
        "invite_token": token,
        "email": payload.email,
        "expires_in_days": 7,
        "message": f"Invitation sent to {payload.email}",
    }


@router.post("/invitations/accept")
async def accept_invitation(
    payload: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.core.security import hash_password, create_access_token, create_refresh_token, verify_password

    inv_result = await db.execute(
        select(Invitation).where(
            Invitation.token == payload.token,
            Invitation.status == InvitationStatus.PENDING,
        )
    )
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    if inv.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation has expired")

    # Check if user exists
    existing = await db.execute(select(User).where(User.email == inv.email))
    user = existing.scalar_one_or_none()

    from sqlalchemy import update
    if user:
        # Existing user: verify password, then link to org
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        # New user: create account as doctor/hospital_admin
        if not payload.first_name or not payload.last_name:
            raise HTTPException(status_code=422, detail="first_name and last_name required for new accounts")

        role = UserRole.HOSPITAL_ADMIN if inv.role == "hospital_admin" else UserRole.DOCTOR
        user = User(
            email=inv.email,
            hashed_password=hash_password(payload.password),
            role=role,
            organization_id=inv.organization_id,
        )
        db.add(user)
        await db.flush()

        profile = UserProfile(
            user_id=user.id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            display_name=f"{payload.first_name} {payload.last_name}",
        )
        db.add(profile)
        await db.flush()

    # Link to org
    await db.execute(
        update(User).where(User.id == user.id).values(organization_id=inv.organization_id)
    )

    member = OrganizationMember(
        organization_id=inv.organization_id,
        user_id=user.id,
        role=inv.role,
    )
    db.add(member)

    # Mark invite accepted
    inv.status = InvitationStatus.ACCEPTED
    inv.accepted_at = datetime.now(timezone.utc)
    inv.accepted_by = user.id

    await db.commit()

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role,
    }


@router.get("/{org_id}/stats")
async def org_stats(
    org_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Admin dashboard stats: doctor count, patient count, records count."""
    await _require_org_admin(user_id, uuid.UUID(org_id), db)

    from app.models.organization import PatientConsent
    from app.models.health_record import HealthRecord

    doc_cnt = await db.execute(
        select(sa_func.count(OrganizationMember.id))
        .where(
            OrganizationMember.organization_id == uuid.UUID(org_id),
            OrganizationMember.role == "doctor",
            OrganizationMember.is_active == True,
        )
    )

    patient_cnt = await db.execute(
        select(sa_func.count(sa_func.distinct(PatientConsent.patient_id)))
        .where(PatientConsent.organization_id == uuid.UUID(org_id))
    )

    return {
        "doctor_count": doc_cnt.scalar() or 0,
        "patient_count": patient_cnt.scalar() or 0,
    }
