# services/vrp_solver.py  — JAPFA VRP Engine v2.1 (Stable)
#
# CHANGELOG dari v1:
#   [FIXED] Slack 120 menit (max nunggu 2 jam, bukan 24 jam/1440)
#   [FIXED] Time limit 60 detik
#   [REMOVED] SetGlobalSpanCostCoefficient — menyebabkan fatal C++ crash
#             di OR-Tools ketika ada kendaraan dengan rute kosong.
#             Keseimbangan dicapai lewat capacity constraints + GLS.
#   [REMOVED] ReadAssignmentFromRoutes warm start — juga penyebab crash.
#
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import logging

logger = logging.getLogger(__name__)


def solve_vrp(
    distance_matrix,
    time_matrix,
    demands,
    num_vehicles,
    vehicle_capacities,
    is_mall_list,
    time_windows,
    base_drop_time,
    var_drop_time,
    warm_start_routes=None,   # diterima tapi tidak dipakai (crash risk)
):
    """
    Solver CVRPTW untuk distribusi frozen food JAPFA.

    Keseimbangan antar truk dicapai lewat:
    - Capacity constraints (truk tidak bisa overload → distribusi natural)
    - Disjunction penalty 500.000 (solver usahakan semua toko terlayani)
    - PARALLEL_CHEAPEST_INSERTION → geographic initial solution
    - GLS 60 detik → fine-tune
    """
    n_nodes = len(distance_matrix)

    data = {
        'distance_matrix':    distance_matrix,
        'time_matrix':        time_matrix,
        'demands':            demands,
        'vehicle_capacities': vehicle_capacities,
        'num_vehicles':       num_vehicles,
        'time_windows':       time_windows,
        'depot':              0,
    }

    manager = pywrapcp.RoutingIndexManager(n_nodes, num_vehicles, data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    # ── [A] DIMENSI JARAK ─────────────────────────────────────────────────
    def distance_callback(fi, ti):
        return data['distance_matrix'][manager.IndexToNode(fi)][manager.IndexToNode(ti)]

    dist_cb = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(dist_cb)
    routing.AddDimension(dist_cb, 0, 300_000, True, 'Distance')

    # CATATAN: SetGlobalSpanCostCoefficient TIDAK dipakai di sini.
    # Kombinasi GlobalSpan + kendaraan rute kosong = fatal C++ crash.

    # ── [B] DIMENSI KAPASITAS (KG) ────────────────────────────────────────
    def demand_callback(fi):
        return data['demands'][manager.IndexToNode(fi)]

    demand_cb = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_cb, 0, data['vehicle_capacities'], True, 'Capacity'
    )

    # ── [C] DIMENSI WAKTU ─────────────────────────────────────────────────
    def time_callback(fi, ti):
        fn = manager.IndexToNode(fi)
        tn = manager.IndexToNode(ti)
        travel = data['time_matrix'][fn][tn]
        if tn == 0:
            return int(travel)
        qty = data['demands'][tn]
        service = (60 if is_mall_list[tn] else base_drop_time) + (qty * var_drop_time / 10.0)
        return int(travel + service)

    time_cb = routing.RegisterTransitCallback(time_callback)

    # Slack 120 menit = max nunggu 2 jam per stop (fix dari v1 yang 1440 = 24 jam)
    MAX_WAIT = 120
    MAX_DAY  = 1440
    routing.AddDimension(time_cb, MAX_WAIT, MAX_DAY, False, 'Time')
    time_dim = routing.GetDimensionOrDie('Time')

    depot_start, depot_end = data['time_windows'][0]

    # Time windows per toko
    for loc_idx, (tw_s, tw_e) in enumerate(data['time_windows']):
        if loc_idx == data['depot']:
            continue
        ridx = manager.NodeToIndex(loc_idx)
        if is_mall_list[loc_idx]:
            # Mall / chain minimarket → hard window (tidak boleh telat)
            time_dim.CumulVar(ridx).SetRange(tw_s, tw_e)
        else:
            # Toko biasa → soft window, boleh lembur max 2 jam
            deadline = min(tw_e + 120, MAX_DAY)
            time_dim.CumulVar(ridx).SetRange(depot_start, deadline)
            time_dim.SetCumulVarSoftUpperBound(ridx, tw_e, 100)

    # Depot constraints + finalizer (agar truk kosong pun ter-bound)
    for v in range(num_vehicles):
        si = routing.Start(v)
        ei = routing.End(v)
        time_dim.CumulVar(si).SetRange(depot_start, depot_end)
        time_dim.CumulVar(ei).SetRange(depot_start, MAX_DAY)
        routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(si))
        routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(ei))

    # ── [D] DENDA DROP NODE ───────────────────────────────────────────────
    for node in range(1, n_nodes):
        routing.AddDisjunction([manager.NodeToIndex(node)], 500_000)

    # ── [E] SEARCH PARAMETERS ────────────────────────────────────────────
    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    params.time_limit.seconds = 60

    # ── [F] SOLVE ─────────────────────────────────────────────────────────
    if warm_start_routes:
        logger.info("ℹ️  warm_start_routes tersedia (tidak diinjeksi — stable mode)")

    logger.info(
        f"🤖 OR-Tools CVRPTW: {n_nodes - 1} toko | {num_vehicles} truk | GLS 60 detik"
    )
    solution = routing.SolveWithParameters(params)

    # ── [G] FORMAT HASIL ──────────────────────────────────────────────────
    if not solution:
        logger.error("❌ OR-Tools: tidak ada solusi ditemukan!")
        return None

    results = {'routes': [], 'dropped_nodes': []}

    for v in range(num_vehicles):
        idx = routing.Start(v)
        route = []
        while not routing.IsEnd(idx):
            route.append(manager.IndexToNode(idx))
            idx = solution.Value(routing.NextVar(idx))
        route.append(manager.IndexToNode(idx))
        results['routes'].append(route)

    for node in range(1, n_nodes):
        nidx = manager.NodeToIndex(node)
        if solution.Value(routing.NextVar(nidx)) == nidx:
            results['dropped_nodes'].append(node)

    active = sum(1 for r in results['routes'] if len(r) > 2)
    logger.info(
        f"✅ Solusi: {active}/{num_vehicles} truk aktif | "
        f"{len(results['dropped_nodes'])} toko drop"
    )
    return results