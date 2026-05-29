# services/tracking_service.py
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models

# ---------------------------------------------------------
# RUMUS MATEMATIKA SATELIT (HAVERSINE)
# ---------------------------------------------------------
def hitung_jarak_meter(lat1, lon1, lat2, lon2):
    if None in [lat1, lon1, lat2, lon2]:
        return 999999.0

    R = 6371000  
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# ---------------------------------------------------------
# MESIN PENERIMA GPS TRUK & TRIGGER ZAP!
# ---------------------------------------------------------
def process_gps_webhook(db: Session, vehicle_id: int, current_lat: float, current_lon: float, speed_kmh: float, ping_time: datetime):
    settings = db.query(models.SystemSettings).first()
    radius_batas = settings.geofence_radius_meters if settings else 200

    # ── VALIDASI KOORDINAT GPS ───────────────────────────────────────────────
    # Tolak koordinat 0,0 (GPS belum fix) dan di luar bounding box Indonesia
    _LAT_MIN, _LAT_MAX = -12.0,  7.0    # Indonesia
    _LON_MIN, _LON_MAX = 94.0,  142.0
    if (current_lat == 0.0 and current_lon == 0.0) or        not (_LAT_MIN <= current_lat <= _LAT_MAX) or        not (_LON_MIN <= current_lon <= _LON_MAX):
        logger.debug(
            f"⚠️ GPS invalid/di luar Indonesia: lat={current_lat}, lon={current_lon}. Ping diabaikan."
        )
        return {"status": "ignored", "msg": "Koordinat GPS tidak valid atau di luar area operasional"}
    # ─────────────────────────────────────────────────────────────────────────

    # 1. Cari Rute Truk Aktif
    active_route = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.vehicle_id == vehicle_id,
        models.TMSRoutePlan.planning_date == ping_time.date()
    ).first()

    if not active_route:
        return {"status": "ignored", "msg": "Truk tidak ada jadwal rute hari ini"}

    # 2. Cari Titik Pengantaran SELANJUTNYA
    next_stop = db.query(models.TMSRouteLine).join(models.DeliveryOrder).filter(
        models.TMSRouteLine.route_id == active_route.route_id,
        models.TMSRouteLine.sequence > 0,
        models.TMSRouteLine.actual_arrival_time == None, 
        models.DeliveryOrder.status == models.DOStatus.do_assigned_to_route
    ).order_by(models.TMSRouteLine.sequence.asc()).first()

    if not next_stop:
        return {"status": "ignored", "msg": "Semua titik sudah selesai"}

    customer = next_stop.order.customer
    
    # 🌟 CEK GPS DRIFT: Jarak dari Titik Asli Google Maps 
    # (Biar kalau AI salah belajar sebelumnya, ngga makin melenceng jauh)
    jarak_dari_pusat = hitung_jarak_meter(current_lat, current_lon, customer.latitude, customer.longitude)
    
    # Prioritaskan titik aktual AI
    target_lat = customer.actual_lat if customer.actual_lat else customer.latitude
    target_lng = customer.actual_lng if customer.actual_lng else customer.longitude

    jarak = hitung_jarak_meter(current_lat, current_lon, target_lat, target_lng)

    # 3. LOGIKA STATE MACHINE: GEOFENCE + 30s DWELL TIME
    if jarak <= radius_batas and speed_kmh <= 5.0:
        
        # Skenario A: Ini ping pertama di dalem radius
        if not next_stop.geofence_enter_time:
            next_stop.geofence_enter_time = ping_time
            next_stop.gps_ping_count = 1
            db.commit()
            return {"status": "standby", "msg": "Truk masuk geofence, mulai menghitung Dwell Time 30s..."}
            
        # Skenario B: Truk MASIH di dalem radius (Ping lanjutan)
        else:
            next_stop.gps_ping_count += 1
            waktu_tunggu = (ping_time - next_stop.geofence_enter_time).total_seconds()

            # 🌟 VALIDASI EMAS: Sudah 30 detik? DAN minimal ada 2 konfirmasi ping?
            if waktu_tunggu >= 30 and next_stop.gps_ping_count >= 2:
                
                # ZAP KOORDINAT! 
                # (Dengan pengaman: Jangan update kalau jaraknya nyimpang > 300m dari toko asli)
                if jarak_dari_pusat <= 300:
                    if customer.actual_lat and customer.actual_lng:
                        customer.actual_lat = (float(customer.actual_lat) * 0.7) + (current_lat * 0.3)
                        customer.actual_lng = (float(customer.actual_lng) * 0.7) + (current_lon * 0.3)
                    else:
                        customer.actual_lat = current_lat
                        customer.actual_lng = current_lon

                # KUNCI WAKTU TIBA
                next_stop.actual_arrival_time = ping_time
                next_stop.order.status = models.DOStatus.delivered_pod_uploaded
                
                db.commit()
                return {"status": "zapped", "msg": f"Validasi 30s sukses! Tiba di {customer.store_name}."}
            else:
                db.commit()
                return {"status": "waiting", "msg": f"Menunggu kepastian dwell time... ({int(waktu_tunggu)}s)"}

    # Skenario C: Truk jalan lagi sebelum 30 detik (Lampu merah / Macet)
    else:
        # Reset ingatan Dwell Time ke nol! AI batalin kedatangan!
        if next_stop.geofence_enter_time and not next_stop.actual_arrival_time:
            next_stop.geofence_enter_time = None
            next_stop.gps_ping_count = 0
            db.commit()
            return {"status": "moving", "msg": "False arrival terdeteksi! Truk bergerak lagi. Dwell time dibatalkan."}
            
    return {"status": "moving", "distance_meters": round(jarak, 2)}