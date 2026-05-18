# Backend/services/eta_service.py
import requests
import math
import logging
import datetime

logger = logging.getLogger(__name__)

TOMTOM_API_KEY = "TARUH_API_KEY_TOMTOM_LU_DISINI"

# 🌟 FIX CTO 1: GLOBAL MEMORY CACHE (Hemat Kuota & Cepat!)
ETA_CACHE = {}

# 🌟 FIX CTO 2: HTTP CONNECTION POOLING (Anti Lelet!)
http_session = requests.Session()

# 🌟 KAMUS KEMACETAN JABODETABEK
TRAFFIC_MULTIPLIERS = {    
    (0, 5):   1.0,   
    (5, 7):   1.15,  
    (7, 9):   1.55,
    (9, 11):  1.25,  
    (11, 14): 1.15,  
    (14, 16): 1.25,  
    (16, 19): 1.60,  
    (19, 24): 1.10,  
}

def get_traffic_multiplier(departure_hour: int) -> float:
    for (start, end), mult in TRAFFIC_MULTIPLIERS.items():
        if start <= departure_hour < end:
            return mult
    return 1.2  

def calculate_haversine(lat1, lon1, lat2, lon2) -> int:
    R = 6371.0 
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2.0)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(R * c * 1000)

def get_dynamic_hybrid_eta(lat1: float, lon1: float, lat2: float, lon2: float, departure_time_minutes: int) -> int:
    dept_hour = int((departure_time_minutes // 60) % 24)
    
    # 🌟 CEK BRANKAS CACHE DULU SEBELUM KERJA KERAS!
    # Bikin kunci unik berdasarkan Koordinat (Pecahan 4 desimal = akurasi ~11 meter) & Jam Berangkat
    cache_key = (
        round(lat1, 4), round(lon1, 4), 
        round(lat2, 4), round(lon2, 4), 
        dept_hour
    )

    if cache_key in ETA_CACHE:
        return ETA_CACHE[cache_key]

    # --- Kalau ngga ada di cache, baru kita itung ---
    def fallback_calculator():
        dist_m = calculate_haversine(lat1, lon1, lat2, lon2) * 1.5 
        base_time_menit = dist_m / 300.0 
        multiplier = get_traffic_multiplier(dept_hour)
        return int(base_time_menit * multiplier)

    try:
        now = datetime.datetime.now()
        dept_min = int(departure_time_minutes % 60)
        
        dept_time = now.replace(hour=dept_hour, minute=dept_min, second=0, microsecond=0)
        iso_dept = dept_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        url = f"https://api.tomtom.com/routing/1/calculateRoute/{lat1},{lon1}:{lat2},{lon2}/json?key={TOMTOM_API_KEY}&departAt={iso_dept}&traffic=true"
        
        # 🌟 Pakai session.get(), BUKAN requests.get() biasa (Super Cepat!)
        res = http_session.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            travel_time_sec = data['routes'][0]['summary']['travelTimeInSeconds']
            mins = int(travel_time_sec / 60)
            
            # 🌟 SIMPAN HASILNYA KE BRANKAS CACHE!
            ETA_CACHE[cache_key] = mins
            return mins 
        else:
            logger.warning(f"⚠️ TomTom API Error ({res.status_code}). Switch ke Fallback!")
            return fallback_calculator()
            
    except Exception as e:
        logger.warning(f"⚠️ TomTom Timeout/Gagal: {e}. Switch ke Fallback Internal!")
        return fallback_calculator()