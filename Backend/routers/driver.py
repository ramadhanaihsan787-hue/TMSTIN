# routers/driver.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date, datetime
import os
import shutil
import uuid
import io

from PIL import Image, ImageDraw, ImageFont
from services.epod_service import submit_epod_with_ai

import models
import schemas 
from dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/driver", tags=["Driver App"])

UPLOAD_DIR = "static/uploads/epod"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ==========================================
# 🌟 HELPER FUNCTION: WATERMARK GENERATOR
# ==========================================
def add_watermark(image_bytes: bytes, text_lines: list) -> bytes:
    """Nambahin teks koordinat & jam transparan ke atas foto"""
    try:
        # Buka gambar dari memory
        img = Image.open(io.BytesIO(image_bytes))
        
        # Biar text ngga nabrak foto asli, kita bikin layer transparan
        # Konversi ke RGBA biar support transparansi (Alpha channel)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # Bikin layer kosong yang ukurannya sama persis sama foto
        txt_layer = Image.new('RGBA', img.size, (255, 255, 255, 0))
        d = ImageDraw.Draw(txt_layer)

        # Coba pake font default (kalo ga nemu font Arial/Roboto di OS)
        try:
            # Atur ukuran font dinamis, 3% dari lebar gambar atau minimal 16px
            font_size = max(16, int(img.size[0] * 0.03))
            # Di server linux biasanya font ada di /usr/share/fonts/
            # Tapi kita pake load default aja biar aman lintas OS
            fnt = ImageFont.load_default()
        except:
            fnt = None

        # Posisi awal text (Pojok kanan bawah)
        margin = 15
        y_text = img.size[1] - margin - (len(text_lines) * 20) 

        # Tulis baris per baris
        for line in text_lines:
            # Warna putih (255,255,255) dengan tingkat transparansi 180 (dari 255)
            # Biar nambah kebaca, kita kasih shadow/stroke hitam tipis (offset 1px)
            d.text((margin+1, y_text+1), line, font=fnt, fill=(0, 0, 0, 200))
            d.text((margin, y_text), line, font=fnt, fill=(255, 255, 255, 180))
            y_text += 20 # Jarak antar baris

        # Tempel layer text di atas foto asli
        watermarked = Image.alpha_composite(img, txt_layer)

        # Konversi balik ke RGB (karena JPG ga support RGBA)
        if watermarked.mode == 'RGBA':
            watermarked = watermarked.convert('RGB')

        # Simpen balik ke memory berupa bytes
        img_byte_arr = io.BytesIO()
        watermarked.save(img_byte_arr, format='JPEG', quality=85) # Compress dikit biar enteng
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"⚠️ Warning: Gagal menempelkan watermark! Menyimpan foto original. Error: {e}")
        return image_bytes # Kalo gagal, balikin foto aslinya aja


# ==========================================
# 1. AMBIL RUTE TUGAS SAYA (MY ROUTE)
# ==========================================
@router.get("/my-route", response_model=schemas.DriverTripResponse)
def get_my_route(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 🌟 FIX: AUTO-LINKING BY NAME ATAU USER_ID
    driver = db.query(models.HRDriver).filter(
        or_(
            models.HRDriver.user_id == current_user.id,
            models.HRDriver.name == current_user.full_name # Cocokin berdasarkan nama lengkap!
        )
    ).first()

    if not driver:
        raise HTTPException(status_code=404, detail="Profil supir tidak ditemukan di database HR!")
        
    # 🌟 AUTO-HEALING: Kalau kemaren profil HRDriver belum ada user_id nya, kita isi otomatis sekarang
    if not driver.user_id:
        driver.user_id = current_user.id
        db.commit()

    today = date.today()
    plan = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.driver_id == driver.driver_id,
        models.TMSRoutePlan.planning_date == today
    ).first()

    if not plan:
        return {
            "truck_id": "-",
            "driver_name": driver.name,
            "total_stops": 0,
            "completed_stops": 0,
            "total_distance": 0,
            "stops": []
        }

    stops_data = []
    completed_count = 0
    
    lines = db.query(models.TMSRouteLine).filter(
        models.TMSRouteLine.route_id == plan.route_id
    ).order_by(models.TMSRouteLine.sequence).all()

    for line in lines:
        order = line.order
        status_fe = "pending"
        if order.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial]:
            status_fe = "completed"
            completed_count += 1
        elif order.status == models.DOStatus.do_assigned_to_route:
            status_fe = "active" if line.sequence == 1 else "pending"

        # 🌟 FIX: SARINGAN ANTI-NONE (Biar Pydantic FastAPI ga ngambek!)
        nama_toko = "Tanpa Nama"
        alamat_toko = "Alamat tidak tersedia"
        
        if hasattr(order, 'customer') and order.customer:
            # Pake "or" biar kalo datanya None, dia milih string default
            nama_toko = order.customer.store_name or nama_toko
            alamat_toko = order.customer.address or alamat_toko
        elif hasattr(order, 'customer_name') and order.customer_name:
            nama_toko = order.customer_name

        stops_data.append({
            "id": line.line_id,
            "sequence": line.sequence,
            "customerName": str(nama_toko), # Paksa jadi string!
            "address": str(alamat_toko),    # Paksa jadi string!
            "timeWindow": f"{line.est_arrival.strftime('%H:%M')} WIB" if line.est_arrival else "-",
            "weight": f"{order.weight_total} KG",
            "status": status_fe,
            "latitude": float(order.latitude) if order.latitude else 0.0,
            "longitude": float(order.longitude) if order.longitude else 0.0
        })

    return {
        "truck_id": plan.vehicle.license_plate if hasattr(plan, 'vehicle') and plan.vehicle else "B ???? JAPFA",
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
    db: Session = Depends(get_db)
):
    line = db.query(models.TMSRouteLine).filter(models.TMSRouteLine.line_id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="ID rute tidak valid!")
    
    db.commit()
    return {"status": "success", "message": f"Status rute {line_id} berhasil diupdate."}

# Tambahin import ini di bagian atas (barengan import lainnya)
from services.epod_service import submit_epod_with_ai

# ==========================================
# 3. SUBMIT E-POD (SECURE UPLOAD + VALIDATION + WATERMARK + AI ANOMALY REJECTION)
# ==========================================
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Format file ditolak! Hanya boleh upload gambar (JPG, PNG, WEBP).")

    file_content = await file.read() 
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"Ukuran foto terlalu besar! Maksimal {MAX_FILE_SIZE_MB}MB.")
    
    try:
        line = db.query(models.TMSRouteLine).filter(models.TMSRouteLine.line_id == line_id).first()
        if not line:
            raise HTTPException(status_code=404, detail="Data rute tidak ditemukan!")

        total_order_kg = line.order.weight_total or 0.0
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

        file_ext = file.filename.split(".")[-1].lower()
        if file_ext not in ["jpg", "jpeg", "png", "webp"]:
             raise HTTPException(status_code=400, detail="Ekstensi file mencurigakan!")

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

        # 🌟 ZAP! KIRIM KE OTAK AI BUAT DIANALISIS (ANOMALY REJECTION & SERVICE TIME)
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

        # 🌟 BUMBU RAHASIA: Simpan driver_note & qty_damaged susulan biar ga ribet ubah fungsi AI-nya
        latest_epod = db.query(models.TMSEpodHistory).filter(
            models.TMSEpodHistory.line_id == line_id
        ).order_by(models.TMSEpodHistory.pod_id.desc()).first()
        
        if latest_epod:
            latest_epod.driver_notes = driver_note
            latest_epod.qty_damaged = qty_damaged
            db.commit()

        # Kasih tau ke Front-End kalau ternyata supirnya kena flag anomali!
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🚨 [UPLOAD EPOD] Error di line_id {line_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal saat menyimpan POD. Silakan hubungi admin.")