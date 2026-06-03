"""Establish Alembic baseline — existing schema managed by create_all.

Revision ID: 0001
Revises:
Create Date: 2026-06-03

For EXISTING deployments that used Base.metadata.create_all():
    Run: alembic stamp 0001
    This marks the DB as up-to-date without executing any SQL.

For NEW deployments:
    Run: alembic upgrade head
    Alembic will run this (no-op) then 0002 which adds audit_logs.
    The application's init_db() creates all other tables via create_all().
"""

from typing import Sequence, Union
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Intentionally empty — tables were created by SQLAlchemy create_all().
    # Future schema changes will be tracked from this point forward.
    pass


def downgrade() -> None:
    pass
