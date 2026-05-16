# routers/tracking.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 🌟 Import Otak Penjaga Geofence yang tadi kita bikin
from services.tracking_service import process_gps_webhook
from dependencies import get_db

router = APIRouter(prefix="/api/tracking", tags=["GPS Tracking Webhook"])

# ==========================================
# SCHEMA: Format Data yang dikirim dari Vendor GPS Truk
# ==========================================
class GPSWebhookPayload(BaseModel):
    vehicle_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    timestamp: Optional[datetime] = None  # Bisa kosong, nanti diisi otomatis sama sistem

# ==========================================
# ENDPOINT: Webhook Penerima Sinyal Satelit
# ==========================================
@router.post("/webhook/gps")
def receive_gps_ping(payload: GPSWebhookPayload, db: Session = Depends(get_db)):
    try:
        # 1. Pastikan waktu akurat (kalau alat GPS delay/ngga ngirim jam, pake jam server)
        ping_time = payload.timestamp if payload.timestamp else datetime.now()

        # 2. 🌟 ZAP! Lempar ke Mesin AI Geofence & Self-Healing
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🚨 [GPS WEBHOOK] Error memproses ping dari kendaraan {payload.vehicle_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal saat memproses data GPS.")