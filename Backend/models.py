from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Time, Boolean, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

# ==========================================
# 0. MASTER DATA ENUMS
# ==========================================
class UserRole(enum.Enum):
    manager_logistik = "manager_logistik"
    admin_distribusi = "admin_distribusi"
    admin_pod = "admin_pod"
    driver = "driver"
    kasir = "kasir"

class DOStatus(enum.Enum):
    so_waiting_verification = "SO_WAITING_VERIFICATION"
    do_verified = "DO_VERIFIED"
    do_assigned_to_route = "DO_ASSIGNED_TO_ROUTE"
    delivered_pod_uploaded = "DELIVERED_POD_UPLOADED"
    delivered_success = "DELIVERED_SUCCESS"
    delivered_partial = "DELIVERED_PARTIAL"
    billed = "BILLED"
    cancelled = "CANCELLED"
    # 🌟 FIX CTO (QW-4): Nama resminya 'failed', bukan 'delivery_failed'
    failed = "FAILED"

# ==========================================
# 1. AUTENTIKASI & HR
# ==========================================
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(100))
    full_name = Column(String(100))
    role = Column(Enum(UserRole))

    auto_advance = Column(Boolean, default=False)
    sound_alert = Column(Boolean, default=True)
    data_density = Column(String(20), default="normal")
    
    driver_profile = relationship("HRDriver", back_populates="user_account", uselist=False)

class HRDriver(Base):
    __tablename__ = "hr_drivers"
    __table_args__ = {'extend_existing': True}
    
    driver_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100))
    phone = Column(String(15))
    status = Column(Boolean, default=True)
    
    is_helper = Column(Boolean, default=False) 
    
    user_account = relationship("User", back_populates="driver_profile")
    route_plans = relationship("TMSRoutePlan", foreign_keys="TMSRoutePlan.driver_id", back_populates="driver")

# ==========================================
# 2. MASTER DATA ARMADA
# ==========================================
class FleetVehicle(Base):
    __tablename__ = "fleet_vehicles"
    __table_args__ = {'extend_existing': True}
    
    vehicle_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    license_plate = Column(String(20), unique=True, index=True)
    type = Column(String(50))
    capacity_kg = Column(Float)
    
    status = Column(String(20), default="Available")
    is_internal = Column(Boolean, default=True)
    
    current_km = Column(Integer, default=0) 
    
    box_length_cm = Column(Integer, default=400)   
    box_width_cm = Column(Integer, default=200)    
    box_height_cm = Column(Integer, default=200)   
    
    route_plans = relationship("TMSRoutePlan", back_populates="vehicle")

    default_driver_id = Column(Integer, ForeignKey("hr_drivers.driver_id"), nullable=True)
    default_driver = relationship("HRDriver", foreign_keys=[default_driver_id])

    co_driver_id = Column(Integer, ForeignKey("hr_drivers.driver_id"), nullable=True)
    co_driver = relationship("HRDriver", foreign_keys=[co_driver_id])

# ==========================================
# 3. MASTER CUSTOMERS
# ==========================================
class MasterCustomer(Base):
    __tablename__ = "master_customers"
    __table_args__ = {'extend_existing': True}
    
    store_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    kode_customer = Column(String(50), unique=True, index=True)
    store_name = Column(String(100))
    
    latitude = Column(Numeric(10, 8), nullable=True) # Titik Google Maps (Default)
    longitude = Column(Numeric(11, 8), nullable=True) # Titik Google Maps (Default)
    
    actual_lat = Column(Numeric(10, 8), nullable=True) # Titik real loading dock dari GPS Truk
    actual_lng = Column(Numeric(11, 8), nullable=True) # Titik real loading dock dari GPS Truk
    avg_service_time_per_kg = Column(Float, default=0.0) # Hasil belajar EMA (Berapa menit per KG di toko ini)
    
    address = Column(Text)
    district = Column(String(100))  
    city = Column(String(100))      
    admin_name = Column(String(100)) 
    status = Column(String(20), default="Active") 
    
    orders = relationship("DeliveryOrder", back_populates="customer")

# ==========================================
# 4. TRANSAKSI DELIVERY ORDER
# ==========================================
class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"
    __table_args__ = {'extend_existing': True}
    
    order_id = Column(String(50), primary_key=True)
    
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    weight_total      = Column(Float)
    weight_realisasi  = Column(Float, nullable=True)   # Qty final dari gudang (upload jam 1 malam)
                                                       # NULL = belum diupdate, pakai weight_total
    
    delivery_window_start = Column(Integer, default=360)
    delivery_window_end = Column(Integer, default=1200)
    
    service_type = Column(Text, default="Regular")
    status = Column(Enum(DOStatus), default=DOStatus.so_waiting_verification)
    
    route_line = relationship("TMSRouteLine", back_populates="order", uselist=False)
    
    store_id = Column(Integer, ForeignKey("master_customers.store_id"), nullable=True)
    customer = relationship("MasterCustomer", back_populates="orders")
    created_at = Column(DateTime, default=datetime.datetime.now)

# ==========================================
# 5. HASIL ROUTING OR-TOOLS
# ==========================================
class TMSRoutePlan(Base):
    __tablename__ = "tms_route_plan"
    __table_args__ = {'extend_existing': True}
    
    route_id = Column(String(50), primary_key=True)
    planning_date = Column(Date, default=datetime.date.today)
    
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.vehicle_id"))
    driver_id = Column(Integer, ForeignKey("hr_drivers.driver_id"))
    helper_id = Column(Integer, ForeignKey("hr_drivers.driver_id"), nullable=True)
    
    start_time = Column(DateTime, default=lambda: datetime.datetime.now().replace(hour=6, minute=0, second=0))
    end_time = Column(DateTime)
    
    total_weight = Column(Float)
    total_distance_km = Column(Float)
    
    vehicle = relationship("FleetVehicle", back_populates="route_plans")
    
    # 🌟 FIX CTO PRIORITY 1: Definisi Foreign Key Eksplisit Biar Ga Ketuker!
    driver = relationship("HRDriver", foreign_keys=[driver_id], back_populates="route_plans")
    helper = relationship("HRDriver", foreign_keys=[helper_id])
    
    route_lines = relationship("TMSRouteLine", back_populates="route_plan")

    # Garis rute jalan asli dari OSRM — disimpan sebagai JSON string [[lon,lat],...]
    # Diisi saat confirm_routes, dibaca saat GET /api/routes
    # Menggantikan route_geometries/*.json yang tidak pernah ditulis
    route_geometry = Column(Text, nullable=True)

    # Data odometer dari driver app (diisi saat trip start/end)
    km_awal_trip  = Column(Integer, nullable=True)
    km_akhir_trip = Column(Integer, nullable=True)

class TMSRouteLine(Base):
    __tablename__ = "tms_route_line"
    __table_args__ = {'extend_existing': True}
    
    line_id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), ForeignKey("tms_route_plan.route_id"))
    order_id = Column(String(50), ForeignKey("delivery_orders.order_id"))
    
    sequence = Column(Integer)
    est_arrival = Column(Time) # Estimasi dari VRP
    distance_from_prev_km = Column(Float, default=0.0)
    
    geofence_enter_time = Column(DateTime, nullable=True) 
    gps_ping_count = Column(Integer, default=0) 

    actual_arrival_time = Column(DateTime, nullable=True) 
    actual_service_minutes = Column(Float, nullable=True) 
    is_anomaly = Column(Boolean, default=False) 
    
    route_plan = relationship("TMSRoutePlan", back_populates="route_lines")
    order = relationship("DeliveryOrder", back_populates="route_line")
    epod = relationship("TMSEpodHistory", back_populates="route_line", uselist=False)

# ==========================================
# 6. E-POD HISTORY
# ==========================================
class TMSEpodHistory(Base):
    __tablename__ = "tms_epod_history"
    __table_args__ = {'extend_existing': True}
    
    pod_id = Column(Integer, primary_key=True, index=True)
    line_id = Column(Integer, ForeignKey("tms_route_line.line_id"))
    
    status = Column(Enum(DOStatus))
    timestamp = Column(DateTime, default=datetime.datetime.now)
    photo_url = Column(Text)
    
    gps_location_lat = Column(Numeric(10, 8))
    gps_location_lon = Column(Numeric(11, 8))
    
    qty_delivered = Column(Float, default=0.0)
    qty_return = Column(Float, default=0.0)    
    qty_damaged = Column(Float, default=0.0)   
    
    return_reason = Column(String(100), nullable=True)
    driver_notes = Column(Text, nullable=True)
    
    route_line = relationship("TMSRouteLine", back_populates="epod")

# ==========================================
# 7. SYSTEM SETTINGS
# ==========================================
class SystemSettings(Base):
    __tablename__ = "system_settings"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, default=1)
    
    vrp_start_time = Column(String(5), default="06:00")
    vrp_end_time = Column(String(5), default="20:00")
    vrp_base_drop_time_mins = Column(Integer, default=15)
    vrp_var_drop_time_mins = Column(Integer, default=1)  
    vrp_capacity_buffer_percent = Column(Integer, default=90)
    
    cost_fuel_per_liter = Column(Float, default=12500.0)
    cost_avg_km_per_liter = Column(Float, default=5.0)
    cost_driver_salary = Column(Float, default=4500000.0)
    cost_overtime_rate = Column(Float, default=25000.0)
    depo_lat = Column(Float, default=-6.207356)
    depo_lon = Column(Float, default=106.479163)
    
    geofence_radius_meters = Column(Integer, default=200) # Batas jarak truk dianggap nyampe
    dwell_time_mins = Column(Integer, default=3) # Harus berhenti berapa menit biar ke-trigger?
    anomaly_tolerance_percent = Column(Float, default=200.0) # Kalau telat 200% dari rata-rata, reject!
    
    api_gps_webhook = Column(String(255), nullable=True)
    api_temp_sensor = Column(String(255), nullable=True)
    sync_interval_sec = Column(Integer, default=60)
    
    alert_max_temp_celsius = Column(Float, default=4.0)
    alert_delay_mins = Column(Integer, default=30)
    
    # Geofence jembatan timbang — untuk auto-lock jam pulang driver
    jembatan_timbang_lat      = Column(Float, nullable=True)
    jembatan_timbang_lon      = Column(Float, nullable=True)
    jembatan_timbang_radius_m = Column(Integer, default=100)

    # Harga BBM per liter — untuk kalkulasi rasio km/liter di BOP export
    harga_bbm_per_liter = Column(Float, default=12500.0, nullable=True)

    alert_channel_dashboard = Column(Boolean, default=True)
    alert_channel_email = Column(Boolean, default=True)
    alert_channel_whatsapp = Column(Boolean, default=False)

# ==========================================
# 8. FINANCE & OPERATIONAL EXPENSES
# ==========================================
class OperationalExpense(Base):
    __tablename__ = "operational_expenses"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String(50), primary_key=True) 
    time = Column(String(10))
    date = Column(Date)
    
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.vehicle_id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("hr_drivers.driver_id"), nullable=True)
    
    is_oncall = Column(Boolean, default=False)
    
    bbm = Column(Float, default=0.0)
    tol = Column(Float, default=0.0)
    parkir = Column(Float, default=0.0)
    parkir_liar = Column(Float, default=0.0)
    kuli_angkut = Column(Float, default=0.0)
    lain_lain = Column(Float, default=0.0)
    
    helper_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    total = Column(Float, default=0.0)

    # Data perjalanan — auto-fill dari driver app, bisa diedit kasir
    km_awal       = Column(Integer, nullable=True)
    km_akhir      = Column(Integer, nullable=True)
    jam_berangkat = Column(String(10), nullable=True)   # "06:45"
    jam_pulang    = Column(String(10), nullable=True)   # "20:30"

    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    vehicle = relationship("FleetVehicle", backref="expenses")
    driver = relationship("HRDriver", backref="expenses")

# ==========================================
# 9. SYSTEM AUDIT LOG 
# ==========================================
class SystemAuditLog(Base):
    __tablename__ = "system_audit_logs"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.now)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), index=True) 
    entity_type = Column(String(100)) 
    entity_id = Column(String(100)) 
    
    old_values = Column(Text, nullable=True) 
    new_values = Column(Text, nullable=True) 
    
    ip_address = Column(String(50), nullable=True)
    
    user = relationship("User", backref="audit_trails")