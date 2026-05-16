# services/analytics_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
import math

import models

def parse_dates(start_str: str, end_str: str):
    try:
        s_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        e_date = datetime.strptime(end_str, "%Y-%m-%d").date()
        return s_date, e_date
    except ValueError:
        e_date = date.today()
        s_date = e_date - timedelta(days=30)
        return s_date, e_date

# =====================================================================
# MESIN REAL-TIME ALERTS (7 SKENARIO)
# =====================================================================
def get_realtime_alerts(db: Session):
    alerts = []
    now = datetime.now()
    today = now.date()

    # 1. PENDING PENGIRIMAN (WARNING)
    pending_count = db.query(models.DeliveryOrder).filter(
        models.DeliveryOrder.status == models.DOStatus.do_verified
    ).count()

    if pending_count > 0:
        alerts.append({
            "title": "Pending Pengiriman", 
            "time": "Live", 
            "desc": f"{pending_count} Delivery Orders (DO) masih dalam status Pending (Belum dapat armada).", 
            "icon": "pending_actions", 
            "bgColor": "bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10",
            "iconColor": "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 rounded-lg p-2",
            "severity": "warning"
        })

    active_routes = db.query(models.TMSRouteLine).join(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today,
        models.TMSRouteLine.order_id != None
    ).all()

    # 2 & 4. KEMACETAN & OVERSTAY (CRITICAL / WARNING)
    for line in active_routes:
        if line.est_arrival and line.order and line.order.status == models.DOStatus.do_assigned_to_route:
            dt_est = datetime.combine(today, line.est_arrival)
            delay_mins = int((now - dt_est).total_seconds() / 60)
            plat = line.route_plan.vehicle.license_plate if line.route_plan.vehicle else "Unknown"
            supir = line.route_plan.driver.name if line.route_plan.driver else "Unknown"
            
            if delay_mins >= 60:
                alerts.append({
                    "title": "Driver Detention", 
                    "time": f"{math.floor(delay_mins/60)}h {delay_mins%60}m ago", 
                    "desc": f"{plat} menunggu sangat lama ({delay_mins} menit) di target Customer! Segera cek status driver.", 
                    "icon": "hourglass_empty", 
                    "bgColor": "bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10",
                    "iconColor": "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 rounded-lg p-2",
                    "severity": "critical"
                })
                
            elif delay_mins > 20:
                alerts.append({
                    "title": "Kemacetan Driver", 
                    "time": f"{delay_mins}m ago", 
                    "desc": f"{plat} ({supir}) terdeteksi macet/terlambat menuju rute selanjutnya (Delay +{delay_mins}m).", 
                    "icon": "traffic", 
                    "bgColor": "bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10",
                    "iconColor": "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 rounded-lg p-2",
                    "severity": "warning"
                })

    # 3. PENGIRIMAN RETUR (CRITICAL)
    returns_today = db.query(models.TMSEpodHistory).filter(
        models.TMSEpodHistory.qty_return > 0,
        func.date(models.TMSEpodHistory.timestamp) == today
    ).all()

    if returns_today:
        total_kg = sum(r.qty_return for r in returns_today)
        alerts.append({
            "title": "Pengiriman Retur", 
            "time": "Hari ini", 
            "desc": f"{len(returns_today)} Pesanan dikonfirmasi Retur hari ini (Total: {total_kg} Kg). Cek panel Retur.", 
            "icon": "assignment_return", 
            "bgColor": "bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10",
            "iconColor": "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 rounded-lg p-2",
            "severity": "critical"
        })

    # 5, 6, 7. STATUS PERJALANAN (INFO & WARNING)
    routes_today = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).all()
    for rute in routes_today:
        total_stops = db.query(models.TMSRouteLine).filter(
            models.TMSRouteLine.route_id == rute.route_id, 
            models.TMSRouteLine.sequence > 0
        ).count()
        
        if total_stops > 0:
            completed_stops = db.query(models.TMSEpodHistory).join(models.TMSRouteLine).filter(
                models.TMSRouteLine.route_id == rute.route_id,
                models.TMSEpodHistory.status.in_([models.DOStatus.delivered_success, models.DOStatus.delivered_partial])
            ).count()
            
            plat = rute.vehicle.license_plate if rute.vehicle else "Unknown"

            if completed_stops == total_stops:
                alerts.append({
                    "title": "Rute Selesai",
                    "time": "Baru saja",
                    "desc": f"Truk {plat} telah menyelesaikan seluruh tugas pengirimannya ({total_stops} drop) dengan aman.",
                    "icon": "task_alt",
                    "bgColor": "bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10",
                    "iconColor": "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg p-2",
                    "severity": "info"
                })
            
            elif 0 < completed_stops < total_stops:
                alerts.append({
                    "title": "Progress Armada",
                    "time": "Live",
                    "desc": f"Truk {plat} masih di jalan. Telah menyelesaikan {completed_stops} dari {total_stops} titik pengiriman.",
                    "icon": "local_shipping",
                    "bgColor": "bg-cyan-50/50 dark:bg-cyan-500/5 border border-cyan-100 dark:border-cyan-500/10",
                    "iconColor": "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg p-2",
                    "severity": "info"
                })
            
            elif completed_stops == 0 and now.hour >= 11:
                alerts.append({
                    "title": "Unscheduled Stop", 
                    "time": "System AI", 
                    "desc": f"{plat} belum memulai pengiriman sama sekali walau sudah siang. Hubungi driver segera!", 
                    "icon": "location_off", 
                    "bgColor": "bg-slate-50/50 dark:bg-slate-500/5 border border-slate-200 dark:border-slate-800",
                    "iconColor": "text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-lg p-2",
                    "severity": "warning"
                })

    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda x: severity_rank.get(x.get("severity", "info"), 3))
    return alerts[:20]

# =====================================================================
# DASHBOARD UTAMA
# =====================================================================
def get_kpi_summary(db: Session, start_date_str: str, end_date_str: str, settings):
    start_date, end_date = parse_dates(start_date_str, end_date_str)

    rute_aktif = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date
    ).all()

    total_do = 0
    total_berat = 0.0
    total_capacity_available = 0.0
    total_trucks_used = len(rute_aktif)

    for rute in rute_aktif:
        if rute.vehicle and rute.vehicle.capacity_kg:
            total_capacity_available += float(rute.vehicle.capacity_kg)
        else:
            total_capacity_available += 2000.0 
            
        for line in rute.route_lines:
            if line.sequence > 0 and line.order:
                total_do += 1
                total_berat += float(line.order.weight_total) if line.order.weight_total else 0.0

    load_utilization = 0.0
    if total_capacity_available > 0:
        load_utilization = round((total_berat / total_capacity_available) * 100, 1)
        load_utilization = min(load_utilization, 100.0)

    fill_rate, return_rate, damage_rate, otif_rate = 0.0, 0.0, 0.0, 0.0

    expenses = db.query(models.OperationalExpense).filter(
        models.OperationalExpense.date >= start_date,
        models.OperationalExpense.date <= end_date
    ).all()
    
    total_cost = sum([float(e.total) for e in expenses])

    today = datetime.now().date()
    today_orders = db.query(models.TMSRouteLine).join(
        models.TMSRoutePlan, models.TMSRouteLine.route_id == models.TMSRoutePlan.route_id
    ).filter(
        models.TMSRoutePlan.planning_date == today,
        models.TMSRouteLine.sequence > 0
    ).all()

    today_target_kg, completed_qty_kg = 0.0, 0.0
    completed_drops, in_transit_drops = 0, 0

    for line in today_orders:
        weight = float(line.order.weight_total) if line.order and line.order.weight_total else 0.0
        today_target_kg += weight
        
        epod = db.query(models.TMSEpodHistory).filter(models.TMSEpodHistory.line_id == line.line_id).first()
        if epod and epod.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial]:
            completed_drops += 1
            completed_qty_kg += float(epod.qty_delivered) if epod.qty_delivered else weight
        else:
            in_transit_drops += 1

    today_remaining_kg = max(0.0, today_target_kg - completed_qty_kg)
    completed_percent = round((completed_qty_kg / today_target_kg) * 100, 1) if today_target_kg > 0 else 0.0
    
    in_transit_qty_kg = today_remaining_kg
    in_transit_percent = 100.0 - completed_percent if today_target_kg > 0 else 0.0

    return {
        "status": "success",
        "success_rate_percent": otif_rate,
        "load_factor_percent": load_utilization,
        "total_weight_kg": round(total_berat, 1),
        "active_fleet_count": total_trucks_used,
        "data": {
            "transportCost": round(total_cost, 2),
            "fillRate": fill_rate,
            "returnRate": return_rate,
            "damageRate": damage_rate,
        },
        "today_target": round(today_target_kg, 1),
        "today_remaining": round(today_remaining_kg, 1),
        "completed_qty": round(completed_qty_kg, 1),
        "completed_percent": completed_percent,
        "completed_drops": completed_drops,
        "in_transit_qty": round(in_transit_qty_kg, 1),
        "in_transit_percent": in_transit_percent,
        "in_transit_drops": in_transit_drops
    }

# =====================================================================
# EFFICIENCY DASHBOARD (PURE REAL DATA)
# =====================================================================
def get_efficiency_dashboard(db: Session, settings):
    now = datetime.now()
    start_of_month = now.replace(day=1).date()
    
    total_shipments = db.query(models.DeliveryOrder).count()

    rutes = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_of_month
    ).all()
    
    total_capacity = 0.0
    total_weight = 0.0

    for r in rutes:
        if r.vehicle and r.vehicle.capacity_kg:
            total_capacity += float(r.vehicle.capacity_kg)
        else:
            total_capacity += 2000.0
            
        r_weight = sum([float(line.order.weight_total) for line in r.route_lines if line.order and line.order.weight_total and line.sequence > 0])
        total_weight += r_weight

    lf_percent = round((total_weight / total_capacity) * 100, 1) if total_capacity > 0 else 0.0
    
    expenses = db.query(models.OperationalExpense).filter(
        models.OperationalExpense.date >= start_of_month
    ).all()

    tot_bbm, tot_tol, tot_parkir, tot_parkir_liar, tot_kuli, tot_lain, tot_driver = 0, 0, 0, 0, 0, 0, 0

    if expenses:
        tot_bbm = sum([float(e.bbm) for e in expenses])
        tot_tol = sum([float(e.tol) for e in expenses])
        tot_parkir = sum([float(e.parkir) for e in expenses])
        tot_parkir_liar = sum([float(e.parkir_liar) for e in expenses])
        tot_kuli = sum([float(e.kuli_angkut) for e in expenses])
        tot_lain = sum([float(e.lain_lain) for e in expenses])
        tot_driver = len(expenses) * (settings.cost_driver_salary / 22) 

    total_cost = tot_bbm + tot_tol + tot_parkir + tot_parkir_liar + tot_kuli + tot_lain + tot_driver
    cost_per_kg = f"{round(total_cost / total_weight, 0):,}".replace(",", ".") if total_weight > 0 and total_cost > 0 else "0"

    cost_dist = []
    if total_cost > 0:
        cost_dist = [
            { "label": "BBM", "percent": round((tot_bbm/total_cost)*100), "color": "bg-japfa-orange", "stroke": "#F28C38" },
            { "label": "Driver", "percent": round((tot_driver/total_cost)*100), "color": "bg-orange-300", "stroke": "#ffcc80" },
            { "label": "Tol & Parkir", "percent": round(((tot_tol+tot_parkir)/total_cost)*100), "color": "bg-amber-700", "stroke": "#8d6e63" },
            { "label": "Lain-Lain (Kuli/Liar)", "percent": round(((tot_kuli+tot_parkir_liar+tot_lain)/total_cost)*100), "color": "bg-[#1d2d50]", "stroke": "#1d2d50" }
        ]

    tot_hidden = tot_parkir_liar + tot_kuli + tot_lain
    hidden_costs = []
    if tot_hidden > 0:
        hidden_costs = [
            { "label": "Parkir Liar", "value": f"{round((tot_parkir_liar/tot_hidden)*100)}%", "color": "bg-japfa-orange" },
            { "label": "Kuli Angkut", "value": f"{round((tot_kuli/tot_hidden)*100)}%", "color": "bg-orange-300" },
            { "label": "Lain-Lain", "value": f"{round((tot_lain/tot_hidden)*100)}%", "color": "bg-slate-700" }
        ]

    op_excellence = []
    for rute in rutes[:5]: 
        w = sum([float(line.order.weight_total) for line in rute.route_lines if line.order and line.order.weight_total and line.sequence > 0])
        c = float(rute.vehicle.capacity_kg) if rute.vehicle and rute.vehicle.capacity_kg else 2000.0
        lf_rute = round((w/c)*100) if c > 0 else 0
        
        start_time = db.query(func.min(models.TMSRouteLine.est_arrival)).filter(models.TMSRouteLine.route_id == rute.route_id).scalar()
        
        op_excellence.append({
            "route": f"Route #{rute.route_id}", 
            "region": rute.vehicle.license_plate if rute.vehicle else "Umum", 
            "otif": "-", 
            "lead": f"{start_time.strftime('%H:%M')} WIB" if start_time else "-", 
            "factor": f"{lf_rute}%",
            "status": "Optimal" if lf_rute > 80 else "Underloaded",
            "color": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" if lf_rute > 80 else "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
        })

    lf_trend = []
    for i in range(6, -1, -1):
        target_date = now.date() - timedelta(days=i)
        rutes_day = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == target_date).all()
        
        w_day = 0.0
        c_day = 0.0
        for r in rutes_day:
            w_day += sum([float(line.order.weight_total) for line in r.route_lines if line.order and line.order.weight_total and line.sequence > 0])
            c_day += float(r.vehicle.capacity_kg) if r.vehicle and r.vehicle.capacity_kg else 2000.0
            
        lf_day = round((w_day / c_day) * 100) if c_day > 0 else 0
        lf_trend.append(lf_day)

    return {
        "kpi": {
            "totalShipments": total_shipments, "avgLeadTime": "N/A", "loadFactor": f"{lf_percent}%",
            "costPerKg": f"Rp {cost_per_kg}", "hiddenCost": f"{round((tot_hidden/total_cost)*100, 1) if total_cost > 0 else 0}%"
        },
        "lfTrend": lf_trend,
        "costDist": cost_dist,
        "hiddenCosts": hidden_costs,
        "opExcellence": op_excellence,
        "leakagePoints": []
    }

# =====================================================================
# REJECTION ANALYSIS
# =====================================================================
def get_rejection_analysis(db: Session, start_date_str: str = None, end_date_str: str = None):
    query = db.query(
        models.TMSEpodHistory.return_reason,
        func.count(models.TMSEpodHistory.pod_id).label('count')
    ).filter(
        models.TMSEpodHistory.status == models.DOStatus.delivered_partial,
        models.TMSEpodHistory.return_reason != None
    )

    if start_date_str and end_date_str:
        start_date, end_date = parse_dates(start_date_str, end_date_str)
        query = query.filter(
            func.date(models.TMSEpodHistory.timestamp) >= start_date,
            func.date(models.TMSEpodHistory.timestamp) <= end_date
        )

    rejections = query.group_by(models.TMSEpodHistory.return_reason).all()
    total_rejections = sum([r.count for r in rejections])

    if total_rejections == 0:
        return {"status": "success", "data": [{"reason": "Belum Ada Data Retur", "percentage": 0, "color": "bg-slate-200"}]}

    color_map = {
        "Barang Rusak": "bg-red-500",
        "Packaging Bocor": "bg-red-400",
        "Kadaluarsa": "bg-orange-500",
        "Salah Produk": "bg-orange-400",
        "Customer Tidak Ada": "bg-slate-400"
    }

    data = []
    for reason, count in rejections:
        clean_reason = reason if reason in color_map else "Lainnya"
        color = color_map.get(clean_reason, "bg-gray-400")
        
        data.append({
            "reason": clean_reason,
            "percentage": round((count / total_rejections) * 100, 1),
            "color": color
        })

    data = sorted(data, key=lambda x: x['percentage'], reverse=True)
    return {"status": "success", "data": data}

def get_returns_dashboard(db: Session):
    returns = db.query(models.TMSEpodHistory, models.TMSRoutePlan, models.DeliveryOrder, models.FleetVehicle).join(
        models.TMSRouteLine, models.TMSEpodHistory.line_id == models.TMSRouteLine.line_id
    ).join(
        models.TMSRoutePlan, models.TMSRouteLine.route_id == models.TMSRoutePlan.route_id
    ).join(
        models.DeliveryOrder, models.TMSRouteLine.order_id == models.DeliveryOrder.order_id
    ).join(
        models.FleetVehicle, models.TMSRoutePlan.vehicle_id == models.FleetVehicle.vehicle_id
    ).filter(
        models.TMSEpodHistory.qty_return > 0
    ).all()

    quality_kg, sku_kg, cust_kg = 0.0, 0.0, 0.0
    fleet_map = {}
    audit_logs = []

    for epod, plan, order, vehicle in returns:
        r_qty = float(epod.qty_return) if epod.qty_return else 0.0
        reason = epod.return_reason or "Lainnya"
        
        if reason in ["Barang Rusak", "Packaging Bocor", "Kadaluarsa"]: quality_kg += r_qty
        elif reason in ["Salah Produk"]: sku_kg += r_qty
        else: cust_kg += r_qty

        plate = vehicle.license_plate
        if plate not in fleet_map: fleet_map[plate] = {"count": 0, "weight": 0.0}
        fleet_map[plate]["count"] += 1
        fleet_map[plate]["weight"] += r_qty

        status_color = "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
        if reason in ["Barang Rusak"]: status_color = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"

        audit_logs.append({
            "date": epod.timestamp.strftime("%d %b %Y"),
            "customer": order.customer_name,
            "id": order.order_id,
            "product": epod.driver_notes.replace("Produk Retur: ", "") if epod.driver_notes else "N/A",
            "weight": f"{r_qty} KG",
            "reason": reason,
            "status": "Selesai (Parsial)" if order.status == models.DOStatus.delivered_partial else "Investigating",
            "color": status_color
        })

    total_return_kg = quality_kg + sku_kg + cust_kg
    qp = round((quality_kg / total_return_kg) * 100, 1) if total_return_kg > 0 else 0
    sp = round((sku_kg / total_return_kg) * 100, 1) if total_return_kg > 0 else 0
    cp = round((cust_kg / total_return_kg) * 100, 1) if total_return_kg > 0 else 0

    fleet_performance = [{"plate": k, "count": v["count"], "weight": round(v["weight"], 1), "trend": "flat", "percent": "Data Aktual"} for k, v in fleet_map.items()]
    fleet_performance = sorted(fleet_performance, key=lambda x: x['weight'], reverse=True)

    return {
        "summary": {
            "qualityKg": quality_kg, "qualityRupiah": quality_kg * 25000, "qualityTrend": 0,
            "skuKg": sku_kg, "skuRupiah": sku_kg * 25000, "skuTrend": 0,
            "custKg": cust_kg, "custRupiah": cust_kg * 25000, "custTrend": 0,
            "totalReturnKg": total_return_kg
        },
        "distribution": { "qualityPercent": qp, "skuPercent": sp, "custPercent": cp },
        "fleet_performance": fleet_performance,
        "audit_logs": audit_logs
    }

def get_manager_overview(db: Session):
    today = datetime.now().date()
    total_do = db.query(models.DeliveryOrder).count()
    active_fleet = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).count()
    
    expenses_today = db.query(models.OperationalExpense).filter(models.OperationalExpense.date == today).all()
    actual_cost = sum([float(e.total) for e in expenses_today])
    
    cost = db.query(func.sum(models.TMSRoutePlan.total_distance_km)).scalar() or 0
    est_cost = actual_cost if actual_cost > 0 else ((cost / 5.0) * 12500)

    now = datetime.now()
    active_routes = db.query(models.TMSRouteLine).join(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today,
        models.TMSRouteLine.order_id != None
    ).all()
    
    delayed_trucks = 0
    for line in active_routes:
        if line.est_arrival and line.order and line.order.status == models.DOStatus.do_assigned_to_route:
            dt_est = datetime.combine(today, line.est_arrival)
            delay_mins = int((now - dt_est).total_seconds() / 60)
            if delay_mins > 20:
                delayed_trucks += 1

    return {
        "status": "success",
        "data": {
            "total_orders": total_do,
            "active_fleet_today": active_fleet,
            "delayed_trucks": delayed_trucks, 
            "estimated_cost_rp": int(est_cost)
        }
    }

def get_delivery_volume(db: Session, start_date_str: str, end_date_str: str):
    start_date, end_date = parse_dates(start_date_str, end_date_str)

    # 🌟 FIX 1: Sinkronisasi mutlak sama KPI! 
    # Wajib tambahin filter order_id != None biar "Data Hantu" ngga ikut kehitung.
    lines = db.query(models.TMSRouteLine).join(
        models.TMSRoutePlan,
        models.TMSRouteLine.route_id == models.TMSRoutePlan.route_id
    ).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date,
        models.TMSRouteLine.sequence > 0,
        models.TMSRouteLine.order_id != None  # <-- INI KUNCI SINKRONNYA!
    ).all()

    # 🌟 FIX 2: Kalau hari itu emang KOSONG (Belum Routing)
    # Langsung balikin array [], biar Frontend nampilin teks "No routing data found"
    if not lines:
        return {"status": "success", "data": [], "max": 0}

    buckets = { "06:00": 0, "08:00": 0, "10:00": 0, "12:00": 0, "14:00": 0, "16:00": 0, "18:00": 0, "20:00": 0 }

    for line in lines:
        if line.est_arrival:
            h = line.est_arrival.hour
            if h < 8: buckets["06:00"] += 1
            elif h < 10: buckets["08:00"] += 1
            elif h < 12: buckets["10:00"] += 1
            elif h < 14: buckets["12:00"] += 1
            elif h < 16: buckets["14:00"] += 1
            elif h < 18: buckets["16:00"] += 1
            elif h < 20: buckets["18:00"] += 1
            else: buckets["20:00"] += 1

    data = [{"time": k, "count": v, "hour": k, "orders": v} for k, v in buckets.items()]
    max_val = max([v for v in buckets.values()] + [1])

    return {"status": "success", "data": data, "max": max_val}

def get_fleet_utilization(db: Session, start_date_str: str, end_date_str: str):
    start_date, end_date = parse_dates(start_date_str, end_date_str)
    total_truck = db.query(models.FleetVehicle).count() or 1
    
    delta_days = (end_date - start_date).days + 1
    days = delta_days if delta_days > 0 else 1

    total_rute = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date
    ).count()

    active_avg = round(total_rute / days)
    utilization = min(round((active_avg / total_truck) * 100), 100)

    return {
        "status": "success",
        "data": {
            "totalTrucks": total_truck,
            "activeTrucks": active_avg,
            "utilizationRate": f"{utilization}%"
        },
        "active_trucks": active_avg,
        "total_trucks": total_truck,
        "utilization_rate": utilization
    }