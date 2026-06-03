"""
HealthWeave – Authentication API
JWT-based auth with refresh tokens.
"""

import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.models.user import User, UserProfile, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

_PASSWORD_RE = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,72}$')


def _validate_password_strength(v: str) -> str:
    if not _PASSWORD_RE.match(v):
        raise ValueError(
            "Password must be 8–72 characters and include uppercase, lowercase, "
            "and at least one digit or special character."
        )
    return v


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    first_name: str
    last_name: str
    role: str = "patient"
    specialization: str | None = None
    medical_registration_number: str | None = None
    organization_name: str | None = None

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("first_name", "last_name")
    @classmethod
    def non_empty_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        if len(v) > 100:
            raise ValueError("Name too long")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password_strength(v)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    role_map = {
        "patient": UserRole.PATIENT,
        "doctor": UserRole.DOCTOR,
        "hospital_admin": UserRole.HOSPITAL_ADMIN,
    }
    user_role = role_map.get(payload.role, UserRole.PATIENT)

    user = User(
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=user_role,
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

    if user_role == UserRole.DOCTOR:
        from app.models.organization import DoctorProfile
        doc_profile = DoctorProfile(
            user_id=user.id,
            specialization=payload.specialization,
            medical_registration_number=payload.medical_registration_number,
        )
        db.add(doc_profile)

    await db.commit()

    from app.services.email_service import send_welcome
    await send_welcome(email=str(user.email), first_name=payload.first_name)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user_id=str(user.id),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("60/minute")
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_login_at=datetime.now(timezone.utc))
    )

    from app.services.audit_service import log_event
    await log_event(db, action="login", resource="user", user_id=str(user.id),
                    resource_id=str(user.id), request=request)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user_id=str(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh(payload: RefreshRequest, request: Request):
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = token_data["sub"]
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        user_id=user_id,
    )


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def forgot_password(payload: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    import secrets
    from datetime import timedelta
    from app.services.email_service import send_password_reset

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always return the same response — never leak whether the email exists
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(reset_token=reset_token, reset_token_expires_at=expires_at)
    )
    await db.commit()

    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    first_name = profile.first_name if profile else ""

    await send_password_reset(
        email=str(user.email),
        reset_token=reset_token,
        first_name=first_name,
    )

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def reset_password(payload: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.reset_token == payload.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.reset_token_expires_at and user.reset_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            hashed_password=hash_password(payload.new_password),
            reset_token=None,
            reset_token_expires_at=None,
        )
    )
    await db.commit()
    return {"message": "Password updated successfully. You can now log in."}


@router.get("/me")
async def get_me(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User, UserProfile)
        .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
        .where(User.id == UUID(user_id))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    user, profile = row

    org_info = None
    if user.organization_id:
        from app.models.organization import Organization
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        org = org_result.scalar_one_or_none()
        if org:
            org_info = {"id": str(org.id), "name": org.name, "org_type": org.org_type}

    from app.services.audit_service import log_event
    await log_event(db, action="profile.read", resource="user", user_id=user_id,
                    resource_id=user_id, request=request)

    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_verified": user.is_verified,
        "organization": org_info,
        "profile": {
            "first_name": profile.first_name if profile else None,
            "last_name": profile.last_name if profile else None,
            "display_name": profile.display_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "date_of_birth": str(profile.date_of_birth) if profile and profile.date_of_birth else None,
            "gender": profile.gender if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "chronic_conditions": profile.chronic_conditions if profile else [],
            "known_allergies": profile.known_allergies if profile else [],
        } if profile else None,
    }
