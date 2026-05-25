"""add_route_geometry_to_tms_route_plan

Revision ID: c1d2e3f4a5b6
Revises: b9c8d7e6f5a4
Create Date: 2026-05-24 00:00:00.000000

Menambah kolom route_geometry (TEXT, nullable) ke tms_route_plan.
Kolom ini menyimpan garis rute OSRM sebagai JSON string [[lon,lat],...].
Menggantikan pola file route_geometries/*.json yang tidak pernah ditulis.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b9c8d7e6f5a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("tms_route_plan")]
    if "route_geometry" not in cols:
        op.add_column(
            "tms_route_plan",
            sa.Column("route_geometry", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c["name"] for c in inspector.get_columns("tms_route_plan")]
    if "route_geometry" in cols:
        op.drop_column("tms_route_plan", "route_geometry")