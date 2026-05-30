# Backend/routers/tracking.py
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging, re

from services.tracking_service import process_gps_webhook
from dependencies import get_db
from core.config import env_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracking", tags=["GPS Tracking Webhook"])


# ──────────────────────────────────────────────────────────────────────────────
# SCHEMA FLEXIBLE — Support format SoloFleet dan format generik lainnya
# Semua field optional, resolver method untuk normalisasi ke format internal
# ──────────────────────────────────────────────────────────────────────────────
class GPSWebhookPayload(BaseModel):
    # ── Identifier kendaraan (salah satu harus ada) ───────────────────────────
    vehicle_id:   Optional[int]   = None   # integer ID format lama / generik
    vehicle_name: Optional[str]   = None   # "PA - B 9518 JXS (B 9580 CXS )- PA57"
    device_id:    Optional[str]   = None   # device ID internal vendor
    plate:        Optional[str]   = None   # plat nomor langsung

    # ── Koordinat GPS — support berbagai nama field ───────────────────────────
    latitude:     Optional[float] = None
    longitude:    Optional[float] = None
    lat:          Optional[float] = None
    lon:          Optional[float] = None
    latlong:      Optional[str]   = None   # "-6.207356,106.479163" sebagai string

    # ── Telemetri ─────────────────────────────────────────────────────────────
    speed_kmh:    Optional[float] = None
    speed:        Optional[float] = None   # alias (SoloFleet: "14 km/hr")
    timestamp:    Optional[datetime] = None

    # ── 🌡️ Sensor suhu cold chain (SoloFleet: temp1, temp2) ──────────────────
    temp1:        Optional[float] = None   # Sensor suhu 1 (°C) — chilled
    temp2:        Optional[float] = None   # Sensor suhu 2 (°C) — frozen

    # ── Status tambahan ───────────────────────────────────────────────────────
    engine_running: Optional[bool]  = None
    voltage:        Optional[float] = None

    class Config:
        extra = "allow"  # Terima semua field tambahan tanpa error

    def resolve_lat(self) -> float:
        if self.latitude:  return float(self.latitude)
        if self.lat:       return float(self.lat)
        if self.latlong:
            try:    return float(self.latlong.split(",")[0].strip())
            except: pass
        return 0.0

    def resolve_lon(self) -> float:
        if self.longitude: return float(self.longitude)
        if self.lon:       return float(self.lon)
        if self.latlong:
            try:    return float(self.latlong.split(",")[1].strip())
            except: pass
        return 0.0

    def resolve_speed(self) -> float:
        """Normalisasi kecepatan ke float km/h."""
        raw = self.speed_kmh or self.speed
        if raw is None:
            return 0.0
        # Kalau string seperti "14 km/hr", ekstrak angkanya
        if isinstance(raw, str):
            try:    return float(re.findall(r"[\d.]+", raw)[0])
            except: return 0.0
        return float(raw)

    def resolve_vehicle_id(self, db) -> Optional[int]:
        """
        Cari vehicle_id di FleetVehicle berdasarkan nama/plat dari SoloFleet.
        Format nama vendor: "PA - B 9518 JXS (B 9580 CXS )- PA57"
        Plat di master fleet kita: "B 9518 JXS"
        """
        import models as _models

        # Sudah ada integer ID → langsung pakai
        if self.vehicle_id:
            return self.vehicle_id

        search = self.vehicle_name or self.device_id or self.plate or ""
        if not search:
            return None

        # Ekstrak semua kandidat plat Indonesia dari string nama
        # Pattern: 1-2 huruf + spasi + 1-4 angka + spasi + 2-3 huruf
        plates = re.findall(r"[A-Z]{1,2}\s+\d{1,4}\s+[A-Z]{2,3}", search.upper())
        for p in plates:
            norm = " ".join(p.split())  # normalisasi spasi ganda
            v = db.query(_models.FleetVehicle).filter(
                _models.FleetVehicle.license_plate.ilike(f"%{norm}%")
            ).first()
            if v:
                logger.info(f"🔍 [GPS] Mapped '{search}' → {v.license_plate} (id={v.vehicle_id})")
                return v.vehicle_id

        logger.warning(f"⚠️ [GPS] Kendaraan tidak ditemukan di master fleet: '{search}'")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# GUARD: Verifikasi API Key dari vendor
# ──────────────────────────────────────────────────────────────────────────────
def verify_gps_vendor(x_api_key: Optional[str] = Header(None)):
    secret = env_settings.GPS_WEBHOOK_SECRET
    if not x_api_key or x_api_key != secret:
        logger.warning(
            f"🚨 [SECURITY] GPS webhook ditolak — key tidak valid: {repr(x_api_key)}"
        )
        raise HTTPException(
            status_code=401,
            detail="Akses Ditolak. X-API-Key tidak valid."
        )


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT: Penerima sinyal GPS dari vendor
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/webhook/gps", dependencies=[Depends(verify_gps_vendor)])
def receive_gps_ping(payload: GPSWebhookPayload, db: Session = Depends(get_db)):
    """
    Endpoint untuk menerima ping GPS dari vendor (SoloFleet atau lainnya).
    Vendor wajib include header: X-API-Key: <GPS_WEBHOOK_SECRET>
    """
    try:
        ping_time = payload.timestamp or datetime.now()

        # Resolve vehicle ID dari nama/plat
        resolved_vid = payload.resolve_vehicle_id(db)
        if not resolved_vid:
            return {
                "status": "ignored",
                "msg": f"Kendaraan tidak ditemukan: vehicle_id={payload.vehicle_id}, name={payload.vehicle_name}"
            }

        lat   = payload.resolve_lat()
        lon   = payload.resolve_lon()
        speed = payload.resolve_speed()

        # Log suhu cold chain (untuk monitoring freezer)
        if payload.temp1 is not None or payload.temp2 is not None:
            logger.info(
                f"🌡️  [COLD CHAIN] Kendaraan {resolved_vid}: "
                f"temp1={payload.temp1}°C, temp2={payload.temp2}°C"
            )

        result = process_gps_webhook(
            db=db,
            vehicle_id=resolved_vid,
            current_lat=lat,
            current_lon=lon,
            speed_kmh=speed,
            ping_time=ping_time
        )
        return result

    except Exception as e:
        logger.error(
            f"🚨 [GPS WEBHOOK] Error memproses ping kendaraan "
            f"id={payload.vehicle_id} name={payload.vehicle_name}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Gagal memproses data GPS.")


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT: Test koneksi (untuk verifikasi setelah SoloFleet dikonfigurasi)
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/webhook/gps/test", dependencies=[Depends(verify_gps_vendor)])
def test_webhook_connection():
    """
    Endpoint test — kirim GET request dengan X-API-Key untuk verifikasi koneksi.
    Tidak menulis data apapun ke DB.
    """
    return {
        "status": "ok",
        "message": "Koneksi webhook GPS berhasil! Server TMS JAPFA siap menerima data.",
        "server_time": datetime.now().isoformat(),
    }