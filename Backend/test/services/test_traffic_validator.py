# test/services/test_traffic_validator.py
"""
Unit tests untuk traffic_validator.py
- Semua test murni Python, tanpa DB atau HTTP
"""
import pytest
from services.traffic_validator import (
    _parse_jam,
    _get_tw_end,
    validate_route_traffic,
)


# ═══════════════════════════════════════════════════════════════════════════════
# _parse_jam — konversi string jam ke menit
# ═══════════════════════════════════════════════════════════════════════════════

def test_parse_jam_hhmm():
    assert _parse_jam("06:45") == 6 * 60 + 45  # = 405

def test_parse_jam_hhmmss_ignores_seconds():
    assert _parse_jam("06:45:30") == 6 * 60 + 45  # detik diabaikan

def test_parse_jam_midnight():
    assert _parse_jam("00:00") == 0

def test_parse_jam_end_of_day():
    assert _parse_jam("23:59") == 23 * 60 + 59  # = 1439

def test_parse_jam_none_returns_none():
    assert _parse_jam(None) is None

def test_parse_jam_empty_returns_none():
    assert _parse_jam("") is None

def test_parse_jam_invalid_string_returns_none():
    assert _parse_jam("INVALID") is None


# ═══════════════════════════════════════════════════════════════════════════════
# _get_tw_end — ambil jam tutup toko dari stop dict
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_tw_end_from_jam_maks():
    stop = {"jam_maks": "18:00"}
    assert _get_tw_end(stop) == 18 * 60  # = 1080

def test_get_tw_end_from_timeWindow():
    stop = {"timeWindow": "17:30"}
    assert _get_tw_end(stop) == 17 * 60 + 30  # = 1050

def test_get_tw_end_prefers_jam_maks_over_timeWindow():
    stop = {"jam_maks": "18:00", "timeWindow": "20:00"}
    assert _get_tw_end(stop) == 18 * 60  # jam_maks diutamakan

def test_get_tw_end_defaults_2000():
    stop = {}  # tanpa time window
    assert _get_tw_end(stop) == 20 * 60  # default 20:00 = 1200


# ═══════════════════════════════════════════════════════════════════════════════
# validate_route_traffic — end-to-end validasi jadwal satu truk
# ═══════════════════════════════════════════════════════════════════════════════

def _make_route(stops):
    return {
        "route_id":         "RP-2026-05-28-T1",
        "armada":           "B 1234 TST",
        "detail_perjalanan": [
            {"keterangan": "Start",  "urutan": 0,  "nama_toko": "GUDANG", "lat": -6.207, "lon": 106.479},
            *stops,
            {"keterangan": "Finish", "urutan": 99, "nama_toko": "GUDANG", "lat": -6.207, "lon": 106.479},
        ]
    }

def test_validate_ontime_stop_no_warnings():
    route = _make_route([{
        "keterangan": "Stop", "urutan": 1,
        "nama_toko": "Superindo", "jam_tiba": "14:00",
        "jam_maks": "20:00", "lat": -6.200, "lon": 106.800
    }])
    result = validate_route_traffic(route, "2026-05-28")
    assert result["warnings"] == []
    assert result["on_time_count"] == 1
    assert result["has_critical"] is False

def test_validate_late_low_severity():
    # Terlambat 15 menit dari jam tutup
    route = _make_route([{
        "keterangan": "Stop", "urutan": 1,
        "nama_toko": "Giant", "jam_tiba": "20:15",
        "jam_maks": "20:00", "lat": -6.210, "lon": 106.810
    }])
    result = validate_route_traffic(route, "2026-05-28")
    assert len(result["warnings"]) == 1
    assert result["warnings"][0]["severity"] == "LOW"
    assert result["warnings"][0]["delay_minutes"] == 15
    assert result["has_critical"] is False

def test_validate_late_high_severity():
    # Terlambat 60 menit — severity HIGH
    route = _make_route([{
        "keterangan": "Stop", "urutan": 1,
        "nama_toko": "Hypermart", "jam_tiba": "21:00",
        "jam_maks": "20:00", "lat": -6.220, "lon": 106.820
    }])
    result = validate_route_traffic(route, "2026-05-28")
    assert len(result["warnings"]) == 1
    assert result["warnings"][0]["severity"] == "HIGH"
    assert result["has_critical"] is True

def test_validate_no_jam_maks_uses_default():
    # Stop tanpa jam_maks — harusnya pakai default 20:00, tidak crash
    route = _make_route([{
        "keterangan": "Stop", "urutan": 1,
        "nama_toko": "Toko X", "jam_tiba": "19:00",
        "lat": -6.230, "lon": 106.830
    }])
    result = validate_route_traffic(route, "2026-05-28")
    assert result["on_time_count"] == 1  # 19:00 < 20:00 = tepat waktu
    assert result["warnings"] == []

def test_validate_multiple_stops_mixed():
    route = _make_route([
        {"keterangan": "Stop", "urutan": 1, "nama_toko": "Toko A",
         "jam_tiba": "10:00", "jam_maks": "18:00", "lat": -6.20, "lon": 106.80},
        {"keterangan": "Stop", "urutan": 2, "nama_toko": "Toko B",
         "jam_tiba": "21:00", "jam_maks": "20:00", "lat": -6.21, "lon": 106.81},
    ])
    result = validate_route_traffic(route, "2026-05-28")
    assert result["on_time_count"] == 1
    assert len(result["warnings"]) == 1
    assert result["total_stops"] == 2

def test_validate_empty_route_no_crash():
    route = {"route_id": "RP-EMPTY", "armada": "B 0000 TST", "detail_perjalanan": []}
    result = validate_route_traffic(route, "2026-05-28")
    assert result["warnings"] == []
    assert result["total_stops"] == 0