# Backend/routers/vrp_jobs.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
import datetime
import uuid
import logging

from database import SessionLocal
import models
from services import vrp_service
from services import osrm_service, eta_service, zoning_service
from services.job_store import VRP_JOBS, TRAFFIC_JOBS, update_job_status
from dependencies import get_settings, require_role
from services import traffic_validator
from main import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["VRP AI Jobs & Optimization"])

# ==========================================
# CATATAN ARSITEKTUR
# ==========================================
# VRP_JOBS dan TRAFFIC_JOBS TIDAK dideklarasikan di sini.
# Keduanya diimpor dari services/job_store.py — satu-satunya
# sumber kebenaran untuk state job. vrp_routes.py juga
# mengimpor dari tempat yang sama, sehingga kedua router
# selalu membaca dan menulis ke dict yang sama persis.
# ==========================================


# ==========================================
# 1. BACKGROUND TASK — VRP OPTIMIZATION
# ==========================================
def run_vrp_optimization_task(job_id: str, preview: bool):
    """Heavy lifting VRP: jalan di background thread."""
    db = SessionLocal()
    try:
        update_job_status(VRP_JOBS, job_id, "processing", 20, "Menyiapkan data order & armada...")

        settings = get_settings()

        # 1. Ambil SEMUA DO yang statusnya terverifikasi
        pending_orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.status == models.DOStatus.do_verified
        ).all()
        
        if not pending_orders:
            raise Exception("Tidak ada Delivery Order terverifikasi!")

        # =========================================================
        # 🌟 ANTI-NULL KOORDINAT
        # =========================================================
        # Kita cek satu-satu, ada ngga toko yang GPS-nya masih bodong?
        # ── Validasi koordinat ketat: NULL, 0.0/0.0, di luar bounding box Indonesia
        # Bounding box Indonesia: lat [-11, 6], lon [95, 141]
        def _koordinat_invalid(order) -> bool:
            lat = order.latitude
            lon = order.longitude
            if lat is None or lon is None:
                return True
            try:
                lat_f, lon_f = float(lat), float(lon)
            except (TypeError, ValueError):
                return True
            # Koordinat (0, 0) = tengah laut, jelas salah
            if lat_f == 0.0 and lon_f == 0.0:
                return True
            # Di luar bounding box Indonesia (dengan margin)
            if not (-12.0 <= lat_f <= 7.0 and 94.0 <= lon_f <= 142.0):
                return True
            return False

        # Pisahkan toko valid vs toko tanpa koordinat
        # Toko tanpa koordinat TIDAK membatalkan VRP — masuk dropped_nodes
        orders_valid     = [o for o in pending_orders if not _koordinat_invalid(o)]
        orders_no_coord  = [o for o in pending_orders if     _koordinat_invalid(o)]

        if orders_no_coord:
            nama_list = [
                (o.customer.store_name if o.customer else o.order_id)
                for o in orders_no_coord
            ]
            logger.warning(
                f"⚠️ [VRP] {len(orders_no_coord)} toko tidak punya koordinat valid → "
                f"di-skip dari routing: {', '.join(nama_list[:5])}"
                f"{'...' if len(nama_list) > 5 else ''}"
            )

        if not orders_valid:
            raise Exception(
                "Tidak ada toko dengan koordinat valid. "
                "Lengkapi koordinat toko di Customer Data terlebih dahulu."
            )

        # Pakai hanya order valid untuk VRP
        pending_orders = orders_valid
        # =========================================================

        vehicles = db.query(models.FleetVehicle).filter(
            models.FleetVehicle.status == "Available"
        ).all()
        if not vehicles:
            raise Exception("Armada tidak tersedia!")

        update_job_status(VRP_JOBS, job_id, "processing", 30, "Menyiapkan data VRP...")

        vrp_input = vrp_service.VRPService.prepare_vrp_data(pending_orders, vehicles, settings)

        # ── ZONING INTEGRATION ────────────────────────────────────────────────
        # Cluster toko ke zona geografis sebelum build OSRM matrix.
        # Hasilnya disimpan di vrp_input["zone_clusters"] sebagai metadata.
        # Untuk saat ini: dipakai untuk progress reporting dan future warm start.
        # Next step (>150 toko): gunakan untuk pecah matriks per zona.
        try:
            n_stores = len(pending_orders)
            n_zones  = min(len(vehicles), 7)
            update_job_status(
                VRP_JOBS, job_id, "processing", 35,
                f"Clustering {n_stores} toko ke {n_zones} zona geografis..."
            )
            store_locs_for_zone = [
                {
                    "lat":       float(o.latitude),
                    "lon":       float(o.longitude),
                    "nama_toko": o.customer.store_name if o.customer else "Toko",
                    "order_id":  o.order_id,
                    "weight":    float(o.weight_total),
                }
                for o in pending_orders
            ]
            zone_clusters = zoning_service.cluster_stores_for_routing(
                store_locs_for_zone, num_zones=n_zones
            )
            vrp_input["zone_clusters"] = zone_clusters
            logger.info(
                f"🗺️  Zoning: {n_stores} toko → {len(zone_clusters)} cluster "
                f"({[len(c) for c in zone_clusters]} toko/zona)"
            )
        except Exception as zone_err:
            # Zoning gagal → lanjut tanpa clustering (tidak fatal)
            logger.warning(f"⚠️ Zoning gagal (lanjut tanpa cluster): {zone_err}")
            vrp_input["zone_clusters"] = []
        # ── END ZONING ────────────────────────────────────────────────────────

        n_locs = len(pending_orders) + 1  # +1 depot
        update_job_status(
            VRP_JOBS, job_id, "processing", 42,
            f"Membangun matrix {n_locs}×{n_locs} via OSRM..."
        )

        locs = [{"lat": lat, "lon": lon} for lat, lon in vrp_input["coordinates"]]
        departure_hour = vrp_input.get('departure_hour', 7)
        dist_mat, time_mat = osrm_service.build_osrm_matrix(locs, departure_hour=departure_hour)
        if not dist_mat:
            dist_mat, time_mat = osrm_service.build_haversine_matrix(locs, departure_hour=departure_hour)

        update_job_status(VRP_JOBS, job_id, "processing", 55, "OR-Tools sedang menghitung rute optimal...")

        hasil = vrp_service.VRPService.solve_and_format(vrp_input, dist_mat, time_mat, settings)

        formatted_routes = []
        spillover = []

        if hasil:
            from utils.helpers import menit_ke_jam

            # Buat lookup dict sekali — hindari O(n²) di inner loop
            order_lookup = {o.order_id: o for o in pending_orders}

            for route in hasil["routes"]:
                truck_idx = route["truck_index"]
                assigned_vehicle = vehicles[truck_idx]
                node_seq = route["node_sequence"]

                manifest = []
                current_time = 420   # 07:00 dalam menit
                prev_node = 0
                total_jarak_m = 0
                total_berat = 0

                for step, node_idx in enumerate(node_seq):
                    seg_m = dist_mat[prev_node][node_idx] if step != 0 else 0
                    seg_km = round(seg_m / 1000.0, 1)

                    if node_idx == 0:
                        # Depot (start atau finish)
                        if step != 0:
                            lat1 = float(locs[prev_node]["lat"])
                            lon1 = float(locs[prev_node]["lon"])
                            travel_mins = eta_service.get_dynamic_hybrid_eta(
                                lat1, lon1,
                                float(settings.depo_lat), float(settings.depo_lon),
                                current_time
                            )
                            current_time += travel_mins

                        manifest.append({
                            "urutan": step,
                            "lokasi": "📍 GUDANG JAPFA",
                            "jam": str(menit_ke_jam(current_time)),
                            "keterangan": "Start" if step == 0 else "Finish",
                            "lat": settings.depo_lat,
                            "lon": settings.depo_lon,
                            "distance_from_prev_km": seg_km,
                        })
                    else:
                        order_id = vrp_input["order_mapping"][node_idx]
                        order = order_lookup[order_id]

                        is_mall = vrp_input["is_mall_list"][node_idx]
                        base_time = 60 if is_mall else 15
                        var_time = (float(order.weight_total) / 10.0) * 1.0
                        service_time = base_time + var_time

                        travel_mins = eta_service.get_dynamic_hybrid_eta(
                            float(locs[prev_node]["lat"]), float(locs[prev_node]["lon"]),
                            float(order.latitude), float(order.longitude),
                            current_time
                        )
                        current_time += travel_mins

                        store_name = (
                            order.customer.store_name
                            if order.customer else "Toko"
                        )

                        manifest.append({
                            "urutan": step,
                            "nomor_do": order.order_id,
                            "nama_toko": store_name,
                            "turun_barang_kg": round(float(order.weight_total), 2),
                            "jam_tiba": str(menit_ke_jam(current_time)),
                            "lat": float(order.latitude),
                            "lon": float(order.longitude),
                            "distance_from_prev_km": seg_km,
                        })

                        current_time += service_time
                        total_berat += float(order.weight_total)

                    total_jarak_m += seg_m
                    prev_node = node_idx

                route_geometry = osrm_service.get_road_geometry(node_seq, locs)

                formatted_routes.append({
                    "route_id": f"RP-{datetime.datetime.now().strftime('%Y%m%d')}-T{truck_idx + 1}",
                    "color_index": truck_idx,
                    "armada": assigned_vehicle.license_plate,
                    "driver_id": assigned_vehicle.default_driver_id,
                    "helper_id": assigned_vehicle.co_driver_id,
                    "total_muatan_kg": round(total_berat, 2),
                    "total_jarak_km": round(total_jarak_m / 1000.0, 1),
                    "detail_perjalanan": manifest,
                    "garis_aspal": route_geometry,
                })

            for dropped_id in hasil["dropped_node_ids"]:
                order = order_lookup[dropped_id]
                store_name = order.customer.store_name if order.customer else "Toko"
                spillover.append({
                    "nama_toko":   store_name,
                    "kode_customer": order.customer.kode_customer if order.customer else None,
                    "berat_kg":    float(order.weight_total),
                    "alasan":      "Drop VRP Global (Kapasitas Maksimal / Waktu Lembur Habis)",
                    "reason":      "capacity_overflow",
                    "lat":         float(order.latitude),
                    "lon":         float(order.longitude),
                })

        # Tambahkan toko tanpa koordinat ke spillover (selalu, di luar blok hasil)
        for order in orders_no_coord:
            store_name = order.customer.store_name if order.customer else order.order_id
            kode       = order.customer.kode_customer if order.customer else None
            spillover.append({
                "nama_toko":     store_name,
                "kode_customer": kode,
                "berat_kg":      float(order.weight_total or 0),
                "alasan":        "Koordinat belum tersedia — pin lokasi di peta",
                "reason":        "no_coordinates",
                "lat":           None,
                "lon":           None,
            })

        # Jika preview=False, hapus rute lama hari ini dari DB
        today = datetime.datetime.now().date()
        if not preview:
            update_job_status(VRP_JOBS, job_id, "processing", 90, "Menyimpan rute ke database...")
            rute_lama = db.query(models.TMSRoutePlan).filter(
                models.TMSRoutePlan.planning_date == today
            ).all()
            for rute in rute_lama:
                db.query(models.TMSRouteLine).filter(
                    models.TMSRouteLine.route_id == rute.route_id
                ).delete()
            db.query(models.TMSRoutePlan).filter(
                models.TMSRoutePlan.planning_date == today
            ).delete()
            db.commit()

        # Tulis hasil final ke VRP_JOBS — satu operasi atomik (bukan update field by field)
        VRP_JOBS[job_id] = {
            "status": "completed",
            "phase": "done",
            "progress": 100,
            "message": f"{len(formatted_routes)} rute berhasil dibuat.",
            "updated_at": str(datetime.datetime.now()),
            "data": {
                "message": f"{'[PREVIEW] ' if preview else ''}{len(formatted_routes)} rute berhasil dibuat.",
                "total_trucks": len(formatted_routes),
                "total_orders": len(pending_orders),
                "dropped_count":           len(spillover),
                "no_coord_count":          len(orders_no_coord),
                "jadwal_truk_internal":    formatted_routes,
                "dropped_nodes_peta":      spillover,
            },
        }
        logger.info(f"✅ [VRP] Job {job_id[:8]}... selesai — {len(formatted_routes)} rute, {len(spillover)} drop.")

    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [VRP BACKGROUND TASK ERROR]: {str(e)}", exc_info=True)
        VRP_JOBS[job_id] = {
            "status": "failed",
            "phase": "error",
            "progress": 0,
            "message": str(e),
            "updated_at": str(datetime.datetime.now()),
            "data": None,
        }
    finally:
        db.close()

# ==========================================
# 2. BACKGROUND TASK — TRAFFIC VALIDATION
# ==========================================
def _run_traffic_validation(job_id: str):
    """
    Validasi apakah ETA tiap stop melewati time window-nya.
    Dijalankan setelah VRP selesai, sebagai background task terpisah.
    """
    try:
        update_job_status(TRAFFIC_JOBS, job_id, "processing", 5, "Memulai traffic validation...")

        vrp_job = VRP_JOBS.get(job_id)
        if not vrp_job:
            update_job_status(TRAFFIC_JOBS, job_id, "failed", 100, "VRP job tidak ditemukan.")
            return

        routes = vrp_job.get("data", {}).get("jadwal_truk_internal", [])
        if not routes:
            update_job_status(TRAFFIC_JOBS, job_id, "failed", 100, "Data rute kosong.")
            return

        today = str(datetime.datetime.now().date())
        all_warnings = []
        total_routes = len(routes)

        for idx, route in enumerate(routes):
            progress = int(((idx + 1) / total_routes) * 90)
            update_job_status(
                TRAFFIC_JOBS, job_id, "processing",
                progress, f"Validasi route {idx + 1}/{total_routes}"
            )
            result = traffic_validator.validate_route_traffic(route, today)
            if result.get("warnings"):
                all_warnings.extend(result["warnings"])

        critical_count = len([w for w in all_warnings if w.get("severity") == "HIGH"])
        update_job_status(
            TRAFFIC_JOBS, job_id, "completed", 100,
            "Traffic validation selesai.",
            data={
                "warnings": all_warnings,
                "critical_count": critical_count,
            },
        )
        logger.info(f"✅ [TRAFFIC] Job {job_id[:8]}... selesai — {len(all_warnings)} warning, {critical_count} kritis.")

    except Exception as e:
        logger.error(f"🚨 [TRAFFIC VALIDATION ERROR]: {str(e)}", exc_info=True)
        update_job_status(TRAFFIC_JOBS, job_id, "failed", 100, str(e))


# ==========================================
# 3. ENDPOINT: SPATIAL PREVIEW (ZONING)
# ==========================================
@router.post("/routes/spatial-preview")
def trigger_spatial_preview(preview: bool = True):
    """
    Petakan semua DO terverifikasi ke 7 zona JABODETABEK (K-Means anchored).
    Hasilnya untuk preview di UI sebelum user klik Optimize.
    """
    db = SessionLocal()
    try:
        # Include do_verified DAN so_waiting_verification — admin bisa preview
        # setelah upload tanpa harus verifikasi manual dulu
        pending_orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.status.in_([
                models.DOStatus.do_verified,
                models.DOStatus.so_waiting_verification,
            ])
        ).all()

        if not pending_orders:
            raise HTTPException(
                status_code=400,
                detail="Tidak ada Delivery Order untuk dipetakan. Upload file SAP terlebih dahulu."
            )

        locations_input = []
        for order in pending_orders:
            # Skip toko tanpa koordinat valid (tidak crash zoning service)
            try:
                lat_f = float(order.latitude or 0)
                lon_f = float(order.longitude or 0)
            except (TypeError, ValueError):
                continue
            if lat_f == 0.0 or lon_f == 0.0:
                continue
            if not (-12.0 <= lat_f <= 7.0 and 94.0 <= lon_f <= 142.0):
                continue

            store_name = order.customer.store_name if order.customer else "Toko"
            kode       = order.customer.kode_customer if order.customer else None
            locations_input.append({
                "lat":      lat_f,
                "lon":      lon_f,
                "nama_toko": store_name,
                "kode_customer": kode,
                "order_id": order.order_id,
                "weight":   float(order.weight_total or 0),
            })

        if not locations_input:
            raise HTTPException(
                status_code=400,
                detail="Semua Delivery Order belum memiliki koordinat GPS. Lengkapi koordinat toko terlebih dahulu."
            )

        zones_data = zoning_service.generate_spatial_zones(locations_input, num_zones=7)
        return {"status": "success", "data": zones_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 [SPATIAL PREVIEW ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal memuat spatial preview: {str(e)}")
    finally:
        db.close()


# ==========================================
# 4. ENDPOINT: START VRP OPTIMIZATION
# ==========================================
@router.post("/routes/optimize/start")
@limiter.limit("10/hour")
def start_optimize_routes(
    request: Request,
    background_tasks: BackgroundTasks,
    preview: bool = False,
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik")),
):
    """
    Mulai job VRP di background. Langsung return job_id untuk polling.
    """
    job_id = str(uuid.uuid4())
    VRP_JOBS[job_id] = {
        "status": "processing",
        "phase": "init",
        "progress": 5,
        "message": "Memulai inisialisasi AI Pipeline...",
        "updated_at": str(datetime.datetime.now()),
        "data": None,
    }
    background_tasks.add_task(run_vrp_optimization_task, job_id, preview)
    logger.info(f"🚀 [VRP] Job baru dimulai: {job_id} (preview={preview}) oleh {current_user.username}")
    return {"status": "success", "job_id": job_id}


# ==========================================
# 5. ENDPOINT: POLLING STATUS VRP
# ==========================================
@router.get("/routes/optimize/status/{job_id}")
def check_optimization_status(job_id: str):
    job_info = VRP_JOBS.get(job_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job ID tidak ditemukan.")
    return job_info


# ==========================================
# 6. ENDPOINT: START TRAFFIC VALIDATION
# ==========================================
@router.post("/routes/validate-traffic/{job_id}")
def start_traffic_validation(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik")),
):
    """
    Validasi apakah jadwal rute VRP terkena kemacetan (ETA vs time window).
    Harus dipanggil setelah VRP job selesai (status=completed).
    """
    vrp_result = VRP_JOBS.get(job_id)
    if not vrp_result or vrp_result.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail="VRP belum selesai atau job tidak ditemukan. Tunggu sampai status=completed."
        )

    TRAFFIC_JOBS[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Menunggu traffic validation...",
        "updated_at": str(datetime.datetime.now()),
    }
    background_tasks.add_task(_run_traffic_validation, job_id)
    logger.info(f"🚦 [TRAFFIC] Validation job dimulai untuk VRP job {job_id[:8]}...")
    return {"status": "success", "message": "Traffic validation dimulai.", "job_id": job_id}


# ==========================================
# 7. ENDPOINT: POLLING STATUS TRAFFIC VALIDATION
# ==========================================
@router.get("/routes/validate-traffic/{job_id}/status")
def get_traffic_validation_status(job_id: str):
    job = TRAFFIC_JOBS.get(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Traffic validation job tidak ditemukan."
        )
    return job