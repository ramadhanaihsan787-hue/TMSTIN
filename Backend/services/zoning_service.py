# Backend/services/zoning_service.py
import logging
import random
import hashlib
from services.eta_service import calculate_haversine

logger = logging.getLogger(__name__)

# 🌟 7 TITIK JANTUNG JABODETABEK (RACIKAN KUSTOM JAPFA)
JABODETABEK_ANCHORS = [
    {'lat': -6.2855, 'lon': 107.1465, 'name': 'Bekasi / Cikarang'},        
    {'lat': -6.1599, 'lon': 106.9050, 'name': 'Kelapa Gading & Sekitarnya'},
    {'lat': -6.1887, 'lon': 106.7460, 'name': 'Kembangan / Jakarta Barat'}, 
    {'lat': -6.3016, 'lon': 106.6520, 'name': 'Serpong / BSD'},            
    {'lat': -6.2146, 'lon': 106.8229, 'name': 'Jakarta Pusat & Selatan'},   
    {'lat': -6.5971, 'lon': 106.8060, 'name': 'Bogor'},                    
    {'lat': -6.2253, 'lon': 106.5088, 'name': 'Tangerang Kota / Tigaraksa'} 
]

JAPFA_ZONES_PUZZLE = [
    # Zona 1 - Bekasi / Cikarang (East)
    {'id': 'Z1', 'name': 'Bekasi / Cikarang', 'anchors': [JABODETABEK_ANCHORS[0]], 'polygon': [[
        [106.98, -6.14], [107.08, -6.12], [107.18, -6.18], [107.22, -6.30], [107.20, -6.42], [107.12, -6.48], [106.98, -6.44],
        [106.95, -6.42], [106.92, -6.40],
        [106.90, -6.34], [106.88, -6.28], [106.90, -6.18],
        [106.94, -6.15], [106.98, -6.14]
    ]]},
    # Zona 2 - Kelapa Gading & Sekitarnya (North)
    {'id': 'Z2', 'name': 'Kelapa Gading & Sekitarnya', 'anchors': [JABODETABEK_ANCHORS[1]], 'polygon': [[
        [106.73, -6.08], [106.80, -6.06], [106.88, -6.07], [106.98, -6.14],
        [106.94, -6.15], [106.90, -6.18],
        [106.85, -6.19], [106.80, -6.20],
        [106.76, -6.15], [106.73, -6.08]
    ]]},
    # Zona 3 - Kembangan / Jakarta Barat (West Urban)
    {'id': 'Z3', 'name': 'Kembangan / Jakarta Barat', 'anchors': [JABODETABEK_ANCHORS[2]], 'polygon': [[
        [106.56, -6.09], [106.65, -6.08], [106.73, -6.08],
        [106.76, -6.15], [106.80, -6.20],
        [106.76, -6.28],
        [106.70, -6.26], [106.64, -6.20],
        [106.60, -6.15], [106.56, -6.09]
    ]]},
    # Zona 4 - Serpong / BSD (West Suburban)
    {'id': 'Z4', 'name': 'Serpong / BSD', 'anchors': [JABODETABEK_ANCHORS[3]], 'polygon': [[
        [106.62, -6.50], [106.54, -6.43], [106.60, -6.42],
        [106.66, -6.34], [106.64, -6.20],
        [106.70, -6.26], [106.76, -6.28],
        [106.78, -6.36], [106.76, -6.42],
        [106.72, -6.42], [106.68, -6.48], [106.62, -6.50]
    ]]},
    # Zona 5 - Jakarta Pusat & Selatan (Central)
    {'id': 'Z5', 'name': 'Jakarta Pusat & Selatan', 'anchors': [JABODETABEK_ANCHORS[4]], 'polygon': [[
        [106.76, -6.28], [106.80, -6.20],
        [106.85, -6.19], [106.90, -6.18],
        [106.88, -6.28], [106.90, -6.34], [106.92, -6.40],
        [106.84, -6.43], [106.76, -6.42],
        [106.78, -6.36], [106.76, -6.28]
    ]]},
    # Zona 6 - Bogor (South)
    {'id': 'Z6', 'name': 'Bogor', 'anchors': [JABODETABEK_ANCHORS[5]], 'polygon': [[
        [106.98, -6.44], [106.94, -6.58], [106.90, -6.67], [106.80, -6.72], [106.70, -6.68], [106.66, -6.58], [106.62, -6.50],
        [106.68, -6.48], [106.72, -6.42], [106.76, -6.42],
        [106.84, -6.43], [106.92, -6.40],
        [106.95, -6.42], [106.98, -6.44]
    ]]},
    # Zona 7 - Tangerang Kota / Tigaraksa (West)
    {'id': 'Z7', 'name': 'Tangerang Kota / Tigaraksa', 'anchors': [JABODETABEK_ANCHORS[6]], 'polygon': [[
        [106.60, -6.42], [106.50, -6.42], [106.42, -6.34], [106.40, -6.22], [106.42, -6.14], [106.46, -6.10], [106.56, -6.09],
        [106.60, -6.15], [106.64, -6.20],
        [106.66, -6.34], [106.60, -6.42]
    ]]}
]

def _generate_seed_from_locations(locations):
    sample_str = "".join([f"{loc['lat']}{loc['lon']}" for loc in locations[:5]])
    hash_obj = hashlib.md5(sample_str.encode('utf-8'))
    return int(hash_obj.hexdigest()[:8], 16)

def point_in_polygon(lon, lat, polygon):
    n = len(polygon)
    inside = False
    if n == 0: return False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def _cluster_by_polygon(locations: list, num_zones: int) -> list:
    active_puzzle = JAPFA_ZONES_PUZZLE[:num_zones]
    clusters = [[] for _ in range(num_zones)]
    
    for loc in locations:
        lon, lat = loc['lon'], loc['lat']
        assigned = False
        for i, puzzle in enumerate(active_puzzle):
            poly = puzzle['polygon'][0]
            if point_in_polygon(lon, lat, poly):
                clusters[i].append(loc)
                assigned = True
                break
                
        if not assigned:
            distances = [calculate_haversine(lat, lon, p['anchors'][0]['lat'], p['anchors'][0]['lon']) for p in active_puzzle]
            if distances:
                closest_idx = distances.index(min(distances))
                clusters[closest_idx].append(loc)
            
    return clusters

def generate_spatial_zones(locations: list, num_zones: int) -> list:
    logger.info(f"🗺️ Memetakan {len(locations)} toko ke {num_zones} zona (Strict Point-in-Polygon)...")
    store_locations = [loc for loc in locations if "GUDANG" not in str(loc.get('nama_toko', '')).upper()]
    
    clusters = _cluster_by_polygon(store_locations, num_zones)
    zones = []
    active_puzzle = JAPFA_ZONES_PUZZLE[:num_zones]
    
    for i, puzzle in enumerate(active_puzzle):
        corresponding_cluster = clusters[i] if i < len(clusters) else []
        zones.append({
            "zone_id": puzzle['id'],
            "name": puzzle['name'],
            "stores": corresponding_cluster, 
            "bounding_polygon": puzzle['polygon'] 
        })
    return zones

def cluster_stores_for_routing(locations: list, num_zones: int) -> list:
    logger.info(f"🗺️ Tahap 1: Membagi {len(locations)} toko ke dalam {num_zones} Cluster Awal (Strict Polygon)...")
    store_locations = [loc for loc in locations if "GUDANG" not in str(loc.get('nama_toko', '')).upper()]
    
    if len(store_locations) <= num_zones:
        return [[store] for store in store_locations]
        
    return _cluster_by_polygon(store_locations, num_zones)