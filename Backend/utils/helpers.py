"""
Helpers module - General utility helper functions
"""
import math
from datetime import time as datetime_time, datetime
from core.constants import EARTH_RADIUS_METERS, MALL_KEYWORDS
import json
from models import SystemAuditLog

# 🌟 FIX: Import logging
import logging

# 🌟 FIX: Inisialisasi logger
logger = logging.getLogger(__name__)


def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2*math.atan2(math.sqrt(a), math.sqrt(1-a))

    return EARTH_RADIUS_METERS * c


def menit_ke_jam(menit_total: int) -> datetime_time:
    return datetime_time(
        hour=int((menit_total // 60) % 24),
        minute=int(menit_total % 60)
    )


def jam_ke_menit(time_obj: datetime_time) -> int:
    return time_obj.hour * 60 + time_obj.minute


def tambah_koma(teks: str) -> str:
    teks = str(teks).strip()

    if teks and teks.lower() != 'nan':
        return ', ' + teks

    return ''


def classify_store(store_name: str) -> bool:
    if not store_name:
        return False

    store_upper = str(store_name).upper()
    return any(kw in store_upper for kw in MALL_KEYWORDS)


# ==========================================================
# 🌟 FIX CTO: SUPER ROBUST TIME PARSER
# Support:
# - "08:30"
# - "08:30:00"
# - datetime.time
# - datetime.datetime
# ==========================================================
def time_str_to_minutes(time_input) -> int:
    """
    Convert many time formats safely to minutes from midnight.
    """

    try:
        if time_input is None:
            return 0

        # datetime.time
        if hasattr(time_input, 'hour') and hasattr(time_input, 'minute'):
            return int(time_input.hour) * 60 + int(time_input.minute)

        time_str = str(time_input).strip()

        if not time_str:
            return 0

        # ISO datetime
        if "T" in time_str:
            dt = datetime.fromisoformat(time_str)
            return dt.hour * 60 + dt.minute

        parts = time_str.split(":")

        # HH:MM
        if len(parts) >= 2:
            h = int(parts[0])
            m = int(parts[1])
            return h * 60 + m

        return 0

    except Exception as e:
        # 🌟 FIX: Ganti print jadi logger.warning
        logger.warning(f"⚠️ Gagal parsing waktu: {time_input} | {e}")
        return 0


def minutes_to_time_str(minutes: int) -> str:
    h = int((minutes // 60) % 24)
    m = int(minutes % 60)

    return f"{h:02d}:{m:02d}"


def log_audit_action(
    db,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data=None,
    new_data=None,
    ip_address=None
):
    new_log = SystemAuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_values=json.dumps(old_data) if old_data else None,
        new_values=json.dumps(new_data) if new_data else None,
        ip_address=ip_address
    )

    db.add(new_log)
    db.commit()


def consolidate_orders(pending_orders: list) -> dict:
    grouped_orders = {}

    for order in pending_orders:
        lat = float(order.latitude)
        lon = float(order.longitude)

        key = f"{lat:.5f}_{lon:.5f}"

        if key not in grouped_orders:
            grouped_orders[key] = []

        grouped_orders[key].append(order)

    return grouped_orders