"""Add audit_logs table for DPDP 2023 / HIPAA compliance.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-03
"""

from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(200), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("outcome", sa.String(20), nullable=True, server_default="success"),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_audit_user_created", "audit_logs", ["user_id", "created_at"])
    op.create_index("ix_audit_resource", "audit_logs", ["resource", "resource_id"])
    op.create_index("ix_audit_action", "audit_logs", ["action"])


def downgrade() -> None:
    # Dropping audit logs is a compliance violation in production.
    # Only run downgrade in development environments.
    op.drop_index("ix_audit_action", table_name="audit_logs")
    op.drop_index("ix_audit_resource", table_name="audit_logs")
    op.drop_index("ix_audit_user_created", table_name="audit_logs")
    op.drop_table("audit_logs")
