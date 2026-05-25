"""
HealthWeave – Authentication API
JWT-based auth with refresh tokens.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.models.user import User, UserProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    first_name: str
    last_name: str


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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
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
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user_id=str(user.id),
    )


@router.post("/login", response_model=TokenResponse)
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

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user_id=str(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
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


@router.get("/me")
async def get_me(
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

    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_verified": user.is_verified,
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
