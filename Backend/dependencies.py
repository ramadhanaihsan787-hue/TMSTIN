# Backend/dependencies.py
"""
Dependencies module — FastAPI dependency injection.

[MR-2] get_settings() sekarang DB-first dengan in-memory TTL cache:
  1. Pertama, cek cache: kalau masih fresh (< 10 menit), return cache.
  2. Kalau cache expire atau kosong, query DB system_settings.
  3. Kalau DB kosong (fresh install), seed baris default dari ENV lalu cache.
  4. Kalau DB error (blip), return last cached value (uptime is king).
  5. PUT /api/settings memanggil invalidate_settings_cache() agar
     perubahan langsung berlaku di request berikutnya.
"""
import time
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import SessionLocal
from core.config import env_settings, SETTINGS_CACHE_TTL_SECONDS
from core.security import decode_token
import models

logger = logging.getLogger(__name__)

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ============================================================
# IN-MEMORY SETTINGS CACHE
# ============================================================
_settings_cache: Optional[models.SystemSettings] = None
_settings_cache_at: float = 0.0   # epoch seconds saat terakhir cached


def invalidate_settings_cache() -> None:
    """
    Paksa cache expire. Dipanggil oleh PUT /api/settings
    agar perubahan dari UI berlaku di request berikutnya.
    """
    global _settings_cache, _settings_cache_at
    _settings_cache = None
    _settings_cache_at = 0.0
    logger.info("[SETTINGS CACHE] Invalidated — akan reload dari DB di request berikutnya.")


def _cache_is_fresh() -> bool:
    return (
        _settings_cache is not None
        and (time.monotonic() - _settings_cache_at) < SETTINGS_CACHE_TTL_SECONDS
    )


def _seed_default_settings(db: Session) -> models.SystemSettings:
    """
    Buat baris default (id=1) dari ENV values.
    Dipanggil sekali saat fresh install / DB kosong.
    """
    db_settings = models.SystemSettings(
        id=1,
        vrp_start_time=env_settings.vrp_start_time,
        vrp_end_time=env_settings.vrp_end_time,
        vrp_base_drop_time_mins=env_settings.vrp_base_drop_time_mins,
        vrp_var_drop_time_mins=env_settings.vrp_var_drop_time_mins,
        vrp_capacity_buffer_percent=env_settings.vrp_capacity_buffer_percent,
        depo_lat=env_settings.depo_lat,
        depo_lon=env_settings.depo_lon,
        cost_fuel_per_liter=env_settings.cost_fuel_per_liter,
        cost_avg_km_per_liter=env_settings.cost_avg_km_per_liter,
        cost_driver_salary=env_settings.cost_driver_salary,
        cost_overtime_rate=env_settings.cost_overtime_rate,
        geofence_radius_meters=env_settings.geofence_radius_meters,
        dwell_time_mins=env_settings.dwell_time_mins,
        anomaly_tolerance_percent=env_settings.anomaly_tolerance_percent,
        api_gps_webhook=env_settings.api_gps_webhook,
        api_temp_sensor=env_settings.api_temp_sensor,
        sync_interval_sec=env_settings.sync_interval_sec,
        alert_max_temp_celsius=env_settings.alert_max_temp_celsius,
        alert_delay_mins=env_settings.alert_delay_mins,
        alert_channel_dashboard=env_settings.alert_channel_dashboard,
        alert_channel_email=env_settings.alert_channel_email,
        alert_channel_whatsapp=env_settings.alert_channel_whatsapp,
    )
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    logger.info("[SETTINGS] DB kosong — baris default berhasil di-seed dari ENV.")
    return db_settings


# ============================================================
# GET DB SESSION
# ============================================================
def get_db():
    """
    Dependency untuk mendapatkan DB session.
    HANYA BOLEH ADA DI SINI. File lain wajib import dari sini.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# GET SETTINGS — DB-first, cache TTL 10 menit (ANTI-CRASH VERSION)
# ============================================================
def get_settings(db: Session = Depends(get_db)) -> models.SystemSettings:
    global _settings_cache, _settings_cache_at

    # 1. Cache hit (Jalanin paling awal biar hemat resource)
    if _cache_is_fresh():
        return _settings_cache

    # 2. Proteksi 'Depends Object': Cek apakah db beneran Session yang punya method 'query'
    is_valid_db = db is not None and hasattr(db, "query")
    
    local_session = None
    if not is_valid_db:
        # Kalo fungsi ini dipanggil manual di body router tanpa melempar session,
        # kita buatin session lokal khusus yang aman.
        local_session = SessionLocal()
        db_session = local_session
    else:
        db_session = db

    # 3. Query DB
    try:
        db_settings = db_session.query(models.SystemSettings).filter(
            models.SystemSettings.id == 1
        ).first()

        if db_settings is None:
            # Fresh install: seed default (Pastikan pakai db_session yang valid)
            db_settings = _seed_default_settings(db_session)

        # Update cache
        _settings_cache = db_settings
        _settings_cache_at = time.monotonic()
        return db_settings

    except Exception as exc:
        logger.warning(
            "[SETTINGS] DB query gagal: %s — "
            "menggunakan last cached value (fallback).",
            exc,
        )
        # 4. Fallback: pakai cache lama kalau ada
        if _settings_cache is not None:
            return _settings_cache

        # 5. Last resort: return ENV defaults
        logger.error(
            "[SETTINGS] Cache kosong dan DB tidak bisa diakses. "
            "Menggunakan ENV defaults sebagai last resort."
        )
        return env_settings
        
    finally:
        # 6. Cleanup: Tutup koneksi HANYA JIKA kita yang bikin session lokalnya
        if local_session is not None:
            local_session.close()
# ============================================================
# AUTH
# ============================================================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Dependency untuk mendapatkan user yang sedang login."""
    credential_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credential_exception
    except JWTError:
        raise credential_exception

    user = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if user is None:
        raise credential_exception

    return user


# ============================================================
# RBAC
# ============================================================
def require_role(*allowed_roles: str):
    """Proteksi endpoint berdasarkan role user."""
    def role_checker(
        current_user: models.User = Depends(get_current_user),
    ) -> models.User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak! Hanya untuk: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker