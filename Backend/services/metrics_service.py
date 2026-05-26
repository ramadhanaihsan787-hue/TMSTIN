# Backend/services/metrics_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import models
from services.kpi_calculator import parse_dates


def get_manager_overview(db: Session):
    today = datetime.now().date()
    now   = datetime.now()

    # ── Armada aktif hari ini ─────────────────────────────────────────────
    rute_hari_ini = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today
    ).all()
    active_fleet = len(rute_hari_ini)

    # ── Total order hari ini & status breakdown ───────────────────────────
    lines_today = db.query(models.TMSRouteLine).join(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today,
        models.TMSRouteLine.order_id != None,
        models.TMSRouteLine.sequence > 0
    ).all()

    total_stops    = len(lines_today)
    done_success   = sum(1 for l in lines_today
                         if l.order and l.order.status == models.DOStatus.delivered_success)
    done_partial   = sum(1 for l in lines_today
                         if l.order and l.order.status == models.DOStatus.delivered_partial)
    in_transit     = sum(1 for l in lines_today
                         if l.order and l.order.status == models.DOStatus.do_assigned_to_route)
    pending_count  = total_stops - done_success - done_partial - in_transit

    # ── Truk terlambat (ETA sudah lewat >20 menit, masih in-transit) ──────
    delayed_trucks = 0
    for line in lines_today:
        if (line.est_arrival
                and line.order
                and line.order.status == models.DOStatus.do_assigned_to_route):
            eta_dt = datetime.combine(today, line.est_arrival)
            overdue_min = int((now - eta_dt).total_seconds() / 60)
            if overdue_min > 20:
                delayed_trucks += 1

    # ── Total berat hari ini ──────────────────────────────────────────────
    total_weight_today = sum(
        float(l.order.weight_total)
        for l in lines_today
        if l.order and l.order.weight_total
    )
    weight_done = sum(
        float(l.order.weight_total)
        for l in lines_today
        if l.order and l.order.weight_total
        and l.order.status in [
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial
        ]
    )

    completed_pct  = round((weight_done / total_weight_today * 100), 1) if total_weight_today > 0 else 0
    done_pct_drops = round(((done_success + done_partial) / total_stops * 100), 1) if total_stops > 0 else 0

    # ── On-time rate (delivered & actual_arrival <= est_arrival + 30 mnt) ─
    on_time = sum(
        1 for l in lines_today
        if l.order
        and l.order.status in [
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial
        ]
        and l.actual_arrival_time
        and l.est_arrival
        and (datetime.combine(today, l.actual_arrival_time.time())
             - datetime.combine(today, l.est_arrival)).total_seconds() / 60 <= 30
    )
    delivered_total = done_success + done_partial
    on_time_rate = round((on_time / delivered_total * 100), 1) if delivered_total > 0 else 0

    # ── Biaya operasional hari ini ────────────────────────────────────────
    expenses_today = db.query(models.OperationalExpense).filter(
        models.OperationalExpense.date == today
    ).all()
    actual_cost = sum(float(e.total or 0) for e in expenses_today)

    # Estimasi kalau belum ada input kasir
    if actual_cost == 0:
        total_km = sum(float(r.total_distance_km or 0) for r in rute_hari_ini)
        actual_cost = (total_km / 5.0) * 12500  # asumsi 5 KM/L, Rp 12.500/L

    # ── Estimasi jam selesai ──────────────────────────────────────────────
    last_etas = [
        l.est_arrival for l in lines_today
        if l.est_arrival and l.order
        and l.order.status == models.DOStatus.do_assigned_to_route
    ]
    if last_etas:
        latest = max(last_etas)
        est_completion = f"{latest.hour:02d}:{latest.minute:02d}"
    else:
        est_completion = "--:--"

    # ── Risk level ────────────────────────────────────────────────────────
    if delayed_trucks == 0 and on_time_rate >= 90:
        risk_level = "Low Range"
    elif delayed_trucks <= 1 or on_time_rate >= 75:
        risk_level = "Medium Range"
    else:
        risk_level = "High Risk"

    return {
        "status": "success",
        "data": {
            # Existing fields (backward compat)
            "total_orders":       total_stops,
            "active_fleet_today": active_fleet,
            "delayed_trucks":     delayed_trucks,
            "estimated_cost_rp":  int(actual_cost),

            # Status breakdown hari ini
            "done_success":       done_success,
            "done_partial":       done_partial,
            "in_transit":         in_transit,
            "pending":            pending_count,
            "on_time_rate":       on_time_rate,
            "done_pct_drops":     done_pct_drops,

            # Weight progress
            "total_weight_today": round(total_weight_today, 1),
            "weight_done":        round(weight_done, 1),
            "completed_percent":  completed_pct,

            # Timing
            "est_completion":     est_completion,
            "risk_level":         risk_level,
        }
    }


def get_delivery_volume(db: Session, start_date_str: str, end_date_str: str):
    start_date, end_date = parse_dates(start_date_str, end_date_str)

    lines = db.query(models.TMSRouteLine).join(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date,
        models.TMSRouteLine.sequence > 0,
        models.TMSRouteLine.order_id != None
    ).all()

    if not lines:
        return {"status": "success", "data": [], "max": 0}

    buckets = {
        "06:00": 0, "08:00": 0, "10:00": 0, "12:00": 0,
        "14:00": 0, "16:00": 0, "18:00": 0, "20:00": 0
    }

    for line in lines:
        if line.est_arrival:
            h = line.est_arrival.hour
            if h < 8:    buckets["06:00"] += 1
            elif h < 10: buckets["08:00"] += 1
            elif h < 12: buckets["10:00"] += 1
            elif h < 14: buckets["12:00"] += 1
            elif h < 16: buckets["14:00"] += 1
            elif h < 18: buckets["16:00"] += 1
            elif h < 20: buckets["18:00"] += 1
            else:        buckets["20:00"] += 1

    data = [{"time": k, "count": v, "hour": k, "orders": v} for k, v in buckets.items()]
    return {"status": "success", "data": data, "max": max(list(buckets.values()) + [1])}


def get_fleet_utilization(db: Session, start_date_str: str, end_date_str: str):
    start_date, end_date = parse_dates(start_date_str, end_date_str)
    total_truck = db.query(models.FleetVehicle).count() or 1

    delta_days = (end_date - start_date).days + 1
    days = delta_days if delta_days > 0 else 1

    total_rute = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date
    ).count()

    active_avg  = round(total_rute / days)
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
        return {"status": "success", "data": [
            {"reason": "Belum Ada Data Retur", "percentage": 0, "color": "bg-slate-200"}
        ]}

    color_map = {
        "Barang Rusak": "bg-red-500", "Packaging Bocor": "bg-red-400",
        "Kadaluarsa": "bg-orange-500", "Salah Produk": "bg-orange-400",
        "Customer Tidak Ada": "bg-slate-400"
    }
    data = [
        {
            "reason": r if r in color_map else "Lainnya",
            "percentage": round((c / total_rejections) * 100, 1),
            "color": color_map.get(r if r in color_map else "Lainnya", "bg-gray-400")
        }
        for r, c in rejections
    ]
    return {"status": "success", "data": sorted(data, key=lambda x: x['percentage'], reverse=True)}


def get_returns_dashboard(db: Session):
    returns = db.query(
        models.TMSEpodHistory, models.TMSRoutePlan,
        models.DeliveryOrder, models.FleetVehicle
    ).join(
        models.TMSRouteLine,
        models.TMSEpodHistory.line_id == models.TMSRouteLine.line_id
    ).join(
        models.TMSRoutePlan,
        models.TMSRouteLine.route_id == models.TMSRoutePlan.route_id
    ).join(
        models.DeliveryOrder,
        models.TMSRouteLine.order_id == models.DeliveryOrder.order_id
    ).join(
        models.FleetVehicle,
        models.TMSRoutePlan.vehicle_id == models.FleetVehicle.vehicle_id
    ).filter(models.TMSEpodHistory.qty_return > 0).all()

    quality_kg, sku_kg, cust_kg = 0.0, 0.0, 0.0
    fleet_map = {}
    audit_logs = []

    for epod, plan, order, vehicle in returns:
        r_qty  = float(epod.qty_return) if epod.qty_return else 0.0
        reason = epod.return_reason or "Lainnya"

        if reason in ["Barang Rusak", "Packaging Bocor", "Kadaluarsa"]:
            quality_kg += r_qty
        elif reason in ["Salah Produk"]:
            sku_kg += r_qty
        else:
            cust_kg += r_qty

        plate = vehicle.license_plate
        if plate not in fleet_map:
            fleet_map[plate] = {"count": 0, "weight": 0.0}
        fleet_map[plate]["count"] += 1
        fleet_map[plate]["weight"] += r_qty

        audit_logs.append({
            "date":     epod.timestamp.strftime("%d %b %Y"),
            "customer": order.customer_name,
            "id":       order.order_id,
            "product":  epod.driver_notes.replace("Produk Retur: ", "") if epod.driver_notes else "N/A",
            "weight":   f"{r_qty} KG",
            "reason":   reason,
            "status":   "Selesai (Parsial)" if order.status == models.DOStatus.delivered_partial else "Investigating",
            "color":    (
                "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                if reason in ["Barang Rusak"]
                else "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
            )
        })

    total_return_kg = quality_kg + sku_kg + cust_kg
    fleet_performance = sorted(
        [
            {
                "plate": k, "count": v["count"],
                "weight": round(v["weight"], 1),
                "trend": "flat", "percent": "Data Aktual"
            }
            for k, v in fleet_map.items()
        ],
        key=lambda x: x['weight'], reverse=True
    )

    return {
        "summary": {
            "qualityKg": quality_kg, "qualityRupiah": quality_kg * 25000, "qualityTrend": 0,
            "skuKg": sku_kg, "skuRupiah": sku_kg * 25000, "skuTrend": 0,
            "custKg": cust_kg, "custRupiah": cust_kg * 25000, "custTrend": 0,
            "totalReturnKg": total_return_kg,
        },
        "distribution": {
            "qualityPercent": round((quality_kg / total_return_kg * 100), 1) if total_return_kg > 0 else 0,
            "skuPercent":     round((sku_kg     / total_return_kg * 100), 1) if total_return_kg > 0 else 0,
            "custPercent":    round((cust_kg    / total_return_kg * 100), 1) if total_return_kg > 0 else 0,
        },
        "fleet_performance": fleet_performance,
        "audit_logs":        audit_logs,
    }