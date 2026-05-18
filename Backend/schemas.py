from pydantic import BaseModel, Field
from datetime import time, date, datetime
from typing import Optional, List, Dict, Any
from models import UserRole

# ==========================================
# 🔐 AUTH & USER SCHEMAS
# ==========================================
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    

# ==========================================
# 📦 DELIVERY ORDER SCHEMAS
# ==========================================
class OrderCreate(BaseModel):
    order_id: str
    customer_name: str
    latitude: float
    longitude: float
    weight_total: float
    service_type: str = "regular"
    delivery_window_start: Optional[time] = None
    delivery_window_end: Optional[time] = None
    store_id: Optional[int] = None

class OrderResponse(OrderCreate):
    status: str
    driver_id: Optional[int] = None
    pod_image_url: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# 🚛 DRIVER APP SCHEMAS (VRP & Route)
# ==========================================
class RouteStopSchema(BaseModel):
    id: int
    sequence: int
    customerName: str
    address: str
    timeWindow: str
    weight: str
    status: str
    latitude: float
    longitude: float

class DriverTripResponse(BaseModel):
    truck_id: str
    driver_name: str
    total_stops: int
    completed_stops: int
    total_distance: float
    stops: List[RouteStopSchema]

class GenericResponse(BaseModel):
    status: str
    message: Optional[str] = None

class EpodResponse(GenericResponse):
    url: str

# ==========================================
# 📊 TAB 2: RETURN DASHBOARD SCHEMAS
# ==========================================
class ReturnSummary(BaseModel):
    qualityKg: float
    qualityRupiah: float
    qualityTrend: float
    skuKg: float
    skuRupiah: float
    skuTrend: float
    custKg: float
    custRupiah: float
    custTrend: float
    totalReturnKg: float

class ReturnDistribution(BaseModel):
    qualityPercent: float
    skuPercent: float
    custPercent: float

class FleetIncident(BaseModel):
    plate: str
    count: int
    weight: float
    trend: str
    percent: str

class AuditLog(BaseModel):
    date: str
    customer: str
    id: str
    product: str
    weight: str
    reason: str
    status: str
    color: str

class ReturnDashboardData(BaseModel):
    summary: ReturnSummary
    distribution: ReturnDistribution
    fleet_performance: List[FleetIncident]
    audit_logs: List[AuditLog]

class ReturnDashboardResponse(BaseModel):
    status: str = "success"
    data: ReturnDashboardData

# ==========================================
# 📈 TAB 3: EFFICIENCY DASHBOARD SCHEMAS
# ==========================================
class EfficiencyKPI(BaseModel):
    totalShipments: int
    avgLeadTime: str
    loadFactor: str
    costPerKg: str
    hiddenCost: str

class CostDistribution(BaseModel):
    label: str
    percent: float
    color: str
    stroke: str

class HiddenCost(BaseModel):
    label: str
    value: str
    color: str

class LeakagePoint(BaseModel):
    loc: str
    cost: str
    pct: str

class OpExcellence(BaseModel):
    route: str
    region: str
    otif: str
    lead: str
    factor: str
    status: str
    color: str

class EfficiencyDashboardData(BaseModel):
    kpi: EfficiencyKPI
    lfTrend: List[float]
    costDist: List[CostDistribution]
    hiddenCosts: List[HiddenCost]
    opExcellence: List[OpExcellence]
    leakagePoints: List[LeakagePoint]

class EfficiencyDashboardResponse(BaseModel):
    status: str = "success"
    data: EfficiencyDashboardData

# ==========================================
# 🌍 LIVE TRACKING SCHEMAS
# ==========================================
class LiveTrackingData(BaseModel):
    id: str
    driver: str
    lat: float
    lon: float
    status: str
    isDelayed: bool
    delayMinutes: int
    routeId: str

class LiveTrackingResponse(BaseModel):
    status: str = "success"
    data: List[LiveTrackingData]

# ==========================================
# 🚨 DASHBOARD ALERTS SCHEMAS
# ==========================================
class AlertData(BaseModel):
    title: str
    desc: str
    time: str
    icon: str
    iconColor: str
    bgColor: str

class AlertResponse(BaseModel):
    status: str = "success"
    data: List[AlertData]

# ==========================================
# 🏢 MASTER CUSTOMERS SCHEMAS
# ==========================================
class CustomerData(BaseModel):
    storeId: int
    kodeCustomer: str
    storeName: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    adminName: Optional[str] = None
    status: str

class CustomerListResponse(BaseModel):
    status: str = "success"
    total: int
    skip: int
    limit: int
    data: List[CustomerData]

class CustomerDetailResponse(BaseModel):
    status: str = "success"
    data: CustomerData

class CustomerCreateResponse(BaseModel):
    message: str
    storeId: int
    kodeCustomer: str

class CustomerActionResponse(BaseModel):
    message: str
    storeId: Optional[int] = None
    note: Optional[str] = None

class BatchImportResponse(BaseModel):
    message: str
    imported: int
    updated: int
    errors: List[str]

# ==========================================
# 🚚 FLEET MANAGEMENT SCHEMAS
# ==========================================
class BoxDimensions(BaseModel):
    length: int
    width: int
    height: int

class FuelHistoryLog(BaseModel):
    date: str
    km: int
    liters: float
    cost: str
    station: str

class FleetVehicleData(BaseModel):
    id: str
    plateNumber: str
    model: str
    capacity: float
    currentLoad: float
    loadPercent: float
    status: str
    isInternal: bool
    kmAwalHariIni: int
    kmAkhirHariIni: Optional[int]
    boxDimensions: BoxDimensions
    lastFuelDate: str
    lastFuelCost: str
    fuelEfficiency: float
    history: List[FuelHistoryLog]

class FleetListResponse(BaseModel):
    status: str = "success"
    data: List[FleetVehicleData]

class FleetActionResponse(BaseModel):
    message: str
    vehicle_id: Optional[int] = None
    log_id: Optional[int] = None
    efficiency: Optional[float] = None

class FleetSummaryResponse(BaseModel):
    status: str = "success"
    totalFleet: int
    activeToday: int
    inMaintenance: int
    available: int

class TelematicsResponse(BaseModel):
    temperature: float
    isTempWarning: bool
    compressorStatus: str
    gpsSignal: str
    doorLocked: bool
    lastUpdate: str

# ==========================================
# 📦 ORDERS & DELIVERY SCHEMAS
# ==========================================
class OrderItem(BaseModel):
    nama_barang: str
    qty: str

class UploadSuccessItem(BaseModel):
    order_id: str
    kode_customer: str
    nama_toko: str
    berat: float
    kordinat: str
    jam_maks: str
    items: List[OrderItem]

class UploadFailedItem(BaseModel):
    kode_customer: str
    nama_toko: str
    berat: float
    items: List[OrderItem]
    jam_maks: str
    alasan: str

class UploadResponse(BaseModel):
    message: str
    success_list: List[UploadSuccessItem]
    failed_list: List[UploadFailedItem]

class OrderActionResponse(BaseModel):
    message: str
    order_id: str
    new_window_end: Optional[int] = None

class PendingOrderData(BaseModel):
    order_id: str
    customer_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    weight_total: float
    delivery_window_start: Optional[int]
    delivery_window_end: Optional[int]
    status: str
    items: List[Dict[str, Any]]

class PendingOrderResponse(BaseModel):
    status: str = "success"
    total: int
    data: List[PendingOrderData]

# ==========================================
# ⚙️ SYSTEM SETTINGS SCHEMAS
# ==========================================
class SystemSettingsUpdate(BaseModel):
    vrp_start_time: str
    vrp_end_time: str
    vrp_base_drop_time_mins: int
    vrp_var_drop_time_mins: int
    vrp_capacity_buffer_percent: int
    cost_fuel_per_liter: float
    cost_avg_km_per_liter: float
    cost_driver_salary: float
    cost_overtime_rate: float
    depo_lat: float
    depo_lon: float
    api_gps_webhook: Optional[str] = None
    api_temp_sensor: Optional[str] = None
    sync_interval_sec: int
    alert_max_temp_celsius: float
    alert_delay_mins: int
    alert_channel_dashboard: bool = True
    alert_channel_email: bool = True
    alert_channel_whatsapp: bool = False

class SettingsResponse(BaseModel):
    status: str = "success"
    data: SystemSettingsUpdate

class DepoData(BaseModel):
    depo_lat: float
    depo_lon: float
    depo_name: str

class DepoResponse(BaseModel):
    status: str = "success"
    data: DepoData

class VrpConfigData(BaseModel):
    start_minutes: int
    end_minutes: int
    base_drop_time: int
    var_drop_time: int
    capacity_buffer: float
    depo_lat: float
    depo_lon: float
    alert_delay_mins: int
    alert_max_temp: float

class VrpConfigResponse(BaseModel):
    status: str = "success"
    data: VrpConfigData

# ==========================================
# 🗺️ VRP & ROUTE PLANNING SCHEMAS
# ==========================================
class RouteDetail(BaseModel):
    urutan: int
    nama_toko: str
    latitude: float
    longitude: float
    berat_kg: float
    jam_tiba: str
    distance_from_prev_km: float
    items: List[Dict[str, Any]]

class RouteData(BaseModel):
    route_id: str
    tanggal: str
    driver_name: str
    kendaraan: str
    jenis: str
    destinasi_jumlah: int
    total_berat: float
    total_distance_km: float
    transport_cost: float
    status: str
    zone: str
    detail_rute: List[RouteDetail]
    garis_aspal: List[List[float]]

class DroppedNode(BaseModel):
    nama_toko: str
    berat_kg: float
    alasan: str
    lat: Optional[float] = None
    lon: Optional[float] = None

class OptimizeResponse(BaseModel):
    message: str
    total_trucks: int
    total_orders: int
    dropped_count: int
    jadwal_truk_internal: List[Dict[str, Any]]
    dropped_nodes_peta: List[DroppedNode]

class GetRoutesResponse(BaseModel):
    routes: List[RouteData]
    dropped_nodes: List[DroppedNode]

class ConfirmRouteResponse(BaseModel):
    message: str
    status: str = "success"

class LoadPlanResponse(BaseModel):
    status: str = "success"
    data: List[Dict[str, Any]]

# 🌟 FIX CTO (SPRINT 3 & 4): SCHEMA ZONING DAN TRAFFIC VALIDATOR
class SpatialZoneStore(BaseModel):
    nama_toko: str
    lat: float
    lon: float
    berat: float

class SpatialZone(BaseModel):
    zone_id: int
    stores: List[SpatialZoneStore]
    bounding_polygon: List[List[float]]

class SpatialPreviewResponse(BaseModel):
    status: str = "success"
    message: str
    data: List[SpatialZone]

class TrafficWarning(BaseModel):
    stop_order: int
    store_name: str
    planned_eta: str
    real_eta_traffic: str
    delay_minutes: int
    severity: str # "HIGH" or "LOW"
    truck_id: str
    armada: str

class TrafficValidationResponse(BaseModel):
    status: str
    total_warnings: int
    critical_count: int
    warnings: List[TrafficWarning]


# ==========================================
# 🔐 AUTHENTICATION SCHEMAS
# ==========================================
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    user_id: int
    refresh_token: Optional[str] = None

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str

class RegisterResponse(BaseModel):
    message: str
    user_id: int

class UserProfileResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    role: str

class UserListResponse(BaseModel):
    status: str = "success"
    count: int
    data: List[UserProfileResponse]

# ==========================================
# 💸 FINANCE & OPERATIONAL EXPENSES SCHEMAS
# ==========================================
class ExpenseCreate(BaseModel):
    id: Optional[str] = None
    time: str
    date: str
    
    # 🌟 FIX CTO: Frontend sekarang harus ngirim ID, bukan ngetik string manual!
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    
    isOncall: bool
    bbm: float
    tol: float
    parkir: float
    parkirLiar: float
    kuliAngkut: float
    lainLain: float
    helperName: Optional[str] = ""
    notes: Optional[str] = ""
    total: float

# 🌟 FIX CTO: Kita bikin skema khusus buat nampilin data di tabel Frontend
class ExpenseResponse(BaseModel):
    id: str
    time: str
    date: str
    
    # Ini yang dibalikin ke frontend hasil dari "nyebrang" relasi database
    plate: str
    vehicleType: str
    driver: str
    
    isOncall: bool
    bbm: float
    tol: float
    parkir: float
    parkirLiar: float
    kuliAngkut: float
    lainLain: float
    helperName: Optional[str] = None
    notes: Optional[str] = None
    total: float

    class Config:
        from_attributes = True
        populate_by_name = True

class ExpenseListResponse(BaseModel):
    status: str = "success"
    data: List[ExpenseResponse]

# ==========================================
# 👤 USER PREFERENCES SCHEMAS (BUAT POD SETTINGS)
# ==========================================
class UserPreferences(BaseModel):
    autoAdvance: bool
    soundAlert: bool
    dataDensity: str

class UserPreferencesResponse(BaseModel):
    status: str = "success"
    data: UserPreferences

# ==========================================
# 📝 POD (PROOF OF DELIVERY) VERIFICATION SCHEMAS
# ==========================================
class PodApproveRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Catatan tambahan dari Admin (Opsional)")

class PodRejectRequest(BaseModel):
    reason: str = Field(..., description="Alasan penolakan POD wajib diisi (contoh: Foto buram, TTD tidak jelas)")
    notes: Optional[str] = Field(None, description="Catatan tambahan (Opsional)")

class PodVerificationResponse(BaseModel):
    status: str = "success"
    message: str
    order_id: str
    new_status: str