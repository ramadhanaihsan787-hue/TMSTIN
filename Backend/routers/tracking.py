# Backend/routers/tracking.py
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from services.tracking_service import process_gps_webhook
from dependencies import get_db

from core.config import env_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracking", tags=["GPS Tracking Webhook"])

# ==========================================
# SCHEMA: Format Data yang dikirim dari Vendor GPS Truk
# ==========================================
class GPSWebhookPayload(BaseModel):
    vehicle_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    timestamp: Optional[datetime] = None 

# ==========================================
# 🌟 SATPAM WEBHOOK
# ==========================================
def verify_gps_vendor(x_api_key: Optional[str] = Header(None)):
    rahasia_vendor = getattr(env_settings, "GPS_WEBHOOK_SECRET", "JAPFA-GPS-SECRET-2026")
    
    if not x_api_key or x_api_key != rahasia_vendor:
        logger.warning(f"🚨 [SECURITY] Ada percobaan nembak GPS tanpa API Key yang valid! Key masuk: {x_api_key}")
        raise HTTPException(status_code=401, detail="Akses Ditolak! API Key Vendor GPS Tidak Valid.")

# ==========================================
# ENDPOINT: Webhook Penerima Sinyal Satelit
# ==========================================
@router.post("/webhook/gps", dependencies=[Depends(verify_gps_vendor)])
def receive_gps_ping(payload: GPSWebhookPayload, db: Session = Depends(get_db)):
    try:
        # 1. Pastikan waktu akurat (kalau alat GPS delay/ngga ngirim jam, pake jam server)
        ping_time = payload.timestamp if payload.timestamp else datetime.now()

        # 2. ZAP! Lempar ke Mesin AI Geofence & Self-Healing
        result = process_gps_webhook(
            db=db,
            vehicle_id=payload.vehicle_id,
            current_lat=payload.latitude,
            current_lon=payload.longitude,
            speed_kmh=payload.speed_kmh,
            ping_time=ping_time
        )

        # Balikin respon ke Vendor GPS biar dia tau datanya sukses diterima
        return result

    except Exception as e:
        logger.error(f"🚨 [GPS WEBHOOK] Error memproses ping dari kendaraan {payload.vehicle_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal saat memproses data GPS.")