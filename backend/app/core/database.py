"""
HealthWeave – Async Database Engine
PostgreSQL via asyncpg + SQLAlchemy 2.0 ORM, with pgvector extension.
"""

import ssl
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _ssl_args() -> dict:
    # Use SSL for any non-local database (e.g. DigitalOcean managed DB)
    url = settings.DATABASE_URL
    if "localhost" in url or "127.0.0.1" in url:
        return {}
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return {"ssl": ctx}


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    connect_args=_ssl_args(),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    # Each extension gets its own transaction so a duplicate-key race condition
    # on multi-instance deploys doesn't abort the entire startup.
    for ext in ("vector", "pg_trgm", "unaccent"):
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"CREATE EXTENSION IF NOT EXISTS {ext}"))
        except Exception:
            pass  # already exists or insufficient privilege — safe to ignore

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _run_migrations(conn)


async def _run_migrations(conn) -> None:
    """Idempotent schema migrations for additive changes."""
    # Add new enum values to userrole (PostgreSQL requires this before adding columns)
    for value in ("hospital_admin", "super_admin", "caregiver"):
        await conn.execute(text(
            f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{value}'"
        ))

    # Add pending status to consentstatus enum (required for doctor-patient connection flow)
    await conn.execute(text(
        "ALTER TYPE consentstatus ADD VALUE IF NOT EXISTS 'pending'"
    ))

    # Add organization_id FK column to users if not present
    await conn.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS organization_id UUID
            REFERENCES organizations(id) ON DELETE SET NULL
    """))

    # Add password reset token columns
    await conn.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100)
    """))
    await conn.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ
    """))

    # Add visit_id to health_records
    await conn.execute(text("""
        ALTER TABLE health_records
        ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES patient_visits(id) ON DELETE SET NULL
    """))

    # Add biomarker_changes JSON column to health_records for auto-comparison
    await conn.execute(text("""
        ALTER TABLE health_records
        ADD COLUMN IF NOT EXISTS biomarker_changes JSONB
    """))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
