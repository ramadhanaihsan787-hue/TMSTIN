# Backend/core/config.py
"""
Configuration module — ENV defaults & app-level constants.

[MR-2] ARSITEKTUR SETTINGS:
- Settings class (ini) = sumber DEFAULT values saat DB belum ada / belum di-seed.
- Sumber kebenaran runtime = DB (tabel system_settings, baris id=1).
- Semua consumer wajib pakai get_settings() dari dependencies.py,
  bukan import 'settings' dari sini langsung.

FIELD YANG TIDAK ADA DI DB (tetap ENV-driven, tidak pernah berubah runtime):
  DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
  APP_NAME, APP_VERSION, APP_DESCRIPTION, DEBUG, UPLOAD_DIR, EPOD_DIR,
  GEOMETRY_DIR, TOMTOM_API_KEY, traffic_validation_enabled

FIELD YANG ADA DI DB (ENV hanya dipakai sebagai seed awal):
  depo_lat, depo_lon, vrp_*, cost_*, geofence_radius_meters,
  dwell_time_mins, anomaly_tolerance_percent, api_*, sync_interval_sec,
  alert_*
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# ------------------------------------------------------------------
# Cache TTL — berapa detik sebelum get_settings() query ulang dari DB
# ------------------------------------------------------------------
SETTINGS_CACHE_TTL_SECONDS = 600  # 10 menit


class Settings(BaseSettings):
    # ==========================================
    # INFRA — ENV ONLY (tidak bisa diubah dari UI)
    # ==========================================
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    APP_NAME: str = "TMS JAPFA - AI Engine"
    APP_VERSION: str = "2.0.0"
    APP_DESCRIPTION: str = "Transport Management System dengan CVRPTW Optimization"
    DEBUG: bool = False

    TOMTOM_API_KEY: Optional[str] = None
    traffic_validation_enabled: bool = True

    UPLOAD_DIR: str = "uploads"
    EPOD_DIR: str = "uploads/epod"
    GEOMETRY_DIR: str = "route_geometries"

    # ==========================================
    # RUNTIME DEFAULTS — seed awal untuk DB.
    # Nilai ini HANYA dipakai saat baris system_settings
    # belum ada di DB (fresh install / first boot).
    # Setelah DB punya baris id=1, nilai dari DB yang dipakai.
    # ==========================================

    # VRP & Routing
    vrp_start_time: str = "06:00"
    vrp_end_time: str = "20:00"
    vrp_base_drop_time_mins: int = 15
    vrp_var_drop_time_mins: int = 1
    vrp_capacity_buffer_percent: int = 90

    # Koordinat Depo
    depo_lat: float = -6.207356
    depo_lon: float = 106.479163

    # Biaya Operasional
    cost_fuel_per_liter: float = 12500.0
    cost_avg_km_per_liter: float = 5.0
    cost_driver_salary: float = 4500000.0
    cost_overtime_rate: float = 25000.0

    # Geofencing & Anomali (sebelumnya missing dari config, sekarang lengkap)
    geofence_radius_meters: int = 200
    dwell_time_mins: int = 3
    anomaly_tolerance_percent: float = 200.0

    # IoT & Webhook
    api_gps_webhook: Optional[str] = None
    api_temp_sensor: Optional[str] = None
    sync_interval_sec: int = 60

    # Alerts
    alert_max_temp_celsius: float = 4.0
    alert_delay_mins: int = 30
    alert_channel_dashboard: bool = True
    alert_channel_email: bool = True
    alert_channel_whatsapp: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# ENV-only instance — dipakai HANYA oleh:
# 1. dependencies.py untuk bootstrap cache pertama kali
# 2. main.py untuk APP_NAME, VERSION, dll (infra-level fields)
# 3. cron_service.py startup (sebelum DB tersedia)
#
# JANGAN import 'env_settings' langsung di router/service lain.
# Pakai get_settings() dari dependencies.py.
env_settings = Settings()

# Create directories
os.makedirs(env_settings.EPOD_DIR, exist_ok=True)
os.makedirs(env_settings.GEOMETRY_DIR, exist_ok=True)