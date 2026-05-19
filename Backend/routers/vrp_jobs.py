# Backend/routers/vrp_jobs.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
import datetime
import uuid
import logging

from database import SessionLocal
import models
from services import vrp_service 
from services import osrm_service, eta_service, zoning_service
from dependencies import get_settings, require_role
from services import traffic_validator
from main import limiter  # 🌟 Import limiter untuk gembok CPU Monster

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["VRP AI Jobs & Optimization"])

VRP_JOBS = {}
TRAFFIC_JOBS = {}

# ==========================================
# 1. BARISTA NYEDUH KOPI (FUNGSI BACKGROUND VRP UTAMA)
# ==========================================
def run_vrp_optimization_task(job_id: str, preview: bool):
    """Heavy lifting jalan di Pipeline VRP GLOBAL murni!"""
    db = SessionLocal() 
    try:
        VRP_JOBS[job_id]["phase"] = "zoning"
        VRP_JOBS[job_id]["progress"] = 20
        
        settings = get_settings()
        pending_orders = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.status == models.DOStatus.do_verified).all()
        if not pending_orders: raise Exception("Tidak ada Delivery Order terverifikasi!")

        vehicles = db.query(models.FleetVehicle).filter(models.FleetVehicle.status == "Available").all()
        if not vehicles: raise Exception("Armada tidak tersedia!")

        vrp_input = vrp_service.VRPService.prepare_vrp_data(pending_orders, vehicles, settings)
        
        locs = [{"lat": lat, "lon": lon} for lat, lon in vrp_input["coordinates"]]
        dist_mat, time_mat = osrm_service.build_osrm_matrix(locs)
        if not dist_mat:
            dist_mat, time_mat = osrm_service.build_haversine_matrix(locs)

        hasil = vrp_service.VRPService.solve_and_format(vrp_input, dist_mat, time_mat, settings)

        formatted_routes = []
        spillover = []

        if hasil:
            from utils.helpers import menit_ke_jam
            
            for route in hasil["routes"]:
                truck_idx = route["truck_index"]
                assigned_vehicle = vehicles[truck_idx]
                node_seq = route["node_sequence"]

                manifest = []
                current_time = 420 
                prev_node = 0
                total_jarak_m = 0
                total_berat = 0

                for step, node_idx in enumerate(node_seq):
                    seg_m = dist_mat[prev_node][node_idx] if step != 0 else 0
                    seg_km = round(seg_m / 1000.0, 1)

                    if node_idx == 0:
                        if step != 0: 
                            lat1, lon1 = float(locs[prev_node]['lat']), float(locs[prev_node]['lon'])
                            lat2, lon2 = float(settings.depo_lat), float(settings.depo_lon)
                            travel_mins = eta_service.get_dynamic_hybrid_eta(lat1, lon1, lat2, lon2, current_time)
                            current_time += travel_mins
                            
                        manifest.append({
                            "urutan": step, "lokasi": "📍 GUDANG JAPFA",
                            "jam": str(menit_ke_jam(current_time)),
                            "keterangan": "Start" if step == 0 else "Finish",
                            "lat": settings.depo_lat, "lon": settings.depo_lon,
                            "distance_from_prev_km": seg_km
                        })
                    else:
                        order_id = vrp_input["order_mapping"][node_idx]
                        order = next(o for o in pending_orders if o.order_id == order_id)

                        is_mall = vrp_input["is_mall_list"][node_idx]
                        base_time = 60 if is_mall else 15
                        var_time = (float(order.weight_total) / 10.0) * 1.0
                        service_time = base_time + var_time

                        lat1, lon1 = float(locs[prev_node]['lat']), float(locs[prev_node]['lon'])
                        lat2, lon2 = float(order.latitude), float(order.longitude)
                        
                        travel_mins = eta_service.get_dynamic_hybrid_eta(lat1, lon1, lat2, lon2, current_time)
                        current_time += travel_mins

                        store_name = order.customer.store_name if hasattr(order, 'customer') and order.customer else (order.customer_name if hasattr(order, 'customer_name') else "Toko")

                        manifest.append({
                            "urutan": step,
                            "nomor_do": order.order_id,
                            "nama_toko": store_name,
                            "turun_barang_kg": round(float(order.weight_total), 2),
                            "jam_tiba": str(menit_ke_jam(current_time)),
                            "lat": float(order.latitude), "lon": float(order.longitude),
                            "distance_from_prev_km": seg_km
                        })

                        current_time += service_time
                        total_berat += float(order.weight_total)

                    total_jarak_m += seg_m
                    prev_node = node_idx

                route_geometry = osrm_service.get_road_geometry(node_seq, locs)

                formatted_routes.append({
                    "route_id": f"RP-{datetime.datetime.now().strftime('%Y%m%d')}-T{truck_idx+1}",
                    "color_index": truck_idx,
                    "armada": assigned_vehicle.license_plate,
                    "driver_id": assigned_vehicle.default_driver_id,
                    "helper_id": assigned_vehicle.co_driver_id,
                    "total_muatan_kg": total_berat,
                    "total_jarak_km": round(total_jarak_m / 1000.0, 1),
                    "detail_perjalanan": manifest,
                    "garis_aspal": route_geometry
                })

            for dropped_id in hasil["dropped_node_ids"]:
                order = next(o for o in pending_orders if o.order_id == dropped_id)
                store_name = order.customer.store_name if hasattr(order, 'customer') and order.customer else (order.customer_name if hasattr(order, 'customer_name') else "Toko")
                spillover.append({
                    "nama_toko": store_name,
                    "berat_kg": float(order.weight_total),
                    "alasan": "Drop VRP Global (Kapasitas Maksimal / Waktu Lembur Habis)",
                    "lat": float(order.latitude),
                    "lon": float(order.longitude)
                })

        VRP_JOBS[job_id]["phase"] = "done"
        VRP_JOBS[job_id]["progress"] = 100

        today = datetime.datetime.now().date()
        
        if not preview:
            rute_lama = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).all()
            for rute in rute_lama:
                db.query(models.TMSRouteLine).filter(models.TMSRouteLine.route_id == rute.route_id).delete()
            db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).delete()
            db.commit()

        VRP_JOBS[job_id] = {
            "status": "completed",
            "phase": "done",
            "progress": 100,
            "data": {
                "message": f"[PREVIEW] {len(formatted_routes)} rute berhasil dibuat.",
                "total_trucks": len(formatted_routes), 
                "total_orders": len(pending_orders), 
                "dropped_count": len(spillover),
                "jadwal_truk_internal": formatted_routes, 
                "dropped_nodes_peta": spillover
            }
        }

    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [VRP BACKGROUND TASK ERROR]: {str(e)}", exc_info=True)
        VRP_JOBS[job_id] = {"status": "failed", "message": str(e)}
    finally:
        db.close() 

# ==========================================
# 2. ENDPOINT: TRIGGER SPATIAL PREVIEW (FIXED TO SYNCHRONOUS)
# ==========================================
@router.post("/routes/spatial-preview")
def trigger_spatial_preview(preview: bool = True):
    """
    🌟 FIX: Memanggil fungsi zoning Japfa dengan parameter utuh.
    Mengambil data DO terverifikasi, diubah jadi list dict, lalu dikunci ke 7 zona.
    """
    db = SessionLocal()
    try:
        # 1. Ambil seluruh Delivery Order terverifikasi dari database
        pending_orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.status == models.DOStatus.do_verified
        ).all()
        
        if not pending_orders:
            raise Exception("Tidak ada Delivery Order terverifikasi untuk dipetakan!")

        # 2. Re-format data DB jadi format List of Dict sesuai ekspektasi zoning_service
        locations_input = []
        for order in pending_orders:
            store_name = order.customer.store_name if hasattr(order, 'customer') and order.customer else (order.customer_name if hasattr(order, 'customer_name') else "Toko")
            locations_input.append({
                "lat": float(order.latitude),
                "lon": float(order.longitude),
                "nama_toko": store_name,
                "order_id": order.order_id,
                "weight": float(order.weight_total)
            })

        # 3. Panggil fungsi zoning_service dengan melampirkan 2 argumen wajibnya
        # num_zones dikunci ke angka 7 sesuai racikan kustom JAPFA
        zones_data = zoning_service.generate_spatial_zones(locations_input, num_zones=7)
        
        return {
            "status": "success",
            "data": zones_data
        }
    except Exception as e:
        logger.error(f"🚨 [SPATIAL PREVIEW ENDPOINT ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal memuat spatial preview: {str(e)}")
    finally:
        db.close()

# ==========================================
# 3. ENDPOINT MINTA TIKET & POLLING VRP (DILIMIT BIAR CPU AMAN)
# ==========================================
@router.post("/routes/optimize/start")
@limiter.limit("10/hour")
def start_optimize_routes(
    request: Request,
    background_tasks: BackgroundTasks,
    preview: bool = False,
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    job_id = str(uuid.uuid4())
    VRP_JOBS[job_id] = {
        "status": "processing",
        "phase": "init",
        "progress": 5,
        "message": "Memulai inisialisasi AI Pipeline...",
        "data": None
    }
    background_tasks.add_task(run_vrp_optimization_task, job_id, preview)
    return {"status": "success", "job_id": job_id}

@router.get("/routes/optimize/status/{job_id}")
def check_optimization_status(job_id: str):
    job_info = VRP_JOBS.get(job_id)
    if not job_info: raise HTTPException(status_code=404, detail="Job ID tidak ditemukan.")
    return job_info

# ==========================================
# 4. ENDPOINT VALIDASI MACET
# ==========================================
@router.post("/routes/validate-traffic/{job_id}")
def start_traffic_validation(
    job_id: str, background_tasks: BackgroundTasks,
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    vrp_result = VRP_JOBS.get(job_id)
    if not vrp_result or vrp_result["status"] != "completed":
        raise HTTPException(400, "VRP belum selesai atau job tidak ditemukan")
    
    TRAFFIC_JOBS[job_id] = {"status": "processing"}
    background_tasks.add_task(_run_traffic_validation, job_id)
    return {"status": "success", "message": "Traffic validation dimulai"}

def _run_traffic_validation(job_id: str):
    global TRAFFIC_JOBS
    try:
        TRAFFIC_JOBS[job_id]["status"] = "processing"
        vrp_job = VRP_JOBS.get(job_id)

        if not vrp_job:
            TRAFFIC_JOBS[job_id] = { "status": "failed", "message": "VRP Job tidak ditemukan" }
            return

        routes = vrp_job["data"]["jadwal_truk_internal"]
        today = str(datetime.date.today())
        all_warnings = []

        for route in routes:
            result = traffic_validator.validate_route_traffic(route, today)
            if result.get("warnings"):
                all_warnings.extend(result["warnings"])

        TRAFFIC_JOBS[job_id] = {
            "status": "completed",
            "warnings": all_warnings,
            "critical_count": len([w for w in all_warnings if w.get("severity") == "HIGH"])
        }
        print(f"✅ Traffic validation selesai untuk Job {job_id}")

    except Exception as e:
        print(f"🚨 TRAFFIC VALIDATION FAILED: {str(e)}")
        TRAFFIC_JOBS[job_id] = {
            "status": "failed",
            "message": str(e),
            "warnings": [],
            "critical_count": 0
        }

@router.get("/routes/validate-traffic/{job_id}/status")
def get_traffic_validation_status(job_id: str):
    return TRAFFIC_JOBS.get(job_id, {"status": "not_found"})