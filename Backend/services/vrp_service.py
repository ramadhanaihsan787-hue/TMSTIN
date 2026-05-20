# services/vrp_service.py
from typing import List, Dict, Any
import datetime
from utils.helpers import time_str_to_minutes
# Import solver yang udah lu bikin tadi
from services import vrp_solver

class VRPService:
    @staticmethod
    def prepare_vrp_data(orders: List[Any], vehicles: List[Any], settings: Any):
        """
        Ngeracik data dari Database (SQLAlchemy Objects) biar siap dimakan OR-Tools
        """
        coordinates = [(settings.depo_lat, settings.depo_lon)]
        demands = [0]
        is_mall_list = [False]
        start_min = time_str_to_minutes(settings.vrp_start_time)
        end_min   = time_str_to_minutes(settings.vrp_end_time) 
        time_windows = [(start_min, end_min)]
        
        order_mapping = {} # Biar kita tau node 1 itu DO nomor berapa

        for idx, order in enumerate(orders):
            coordinates.append((float(order.latitude), float(order.longitude)))
            demands.append(int(order.weight_total))
            
            # 🌟 FIX ERROR ATTRIBUTE: Ambil nama toko dengan aman lewat relasi
            store_name = order.customer.store_name if hasattr(order, 'customer') and order.customer else (getattr(order, 'customer_name', "Toko"))
            
            # Cek apakah dia Mall/Supermarket (Biar service time-nya beda)
            keywords = ['MALL', 'PLAZA', 'SQUARE', 'SUPERMARKET', 'HYPERMART', 'LOTTE']
            is_mall = any(kw in str(store_name).upper() for kw in keywords)
            is_mall_list.append(is_mall)
            
            # Time window per toko
            tw_s = order.delivery_window_start or start_min
            tw_e = order.delivery_window_end or end_min
            time_windows.append((tw_s, tw_e))
            
            order_mapping[idx + 1] = order.order_id

        return {
            "coordinates": coordinates,
            "demands": demands,
            "capacities": [
                int(v.capacity_kg * (getattr(settings, "vrp_capacity_buffer_percent", 90) / 100.0))
                for v in vehicles
            ], # <--- 🌟 INI DIA KOMANYA BOS! Tadi lu lupa naruh ini doang wkwk
            "num_vehicles": len(vehicles),
            "time_windows": time_windows,
            "is_mall_list": is_mall_list,
            "order_mapping": order_mapping
        }

    @staticmethod
    def solve_and_format(vrp_input: Dict[str, Any], distance_matrix, time_matrix, settings):
        """
        Jalanin AI Solver terus balikin format yang rapi buat masuk DB/Frontend
        """
        # 1. Panggil si Otak (vrp_solver)
        raw_result = vrp_solver.solve_vrp(
            distance_matrix=distance_matrix,
            time_matrix=time_matrix,
            demands=vrp_input["demands"],
            num_vehicles=vrp_input["num_vehicles"],
            vehicle_capacities=vrp_input["capacities"],
            is_mall_list=vrp_input["is_mall_list"],
            time_windows=vrp_input["time_windows"],
            base_drop_time=settings.vrp_base_drop_time_mins,
            var_drop_time=settings.vrp_var_drop_time_mins
        )

        if not raw_result:
            return None

        # 2. Format hasil rute biar sinkron sama tabel TMSRoutePlan & TMSRouteLine
        formatted_routes = []
        for truck_idx, node_indices in enumerate(raw_result['routes']):
            if len(node_indices) <= 2: continue # Skip rute kosong
            
            formatted_routes.append({
                "truck_index": truck_idx,
                "node_sequence": node_indices,
                "order_ids": [vrp_input["order_mapping"][n] for n in node_indices if n != 0]
            })

        return {
            "routes": formatted_routes,
            "dropped_node_ids": [vrp_input["order_mapping"][n] for n in raw_result['dropped_nodes']]
        }