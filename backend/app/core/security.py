"""
HealthWeave – Security Layer
JWT auth, password hashing, HIPAA-aligned audit logging.
"""

import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT tokens ────────────────────────────────────────────────────────────────

def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra: Optional[dict] = None,
) -> str:
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + expires_delta,
        "jti": secrets.token_hex(16),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str, roles: list[str] | None = None) -> str:
    return _create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra={"roles": roles or []},
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_emergency_token(user_id: str) -> str:
    """Short-lived, read-only token for emergency QR access."""
    return _create_token(
        subject=user_id,
        token_type="emergency",
        expires_delta=timedelta(hours=settings.EMERGENCY_TOKEN_EXPIRE_HOURS),
        extra={"scope": "emergency_read"},
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    payload = decode_token(credentials.credentials)
    if payload.get("type") not in ("access", "emergency"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    return payload["sub"]


async def get_emergency_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Used by emergency-only endpoints — allows emergency token type."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token required")
    payload = decode_token(credentials.credentials)
    if payload.get("type") not in ("access", "emergency"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload["sub"]


# ── Document encryption helpers ───────────────────────────────────────────────

def generate_document_key() -> str:
    return secrets.token_hex(32)


def hash_document_id(document_id: str) -> str:
    """Deterministic obfuscated ID for storage references."""
    return hashlib.sha256(
        f"{document_id}{settings.SECRET_KEY}".encode()
    ).hexdigest()[:16]


# ── Audit log entry builder ───────────────────────────────────────────────────

def build_audit_entry(
    user_id: str,
    action: str,
    resource: str,
    resource_id: str,
    ip: str = "",
    extra: dict | None = None,
) -> dict:
    return {
        "user_id": user_id,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "ip_address": ip,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "extra": extra or {},
    }
