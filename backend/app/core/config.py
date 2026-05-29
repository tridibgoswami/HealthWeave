"""
HealthWeave – Core Configuration
Environment-driven settings with sensible defaults for dev/prod parity.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "HealthWeave"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-32-char-min"
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://healthweave:healthweave@localhost:5432/healthweave"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        # DigitalOcean Managed DB injects plain postgresql:// — convert for asyncpg
        if isinstance(v, str):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # ── Vector DB (pgvector via PostgreSQL) ───────────────────────────────────
    VECTOR_DIMENSION: int = 1536  # OpenAI ada-002 / text-embedding-3-small

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 3600

    # ── Object Storage ───────────────────────────────────────────────────────
    S3_ENDPOINT: str = "https://s3.amazonaws.com"
    S3_BUCKET: str = "healthweave-documents"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "ap-south-1"

    # ── AI / LLM ─────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""           # fallback + embeddings
    PRIMARY_LLM: str = "claude-sonnet-4-6"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    MAX_TOKENS_REASONING: int = 4096
    MAX_TOKENS_SUMMARY: int = 2048

    # ── OCR ──────────────────────────────────────────────────────────────────
    GOOGLE_VISION_API_KEY: str = ""
    OCR_CONFIDENCE_THRESHOLD: float = 0.75
    SUPPORTED_LANGUAGES: List[str] = ["en", "hi", "ta", "te", "bn", "mr", "kn"]

    # ── Security / Auth ──────────────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12
    EMERGENCY_TOKEN_EXPIRE_HOURS: int = 72

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.healthweave.in",
    ]

    # ── File Upload ───────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/tiff",
    ]

    # ── Notification ─────────────────────────────────────────────────────────
    FCM_SERVER_KEY: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    TWILIO_SID: str = ""
    TWILIO_TOKEN: str = ""
    TWILIO_PHONE: str = ""

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 100
    AI_RATE_LIMIT_PER_MINUTE: int = 30

    # ── Medical Safety ────────────────────────────────────────────────────────
    MEDICAL_DISCLAIMER: str = (
        "HealthWeave provides health intelligence for informational purposes only. "
        "It does not diagnose diseases or replace professional medical advice. "
        "Always consult a qualified healthcare provider for medical decisions."
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
