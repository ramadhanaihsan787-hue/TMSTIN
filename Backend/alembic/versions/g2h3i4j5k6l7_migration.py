"""add_delivered_pod_uploaded_to_dostatus_enum

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-30 00:00:00.000000

Tambah nilai 'delivered_pod_uploaded' ke PostgreSQL enum dostatus.
Nilai ini sudah ada di Python models.py (DOStatus.delivered_pod_uploaded)
tapi belum pernah di-ALTER ke DB — menyebabkan error 500 di GET /api/pod/verifications.

CATATAN PostgreSQL:
  ALTER TYPE ... ADD VALUE tidak bisa di dalam transaction block.
  Tidak bisa di-rollback. Aman untuk re-run (IF NOT EXISTS).
"""
from alembic import op
from sqlalchemy import text


revision: str = 'g2h3i4j5k6l7'
down_revision: str = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cek apakah nilai sudah ada — kalau sudah, skip (idempotent)
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM pg_enum e "
        "JOIN pg_type t ON t.oid = e.enumtypid "
        "WHERE t.typname = 'dostatus' "
        "AND e.enumlabel = 'delivered_pod_uploaded'"
    )).fetchone()

    if not result:
        # ALTER TYPE tidak bisa dalam transaksi — commit dulu
        conn.execute(text("COMMIT"))
        conn.execute(text(
            "ALTER TYPE dostatus ADD VALUE 'delivered_pod_uploaded' "
            "AFTER 'do_assigned_to_route'"
        ))


def downgrade() -> None:
    # PostgreSQL tidak support DROP VALUE dari enum
    # Downgrade tidak tersedia — hapus manual kalau perlu
    pass