# Backend/routers/settings.py
"""
Settings Router — baca & tulis konfigurasi sistem.

[MR-2] Semua endpoint sekarang konsisten DB-driven:
  GET /api/settings      → baca dari cache → DB (sama seperti runtime)
  PUT /api/settings      → tulis DB + invalidate cache
  POST /api/settings/refresh → force-invalidate cache (admin tool)
  GET /api/settings/depo    → baca dari cache → DB
  GET /api/settings/vrp-config → baca dari cache → DB
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from dependencies import (
    get_db,
    get_settings,
    get_current_user,
    require_role,
    invalidate_settings_cache,
)
from utils.helpers import time_str_to_minutes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["System Settings"])


# ------------------------------------------------------------------
# GET /api/settings
# ------------------------------------------------------------------
@router.get("/settings", response_model=schemas.SettingsResponse)
def get_system_settings(
    settings: models.SystemSettings = Depends(get_settings),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return semua konfigurasi sistem dari DB (via cache).
    Ini yang ditampilkan di Settings UI — konsisten dengan nilai runtime.
    """
    return {
        "status": "success",
        "data": {
            "vrp_start_time": settings.vrp_start_time,
            "vrp_end_time": settings.vrp_end_time,
            "vrp_base_drop_time_mins": settings.vrp_base_drop_time_mins,
            "vrp_var_drop_time_mins": settings.vrp_var_drop_time_mins,
            "vrp_capacity_buffer_percent": settings.vrp_capacity_buffer_percent,
            "cost_fuel_per_liter": settings.cost_fuel_per_liter,
            "cost_avg_km_per_liter": settings.cost_avg_km_per_liter,
            "cost_driver_salary": settings.cost_driver_salary,
            "cost_overtime_rate": settings.cost_overtime_rate,
            "depo_lat": settings.depo_lat,
            "depo_lon": settings.depo_lon,
            "geofence_radius_meters": settings.geofence_radius_meters,
            "dwell_time_mins": settings.dwell_time_mins,
            "anomaly_tolerance_percent": settings.anomaly_tolerance_percent,
            "api_gps_webhook": settings.api_gps_webhook,
            "api_temp_sensor": settings.api_temp_sensor,
            "sync_interval_sec": settings.sync_interval_sec,
            "alert_max_temp_celsius": settings.alert_max_temp_celsius,
            "alert_delay_mins": settings.alert_delay_mins,
            "alert_channel_dashboard": settings.alert_channel_dashboard,
            "alert_channel_email": settings.alert_channel_email,
            "alert_channel_whatsapp": settings.alert_channel_whatsapp,
        },
    }


# ------------------------------------------------------------------
# PUT /api/settings
# ------------------------------------------------------------------
@router.put("/settings", response_model=schemas.GenericResponse)
def update_system_settings(
    data: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role("admin_distribusi", "manager_logistik")
    ),
):
    """
    Simpan konfigurasi baru ke DB, lalu invalidate cache.
    Perubahan berlaku di request berikutnya (tanpa restart server).
    """
    db_settings = db.query(models.SystemSettings).filter(
        models.SystemSettings.id == 1
    ).first()

    if not db_settings:
        db_settings = models.SystemSettings(id=1)
        db.add(db_settings)

    for key, value in data.model_dump().items():
        if hasattr(db_settings, key):
            setattr(db_settings, key, value)

    db.commit()

    # Invalidate cache agar perubahan berlaku di request berikutnya
    invalidate_settings_cache()

    logger.info(
        "[SETTINGS] Konfigurasi diperbarui oleh user '%s'.",
        current_user.username,
    )

    return {
        "status": "success",
        "message": "Konfigurasi sistem berhasil diperbarui!",
    }


# ------------------------------------------------------------------
# POST /api/settings/refresh  (admin tool)
# ------------------------------------------------------------------
@router.post("/settings/refresh", response_model=schemas.GenericResponse)
def force_refresh_settings(
    current_user: models.User = Depends(
        require_role("admin_distribusi", "manager_logistik")
    ),
):
    """
    Force-invalidate in-memory settings cache.
    Request berikutnya ke get_settings() akan query ulang dari DB.
    Berguna untuk: debug, atau saat ada perubahan langsung di DB.
    """
    invalidate_settings_cache()
    logger.info(
        "[SETTINGS] Cache di-refresh manual oleh user '%s'.",
        current_user.username,
    )
    return {
        "status": "success",
        "message": "Settings cache berhasil di-refresh. "
                   "Nilai terbaru dari DB akan digunakan di request berikutnya.",
    }


# ------------------------------------------------------------------
# GET /api/settings/depo
# ------------------------------------------------------------------
@router.get("/settings/depo", response_model=schemas.DepoResponse)
def get_depo_coordinates(
    settings: models.SystemSettings = Depends(get_settings),
    current_user: models.User = Depends(get_current_user),
):
    return {
        "status": "success",
        "data": {
            "depo_lat": settings.depo_lat,
            "depo_lon": settings.depo_lon,
            "depo_name": "Gudang JAPFA Cikupa",
        },
    }


# ------------------------------------------------------------------
# GET /api/settings/vrp-config
# ------------------------------------------------------------------
@router.get("/settings/vrp-config", response_model=schemas.VrpConfigResponse)
def get_vrp_config(
    settings: models.SystemSettings = Depends(get_settings),
    current_user: models.User = Depends(get_current_user),
):
    return {
        "status": "success",
        "data": {
            "start_minutes": time_str_to_minutes(settings.vrp_start_time),
            "end_minutes": time_str_to_minutes(settings.vrp_end_time),
            "base_drop_time": settings.vrp_base_drop_time_mins,
            "var_drop_time": settings.vrp_var_drop_time_mins,
            "capacity_buffer": settings.vrp_capacity_buffer_percent / 100.0,
            "depo_lat": settings.depo_lat,
            "depo_lon": settings.depo_lon,
            "alert_delay_mins": settings.alert_delay_mins,
            "alert_max_temp": settings.alert_max_temp_celsius,
        },
    }