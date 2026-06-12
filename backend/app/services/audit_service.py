"""
HealthWeave – Audit Persistence Service
Fire-and-forget helper that writes to audit_logs without blocking the request path.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import AuditLog

logger = logging.getLogger(__name__)


async def log_event(
    db: AsyncSession,
    *,
    action: str,
    resource: str,
    user_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    request: Optional[Request] = None,
    outcome: str = "success",
    extra: Optional[dict] = None,
) -> None:
    """
    Persist one audit event. Never raises — a logging failure must never break the endpoint.
    Call with `await log_event(...)` inside the endpoint after the main work is done.
    """
    try:
        ip = _get_ip(request)
        ua = request.headers.get("user-agent", "")[:500] if request else ""

        entry = AuditLog(
            user_id=UUID(user_id) if user_id else None,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip,
            user_agent=ua,
            extra_data={"outcome": outcome, **(extra or {})},
        )
        db.add(entry)
        # Use flush (not commit) — the route's own commit at session close handles it.
        await db.flush()
    except Exception as exc:
        logger.error("Audit log write failed (action=%s resource=%s): %s", action, resource, exc)


def _get_ip(request: Optional[Request]) -> str:
    if not request:
        return ""
    # Respect X-Forwarded-For set by Cloudflare / load balancer
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return (request.client.host or "") if request.client else ""
