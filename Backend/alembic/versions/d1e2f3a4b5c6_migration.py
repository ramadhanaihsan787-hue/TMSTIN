"""add_trip_km_and_bop_fields

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-05-27 00:00:00.000000

Menambah kolom baru untuk tracking perjalanan driver dan BOP kasir:
  tms_route_plan:      km_awal_trip, km_akhir_trip
  operational_expenses: km_awal, km_akhir, jam_berangkat, jam_pulang
  system_settings:     jembatan_timbang_lat/lon/radius
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # tms_route_plan
    rp_cols = [c["name"] for c in inspector.get_columns("tms_route_plan")]
    if "km_awal_trip" not in rp_cols:
        op.add_column("tms_route_plan", sa.Column("km_awal_trip", sa.Integer(), nullable=True))
    if "km_akhir_trip" not in rp_cols:
        op.add_column("tms_route_plan", sa.Column("km_akhir_trip", sa.Integer(), nullable=True))

    # operational_expenses
    oe_cols = [c["name"] for c in inspector.get_columns("operational_expenses")]
    if "km_awal" not in oe_cols:
        op.add_column("operational_expenses", sa.Column("km_awal", sa.Integer(), nullable=True))
    if "km_akhir" not in oe_cols:
        op.add_column("operational_expenses", sa.Column("km_akhir", sa.Integer(), nullable=True))
    if "jam_berangkat" not in oe_cols:
        op.add_column("operational_expenses", sa.Column("jam_berangkat", sa.String(10), nullable=True))
    if "jam_pulang" not in oe_cols:
        op.add_column("operational_expenses", sa.Column("jam_pulang", sa.String(10), nullable=True))

    # system_settings
    ss_cols = [c["name"] for c in inspector.get_columns("system_settings")]
    if "jembatan_timbang_lat" not in ss_cols:
        op.add_column("system_settings", sa.Column("jembatan_timbang_lat", sa.Float(), nullable=True))
    if "jembatan_timbang_lon" not in ss_cols:
        op.add_column("system_settings", sa.Column("jembatan_timbang_lon", sa.Float(), nullable=True))
    if "jembatan_timbang_radius_m" not in ss_cols:
        op.add_column("system_settings", sa.Column("jembatan_timbang_radius_m", sa.Integer(), nullable=True))


def downgrade() -> None:
    for col in ["km_awal_trip", "km_akhir_trip"]:
        try: op.drop_column("tms_route_plan", col)
        except: pass
    for col in ["km_awal", "km_akhir", "jam_berangkat", "jam_pulang"]:
        try: op.drop_column("operational_expenses", col)
        except: pass
    for col in ["jembatan_timbang_lat", "jembatan_timbang_lon", "jembatan_timbang_radius_m"]:
        try: op.drop_column("system_settings", col)
        except: pass