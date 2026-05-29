"""
Constants module - Immutable application constants
"""

# ==========================================
# VALID ROLES
# ==========================================
VALID_ROLES = [
    "manager_logistik",
    "admin_distribusi",
    "admin_pod",
    "driver",
    "kasir",        
]

# ==========================================
# ORDER STATUSES
# ==========================================
ORDER_STATUSES = [
    "SO_WAITING_VERIFICATION",
    "DO_VERIFIED",
    "DO_ASSIGNED_TO_ROUTE",
    "DELIVERED_SUCCESS",
    "DELIVERED_PARTIAL",
    "BILLED",
]

# ==========================================
# VEHICLE STATUSES
# ==========================================
VEHICLE_STATUSES = [
    "Available",
    "InUse",
    "Maintenance",
    "Inactive",
]

# ==========================================
# TIME WINDOWS (in minutes from 00:00)
# ==========================================
DEFAULT_DELIVERY_WINDOW_START = 6 * 60  
DEFAULT_DELIVERY_WINDOW_END = 20 * 60   

# ==========================================
# STORE CLASSIFICATION KEYWORDS
# ==========================================
MALL_KEYWORDS = [
    # Mall & pusat perbelanjaan
    'MALL',
    'PLAZA',
    'SQUARE',
    'FOOD HALL',
    'ITC',
    'SUPERMARKET',
    'HYPERMART',
    'AEON',
    'HERO',
    'TRANSMART',
    'LOTTE',
    'GIANT',
    'SUPERINDO',
    'CARREFOUR',
    'ALFAMART',
    'INDOMARET',
    'ALFAMIDI',
    'CIRCLE K',
    'LAWSON',
]

# ==========================================
# DISTANCE & TIME CONSTANTS
# ==========================================
EARTH_RADIUS_METERS = 6371000
DEFAULT_DELIVERY_TIME_MINUTES = 10  # Expected time per delivery
ROUTING_TIMEOUT_SECONDS = 30

# ==========================================
# FILE UPLOAD LIMITS
# ==========================================
MAX_FILE_SIZE_MB = 50
ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv', '.json'}