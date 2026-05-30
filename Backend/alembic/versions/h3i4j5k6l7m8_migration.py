"""add_failed_to_dostatus_enum

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-05-31

Tambah nilai 'failed' ke PostgreSQL enum dostatus.
DB dibuat dengan nilai UPPERCASE ('FAILED') tapi SQLAlchemy query dengan lowercase ('failed').
Menyebabkan: invalid input value for enum dostatus: "failed"
"""
from alembic import op
from sqlalchemy import text

revision: str = 'h3i4j5k6l7m8'
down_revision: str = 'g2h3i4j5k6l7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Tambah semua nilai lowercase yang mungkin belum ada
    missing_values = ['failed', 'billed', 'cancelled']
    for val in missing_values:
        exists = conn.execute(text(
            "SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid "
            f"WHERE t.typname = 'dostatus' AND e.enumlabel = '{val}'"
        )).fetchone()
        if not exists:
            conn.execute(text("COMMIT"))
            conn.execute(text(f"ALTER TYPE dostatus ADD VALUE '{val}'"))


def downgrade() -> None:
    pass  # PostgreSQL tidak support DROP VALUE