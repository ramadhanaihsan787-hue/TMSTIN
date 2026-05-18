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
    # Zona 1
    {'id': 'Z1', 'name': 'Bekasi / Cikarang', 'anchors': [JABODETABEK_ANCHORS[0]], 'polygon': [[[106.90, -6.15], [107.02, -6.13], [107.15, -6.17], [107.22, -6.26], [107.22, -6.42], [107.12, -6.48], [106.98, -6.44], [106.90, -6.32], [106.88, -6.22], [106.90, -6.15]]]},
    # Zona 2
    {'id': 'Z2', 'name': 'Kelapa Gading & Sekitarnya', 'anchors': [JABODETABEK_ANCHORS[1]], 'polygon': [[[106.730, -6.080], [106.850, -6.060], [106.950, -6.080], [107.000, -6.120], [106.980, -6.150], [106.900, -6.145], [106.870, -6.220], [106.760, -6.200], [106.730, -6.080]]]},
    # Zona 3
    {'id': 'Z3', 'name': 'Kembangan / Jakarta Barat', 'anchors': [JABODETABEK_ANCHORS[2]], 'polygon': [[[106.560, -6.090], [106.730, -6.080], [106.760, -6.200], [106.870, -6.220], [106.820, -6.290], [106.760, -6.320], [106.650, -6.320], [106.580, -6.260], [106.550, -6.170], [106.560, -6.090]]]},
    # Zona 4
    {'id': 'Z4', 'name': 'Serpong / BSD', 'anchors': [JABODETABEK_ANCHORS[3]], 'polygon': [[[106.580, -6.260], [106.650, -6.320], [106.760, -6.320], [106.830, -6.340], [106.850, -6.450], [106.760, -6.500], [106.620, -6.500], [106.540, -6.430], [106.520, -6.340], [106.580, -6.260]]]},
    # Zona 5
    {'id': 'Z5', 'name': 'Jakarta Pusat & Selatan', 'anchors': [JABODETABEK_ANCHORS[4]], 'polygon': [[[106.870, -6.220], [106.900, -6.300], [106.930, -6.420], [106.850, -6.450], [106.830, -6.340], [106.760, -6.320], [106.820, -6.290], [106.870, -6.220]]]},
    # Zona 6
    {'id': 'Z6', 'name': 'Bogor', 'anchors': [JABODETABEK_ANCHORS[5]], 'polygon': [[[106.72, -6.42], [106.84, -6.43], [106.92, -6.48], [106.94, -6.58], [106.90, -6.67], [106.80, -6.72], [106.70, -6.68], [106.66, -6.58], [106.68, -6.48], [106.72, -6.42]]]},
    # Zona 7
    {'id': 'Z7', 'name': 'Tangerang Kota / Tigaraksa', 'anchors': [JABODETABEK_ANCHORS[6]], 'polygon': [[[106.46, -6.10], [106.58, -6.10], [106.64, -6.20], [106.66, -6.34], [106.60, -6.42], [106.50, -6.42], [106.42, -6.34], [106.40, -6.22], [106.42, -6.14], [106.46, -6.10]]]}
]

def _generate_seed_from_locations(locations):
    sample_str = "".join([f"{loc['lat']}{loc['lon']}" for loc in locations[:5]])
    hash_obj = hashlib.md5(sample_str.encode('utf-8'))
    return int(hash_obj.hexdigest()[:8], 16)

def _kmeans_clustering(locations, k, max_iters=20):
    if len(locations) <= k:
        return [[loc] for loc in locations]

    centroids = []
    if k <= len(JABODETABEK_ANCHORS):
        centroids = [{'lat': a['lat'], 'lon': a['lon']} for a in JABODETABEK_ANCHORS[:k]]
    else:
        seed_val = _generate_seed_from_locations(locations)
        random.seed(seed_val)
        centroids = random.sample(locations, k)
    
    clusters = []

    for iteration in range(max_iters):
        clusters = [[] for _ in range(k)]
        for loc in locations:
            distances = [calculate_haversine(loc['lat'], loc['lon'], c['lat'], c['lon']) for c in centroids]
            closest_idx = distances.index(min(distances))
            clusters[closest_idx].append(loc)
            
        new_centroids = []
        for i, cluster in enumerate(clusters):
            if not cluster:
                new_centroids.append(centroids[i])
            else:
                avg_lat = sum(c['lat'] for c in cluster) / len(cluster)
                avg_lon = sum(c['lon'] for c in cluster) / len(cluster)
                new_centroids.append({'lat': avg_lat, 'lon': avg_lon})
                
        centroids = new_centroids

    return clusters

def generate_spatial_zones(locations: list, num_zones: int) -> list:
    logger.info(f"🗺️ Memetakan {len(locations)} toko ke {num_zones} zona (Anchored K-Means)...")
    store_locations = [loc for loc in locations if "GUDANG" not in str(loc.get('nama_toko', '')).upper()]
    
    clusters = _kmeans_clustering(store_locations, num_zones)
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
    logger.info(f"🗺️ Tahap 1: Membagi {len(locations)} toko ke dalam {num_zones} Cluster Awal (Anchored)...")
    store_locations = [loc for loc in locations if "GUDANG" not in str(loc.get('nama_toko', '')).upper()]
    
    if len(store_locations) <= num_zones:
        return [[store] for store in store_locations]
        
    return _kmeans_clustering(store_locations, num_zones)