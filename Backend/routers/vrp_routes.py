# Backend/routers/vrp_routes.py

import datetime
import json
import math
import os
import shutil
import logging
from typing import Optional

import openpyxl
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
import schemas
from services import osrm_service, eta_service, zoning_service
from dependencies import get_db, get_settings, get_current_user, require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Route Management & Export"])

# ==========================================
# 🌟 GLOBAL JOB TRACKER
# ==========================================
VRP_JOBS = {}
TRAFFIC_JOBS = {}


# ==========================================
# 🌟 HELPER FUNCTIONS
# ==========================================
def update_job_status(
    job_store: dict,
    job_id: str,
    status: str,
    progress: int = 0,
    message: str = "",
    data=None
):
    if job_id not in job_store:
        job_store[job_id] = {}

    job_store[job_id]["status"] = status
    job_store[job_id]["progress"] = progress
    job_store[job_id]["message"] = message
    job_store[job_id]["updated_at"] = str(datetime.datetime.now())

    if data is not None:
        job_store[job_id]["data"] = data


def _run_traffic_validation(job_id: str):
    """
    Background Traffic Validator
    """
    try:
        update_job_status(
            TRAFFIC_JOBS,
            job_id,
            "processing",
            5,
            "Memulai traffic validation..."
        )

        vrp_job = VRP_JOBS.get(job_id)

        if not vrp_job:
            update_job_status(
                TRAFFIC_JOBS,
                job_id,
                "failed",
                100,
                "VRP job tidak ditemukan."
            )
            return

        routes = vrp_job.get("data", {}).get("routes", [])

        if not routes:
            update_job_status(
                TRAFFIC_JOBS,
                job_id,
                "failed",
                100,
                "Routes kosong."
            )
            return

        from services import traffic_validator

        all_warnings = []
        today = str(datetime.datetime.now().date())
        total_routes = len(routes)

        for idx, route in enumerate(routes):
            progress = int(((idx + 1) / total_routes) * 90)

            update_job_status(
                TRAFFIC_JOBS,
                job_id,
                "processing",
                progress,
                f"Validasi route {idx+1}/{total_routes}"
            )

            result = traffic_validator.validate_route_traffic(
                route,
                today
            )

            if result.get("warnings"):
                all_warnings.extend(result["warnings"])

        update_job_status(
            TRAFFIC_JOBS,
            job_id,
            "completed",
            100,
            "Traffic validation selesai.",
            {
                "warnings": all_warnings,
                "critical_count": len([
                    w for w in all_warnings
                    if w.get("severity") == "HIGH"
                ])
            }
        )

        logger.info(f"✅ Traffic validation selesai: {job_id}")

    except Exception as e:
        logger.error(
            f"🚨 [TRAFFIC VALIDATION ERROR]: {str(e)}",
            exc_info=True
        )

        update_job_status(
            TRAFFIC_JOBS,
            job_id,
            "failed",
            100,
            str(e)
        )


# ==========================================
# 🌟 ENDPOINTS
# ==========================================

# ------------------------------------------
# 1. GET ROUTES
# ------------------------------------------
@router.get("/routes", response_model=schemas.GetRoutesResponse)
def get_routes(
    date: Optional[str] = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.TMSRoutePlan)
    if date:
        try: 
            query = query.filter(models.TMSRoutePlan.planning_date == datetime.datetime.strptime(date, "%Y-%m-%d").date())
        except Exception as e:
            logger.warning(
                f"⚠️ Invalid route date format: {date}"
            )
            raise HTTPException(
                status_code=400,
                detail="Format tanggal salah!"
            )

    zona_dummy = ["Bekasi/Cikarang", "Kelapa Gading", "Kembangan/Jakbar", "Serpong/BSD", "Pusat/Selatan", "Bogor", "Tigaraksa"]
    settings = get_settings()

    hasil = []
    routes = query.all()

    is_route_empty = len(routes) == 0

    for rute in routes:
        lines = db.query(models.TMSRouteLine).filter(models.TMSRouteLine.route_id == rute.route_id).order_by(models.TMSRouteLine.sequence).all()
        detail_rute = []
        for line in lines:
            order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == line.order_id).first()
            if order:
                items = json.loads(order.service_type) if order.service_type and order.service_type.startswith('[') else []
                nama_toko_asli = order.customer.store_name if hasattr(order, 'customer') and order.customer else (order.customer_name if hasattr(order, 'customer_name') else "Toko")
                
                detail_rute.append({
                    "urutan": line.sequence, 
                    "nama_toko": nama_toko_asli, 
                    "latitude": float(order.latitude) if order.latitude else 0.0,
                    "longitude": float(order.longitude) if order.longitude else 0.0, 
                    "berat_kg": order.weight_total,
                    "jam_tiba": str(line.est_arrival), 
                    "distance_from_prev_km": line.distance_from_prev_km or 0.0, 
                    "items": items
                })

        garis_aspal = []
        try:
            with open(f"route_geometries/{rute.route_id}.json", "r") as f: 
                garis_aspal = json.load(f)
        except Exception as e:
            logger.warning(
                f"⚠️ Gagal load geometry untuk route {rute.route_id}: {str(e)}"
            )

        idx_zona = int(rute.route_id[-1]) % len(zona_dummy) if rute.route_id[-1].isdigit() else 0
        transport_cost = round((rute.total_distance_km or 0) * (settings.cost_fuel_per_liter / settings.cost_avg_km_per_liter))

        hasil.append({
            "route_id": rute.route_id, 
            "tanggal": str(rute.planning_date), 
            "driver_name": rute.driver.name if rute.driver else "-",
            "kendaraan": rute.vehicle.license_plate if rute.vehicle else "-", 
            "jenis": rute.vehicle.type if rute.vehicle else "-",
            "destinasi_jumlah": len(detail_rute), 
            "total_berat": rute.total_weight, 
            "total_distance_km": rute.total_distance_km,
            "transport_cost": transport_cost, 
            "status": "Aktif", 
            "zone": zona_dummy[idx_zona], 
            "detail_rute": detail_rute, 
            "garis_aspal": garis_aspal
        })

    dropped_nodes_response = []
    
    if not is_route_empty:
        unassigned = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.status == models.DOStatus.do_verified).all()
        dropped_nodes_response = [{
            "nama_toko": o.customer.store_name if hasattr(o, 'customer') and o.customer else (o.customer_name if hasattr(o, 'customer_name') else "Toko"), 
            "berat_kg": o.weight_total, 
            "alasan": "Drop AI (Overcapacity)", 
            "lat": float(o.latitude) if o.latitude else 0.0, 
            "lon": float(o.longitude) if o.longitude else 0.0
        } for o in unassigned]

    return {
        "routes": hasil, 
        "dropped_nodes": dropped_nodes_response
    }


# ------------------------------------------
# 2. RESEQUENCE (TSP) SETELAH MANUAL OVERRIDE
# ------------------------------------------
@router.post("/routes/resequence")
def resequence_routes(payload: dict, db: Session = Depends(get_db)):
    from utils.helpers import time_str_to_minutes, menit_ke_jam
    try:
        settings = get_settings()
        DEPO_LAT = settings.depo_lat
        DEPO_LON = settings.depo_lon
        START_MINUTE = time_str_to_minutes(settings.vrp_start_time)
        BASE_DROP = settings.vrp_base_drop_time_mins
        VAR_DROP = settings.vrp_var_drop_time_mins
        
        jadwal = payload.get("jadwal_truk_internal", [])
        
        for truk in jadwal:
            stops = truk.get("detail_perjalanan", [])
            customers = [s for s in stops if str(s.get("keterangan", "")).lower() not in ["start", "finish"] and s.get("urutan", 0) != 0]
            
            if len(customers) < 2:
                continue 
                
            locations = [{"lat": DEPO_LAT, "lon": DEPO_LON}]
            demands = [0]
            customer_map = {} 
            
            for idx, c in enumerate(customers):
                locations.append({"lat": float(c["lat"]), "lon": float(c["lon"])})
                berat = float(c.get("turun_barang_kg", 0) or c.get("berat_kg", 0))
                demands.append(int(berat))
                customer_map[idx + 1] = c
            
            dist_mat, time_mat = osrm_service.build_osrm_matrix(locations)
            if not dist_mat:
                dist_mat, time_mat = osrm_service.build_haversine_matrix(locations)
            
            matrix_km = [[int(d / 1000) for d in row] for row in dist_mat]
            
            best_indices = list(range(len(locations)))
            caps = [sum(demands) + 9999]
            is_mall = [False] * len(locations)
            time_windows = [(0, 1440)] * len(locations)
            
            from services import vrp_solver
            hasil_tsp = vrp_solver.solve_vrp(
                matrix_km, time_mat, demands, 1, caps, is_mall, time_windows, BASE_DROP, VAR_DROP
            )
            
            if hasil_tsp and hasil_tsp['routes'] and len(hasil_tsp['routes'][0]) > 0:
                best_indices = hasil_tsp['routes'][0]
            
            new_manifest = []
            current_time = START_MINUTE
            prev_node = 0
            total_jarak_m = 0
            
            for step, node_idx in enumerate(best_indices):
                seg_km = round((dist_mat[prev_node][node_idx] if step != 0 else 0) / 1000.0, 1)
                if step != 0:
                    current_time += time_mat[prev_node][node_idx]
                    total_jarak_m += dist_mat[prev_node][node_idx]
                    
                if node_idx == 0:
                    new_manifest.append({
                        "urutan": step, 
                        "lokasi": "📍 GUDANG JAPFA", 
                        "jam": str(menit_ke_jam(current_time)),
                        "keterangan": "Start", 
                        "lat": DEPO_LAT, 
                        "lon": DEPO_LON, 
                        "distance_from_prev_km": seg_km
                    })
                else:
                    cust = customer_map[node_idx]
                    est_arrival = menit_ke_jam(current_time)
                    
                    cust["urutan"] = step
                    cust["jam_tiba"] = str(est_arrival)
                    cust["distance_from_prev_km"] = seg_km
                    new_manifest.append(cust)
                    
                    service_time = BASE_DROP + (demands[node_idx] * VAR_DROP / 10.0)
                    current_time += service_time
                    
                prev_node = node_idx
            
            est_finish_m = dist_mat[prev_node][0] if dist_mat else 0
            est_finish_km = round(est_finish_m / 1000.0, 1)
            
            current_time += (time_mat[prev_node][0] if time_mat else 0)
            total_jarak_m += est_finish_m
            
            new_manifest.append({
                "urutan": len(best_indices), 
                "lokasi": "📍 GUDANG JAPFA", 
                "jam": str(menit_ke_jam(current_time)),
                "keterangan": "Finish", 
                "lat": DEPO_LAT, 
                "lon": DEPO_LON, 
                "distance_from_prev_km": est_finish_km
            })
                
            route_geometry = osrm_service.get_road_geometry(best_indices + [0], locations)
            truk["garis_aspal"] = route_geometry
            truk["detail_perjalanan"] = new_manifest
            truk["total_jarak_km"] = round(total_jarak_m / 1000.0, 1)

        return payload

    except Exception as e:
        logger.error(f"🚨 [RESEQUENCE ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Gagal menghitung ulang urutan rute.")

# ==========================================
# 🌟 START TRAFFIC VALIDATION JOB
# ==========================================
@router.post("/routes/validate-traffic/{job_id}")
def start_traffic_validation(job_id: str, background_tasks: BackgroundTasks):
    # Pastikan data VRP-nya ada, karena worker butuh data rute dari VRP_JOBS
    if job_id not in VRP_JOBS:
        raise HTTPException(
            status_code=404, 
            detail=f"VRP Job dengan ID {job_id} tidak ditemukan. Jalankan VRP terlebih dahulu."
        )

    # KODE YANG SEMPAT MENGGANTUNG ADA DI SINI
    TRAFFIC_JOBS[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Menunggu traffic validation...",
        "updated_at": str(datetime.datetime.now())
    }

    # Lempar tugas validasi ke background agar response API langsung return (tidak nunggu proses selesai)
    background_tasks.add_task(_run_traffic_validation, job_id)

    return {
        "message": "Traffic validation job berhasil dimasukkan ke antrean.",
        "job_id": job_id,
        "status": "queued"
    }


# ------------------------------------------
# 3. CONFIRM ROUTES
# ------------------------------------------
@router.post("/routes/confirm", response_model=schemas.ConfirmRouteResponse)
def confirm_routes(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    try:
        today = datetime.datetime.now().date()
        jadwal = payload.get("jadwal_truk_internal", [])

        if not jadwal:
            raise HTTPException(
                status_code=400,
                detail="Tidak ada data rute untuk dikonfirmasi."
            )

        # =====================================================
        # 🌟 PHASE 1 - VALIDASI SEMUA DULU (NO DB CHANGE)
        # =====================================================
        used_route_ids = set()

        for truk in jadwal:
            route_id = truk.get("route_id")
            nopol = truk.get("armada")
            drv_id = truk.get("driver_id")
            hlp_id = truk.get("helper_id")

            # ROUTE ID
            if not route_id:
                raise HTTPException(status_code=400, detail="Ada route tanpa route_id.")
            if route_id in used_route_ids:
                raise HTTPException(status_code=400, detail=f"Duplicate route_id terdeteksi: {route_id}")
            used_route_ids.add(route_id)

            # VEHICLE
            vehicle = db.query(models.FleetVehicle).filter(models.FleetVehicle.license_plate == nopol).first()
            if not vehicle:
                raise HTTPException(status_code=400, detail=f"Armada '{nopol}' tidak ditemukan.")

            # DRIVER
            if not drv_id:
                raise HTTPException(status_code=400, detail=f"Truk {nopol} belum diassign driver.")

            driver = db.query(models.HRDriver).filter(models.HRDriver.driver_id == drv_id).first()
            if not driver:
                raise HTTPException(status_code=400, detail=f"Driver ID {drv_id} tidak ditemukan.")

            # HELPER OPTIONAL
            if hlp_id:
                helper = db.query(models.HRDriver).filter(models.HRDriver.driver_id == hlp_id).first()
                if not helper:
                    raise HTTPException(status_code=400, detail=f"Helper ID {hlp_id} tidak ditemukan.")

            # VALIDASI STOP
            for stop in truk.get("detail_perjalanan", []):
                nomor_do = stop.get("nomor_do") or stop.get("order_id") or stop.get("id")
                if not nomor_do:
                    continue

                order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == nomor_do).first()
                if not order:
                    raise HTTPException(status_code=400, detail=f"DO '{nomor_do}' tidak ditemukan.")

        # =====================================================
        # 🌟 PHASE 2 - EKSEKUSI DATABASE
        # =====================================================
        # HAPUS ROUTE HARI INI
        existing_routes = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).all()

        for rute in existing_routes:
            db.query(models.TMSRouteLine).filter(models.TMSRouteLine.route_id == rute.route_id).delete()

        db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).delete()

        # INSERT ROUTE BARU
        for truk in jadwal:
            nopol = truk.get("armada")
            vehicle = db.query(models.FleetVehicle).filter(models.FleetVehicle.license_plate == nopol).first()

            new_plan = models.TMSRoutePlan(
                route_id=truk["route_id"],
                planning_date=today,
                vehicle_id=vehicle.vehicle_id,
                driver_id=truk.get("driver_id"),
                helper_id=truk.get("helper_id"),
                total_weight=truk.get("total_muatan_kg", 0),
                total_distance_km=truk.get("total_jarak_km", 0)
            )

            db.add(new_plan)

            # INSERT ROUTE LINES
            for stop in truk.get("detail_perjalanan", []):
                nomor_do = stop.get("nomor_do") or stop.get("order_id") or stop.get("id")
                if not nomor_do:
                    continue

                # SAFE TIME PARSER
                try:
                    jam_parts = str(stop["jam_tiba"]).split(":")
                    jam_est = datetime.time(hour=int(jam_parts[0]), minute=int(jam_parts[1]))
                except Exception as e:
                    logger.warning(
                        f"⚠️ Invalid jam_tiba pada route {truk['route_id']}: {stop.get('jam_tiba')} | {str(e)}"
                    )
                    jam_est = datetime.time(hour=12, minute=0)

                route_line = models.TMSRouteLine(
                    route_id=truk["route_id"],
                    order_id=nomor_do,
                    sequence=stop.get("urutan", 0),
                    est_arrival=jam_est,
                    distance_from_prev_km=stop.get("distance_from_prev_km", 0)
                )

                db.add(route_line)

                # UPDATE ORDER STATUS
                order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == nomor_do).first()
                if order:
                    order.status = models.DOStatus.do_assigned_to_route

        # 🌟 JANGAN LUPA COMMIT DI SINI 🌟
        db.commit()

        # =====================================================
        # 🌟 SUCCESS
        # =====================================================
        return {
            "message": f"Sukses! {len(jadwal)} rute dikonfirmasi.",
            "status": "success"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [CONFIRM ROUTES ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal mengonfirmasi rute: {str(e)}")

# ------------------------------------------
# 4. GET TRAFFIC VALIDATION STATUS
# ------------------------------------------
@router.get("/routes/validate-traffic/{job_id}/status")
def get_traffic_validation_status(job_id: str):
    job = TRAFFIC_JOBS.get(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Traffic validation job tidak ditemukan."
        )

    return job


# ------------------------------------------
# 5. EXPORT KE CORPORATE EXCEL TEMPLATE
# ------------------------------------------
@router.get("/routes/export-excel", response_class=FileResponse)
def export_all_routes_to_excel(date: str, db: Session = Depends(get_db)):
    try:
        target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        routes = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == target_date).all()
        
        if not routes:
            raise HTTPException(status_code=400, detail="Tidak ada rute berjalan di tanggal ini!")

        template_path = "templates/DO_TEMPLATE.xlsx"
        output_filename = f"Surat_Jalan_JAPFA_{date}.xlsx"
        
        os.makedirs("static/uploads", exist_ok=True)
        output_path = f"static/uploads/{output_filename}"
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=404, detail="File DO_TEMPLATE.xlsx tidak ditemukan di folder Backend/templates/")

        shutil.copyfile(template_path, output_path)
        wb = openpyxl.load_workbook(output_path)
        sheet_name = "JADWAL" if "JADWAL" in wb.sheetnames else wb.sheetnames[0]
        ws = wb[sheet_name]

        def tulis_sel(col_letter, row_number, val):
            coord = f"{col_letter}{row_number}"
            cell = ws[coord]
            
            if type(cell).__name__ == 'MergedCell':
                for m_range in ws.merged_cells.ranges:
                    if coord in m_range:
                        ws.cell(row=m_range.min_row, column=m_range.min_col).value = val
                        break
            else:
                cell.value = val
        
        BLOCK_HEIGHT = 36 
        
        for idx, rute in enumerate(routes):
            offset = idx * BLOCK_HEIGHT
            
            if idx == 0:
                tulis_sel("I", 2, str(target_date))
            
            tulis_sel("C", 7 + offset, rute.vehicle.license_plate if rute.vehicle else "-")
            tulis_sel("J", 7 + offset, rute.driver.name if rute.driver else "-")
            tulis_sel("J", 8 + offset, rute.helper.name if hasattr(rute, 'helper') and rute.helper else "Tanpa Helper")
            
            lines = db.query(models.TMSRouteLine).filter(
                models.TMSRouteLine.route_id == rute.route_id
            ).order_by(models.TMSRouteLine.sequence).all()
            
            for item_idx, line in enumerate(lines):
                if item_idx >= 30: 
                    break 
                    
                row_target = 10 + offset + item_idx
                order = line.order
                if not order: 
                    continue
                
                nama_toko = "Toko JAPFA"
                kode_toko = ""
                if hasattr(order, 'customer') and order.customer:
                    nama_toko = order.customer.store_name
                    kode_toko = order.customer.kode_customer or ""
                elif hasattr(order, 'customer_name') and order.customer_name:
                    nama_toko = order.customer_name

                jenis_barang = "FROZEN"
                kategori = "AYAM"
                if order.service_type and order.service_type.startswith('['):
                    try:
                        items = json.loads(order.service_type)
                        if len(items) > 0:
                            jenis_barang = items[0].get('tipe', 'FROZEN')
                    except Exception as e:
                        logger.warning(
                            f"⚠️ Gagal parse service_type DO {order.order_id}: {str(e)}"
                        )
                
                tulis_sel("A", row_target, rute.vehicle.license_plate if rute.vehicle else "-")
                tulis_sel("B", row_target, line.sequence)
                tulis_sel("C", row_target, kode_toko)
                tulis_sel("D", row_target, nama_toko)
                tulis_sel("E", row_target, float(order.weight_total) if order.weight_total else 0)
                tulis_sel("F", row_target, jenis_barang)
                tulis_sel("G", row_target, kategori)
                tulis_sel("H", row_target, str(line.est_arrival)[:5] if line.est_arrival else "-")
                tulis_sel("K", row_target, order.order_id)
                
            tulis_sel("E", 41 + offset, rute.total_weight)
            
        wb.save(output_path)
        
        return FileResponse(
            path=output_path, 
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚨 [EXCEL EXPORT ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate Excel: {str(e)}")