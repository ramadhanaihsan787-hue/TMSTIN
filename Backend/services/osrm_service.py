# Backend/services/osrm_service.py
import requests
import logging
from services.eta_service import calculate_haversine

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "http://210.79.191.145:5000"

# 🌟 FIX CTO: Rata-rata lalu lintas harian (Neutral Matrix)
AVERAGE_TRAFFIC_FACTOR = 1.20 

def build_osrm_matrix(locations: list):
    try:
        logger.info(f"🗺️ Menembak OSRM Matrix API untuk {len(locations)} titik...")
        coords = ";".join([f"{loc['lon']},{loc['lat']}" for loc in locations])
        url = f"{OSRM_BASE_URL}/table/v1/driving/{coords}?annotations=duration,distance"
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != "Ok":
            raise Exception(f"OSRM Error: {data.get('code')}")
            
        n = len(locations)
        distance_matrix = [[0] * n for _ in range(n)]
        time_matrix = [[0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                distance_matrix[i][j] = int(data["distances"][i][j])
                # 🌟 AI Sekarang mikir pake angka rata-rata yang adil!
                time_matrix[i][j] = int((data["durations"][i][j] / 60) * AVERAGE_TRAFFIC_FACTOR)
                
        logger.info(f"✅ OSRM Matrix berhasil (Neutral Factor {AVERAGE_TRAFFIC_FACTOR}x)!")
        return distance_matrix, time_matrix

    except Exception as e:
        logger.warning(f"⚠️ OSRM gagal: {e} → Switch ke Haversine fallback")
        return build_haversine_matrix(locations)

def build_haversine_matrix(locations: list):
    logger.info("🔄 Pakai Haversine Fallback (Dengan Detour & Traffic Simulation)...")
    n = len(locations)
    distance_matrix, time_matrix = [[0] * n for _ in range(n)], [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                dist_lurus = calculate_haversine(locations[i]["lat"], locations[i]["lon"], locations[j]["lat"], locations[j]["lon"])
                real_dist = dist_lurus * 1.5 
                distance_matrix[i][j] = int(real_dist)
                
                time_menit = (real_dist / 300.0) * AVERAGE_TRAFFIC_FACTOR 
                time_matrix[i][j] = int(time_menit)
                
    return distance_matrix, time_matrix

def get_road_geometry(route_indices: list, locations: list) -> list:
    try:
        coords = ";".join([f"{locations[n]['lon']},{locations[n]['lat']}" for n in route_indices])
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