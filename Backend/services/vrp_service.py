# services/vrp_service.py
#
# JAPFA VRP Service v2 — Orchestrator untuk pipeline optimasi rute
#
# Perubahan dari v1:
#   [1] K-Means Warm Start — clustering geografis sebelum OR-Tools
#   [2] Alfamart / Indomaret / Alfamidi masuk MALL_KEYWORDS (hard time window)
#   [3] Departure hour diteruskan ke OSRM untuk traffic factor yang tepat
#
from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional

from utils.helpers import time_str_to_minutes
from services import vrp_solver
from services.zoning_service import _kmeans_clustering  # K-Means sudah ada, tidak perlu scikit-learn

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# [2] MALL_KEYWORDS — toko dengan hard time window
#
# Mall & hypermarket: ada jam operasional loading dock yang ketat.
# Chain minimarket (Alfamart, Indomaret, Alfamidi): ada jam buka/tutup yang
# konsisten dan ketat — delivery harus on-time, tidak bisa minta lembur.
# ─────────────────────────────────────────────────────────────────────────────
MALL_KEYWORDS = [
    'MALL', 'PLAZA', 'SQUARE',
    'SUPERMARKET', 'HYPERMART', 'LOTTE', 'GIANT', 'CARREFOUR',
    'ALFAMART', 'INDOMARET', 'ALFAMIDI',
    'LAWSON', 'CIRCLE K', 'FAMILYMART',
]


def _is_hard_tw_store(store_name: str) -> bool:
    """True kalau toko ini butuh hard time window (mall / chain minimarket)."""
    name_upper = str(store_name).upper()
    return any(kw in name_upper for kw in MALL_KEYWORDS)


class VRPService:

    # ─────────────────────────────────────────────────────────────────────
    # [1] K-MEANS WARM START BUILDER
    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def _build_warm_start_routes(
        coordinates: list,
        num_vehicles: int,
    ) -> Optional[List[List[int]]]:
        """
        Fase 1 dari Hybrid Architecture: K-Means Clustering → Initial Routes.

        Gunakan _kmeans_clustering() dari zoning_service yang sudah ada
        (anchor-based K-Means dengan 7 anchor poin Jabodetabek kustom JAPFA).
        Tidak perlu scikit-learn — implementasi custom sudah tepat untuk geo-clustering.

        Flow:
            coordinates[0]     = depot
            coordinates[1..]   = toko (node 1, 2, 3, ...)

        Return:
            List[List[int]] — setiap inner list = node indices yang dialokasikan
            ke satu truk. Panjang = num_vehicles.
            None kalau clustering tidak memungkinkan.
        """
        n_stores = len(coordinates) - 1  # exclude depot
        if n_stores <= 0 or num_vehicles <= 1:
            return None

        # Format yang diharapkan _kmeans_clustering: list of {'lat', 'lon', '_node_idx'}
        # _node_idx: kita simpan untuk mapping balik ke node index OR-Tools
        store_locs = [
            {'lat': float(lat), 'lon': float(lon), '_node_idx': idx}
            for idx, (lat, lon) in enumerate(coordinates)
            if idx > 0  # skip depot
        ]

        k = min(num_vehicles, n_stores)

        try:
            clusters = _kmeans_clustering(store_locs, k, max_iters=25)
        except Exception as exc:
            logger.warning(f"⚠️ K-Means gagal: {exc} — lanjut tanpa warm start")
            return None

        # Pad jadi tepat num_vehicles routes (rute kosong untuk truk yang tidak butuh load)
        while len(clusters) < num_vehicles:
            clusters.append([])

        warm_start = [
            [loc['_node_idx'] for loc in cluster if '_node_idx' in loc]
            for cluster in clusters[:num_vehicles]
        ]

        filled = sum(1 for r in warm_start if r)
        total_assigned = sum(len(r) for r in warm_start)
        logger.info(
            f"🗺️ K-Means Warm Start: {n_stores} toko → "
            f"{filled} zona aktif | {total_assigned} toko ter-assign ke {num_vehicles} truk"
        )
        return warm_start

    # ─────────────────────────────────────────────────────────────────────
    # PREPARE VRP DATA
    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def prepare_vrp_data(
        orders: List[Any],
        vehicles: List[Any],
        settings: Any,
    ) -> Dict[str, Any]:
        """
        Racik data dari SQLAlchemy objects ke format yang dibutuhkan OR-Tools.

        Mengambil semua setting dari DB (DB-first via MR-2):
            - depo_lat / depo_lon
            - vrp_start_time / vrp_end_time
            - vrp_capacity_buffer_percent
            - vrp_base_drop_time_mins / vrp_var_drop_time_mins
        """
        start_min = time_str_to_minutes(settings.vrp_start_time)
        end_min   = time_str_to_minutes(settings.vrp_end_time)

        coordinates  = [(float(settings.depo_lat), float(settings.depo_lon))]
        demands      = [0]
        is_mall_list = [False]
        time_windows = [(start_min, end_min)]
        order_mapping: Dict[int, str] = {}

        for idx, order in enumerate(orders):
            coordinates.append((float(order.latitude), float(order.longitude)))
            demands.append(int(order.weight_total))

            # Ambil nama toko dengan aman (lewat relasi customer atau fallback)
            store_name = (
                order.customer.store_name
                if hasattr(order, 'customer') and order.customer
                else getattr(order, 'customer_name', 'Toko')
            )

            # [2] Cek hard time window pakai MALL_KEYWORDS yang sudah diperluas
            is_mall_list.append(_is_hard_tw_store(store_name))

            tw_s = order.delivery_window_start or start_min
            tw_e = order.delivery_window_end   or end_min
            time_windows.append((tw_s, tw_e))

            order_mapping[idx + 1] = order.order_id

        # Kapasitas truk dengan buffer dari settings DB (bukan hardcode 0.9)
        buffer_pct = getattr(settings, 'vrp_capacity_buffer_percent', 90)
        capacities = [
            int(v.capacity_kg * (buffer_pct / 100.0))
            for v in vehicles
        ]

        return {
            'coordinates':   coordinates,
            'demands':       demands,
            'capacities':    capacities,
            'num_vehicles':  len(vehicles),
            'time_windows':  time_windows,
            'is_mall_list':  is_mall_list,
            'order_mapping': order_mapping,
            # Departure hour untuk traffic factor OSRM
            'departure_hour': start_min // 60,
        }

    # ─────────────────────────────────────────────────────────────────────
    # SOLVE AND FORMAT
    # ─────────────────────────────────────────────────────────────────────
    @staticmethod
    def solve_and_format(
        vrp_input: Dict[str, Any],
        distance_matrix,
        time_matrix,
        settings: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        Orkestrasi lengkap:
            1. Bangun warm start dari K-Means
            2. Panggil OR-Tools solver (v2) dengan warm start
            3. Format hasil ke struktur yang siap masuk DB / frontend
        """
        # [1] Bangun warm start via K-Means
        warm_start = VRPService._build_warm_start_routes(
            vrp_input['coordinates'],
            vrp_input['num_vehicles'],
        )

        # [2] Solve
        raw = vrp_solver.solve_vrp(
            distance_matrix  = distance_matrix,
            time_matrix      = time_matrix,
            demands          = vrp_input['demands'],
            num_vehicles     = vrp_input['num_vehicles'],
            vehicle_capacities = vrp_input['capacities'],
            is_mall_list     = vrp_input['is_mall_list'],
            time_windows     = vrp_input['time_windows'],
            base_drop_time   = settings.vrp_base_drop_time_mins,
            var_drop_time    = settings.vrp_var_drop_time_mins,
            warm_start_routes = warm_start,
        )

        if not raw:
            return None

        # [3] Format hasil
        mapping = vrp_input['order_mapping']

        formatted_routes = []
        for truck_idx, node_seq in enumerate(raw['routes']):
            if len(node_seq) <= 2:
                # Rute kosong (depot → depot) — truk ini tidak berangkat
                continue
            formatted_routes.append({
                'truck_index':   truck_idx,
                'node_sequence': node_seq,
                'order_ids':     [mapping[n] for n in node_seq if n != 0],
            })

        dropped_ids = [mapping[n] for n in raw['dropped_nodes'] if n in mapping]
        if dropped_ids:
            logger.warning(
                f"⚠️ {len(dropped_ids)} toko tidak terlayani: {dropped_ids[:5]}"
                f"{'...' if len(dropped_ids) > 5 else ''}"
            )

        return {
            'routes':           formatted_routes,
            'dropped_node_ids': dropped_ids,
        }