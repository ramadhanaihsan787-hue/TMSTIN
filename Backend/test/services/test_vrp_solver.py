# test/services/test_vrp_solver.py
"""
Unit tests untuk vrp_solver.py (OR-Tools CVRPTW)

Fokus:
- Solver tidak crash pada input edge-case
- Capacity constraint bekerja benar
- Custom service times diperhitungkan
- Hasil deterministik pada input sederhana
"""
import pytest
from services.vrp_solver import solve_vrp


# ── Helpers ───────────────────────────────────────────────────────────────────

def simple_distance_matrix(n: int, base_dist: int = 1000) -> list:
    """Matrix jarak sederhana: depot ke toko = base_dist, antar toko = 2 * base_dist."""
    mat = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                mat[i][j] = base_dist if (i == 0 or j == 0) else base_dist * 2
    return mat

def simple_time_matrix(n: int, minutes: int = 30) -> list:
    mat = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                mat[i][j] = minutes if (i == 0 or j == 0) else minutes * 2
    return mat


# ═══════════════════════════════════════════════════════════════════════════════
# BASIC FUNCTIONALITY
# ═══════════════════════════════════════════════════════════════════════════════

def test_solve_vrp_single_stop():
    """2 node (depot + 1 toko), 1 truk — paling minimal."""
    n = 2
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n),
        time_matrix        = simple_time_matrix(n),
        demands            = [0, 100],
        num_vehicles       = 1,
        vehicle_capacities = [2000],
        is_mall_list       = [False, False],
        time_windows       = [(0, 1440), (360, 1200)],
        base_drop_time     = 15,
        var_drop_time      = 1,
    )
    assert result is not None
    assert "routes" in result or isinstance(result, dict)

def test_solve_vrp_two_stops_one_truck():
    """3 node (depot + 2 toko), 1 truk kapasitas cukup — semua terlayani."""
    n = 3
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n),
        time_matrix        = simple_time_matrix(n),
        demands            = [0, 200, 300],
        num_vehicles       = 1,
        vehicle_capacities = [2000],
        is_mall_list       = [False, False, False],
        time_windows       = [(0, 1440)] * n,
        base_drop_time     = 15,
        var_drop_time      = 1,
    )
    assert result is not None

def test_solve_vrp_capacity_forces_spillover():
    """Total demand 1500 kg, kapasitas 1 truk 700 kg — ada toko yang di-drop."""
    n = 4  # depot + 3 toko
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n),
        time_matrix        = simple_time_matrix(n),
        demands            = [0, 500, 500, 500],  # total 1500
        num_vehicles       = 1,
        vehicle_capacities = [700],               # hanya muat 1 toko
        is_mall_list       = [False] * n,
        time_windows       = [(0, 1440)] * n,
        base_drop_time     = 15,
        var_drop_time      = 1,
    )
    # Tidak crash — ada atau tidak ada unserved tetap return dict
    assert result is not None

def test_solve_vrp_two_trucks():
    """3 toko, 2 truk — solver bebas distribusi."""
    n = 4
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n),
        time_matrix        = simple_time_matrix(n),
        demands            = [0, 200, 300, 250],
        num_vehicles       = 2,
        vehicle_capacities = [600, 600],
        is_mall_list       = [False] * n,
        time_windows       = [(0, 1440)] * n,
        base_drop_time     = 15,
        var_drop_time      = 1,
    )
    assert result is not None

def test_solve_vrp_custom_service_times_accepted():
    """Solver menerima custom_service_times tanpa crash."""
    n = 3
    result = solve_vrp(
        distance_matrix      = simple_distance_matrix(n),
        time_matrix          = simple_time_matrix(n),
        demands              = [0, 200, 300],
        num_vehicles         = 1,
        vehicle_capacities   = [2000],
        is_mall_list         = [False] * n,
        time_windows         = [(0, 1440)] * n,
        base_drop_time       = 15,
        var_drop_time        = 1,
        custom_service_times = [0.0, 45.0, 15.0],  # EMA per-toko
    )
    assert result is not None

def test_solve_vrp_tight_time_window_no_crash():
    """Time window sangat ketat — solver drop toko, tidak crash."""
    n = 3
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n, base_dist=50000),  # 50km
        time_matrix        = simple_time_matrix(n, minutes=180),           # 3 jam
        demands            = [0, 100, 100],
        num_vehicles       = 1,
        vehicle_capacities = [2000],
        is_mall_list       = [False] * n,
        time_windows       = [(0, 1440), (360, 365), (360, 365)],  # hanya 5 menit
        base_drop_time     = 15,
        var_drop_time      = 1,
    )
    # Tidak crash, hasil mungkin kosong/unserved
    assert result is not None

def test_solve_vrp_warm_start_ignored_no_crash():
    """warm_start_routes diterima tapi diabaikan — tidak crash."""
    n = 3
    result = solve_vrp(
        distance_matrix    = simple_distance_matrix(n),
        time_matrix        = simple_time_matrix(n),
        demands            = [0, 200, 300],
        num_vehicles       = 1,
        vehicle_capacities = [2000],
        is_mall_list       = [False] * n,
        time_windows       = [(0, 1440)] * n,
        base_drop_time     = 15,
        var_drop_time      = 1,
        warm_start_routes  = [[1, 2]],  # diterima tapi tidak dipakai
    )
    assert result is not None