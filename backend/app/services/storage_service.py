"""
HealthWeave – Object Storage Service
Handles file upload/download via S3-compatible storage (AWS S3 or DigitalOcean Spaces).
Degrades gracefully when credentials are not configured (dev mode).
"""

import logging

logger = logging.getLogger(__name__)


async def upload_file(file_bytes: bytes, storage_key: str, content_type: str) -> bool:
    """
    Upload file bytes to S3/Spaces under storage_key.
    Returns True on success, False if storage is not configured or upload fails.
    Never raises — a storage failure must not block the upload response.
    """
    from app.core.config import settings

    if not settings.S3_ACCESS_KEY or not settings.S3_SECRET_KEY:
        logger.warning("S3 credentials not configured — file %s not persisted to object storage", storage_key)
        return False

    try:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        ) as s3:
            await s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=storage_key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
        logger.info("Uploaded %s (%d bytes) to %s", storage_key, len(file_bytes), settings.S3_BUCKET)
        return True

    except Exception as exc:
        logger.error("Failed to upload %s to object storage: %s", storage_key, exc)
        return False


async def get_presigned_url(storage_key: str, expires_in: int = 3600) -> str | None:
    """
    Generate a presigned GET URL for temporary file access.
    Returns None if storage is not configured or generation fails.
    expires_in: seconds until URL expires (default 1 hour).
    """
    from app.core.config import settings

    if not settings.S3_ACCESS_KEY or not settings.S3_SECRET_KEY:
        return None

    try:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        ) as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET, "Key": storage_key},
                ExpiresIn=expires_in,
            )
        return url

    except Exception as exc:
        logger.error("Failed to generate presigned URL for %s: %s", storage_key, exc)
        return None


async def delete_file(storage_key: str) -> bool:
    """Delete a file from object storage. Returns True on success."""
    from app.core.config import settings

    if not settings.S3_ACCESS_KEY or not settings.S3_SECRET_KEY:
        return False

    try:
        import aioboto3
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        ) as s3:
            await s3.delete_object(Bucket=settings.S3_BUCKET, Key=storage_key)
        logger.info("Deleted %s from object storage", storage_key)
        return True

    except Exception as exc:
        logger.error("Failed to delete %s from object storage: %s", storage_key, exc)
        return False
