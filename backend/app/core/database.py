"""
HealthWeave – Async Database Engine
PostgreSQL via asyncpg + SQLAlchemy 2.0 ORM, with pgvector extension.
"""

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


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        # Create all tables (new tables only; existing ones are not altered)
        await conn.run_sync(Base.metadata.create_all)
        # Schema migrations — safe to run on every startup
        await _run_migrations(conn)


async def _run_migrations(conn) -> None:
    """Idempotent schema migrations for additive changes."""
    # Add new enum values to userrole (PostgreSQL requires this before adding columns)
    for value in ("hospital_admin", "super_admin", "caregiver"):
        await conn.execute(text(
            f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{value}'"
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
