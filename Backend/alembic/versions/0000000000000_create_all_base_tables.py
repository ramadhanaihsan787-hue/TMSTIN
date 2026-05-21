"""create_all_base_tables

Migration PERTAMA — membuat semua tabel dasar dari models.py.
Sebelumnya tabel dibuat oleh Base.metadata.create_all() di main.py.
Setelah QW-9 (hapus create_all), migration inilah yang bertanggung jawab.

Revision ID: 0000000000000
Revises: (none — ini yang paling awal)
Create Date: 2026-05-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0000000000000'
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    existing = sa.inspect(conn).get_table_names()

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    if 'users' not in existing:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('username', sa.String(50), unique=True, nullable=False),
            sa.Column('hashed_password', sa.String(100), nullable=False),
            sa.Column('full_name', sa.String(100)),
            sa.Column('role', sa.Enum(
                'manager_logistik','admin_distribusi','admin_pod','driver','kasir',
                name='userrole'
            )),
            sa.Column('auto_advance', sa.Boolean(), server_default='false'),
            sa.Column('sound_alert', sa.Boolean(), server_default='true'),
            sa.Column('data_density', sa.String(20), server_default='normal'),
        )
        op.create_index('ix_users_id', 'users', ['id'])
        op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # ------------------------------------------------------------------
    # hr_drivers
    # ------------------------------------------------------------------
    if 'hr_drivers' not in existing:
        op.create_table(
            'hr_drivers',
            sa.Column('driver_id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
            sa.Column('name', sa.String(100)),
            sa.Column('phone', sa.String(15)),
            sa.Column('status', sa.Boolean(), server_default='true'),
            sa.Column('is_helper', sa.Boolean(), server_default='false'),
        )
        op.create_index('ix_hr_drivers_driver_id', 'hr_drivers', ['driver_id'])

    # ------------------------------------------------------------------
    # fleet_vehicles
    # ------------------------------------------------------------------
    if 'fleet_vehicles' not in existing:
        op.create_table(
            'fleet_vehicles',
            sa.Column('vehicle_id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('license_plate', sa.String(20), unique=True, nullable=False),
            sa.Column('type', sa.String(50)),
            sa.Column('capacity_kg', sa.Float()),
            sa.Column('status', sa.String(20), server_default='Available'),
            sa.Column('is_internal', sa.Boolean(), server_default='true'),
            sa.Column('current_km', sa.Integer(), server_default='0'),
            sa.Column('box_length_cm', sa.Integer(), server_default='400'),
            sa.Column('box_width_cm', sa.Integer(), server_default='200'),
            sa.Column('box_height_cm', sa.Integer(), server_default='200'),
            sa.Column('default_driver_id', sa.Integer(),
                      sa.ForeignKey('hr_drivers.driver_id'), nullable=True),
            sa.Column('co_driver_id', sa.Integer(),
                      sa.ForeignKey('hr_drivers.driver_id'), nullable=True),
        )
        op.create_index('ix_fleet_vehicles_vehicle_id', 'fleet_vehicles', ['vehicle_id'])
        op.create_index('ix_fleet_vehicles_license_plate', 'fleet_vehicles',
                        ['license_plate'], unique=True)

    # ------------------------------------------------------------------
    # master_customers
    # ------------------------------------------------------------------
    if 'master_customers' not in existing:
        op.create_table(
            'master_customers',
            sa.Column('store_id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('kode_customer', sa.String(50), unique=True, nullable=False),
            sa.Column('store_name', sa.String(100)),
            sa.Column('latitude', sa.Numeric(10, 8), nullable=True),
            sa.Column('longitude', sa.Numeric(11, 8), nullable=True),
            sa.Column('actual_lat', sa.Numeric(10, 8), nullable=True),
            sa.Column('actual_lng', sa.Numeric(11, 8), nullable=True),
            sa.Column('avg_service_time_per_kg', sa.Float(), server_default='0.0'),
            sa.Column('address', sa.Text()),
            sa.Column('district', sa.String(100), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('admin_name', sa.String(100), nullable=True),
            sa.Column('status', sa.String(20), server_default='Active'),
        )
        op.create_index('ix_master_customers_store_id', 'master_customers', ['store_id'])
        op.create_index('ix_master_customers_kode_customer', 'master_customers',
                        ['kode_customer'], unique=True)

    # ------------------------------------------------------------------
    # delivery_orders
    # ------------------------------------------------------------------
    if 'delivery_orders' not in existing:
        op.create_table(
            'delivery_orders',
            sa.Column('order_id', sa.String(50), primary_key=True),
            sa.Column('latitude', sa.Numeric(10, 8), nullable=True),
            sa.Column('longitude', sa.Numeric(11, 8), nullable=True),
            sa.Column('weight_total', sa.Float()),
            sa.Column('delivery_window_start', sa.Integer(), server_default='360'),
            sa.Column('delivery_window_end', sa.Integer(), server_default='1200'),
            sa.Column('service_type', sa.Text(), server_default='Regular'),
            sa.Column('status', sa.Enum(
                'SO_WAITING_VERIFICATION','DO_VERIFIED','DO_ASSIGNED_TO_ROUTE',
                'DELIVERED_POD_UPLOADED','DELIVERED_SUCCESS','DELIVERED_PARTIAL',
                'BILLED','CANCELLED','FAILED',
                name='dostatus'
            ), server_default='SO_WAITING_VERIFICATION'),
            sa.Column('store_id', sa.Integer(),
                      sa.ForeignKey('master_customers.store_id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )

    # ------------------------------------------------------------------
    # tms_route_plan
    # ------------------------------------------------------------------
    if 'tms_route_plan' not in existing:
        op.create_table(
            'tms_route_plan',
            sa.Column('route_id', sa.String(50), primary_key=True),
            sa.Column('planning_date', sa.Date()),
            sa.Column('vehicle_id', sa.Integer(),
                      sa.ForeignKey('fleet_vehicles.vehicle_id')),
            sa.Column('driver_id', sa.Integer(),
                      sa.ForeignKey('hr_drivers.driver_id')),
            sa.Column('helper_id', sa.Integer(),
                      sa.ForeignKey('hr_drivers.driver_id'), nullable=True),
            sa.Column('start_time', sa.DateTime()),
            sa.Column('end_time', sa.DateTime()),
            sa.Column('total_weight', sa.Float()),
            sa.Column('total_distance_km', sa.Float()),
        )

    # ------------------------------------------------------------------
    # tms_route_line
    # ------------------------------------------------------------------
    if 'tms_route_line' not in existing:
        op.create_table(
            'tms_route_line',
            sa.Column('line_id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('route_id', sa.String(50),
                      sa.ForeignKey('tms_route_plan.route_id')),
            sa.Column('order_id', sa.String(50),
                      sa.ForeignKey('delivery_orders.order_id')),
            sa.Column('sequence', sa.Integer()),
            sa.Column('est_arrival', sa.Time()),
            sa.Column('distance_from_prev_km', sa.Float(), server_default='0.0'),
            sa.Column('geofence_enter_time', sa.DateTime(), nullable=True),
            sa.Column('gps_ping_count', sa.Integer(), server_default='0'),
            sa.Column('actual_arrival_time', sa.DateTime(), nullable=True),
            sa.Column('actual_service_minutes', sa.Float(), nullable=True),
            sa.Column('is_anomaly', sa.Boolean(), server_default='false'),
        )
        op.create_index('ix_tms_route_line_line_id', 'tms_route_line', ['line_id'])

    # ------------------------------------------------------------------
    # tms_epod_history
    # ------------------------------------------------------------------
    if 'tms_epod_history' not in existing:
        op.create_table(
            'tms_epod_history',
            sa.Column('pod_id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('line_id', sa.Integer(),
                      sa.ForeignKey('tms_route_line.line_id')),
            sa.Column('status', sa.Enum(
                'SO_WAITING_VERIFICATION','DO_VERIFIED','DO_ASSIGNED_TO_ROUTE',
                'DELIVERED_POD_UPLOADED','DELIVERED_SUCCESS','DELIVERED_PARTIAL',
                'BILLED','CANCELLED','FAILED',
                name='dostatus'
            )),
            sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('photo_url', sa.Text()),
            sa.Column('gps_location_lat', sa.Numeric(10, 8)),
            sa.Column('gps_location_lon', sa.Numeric(11, 8)),
            sa.Column('qty_delivered', sa.Float(), server_default='0.0'),
            sa.Column('qty_return', sa.Float(), server_default='0.0'),
            sa.Column('qty_damaged', sa.Float(), server_default='0.0'),
            sa.Column('return_reason', sa.String(100), nullable=True),
            sa.Column('driver_notes', sa.Text(), nullable=True),
        )
        op.create_index('ix_tms_epod_history_pod_id', 'tms_epod_history', ['pod_id'])

    # ------------------------------------------------------------------
    # operational_expenses
    # ------------------------------------------------------------------
    if 'operational_expenses' not in existing:
        op.create_table(
            'operational_expenses',
            sa.Column('id', sa.String(50), primary_key=True),
            sa.Column('time', sa.String(10)),
            sa.Column('date', sa.Date()),
            sa.Column('vehicle_id', sa.Integer(),
                      sa.ForeignKey('fleet_vehicles.vehicle_id'), nullable=True),
            sa.Column('driver_id', sa.Integer(),
                      sa.ForeignKey('hr_drivers.driver_id'), nullable=True),
            sa.Column('is_oncall', sa.Boolean(), server_default='false'),
            sa.Column('bbm', sa.Float(), server_default='0.0'),
            sa.Column('tol', sa.Float(), server_default='0.0'),
            sa.Column('parkir', sa.Float(), server_default='0.0'),
            sa.Column('parkir_liar', sa.Float(), server_default='0.0'),
            sa.Column('kuli_angkut', sa.Float(), server_default='0.0'),
            sa.Column('lain_lain', sa.Float(), server_default='0.0'),
            sa.Column('helper_name', sa.String(100), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('total', sa.Float(), server_default='0.0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table('operational_expenses')
    op.drop_table('tms_epod_history')
    op.drop_table('tms_route_line')
    op.drop_table('tms_route_plan')
    op.drop_table('delivery_orders')
    op.drop_table('master_customers')
    op.drop_table('fleet_vehicles')
    op.drop_table('hr_drivers')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS dostatus")
    op.execute("DROP TYPE IF EXISTS userrole")