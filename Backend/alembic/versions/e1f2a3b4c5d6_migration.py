"""add_harga_bbm_per_liter_to_system_settings

Revision ID: e1f2a3b4c5d6
Revises: d1e2f3a4b5c6
Create Date: 2026-05-29 00:00:00.000000

Tambah kolom harga_bbm_per_liter (FLOAT) ke system_settings.
Default Rp 12.500/liter (Pertalite). Admin dapat mengubah dari Settings page.
Dipakai oleh bop-export untuk kalkulasi rasio km/liter yang akurat.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("system_settings")]
    if "harga_bbm_per_liter" not in cols:
        op.add_column(
            "system_settings",
            sa.Column("harga_bbm_per_liter", sa.Float(), nullable=True, server_default="12500.0")
        )
        op.execute("UPDATE system_settings SET harga_bbm_per_liter = 12500.0 WHERE harga_bbm_per_liter IS NULL")


def downgrade() -> None:
    try:
        op.drop_column("system_settings", "harga_bbm_per_liter")
    except Exception:
        pass