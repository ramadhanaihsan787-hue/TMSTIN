# Backend/services/osrm_service.py
import requests
import logging
import datetime
from services.eta_service import calculate_haversine
from core.config import env_settings

logger = logging.getLogger(__name__)

OSRM_BASE_URL = env_settings.OSRM_BASE_URL

# ─────────────────────────────────────────────────────────────────────────────
# TRAFFIC TIME-OF-DAY LOOKUP TABLE — Jabodetabek Frozen Food Distribution
#
# Sumber: pattern rush hour Jabodetabek + karakteristik rute distribusi JAPFA
# Truk berangkat jam 07:00, pulang paling malam jam 20:00.
#
#   06:00 — mulai macet keluar kota/industri
#   07:00-08:00 — rush hour pagi (paling parah, banyak kendaraan pribadi)
#   09:00 — mulai longgar tapi masih padat area pusat
#   10:00-14:00 — relatif normal (window optimal pengiriman)
#   15:00-16:00 — mulai membangun sore
#   17:00-18:00 — rush hour sore (sangat parah, semua orang pulang)
#   19:00+ — mulai longgar
# ─────────────────────────────────────────────────────────────────────────────
TRAFFIC_BY_HOUR: dict = {
    5:  1.15,   # 05:00 — sangat sepi
    6:  1.30,   # 06:00 — mulai padat
    7:  1.55,   # 07:00 — rush hour pagi PUNCAK
    8:  1.50,   # 08:00 — masih sangat padat
    9:  1.35,   # 09:00 — mereda, tapi pusat masih macet
    10: 1.20,   # 10:00 — normal
    11: 1.20,   # 11:00 — normal
    12: 1.25,   # 12:00 — jam makan siang
    13: 1.25,   # 13:00 — jam makan siang kembali
    14: 1.20,   # 14:00 — normal
    15: 1.25,   # 15:00 — mulai membangun
    16: 1.45,   # 16:00 — rush hour sore membangun cepat
    17: 1.60,   # 17:00 — rush hour sore PUNCAK
    18: 1.55,   # 18:00 — masih sangat padat
    19: 1.35,   # 19:00 — mulai mereda
    20: 1.20,   # 20:00 — normal malam
    21: 1.10,   # 21:00 — sepi
    22: 1.05,   # 22:00 — sangat sepi
}

# Fallback kalau jam tidak ada di tabel
_DEFAULT_FACTOR = 1.20


def get_traffic_factor(hour: int) -> float:
    """Ambil traffic multiplier berdasarkan jam (0-23)."""
    return TRAFFIC_BY_HOUR.get(hour, _DEFAULT_FACTOR)


def get_delivery_window_factor(start_hour: int = 7, end_hour: int = 19) -> float:
    """
    Hitung faktor traffic rata-rata tertimbang sepanjang jendela pengiriman.

    Digunakan untuk membangun time_matrix yang representatif untuk solver.
    Dengan window 07:00-19:00 (JAPFA default), rata-ratanya sekitar 1.35x.
    """
    if start_hour >= end_hour:
        return _DEFAULT_FACTOR
    hours = range(start_hour, end_hour + 1)
    factors = [TRAFFIC_BY_HOUR.get(h, _DEFAULT_FACTOR) for h in hours]
    return round(sum(factors) / len(factors), 3)


def build_osrm_matrix(locations: list, departure_hour: int | None = None):
    """
    Bangun distance + time matrix via OSRM Table API.

    Args:
        locations: list of {'lat': float, 'lon': float}
        departure_hour: jam keberangkatan truk (default: jam server sekarang,
                        di-fallback ke 7 kalau tidak diketahui).
                        Digunakan untuk pilih traffic factor yang tepat.

    Returns:
        (distance_matrix, time_matrix) — satuan: meter dan menit.
    """
    # Tentukan traffic factor
    if departure_hour is None:
        departure_hour = datetime.datetime.now().hour
    traffic_factor = get_traffic_factor(departure_hour)

    try:
        logger.info(
            f"🗺️ OSRM Matrix: {len(locations)} titik | "
            f"jam={departure_hour:02d}:00 | traffic={traffic_factor}x"
        )
        coords = ";".join([f"{loc['lon']},{loc['lat']}" for loc in locations])
        url = f"{OSRM_BASE_URL}/table/v1/driving/{coords}?annotations=duration,distance"

        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            raise Exception(f"OSRM Error: {data.get('code')}")

        n = len(locations)
        distance_matrix = [[0] * n for _ in range(n)]
        time_matrix     = [[0] * n for _ in range(n)]

        for i in range(n):
            for j in range(n):
                distance_matrix[i][j] = int(data["distances"][i][j])
                # Durasi OSRM (detik) → menit, lalu dikali traffic factor
                time_matrix[i][j] = int((data["durations"][i][j] / 60.0) * traffic_factor)

        logger.info(f"✅ OSRM Matrix berhasil (traffic factor {traffic_factor}x)")
        return distance_matrix, time_matrix

    except Exception as e:
        logger.warning(f"⚠️ OSRM gagal: {e} → Switch ke Haversine fallback")
        return build_haversine_matrix(locations, departure_hour=departure_hour)


def build_haversine_matrix(locations: list, departure_hour: int | None = None):
    """
    Fallback matrix via Haversine (straight-line + detour factor).

    Digunakan kalau OSRM tidak tersedia.
    Akurasi lebih rendah tapi lebih baik dari crash.
    """
    if departure_hour is None:
        departure_hour = datetime.datetime.now().hour
    traffic_factor = get_traffic_factor(departure_hour)

    logger.info(
        f"🔄 Haversine Fallback: {len(locations)} titik | "
        f"traffic={traffic_factor}x | detour=1.5x"
    )
    n = len(locations)
    distance_matrix = [[0] * n for _ in range(n)]
    time_matrix     = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                dist_lurus = calculate_haversine(
                    locations[i]["lat"], locations[i]["lon"],
                    locations[j]["lat"], locations[j]["lon"]
                )
                # Faktor jalan nyata ~1.5x lurus
                real_dist = dist_lurus * 1.5
                distance_matrix[i][j] = int(real_dist)

                # Kecepatan rata-rata 30 km/h di kota, dalam satuan menit
                # real_dist dalam meter → / 1000 → km → / 30 → jam → × 60 → menit
                time_menit = (real_dist / 1000.0 / 30.0) * 60.0 * traffic_factor
                time_matrix[i][j] = int(time_menit)

    return distance_matrix, time_matrix


def get_road_geometry(route_indices: list, locations: list) -> list:
    """Ambil polyline jalan asli dari OSRM Route API (untuk visualisasi peta)."""
    try:
        coords = ";".join(
            [f"{locations[n]['lon']},{locations[n]['lat']}" for n in route_indices]
        )
        url = f"{OSRM_BASE_URL}/route/v1/driving/{coords}?overview=full&geometries=geojson"
        res = requests.get(url, timeout=15)
        if res.status_code == 200:
            data = res.json()
            if data.get("code") == "Ok":
                coordinates = data["routes"][0]["geometry"]["coordinates"]
                return [[p[1], p[0]] for p in coordinates]
    except Exception as e:
        logger.error(f"⚠️ Gagal ambil geometry OSRM: {e}")
    return []