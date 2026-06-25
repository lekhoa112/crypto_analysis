"""users status varchar

Revision ID: 20260625_0002
Revises: 20260625_0001
Create Date: 2026-06-25
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20260625_0002"
down_revision: Union[str, None] = "20260625_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(32) USING status::TEXT")


def downgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE user_status AS ENUM ('active', 'disabled', 'pending');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.execute("ALTER TABLE users ALTER COLUMN status TYPE user_status USING status::user_status")
