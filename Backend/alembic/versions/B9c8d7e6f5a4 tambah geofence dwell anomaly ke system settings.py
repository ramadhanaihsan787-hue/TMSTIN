"""tambah_geofence_dwell_anomaly_ke_system_settings

Kolom geofence_radius_meters, dwell_time_mins, anomaly_tolerance_percent
ada di models.SystemSettings sejak awal tapi tidak di-CREATE waktu
migration pertama (cba2a1b5c7a3). Akibatnya tracking_service dan
epod_service yang query kolom ini di DB akan selalu AttributeError.

[MR-2] Tambah kolom yang missing + populasi default value ke baris id=1.

Revision ID: b9c8d7e6f5a4
Revises: a1b2c3d4e5f6
Create Date: 2026-05-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b9c8d7e6f5a4'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambah 3 kolom yang hilang ke tabel system_settings."""

    with op.batch_alter_table('system_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'geofence_radius_meters',
                sa.Integer(),
                server_default='200',
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                'dwell_time_mins',
                sa.Integer(),
                server_default='3',
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column(
                'anomaly_tolerance_percent',
                sa.Float(),
                server_default='200.0',
                nullable=False,
            )
        )

    # Pastikan baris id=1 ada dan nilai baru terisi default
    # (server_default hanya berlaku untuk INSERT baru, bukan UPDATE baris existing)
    op.execute("""
        UPDATE system_settings
        SET
            geofence_radius_meters  = COALESCE(geofence_radius_meters, 200),
            dwell_time_mins         = COALESCE(dwell_time_mins, 3),
            anomaly_tolerance_percent = COALESCE(anomaly_tolerance_percent, 200.0)
        WHERE id = 1
    """)


def downgrade() -> None:
    """Hapus 3 kolom yang ditambahkan."""
    with op.batch_alter_table('system_settings', schema=None) as batch_op:
        batch_op.drop_column('anomaly_tolerance_percent')
        batch_op.drop_column('dwell_time_mins')
        batch_op.drop_column('geofence_radius_meters')