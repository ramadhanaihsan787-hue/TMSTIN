"""tambah_composite_indexes_performa

Tambahkan index yang hilang untuk mempercepat query terbanyak di sistem:
- tms_route_plan(planning_date, vehicle_id) — dashboard & tracking
- tms_route_line(route_id, sequence)        — GET routes & manifest
- tms_route_line(order_id)                  — GPS webhook lookup
- delivery_orders(status)                   — VRP & dashboard filter
- delivery_orders(store_id)                 — join ke master_customers
- system_audit_logs(entity_type, entity_id) — audit history lookup

Catatan: route_id di tms_route_plan adalah PRIMARY KEY, sehingga
UNIQUE + NOT NULL sudah otomatis ada. Tidak perlu constraint tambahan.

Revision ID: a1b2c3d4e5f6
Revises: 4e12c61d2be6
Create Date: 2026-05-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4e12c61d2be6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambah composite indexes untuk query yang paling sering dipakai."""

    # ------------------------------------------------------------------
    # tms_route_plan
    # Query paling sering: filter planning_date + vehicle_id
    # Dipakai di: tracking_service, driver.py, fleet.py, dashboard.py
    # ------------------------------------------------------------------
    op.create_index(
        'ix_tms_route_plan_date_vehicle',
        'tms_route_plan',
        ['planning_date', 'vehicle_id'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # tms_route_plan — filter by driver_id + planning_date
    # Dipakai di: driver.py get_my_route, driver_performance_service
    # ------------------------------------------------------------------
    op.create_index(
        'ix_tms_route_plan_driver_date',
        'tms_route_plan',
        ['driver_id', 'planning_date'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # tms_route_line — (route_id, sequence)
    # Dipakai di: GET /api/routes, manifest generation, setiap order_by
    # ------------------------------------------------------------------
    op.create_index(
        'ix_tms_route_line_route_seq',
        'tms_route_line',
        ['route_id', 'sequence'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # tms_route_line — (order_id)
    # Dipakai di: GPS webhook lookup, POD submission, epod_service
    # ------------------------------------------------------------------
    op.create_index(
        'ix_tms_route_line_order_id',
        'tms_route_line',
        ['order_id'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # delivery_orders — (status)
    # Dipakai di: VRP (filter do_verified), dashboard, analytics, cron
    # Kolom ini di-filter di hampir setiap endpoint
    # ------------------------------------------------------------------
    op.create_index(
        'ix_delivery_orders_status',
        'delivery_orders',
        ['status'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # delivery_orders — (store_id)
    # Dipakai di: join ke master_customers di order_import & GET orders
    # ------------------------------------------------------------------
    op.create_index(
        'ix_delivery_orders_store_id',
        'delivery_orders',
        ['store_id'],
        unique=False,
    )

    # ------------------------------------------------------------------
    # system_audit_logs — (entity_type, entity_id)
    # Dipakai di: audit history lookup (belum ada query tapi akan dipakai)
    # entity_id sudah ada index di d53f63c0c4c1 untuk action saja
    # ------------------------------------------------------------------
    op.create_index(
        'ix_system_audit_logs_entity',
        'system_audit_logs',
        ['entity_type', 'entity_id'],
        unique=False,
    )


def downgrade() -> None:
    """Hapus semua index yang ditambahkan di upgrade()."""
    op.drop_index('ix_system_audit_logs_entity',        table_name='system_audit_logs')
    op.drop_index('ix_delivery_orders_store_id',        table_name='delivery_orders')
    op.drop_index('ix_delivery_orders_status',          table_name='delivery_orders')
    op.drop_index('ix_tms_route_line_order_id',         table_name='tms_route_line')
    op.drop_index('ix_tms_route_line_route_seq',        table_name='tms_route_line')
    op.drop_index('ix_tms_route_plan_driver_date',      table_name='tms_route_plan')
    op.drop_index('ix_tms_route_plan_date_vehicle',     table_name='tms_route_plan')