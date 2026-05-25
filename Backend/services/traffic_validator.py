# Backend/services/traffic_validator.py
#
# Schedule Validator — cek apakah ETA tiap stop melewati jam tutup toko.
#
# CHANGELOG:
#   [FIX] Hapus import httpx dan _minutes_to_iso() yang tidak dipakai
#   [FIX] Parsing tw_end: baca dari stop.jam_maks → stop.timeWindow → default 20:00
#   [FIX] Parsing jam_tiba: handle "HH:MM:SS" dan "HH:MM" keduanya
#   [NEW] Output tambah on_time_count dan total_stops
#
import logging
from utils.helpers import time_str_to_minutes
from dependencies import get_settings

logger = logging.getLogger(__name__)

# Jam tutup operasional default JAPFA kalau toko tidak punya time window eksplisit
_DEFAULT_CLOSE_HOUR = "20:00"


def _parse_jam(jam_str: str | None) -> int | None:
    """
    Parse jam tiba dari string ke menit.
    Handle format 'HH:MM:SS', 'HH:MM', dan None.
    Return None kalau tidak bisa di-parse.
    """
    if not jam_str:
        return None
    try:
        # Ambil hanya HH:MM — potong detik kalau ada
        parts = str(jam_str).strip().split(":")
        if len(parts) >= 2:
            h = int(parts[0])
            m = int(parts[1])
            return h * 60 + m
    except (ValueError, AttributeError):
        pass
    return None


def _get_tw_end(stop: dict) -> int | None:
    """
    Ambil jam tutup toko dari stop dict.
    Priority: jam_maks → timeWindow → default 20:00.
    """
    # Coba jam_maks (format "HH:MM" atau "HH:MM:SS")
    if stop.get("jam_maks"):
        parsed = _parse_jam(stop["jam_maks"])
        if parsed is not None:
            return parsed

    # Coba timeWindow (format "HH:MM" atau "HH:MM:SS")
    if stop.get("timeWindow"):
        parsed = _parse_jam(stop["timeWindow"])
        if parsed is not None:
            return parsed

    # Fallback ke default jam tutup operasional
    return _parse_jam(_DEFAULT_CLOSE_HOUR)


def validate_route_traffic(route: dict, date_str: str) -> dict:
    """
    Validasi jadwal rute — cek apakah ETA tiap stop melewati jam tutup toko.

    Nama fungsi dipertahankan untuk backward compatibility dengan vrp_jobs.py.
    Logika internal sudah diperbaiki — sebelumnya tw_end sering None sehingga
    tidak ada warning yang pernah keluar.

    Args:
        route:    dict satu truk dari jadwal_truk_internal
        date_str: tanggal hari ini (format YYYY-MM-DD)

    Returns:
        {
            warnings:      list of warning dicts,
            has_critical:  bool,
            route_id:      str,
            on_time_count: int,  — jumlah stop yang on-time
            total_stops:   int,  — total stop (tidak termasuk depot)
        }
    """
    try:
        warnings = []
        on_time_count = 0

        stops = [
            s for s in route.get("detail_perjalanan", [])
            if s.get("keterangan") not in ["Start", "Finish"]
            and not str(s.get("nama_toko", "")).upper().startswith("GUDANG")
            and not str(s.get("lokasi", "")).upper().startswith("GUDANG")
        ]

        total_stops = len(stops)

        for stop in stops:
            jam_tiba_str = stop.get("jam_tiba") or stop.get("jam")
            arrival_min = _parse_jam(jam_tiba_str)

            # Kalau jam tiba tidak ada / tidak bisa di-parse, skip
            if arrival_min is None:
                total_stops -= 1
                continue

            tw_end = _get_tw_end(stop)
            if tw_end is None:
                on_time_count += 1
                continue

            store_name = (
                stop.get("nama_toko")
                or stop.get("storeName")
                or stop.get("lokasi")
                or "Toko"
            )

            if arrival_min > tw_end:
                delay = arrival_min - tw_end
                severity = "HIGH" if delay > 30 else "LOW"

                # Format jam untuk tampilan
                jam_tutup_fmt = f"{tw_end // 60:02d}:{tw_end % 60:02d}"

                warnings.append({
                    "stop_order":    stop.get("urutan"),
                    "store_name":    store_name,
                    "planned_eta":   jam_tiba_str,
                    "jam_tutup":     jam_tutup_fmt,
                    "delay_minutes": delay,
                    "severity":      severity,
                    "truck_id":      route.get("route_id"),
                    "armada":        route.get("armada"),
                    # Field tambahan untuk RoutePreviewModal
                    "real_eta_traffic": jam_tiba_str,
                })
            else:
                on_time_count += 1

        return {
            "warnings":      warnings,
            "has_critical":  any(w["severity"] == "HIGH" for w in warnings),
            "route_id":      route.get("route_id"),
            "on_time_count": on_time_count,
            "total_stops":   total_stops,
        }

    except Exception as e:
        logger.error(f"🚨 VALIDATE SCHEDULE ERROR: {str(e)}")
        return {
            "warnings":      [],
            "has_critical":  False,
            "route_id":      route.get("route_id"),
            "on_time_count": 0,
            "total_stops":   0,
            "error":         str(e),
        }