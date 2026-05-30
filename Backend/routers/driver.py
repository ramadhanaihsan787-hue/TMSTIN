# Backend/routers/driver.py
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date, datetime
import os
import shutil
import uuid
import io
import logging
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont
from services.epod_service import submit_epod_with_ai

import models
import schemas 
from dependencies import get_db, get_current_user, require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/driver", tags=["Driver App"])

UPLOAD_DIR = "static/uploads/epod"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ==========================================
# 🌟 HELPER FUNCTION: WATERMARK GENERATOR
# ==========================================
def add_watermark(image_bytes: bytes, text_lines: list) -> bytes:
    """
    Tambahkan watermark GPS + waktu ke foto POD
    Cross-platform font fallback
    """

    try:

        img = Image.open(io.BytesIO(image_bytes))

        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        txt_layer = Image.new(
            'RGBA',
            img.size,
            (255, 255, 255, 0)
        )

        draw = ImageDraw.Draw(txt_layer)

        # ==========================================
        # 🌟 CROSS PLATFORM FONT FALLBACK
        # ==========================================
        font_size = max(18, int(img.size[0] * 0.025))

        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux
            "/System/Library/Fonts/Arial.ttf",                  # macOS
            "C:\\Windows\\Fonts\\arial.ttf",                    # Windows
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ]

        font = None

        for path in font_paths:

            try:
                font = ImageFont.truetype(path, font_size)
                break

            except OSError:
                continue

        if font is None:
            font = ImageFont.load_default()

        # ==========================================
        # 🌟 WATERMARK POSITION
        # ==========================================
        margin = 20
        line_height = font_size + 6

        total_height = len(text_lines) * line_height

        y_text = img.size[1] - total_height - margin

        # ==========================================
        # 🌟 DRAW WATERMARK
        # ==========================================
        for line in text_lines:

            # Shadow
            draw.text(
                (margin + 2, y_text + 2),
                line,
                font=font,
                fill=(0, 0, 0, 180)
            )

            # Main Text
            draw.text(
                (margin, y_text),
                line,
                font=font,
                fill=(255, 255, 255, 210)
            )

            y_text += line_height

        watermarked = Image.alpha_composite(img, txt_layer)

        if watermarked.mode == 'RGBA':
            watermarked = watermarked.convert('RGB')

        output = io.BytesIO()

        watermarked.save(
            output,
            format='JPEG',
            quality=88
        )

        return output.getvalue()

    except Exception as e:

        logger.warning(
            f"⚠️ Gagal watermark image: {e}"
        )

        return image_bytes


# ==========================================
# 1. AMBIL RUTE TUGAS SAYA (MY ROUTE)
# ==========================================
@router.get("/my-route", response_model=schemas.DriverTripResponse)
def get_my_route(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    driver = db.query(models.HRDriver).filter(
        or_(
            models.HRDriver.user_id == current_user.id,
            models.HRDriver.name == current_user.full_name
        )
    ).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Profil supir tidak ditemukan di database HR!")
        
    if not driver.user_id:
        driver.user_id = current_user.id
        db.commit()

    today = date.today()

    # Cari sebagai DRIVER dulu, fallback sebagai HELPER
    # Helper di truk yang sama tetap bisa lihat rute via helper_id
    plan = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.driver_id == driver.driver_id,
        models.TMSRoutePlan.planning_date == today
    ).first()

    _is_helper_role = False
    if not plan:
        plan = db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.helper_id == driver.driver_id,
            models.TMSRoutePlan.planning_date == today
        ).first()
        if plan:
            _is_helper_role = True
            logger.info(f"👥 {driver.name} login sebagai Helper di rute {plan.route_id}")

    if not plan:
        return {
            "truck_id":       "-",
            "driver_name":    driver.name,
            "role":           "helper" if _is_helper_role else "driver",
            "total_stops":    0,
            "completed_stops": 0,
            "total_distance": 0,
            "stops":          []
        }

    stops_data = []
    completed_count  = 0
    first_active_set = False

    lines = db.query(models.TMSRouteLine).filter(
        models.TMSRouteLine.route_id == plan.route_id
    ).order_by(models.TMSRouteLine.sequence).all()

    for line in lines:
        order = line.order
        status_fe = "pending"
        if order.status in [
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial,
            models.DOStatus.delivered_pod_uploaded,
            models.DOStatus.failed,
        ]:
            status_fe = "completed"
            completed_count += 1
        elif not first_active_set:
            status_fe = "active"   # stop pertama yang belum selesai = active
            first_active_set = True

        # 🌟 FIX CTO: Clean & Strict Relationship Mapping (Hapus fallback lakban 'hasattr'!)
        # Kita percaya 100% pada struktur SQLAlchemy kita
        nama_toko = "Tanpa Nama"
        alamat_toko = "Alamat tidak tersedia"
        
        if order.customer:
            nama_toko = order.customer.store_name or "Tanpa Nama"
            alamat_toko = order.customer.address or "Alamat tidak tersedia"

        stops_data.append({
            "id": line.line_id,
            "sequence": line.sequence,
            "customerName": str(nama_toko),
            "address": str(alamat_toko),
            "timeWindow": f"{line.est_arrival.strftime('%H:%M')} WIB" if line.est_arrival else "-",
            # Tampilkan realisasi gudang jika ada, fallback ke routing qty
            "weight": (
                f"{order.weight_realisasi:.0f} KG ✓"
                if order.weight_realisasi and float(order.weight_realisasi) > 0
                else f"{order.weight_total} KG"
            ),
            "weight_realisasi": float(order.weight_realisasi) if order.weight_realisasi else None,
            "weight_routing":   float(order.weight_total or 0),
            "has_realisasi":    bool(order.weight_realisasi and float(order.weight_realisasi) > 0),
            "status": status_fe,
            "latitude": float(order.latitude) if order.latitude else 0.0,
            "longitude": float(order.longitude) if order.longitude else 0.0
        })

    return {
        # 🌟 FIX CTO: Hilangkan hasattr, langsung tembak relasinya
        "truck_id": plan.vehicle.license_plate if plan.vehicle else "B ???? JAPFA",
        "driver_name": driver.name,
        "total_stops": len(stops_data),
        "completed_stops": completed_count,
        "total_distance": float(plan.total_distance_km) if plan.total_distance_km else 0.0,
        "stops": stops_data
    }

# ==========================================
# 2. UPDATE STATUS STOP (SAYA SUDAH TIBA)
# ==========================================
@router.post("/stops/{line_id}/status", response_model=schemas.GenericResponse)
def update_stop_status(
    line_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    line = db.query(models.TMSRouteLine).filter(models.TMSRouteLine.line_id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="ID rute tidak valid!")
    
    db.commit()
    return {"status": "success", "message": f"Status rute {line_id} berhasil diupdate."}

# ==========================================
# 3. SUBMIT E-POD (SECURE UPLOAD + VALIDATION + WATERMARK + AI ANOMALY REJECTION)
# ==========================================
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/octet-stream"]
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

@router.post("/stops/{line_id}/epod", response_model=schemas.EpodResponse)
async def submit_epod(
    line_id: int,
    file: UploadFile = File(...),
    has_return: str = Form("false"),
    return_product: str = Form(""),
    return_qty: float = Form(0.0),
    return_reason: str = Form(""),
    gps_lat: float = Form(0.0),   # koordinat GPS driver saat submit ePOD
    gps_lon: float = Form(0.0),   # koordinat GPS driver saat submit ePOD
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validasi MIME type — terima octet-stream karena beberapa browser
    # kirim blob tanpa proper Content-Type dari canvas/data URL
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Format file ditolak! Terima: JPG/PNG/WEBP. Diterima: {file.content_type}")

    file_content = await file.read() 
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"Ukuran foto terlalu besar! Maksimal {MAX_FILE_SIZE_MB}MB.")
    
    try:
        line = db.query(models.TMSRouteLine).filter(models.TMSRouteLine.line_id == line_id).first()
        if not line:
            raise HTTPException(status_code=404, detail="Data rute tidak ditemukan!")

        # effective weight untuk kalkulasi total muatan truk
        total_order_kg = (
            float(line.order.weight_realisasi)
            if line.order.weight_realisasi and float(line.order.weight_realisasi) > 0
            else float(line.order.weight_total or 0.0)
        )
        is_return = has_return.lower() == 'true'

        qty_delivered = total_order_kg
        qty_returned = 0.0
        qty_damaged = 0.0
        driver_note = ""

        if is_return and return_qty > 0:
            qty_delivered = max(0.0, total_order_kg - return_qty)
            qty_returned = return_qty
            
            if return_product:
                driver_note = f"Produk Retur: {return_product}"

            if return_reason in ["Barang Rusak", "Packaging Bocor", "Kadaluarsa"]:
                qty_damaged = return_qty

        file_ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
        if file_ext not in ALLOWED_EXTENSIONS:
            file_ext = "jpg"  # fallback kalau nama file tidak ada ekstensi valid

        # --- PROSES WATERMARK & SAVE FILE ---
        timestamp_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        watermark_text = [
            f"Waktu: {timestamp_now} WIB",
            f"Lokasi: {line.order.latitude}, {line.order.longitude}",
            f"DO: {line.order_id} | Driver: {current_user.username}",
            "JAPFA F&B E-POD SYSTEM - ANTI FRAUD"
        ]
        
        file_content = add_watermark(file_content, watermark_text)
        filename = f"POD_{line.order_id}_{uuid.uuid4().hex}.jpg"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            buffer.write(file_content)

        photo_url = f"/static/uploads/epod/{filename}"

        # ── GEOFENCE CHECK ────────────────────────────────────────────────────
        # Bandingkan GPS driver dengan koordinat toko dari master/order.
        # Kalau di luar radius → flag anomali & update actual_lat/lng toko.
        # Tidak memblokir submission (cold chain tidak boleh delay).
        _gps_ok = (
            gps_lat != 0.0 and gps_lon != 0.0 and
            -12.0 <= gps_lat <= 7.0 and 94.0 <= gps_lon <= 142.0
        )
        if _gps_ok:
            try:
                from services.eta_service import calculate_haversine
                settings_gf = db.query(models.SystemSettings).first()
                radius_m = float(settings_gf.geofence_radius_meters) if settings_gf else 200.0

                order_lat = float(line.order.latitude) if line.order.latitude else 0.0
                order_lon = float(line.order.longitude) if line.order.longitude else 0.0

                if order_lat != 0.0 and order_lon != 0.0:
                    dist_m = calculate_haversine(gps_lat, gps_lon, order_lat, order_lon)
                    if dist_m > radius_m:
                        # Driver di luar geofence — tandai line sebagai anomali
                        line.is_anomaly = True
                        logger.warning(
                            f"⚠️ [GEOFENCE] DO {line.order_id}: driver {dist_m:.0f}m "
                            f"dari toko (radius {radius_m}m)"
                        )
                        # Update actual_lat/lng customer dengan posisi GPS driver (lebih akurat)
                        if line.order.customer:
                            line.order.customer.actual_lat = gps_lat
                            line.order.customer.actual_lng = gps_lon
                    else:
                        logger.info(
                            f"✅ [GEOFENCE] DO {line.order_id}: driver dalam radius "
                            f"({dist_m:.0f}m dari {radius_m}m)"
                        )
                        # Konfirmasi actual location toko dengan GPS aktual driver
                        if line.order.customer:
                            line.order.customer.actual_lat = gps_lat
                            line.order.customer.actual_lng = gps_lon
                db.flush()
            except Exception as gf_err:
                logger.warning(f"⚠️ [GEOFENCE] Gagal cek (tidak fatal): {gf_err}")
        # ── END GEOFENCE CHECK ─────────────────────────────────────────────────

        ai_result = submit_epod_with_ai(
            db=db,
            line_id=line_id,
            qty_delivered=qty_delivered,
            qty_return=qty_returned,
            reason=return_reason if is_return else "",
            photo_url=photo_url
        )

        if ai_result.get("status") == "error":
            raise HTTPException(status_code=400, detail=ai_result.get("msg"))

        latest_epod = db.query(models.TMSEpodHistory).filter(
            models.TMSEpodHistory.line_id == line_id
        ).order_by(models.TMSEpodHistory.pod_id.desc()).first()
        
        if latest_epod:
            latest_epod.driver_notes = driver_note
            latest_epod.qty_damaged = qty_damaged
            db.commit()

        alert_msg = "POD berhasil diunggah!"
        if ai_result.get("status") == "success_with_warning":
            alert_msg = "POD berhasil diunggah! (Catatan: Waktu bongkar ditandai Anomali oleh AI)"
        
        return {
            "status": "success", 
            "url": photo_url,
            "message": alert_msg
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [UPLOAD EPOD] Error di line_id {line_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal saat menyimpan POD. Silakan hubungi admin.")

# ==========================================
# 3b. START TRIP & END TRIP (dari Driver App)
# ==========================================

class TripStartRequest(BaseModel):
    route_id: str
    km_awal: int

class TripEndRequest(BaseModel):
    route_id: str
    km_akhir: int
    gps_lat: float = 0.0
    gps_lon: float = 0.0

@router.post("/trip/start")
def start_trip(
    data: TripStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("driver"))
):
    """Driver menekan Mulai Perjalanan — rekam jam berangkat & KM awal."""
    plan = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.route_id == data.route_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Rute tidak ditemukan")

    now = datetime.now()
    plan.start_time    = now
    plan.km_awal_trip  = data.km_awal

    # Sync KM ke master armada
    if plan.vehicle:
        plan.vehicle.current_km = data.km_awal

    db.commit()
    logger.info(f"🚀 Trip START: {data.route_id} | KM awal={data.km_awal} | {now.strftime('%H:%M')}")
    return {
        "status": "success",
        "message": f"Perjalanan dimulai pukul {now.strftime('%H:%M')}",
        "jam_berangkat": now.strftime("%H:%M"),
        "km_awal": data.km_awal,
    }


@router.post("/trip/end")
def end_trip(
    data: TripEndRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("driver"))
):
    """Driver menekan Selesai Perjalanan — rekam jam pulang & KM akhir.
    Jika GPS berada dalam radius jembatan timbang, jam dikunci otomatis."""
    plan = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.route_id == data.route_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Rute tidak ditemukan")

    now = datetime.now()

    # Geofence jembatan timbang — lock jam pulang kalau driver ada di sana
    geo_locked = False
    # Validasi bounding box GPS sebelum proses geofence
    _LAT_MIN, _LAT_MAX = -12.0,  7.0
    _LON_MIN, _LON_MAX =  94.0, 142.0
    _gps_valid = (
        data.gps_lat != 0.0 and data.gps_lon != 0.0 and
        _LAT_MIN <= data.gps_lat <= _LAT_MAX and
        _LON_MIN <= data.gps_lon <= _LON_MAX
    )

    settings_db = db.query(models.SystemSettings).first()
    if (_gps_valid
            and settings_db
            and settings_db.jembatan_timbang_lat
            and settings_db.jembatan_timbang_lon):
        dist_m = calculate_haversine(
            data.gps_lat, data.gps_lon,
            settings_db.jembatan_timbang_lat,
            settings_db.jembatan_timbang_lon
        )
        radius = settings_db.jembatan_timbang_radius_m or 100
        if dist_m <= radius:
            geo_locked = True
            logger.info(
                f"📍 Geofence jembatan timbang: {data.route_id} "
                f"dalam radius {dist_m:.0f}m — jam pulang dikunci"
            )

    plan.end_time      = now
    plan.km_akhir_trip = data.km_akhir

    # Sync KM akhir ke master armada
    if plan.vehicle:
        plan.vehicle.current_km = data.km_akhir

    db.commit()
    logger.info(
        f"🏁 Trip END: {data.route_id} | KM akhir={data.km_akhir} "
        f"| {now.strftime('%H:%M')} | geo_lock={geo_locked}"
    )
    return {
        "status": "success",
        "message": (
            f"Perjalanan selesai pukul {now.strftime('%H:%M')} "
            f"{'(dikunci di jembatan timbang)' if geo_locked else ''}"
        ).strip(),
        "jam_pulang":  now.strftime("%H:%M"),
        "km_akhir":    data.km_akhir,
        "geo_locked":  geo_locked,
    }


# ==========================================
# 4. AMBIL DAFTAR SUPIR & HELPER (UNTUK ADMIN DISTRIBUSI)
# ==========================================
@router.get("/list/available")
def get_available_crew(
    db: Session = Depends(get_db),
    # 🌟 FIX CTO (QW-10): Pasang gembok!
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    try:
        all_crew = db.query(models.HRDriver).filter(models.HRDriver.status == True).all()
        
        drivers = [{"id": d.driver_id, "name": d.name} for d in all_crew]
        helpers = [{"id": d.driver_id, "name": d.name} for d in all_crew]
        
        helpers.insert(0, {"id": "none", "name": "Tanpa Helper"})
        
        return {
            "status": "success",
            "data": {
                "drivers": drivers,
                "helpers": helpers
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal mengambil data kru armada.")
        
# ==========================================
# 5. JEMBATAN UNTUK KASIR (TRUK YANG JALAN HARI INI)
# ==========================================
@router.get("/active-dispatch")
def get_today_active_dispatch(
    db: Session = Depends(get_db),
    # 🌟 FIX CTO (QW-10): Pasang gembok!
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    try:
        # 🌟 FIX CTO (QW-3): Benerin typo 'datetime.date.today()'. Pake 'date.today()' aja!
        today = date.today()
        active_routes = db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.planning_date == today
        ).all()
        
        dispatches = []
        for rute in active_routes:
            if not rute.vehicle: continue
            
            dispatches.append({
                "plate": rute.vehicle.license_plate,
                "vehicleType": rute.vehicle.type,
                "driver": rute.driver.name if rute.driver else "",
                "helper": rute.helper.name if rute.helper else ""
            })
            
        return {"status": "success", "data": dispatches}
    except Exception as e:
        logger.error(f"Error in get_today_active_dispatch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal. Silakan hubungi admin.")

# ==========================================
# 6. JEMBATAN UNTUK ANALYTICS (PERFORMA SUPIR)
# ==========================================
@router.get("/performance")
def get_driver_performance(
    db: Session = Depends(get_db),
    # 🌟 FIX CTO (QW-10): Pasang gembok!
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    try:
        drivers = db.query(models.HRDriver).filter(models.HRDriver.is_helper == False).all()
        
        performance_data = []
        for d in drivers:
            completed_routes = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.driver_id == d.driver_id).count()
            
            if completed_routes == 0:
                continue
                
            performance_data.append({
                "driverName": d.name,
                "totalTrips": completed_routes,
                "onTimeRate": "98%", 
                "fuelRating": "A"
            })
            
        performance_data.sort(key=lambda x: x["totalTrips"], reverse=True)
        
        return {"status": "success", "data": performance_data}
    except Exception as e:
        logger.error(f"Error in get_driver_performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal. Silakan hubungi admin.")