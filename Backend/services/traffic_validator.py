# services/traffic_validator.py
import logging
from dependencies import get_settings
from utils.helpers import time_str_to_minutes

logger = logging.getLogger(__name__)

def validate_route_traffic(route: dict, date_str: str) -> dict:
    """
    Validasi rute kendaraan berdasarkan ETA Hybrid yang sudah dihitung VRP.
    Sekarang NGGA PERLU nembak TomTom lagi (Hemat Kuota!).
    Tugasnya cuma ngecek: "Ada toko yang nyampenya kemaleman/tutup ga?"
    """
    warnings = []
    
    # Ambil semua titik yang bukan Gudang
    stops = [s for s in route["detail_perjalanan"]
             if s.get("keterangan", "") not in ["Start", "Finish"]]
             
    for stop in stops:
        jam_tiba_str = stop.get("jam_tiba", "00:00")
        arrival_minutes = time_str_to_minutes(jam_tiba_str)
        
        # 🌟 LOGICA SATPAM: Asumsi batas aman jam operasional toko adalah 19:00 (1140 menit)
        # Nanti bisa disesuaikan kalau di database lu ada jam tutup toko masing-masing
        tw_end = stop.get("tw_end", 1140) 
        
        # Cek apakah kedatangan asli melebihi jam tutup toko / batas aman
        if arrival_minutes > tw_end:
            delay = arrival_minutes - tw_end
            warnings.append({
                "stop_order": stop.get("urutan"),
                "store_name": stop.get("nama_toko"),
                "planned_eta": jam_tiba_str,
                "real_eta_traffic": jam_tiba_str, # Sudah akurat karena dari Hybrid Engine
                "delay_minutes": delay,
                # Kalau telat lebih dari 1 jam (60 menit), kita kasih flag HIGH biar admin notice
                "severity": "HIGH" if delay > 60 else "LOW",
                "truck_id": route.get("route_id"),
                "armada": route.get("armada")
            })
    
    return {
        "warnings": warnings,
        "has_critical": any(w["severity"] == "HIGH" for w in warnings),
        "route_id": route.get("route_id"),
    }