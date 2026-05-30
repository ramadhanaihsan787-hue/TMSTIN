"""add_weight_realisasi_to_delivery_orders

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-05-30 00:00:00.000000

Tambah kolom weight_realisasi (FLOAT) ke delivery_orders.
NULL  = admin belum upload realisasi, sistem pakai weight_total (routing qty).
Terisi = admin sudah upload Excel realisasi jam ~1 malam, sistem pakai nilai ini
         untuk analytics, KPI, driver app, dan manager dashboard.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e7f8a9b0c1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("delivery_orders")]
    if "weight_realisasi" not in cols:
        op.add_column(
            "delivery_orders",
            sa.Column("weight_realisasi", sa.Float(), nullable=True)
        )
        # Biarkan NULL — berarti "belum ada realisasi, pakai routing qty"


def downgrade() -> None:
    try:
        op.drop_column("delivery_orders", "weight_realisasi")
    except Exception:
        pass