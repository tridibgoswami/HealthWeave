"""HealthWeave – Immutable Audit Log Model (DPDP 2023 / HIPAA compliance)"""

import uuid
from sqlalchemy import Column, DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class AuditLog(Base):
    """
    Write-once audit trail for every data access and mutation.
    Never delete rows from this table — deletion is a compliance violation.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Who performed the action (null for unauthenticated public endpoints)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(String(100), nullable=False)    # e.g. "login", "record.list", "passport.read"
    resource = Column(String(100), nullable=False)  # e.g. "health_record", "emergency_passport"
    resource_id = Column(String(200))               # UUID of the accessed resource, if applicable
    ip_address = Column(String(45))                 # IPv4 or IPv6
    user_agent = Column(String(500))
    outcome = Column(String(20), default="success") # "success" | "failure" | "denied"
    extra = Column(JSONB, default=dict)              # additional context (record_type, search_query, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_audit_user_created", "user_id", "created_at"),
        Index("ix_audit_resource", "resource", "resource_id"),
        Index("ix_audit_action", "action"),
    )
