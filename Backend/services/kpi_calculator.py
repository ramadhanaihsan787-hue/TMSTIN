# Backend/services/kpi_calculator.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
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

def _ew(order) -> float:
    """Effective weight: realisasi gudang jika ada, fallback ke routing qty."""
    if order is None: return 0.0
    if order.weight_realisasi and float(order.weight_realisasi) > 0:
        return float(order.weight_realisasi)
    return float(order.weight_total or 0.0)


def get_kpi_summary(db: Session, start_date_str: str, end_date_str: str, settings):
    start_date, end_date = parse_dates(start_date_str, end_date_str)

    rute_aktif = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date >= start_date,
        models.TMSRoutePlan.planning_date <= end_date
    ).all()

    total_do, total_berat, total_capacity_available = 0, 0.0, 0.0
    total_trucks_used = len(rute_aktif)

    # Hitung rata-rata kapasitas fleet sebagai fallback dinamis
    # (lebih akurat dari hardcode 2000 kg untuk fleet JAPFA yang variatif)
    from sqlalchemy import func as sqlfunc
    avg_cap_result = db.query(sqlfunc.avg(models.FleetVehicle.capacity_kg)).filter(
        models.FleetVehicle.capacity_kg.isnot(None)
    ).scalar()
    default_cap_kg = float(avg_cap_result) if avg_cap_result else 2000.0

    for rute in rute_aktif:
        total_capacity_available += float(rute.vehicle.capacity_kg) if rute.vehicle and rute.vehicle.capacity_kg else default_cap_kg

        for line in rute.route_lines:
            if line.sequence > 0 and line.order:
                total_do += 1
                total_berat += _ew(line.order)

    load_utilization = 0.0
    if total_capacity_available > 0:
        load_utilization = min(round((total_berat / total_capacity_available) * 100, 1), 100.0)

    expenses = db.query(models.OperationalExpense).filter(
        models.OperationalExpense.date >= start_date,
        models.OperationalExpense.date <= end_date
    ).all()
    total_cost = sum([float(e.total) for e in expenses])

    epods_in_range = db.query(models.TMSEpodHistory).filter(
        func.date(models.TMSEpodHistory.timestamp) >= start_date,
        func.date(models.TMSEpodHistory.timestamp) <= end_date
    ).all()

    total_epods = len(epods_in_range)
    total_success_epods = 0
    total_qty_delivered = 0.0
    total_qty_return = 0.0
    total_qty_damaged = 0.0

    for epod in epods_in_range:
        # 1. Hitung e-POD yang sukses / partial sukses
        if epod.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial]:
            total_success_epods += 1
        
        # 2. Total kuantitas barang
        total_qty_delivered += float(epod.qty_delivered) if epod.qty_delivered else 0.0
        total_qty_return += float(epod.qty_return) if epod.qty_return else 0.0
        total_qty_damaged += float(epod.qty_damaged) if epod.qty_damaged else 0.0

    # 🌟 RUMUS MATEMATIS 4 KPI
    # 1. Success Rate
    success_rate = round((total_success_epods / total_epods * 100), 1) if total_epods > 0 else 0.0
    
    # 2. Fill Rate = Dikirim / (Dikirim + Dikembalikan + Rusak)
    total_qty_attempted = total_qty_delivered + total_qty_return + total_qty_damaged
    fill_rate = round((total_qty_delivered / total_qty_attempted * 100), 1) if total_qty_attempted > 0 else 0.0
    
    # 3. Return Rate = Dikembalikan / Total Attempt
    return_rate = round((total_qty_return / total_qty_attempted * 100), 1) if total_qty_attempted > 0 else 0.0
    
    # 4. Damage Rate = Rusak / Total Attempt
    damage_rate = round((total_qty_damaged / total_qty_attempted * 100), 1) if total_qty_attempted > 0 else 0.0


    today = datetime.now().date()
    today_orders = db.query(models.TMSRouteLine).join(
        models.TMSRoutePlan, models.TMSRouteLine.route_id == models.TMSRoutePlan.route_id
    ).filter(
        models.TMSRoutePlan.planning_date == today,
        models.TMSRouteLine.sequence > 0
    ).all()

    today_target_kg, completed_qty_kg, completed_drops, in_transit_drops = 0.0, 0.0, 0, 0

    for line in today_orders:
        weight = _ew(line.order)
        today_target_kg += weight
        
        epod = db.query(models.TMSEpodHistory).filter(models.TMSEpodHistory.line_id == line.line_id).first()
        if epod and epod.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial]:
            completed_drops += 1
            completed_qty_kg += float(epod.qty_delivered) if epod.qty_delivered else weight
        else:
            in_transit_drops += 1

    today_remaining_kg = max(0.0, today_target_kg - completed_qty_kg)
    completed_percent = round((completed_qty_kg / today_target_kg) * 100, 1) if today_target_kg > 0 else 0.0
    in_transit_percent = 100.0 - completed_percent if today_target_kg > 0 else 0.0

    # 🌟 CALCULATE 7-DAYS TREND FOR OVERVIEW DASHBOARD
    otif_trend = []
    volume_trend = []
    now = datetime.now()
    for i in range(6, -1, -1):
        target_date = now.date() - timedelta(days=i)
        
        # Volume = total weight planned that day
        rutes_day = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == target_date).all()
        day_volume = 0.0
        for r in rutes_day:
            day_volume += sum([_ew(line.order) for line in r.route_lines if line.order and line.sequence > 0])
        volume_trend.append(round(day_volume))

        # OTIF (Success Rate) that day
        epods_day = db.query(models.TMSEpodHistory).filter(
            func.date(models.TMSEpodHistory.timestamp) == target_date
        ).all()
        day_success = sum(1 for e in epods_day if e.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial])
        day_otif = round((day_success / len(epods_day)) * 100) if len(epods_day) > 0 else 0
        otif_trend.append(day_otif)

    return {
        "status": "success",
        "success_rate_percent": success_rate, 
        "load_factor_percent": load_utilization,
        "total_weight_kg": round(total_berat, 1),
        "active_fleet_count": total_trucks_used,
        "data": { 
            "transportCost": round(total_cost, 2), 
            "fillRate": fill_rate, 
            "returnRate": return_rate, 
            "damageRate": damage_rate 
        },
        "today_target": round(today_target_kg, 1),
        "today_remaining": round(today_remaining_kg, 1),
        "completed_qty": round(completed_qty_kg, 1),
        "completed_percent": completed_percent,
        "completed_drops": completed_drops,
        "in_transit_qty": round(today_remaining_kg, 1),
        "in_transit_percent": in_transit_percent,
        "in_transit_drops": in_transit_drops,
        "otifTrend": otif_trend,
        "volumeTrend": volume_trend
    }

def get_efficiency_dashboard(db: Session, settings):
    now = datetime.now()
    start_of_month = now.replace(day=1).date()
    
    total_shipments = db.query(models.DeliveryOrder).count()

    rutes = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date >= start_of_month).all()
    
    total_capacity, total_weight = 0.0, 0.0

    # Fallback capacity dinamis dari rata-rata fleet
    from sqlalchemy import func as sqlfunc
    avg_cap_eff = db.query(sqlfunc.avg(models.FleetVehicle.capacity_kg)).filter(
        models.FleetVehicle.capacity_kg.isnot(None)
    ).scalar()
    default_cap_eff = float(avg_cap_eff) if avg_cap_eff else 2000.0

    for r in rutes:
        total_capacity += float(r.vehicle.capacity_kg) if r.vehicle and r.vehicle.capacity_kg else default_cap_eff
        total_weight += sum([_ew(line.order) for line in r.route_lines if line.order and line.sequence > 0])

    lf_percent = round((total_weight / total_capacity) * 100, 1) if total_capacity > 0 else 0.0
    
    expenses = db.query(models.OperationalExpense).filter(models.OperationalExpense.date >= start_of_month).all()
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
        c = float(rute.vehicle.capacity_kg) if rute.vehicle and rute.vehicle.capacity_kg else default_cap_eff
        lf_rute = round((w/c)*100) if c > 0 else 0
        start_time = db.query(func.min(models.TMSRouteLine.est_arrival)).filter(models.TMSRouteLine.route_id == rute.route_id).scalar()
        
        op_excellence.append({
            "route": f"Route #{rute.route_id}", "region": rute.vehicle.license_plate if rute.vehicle else "Umum", 
            "otif": "-", "lead": f"{start_time.strftime('%H:%M')} WIB" if start_time else "-", "factor": f"{lf_rute}%",
            "status": "Optimal" if lf_rute > 80 else "Underloaded",
            "color": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" if lf_rute > 80 else "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
        })

    lf_trend = []
    for i in range(6, -1, -1):
        target_date = now.date() - timedelta(days=i)
        rutes_day = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == target_date).all()
        w_day, c_day = 0.0, 0.0
        for r in rutes_day:
            w_day += sum([float(line.order.weight_total) for line in r.route_lines if line.order and line.order.weight_total and line.sequence > 0])
            c_day += float(r.vehicle.capacity_kg) if r.vehicle and r.vehicle.capacity_kg else default_cap_eff
        lf_trend.append(round((w_day / c_day) * 100) if c_day > 0 else 0)

    return {
        "kpi": {
            "totalShipments": total_shipments, "avgLeadTime": "N/A", "loadFactor": f"{lf_percent}%",
            "costPerKg": f"Rp {cost_per_kg}", "hiddenCost": f"{round((tot_hidden/total_cost)*100, 1) if total_cost > 0 else 0}%"
        },
        "lfTrend": lf_trend, "costDist": cost_dist, "hiddenCosts": hidden_costs, "opExcellence": op_excellence, "leakagePoints": []
    }