# Backend/services/analytics_service.py
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import math
import models

# =====================================================================
# MESIN REAL-TIME ALERTS (7 SKENARIO)
# =====================================================================
def get_realtime_alerts(db: Session) -> list:
    """
    Menghasilkan maksimal 20 alert real-time yang diurutkan berdasarkan
    severity: critical → warning → info.

    Bug yang diperbaiki:
    - [QW-2] `func` dari sqlalchemy tidak di-import → NameError saat ada retur.
    - Filter timestamp retur sekarang pakai range (>= hari ini, < besok)
      — lebih portable di semua versi PostgreSQL vs func.date().
    - Guard None untuk line.route_plan sebelum akses .vehicle / .driver.
    - Ganti `.order_id != None` → `.isnot(None)` — cara benar di SQLAlchemy.
    - Eager load route_plan+vehicle+driver di satu query (hilangkan N+1).
    """
    alerts = []
    now = datetime.now()
    today = now.date()

    # Batas waktu untuk filter "hari ini" — lebih portable dari func.date()
    today_start = datetime.combine(today, datetime.min.time())
    tomorrow_start = today_start + timedelta(days=1)

    # ----------------------------------------------------------------
    # 1. PENDING PENGIRIMAN (WARNING)
    # ----------------------------------------------------------------
    pending_count = (
        db.query(models.DeliveryOrder)
        .filter(models.DeliveryOrder.status == models.DOStatus.do_verified)
        .count()
    )

    if pending_count > 0:
        alerts.append({
            "title": "Pending Pengiriman",
            "time": "Live",
            "desc": (
                f"{pending_count} Delivery Orders (DO) masih dalam status "
                "Pending (Belum dapat armada)."
            ),
            "icon": "pending_actions",
            "bgColor": (
                "bg-blue-50/50 dark:bg-blue-500/5 "
                "border border-blue-100 dark:border-blue-500/10"
            ),
            "iconColor": (
                "text-blue-600 dark:text-blue-400 "
                "bg-blue-100 dark:bg-blue-500/20 rounded-lg p-2"
            ),
            "severity": "warning",
        })

    # ----------------------------------------------------------------
    # 2 & 4. KEMACETAN & OVERSTAY (CRITICAL / WARNING)
    #
    # Eager-load route_plan → vehicle, driver sekaligus agar tidak N+1.
    # Guard route_plan is None sebelum akses atributnya.
    # ----------------------------------------------------------------
    active_routes = (
        db.query(models.TMSRouteLine)
        .join(models.TMSRoutePlan)
        .filter(
            models.TMSRoutePlan.planning_date == today,
            models.TMSRouteLine.order_id.isnot(None),
        )
        .options(
            joinedload(models.TMSRouteLine.route_plan)
            .joinedload(models.TMSRoutePlan.vehicle),
            joinedload(models.TMSRouteLine.route_plan)
            .joinedload(models.TMSRoutePlan.driver),
            joinedload(models.TMSRouteLine.order),
        )
        .all()
    )

    for line in active_routes:
        # Guard: route_plan bisa None kalau data tidak konsisten
        if not line.route_plan:
            continue
        if not (
            line.est_arrival
            and line.order
            and line.order.status == models.DOStatus.do_assigned_to_route
        ):
            continue

        dt_est = datetime.combine(today, line.est_arrival)
        delay_mins = int((now - dt_est).total_seconds() / 60)

        # Hanya alert kalau memang sudah lewat dari jam estimasi
        if delay_mins <= 0:
            continue

        plat = (
            line.route_plan.vehicle.license_plate
            if line.route_plan.vehicle
            else "Unknown"
        )
        supir = (
            line.route_plan.driver.name
            if line.route_plan.driver
            else "Unknown"
        )

        if delay_mins >= 60:
            alerts.append({
                "title": "Driver Detention",
                "time": f"{math.floor(delay_mins / 60)}h {delay_mins % 60}m ago",
                "desc": (
                    f"{plat} menunggu sangat lama ({delay_mins} menit) "
                    "di target Customer! Segera cek status driver."
                ),
                "icon": "hourglass_empty",
                "bgColor": (
                    "bg-purple-50/50 dark:bg-purple-500/5 "
                    "border border-purple-100 dark:border-purple-500/10"
                ),
                "iconColor": (
                    "text-purple-600 dark:text-purple-400 "
                    "bg-purple-100 dark:bg-purple-500/20 rounded-lg p-2"
                ),
                "severity": "critical",
            })

        elif delay_mins > 20:
            alerts.append({
                "title": "Kemacetan Driver",
                "time": f"{delay_mins}m ago",
                "desc": (
                    f"{plat} ({supir}) terdeteksi macet/terlambat menuju "
                    f"rute selanjutnya (Delay +{delay_mins}m)."
                ),
                "icon": "traffic",
                "bgColor": (
                    "bg-orange-50/50 dark:bg-orange-500/5 "
                    "border border-orange-100 dark:border-orange-500/10"
                ),
                "iconColor": (
                    "text-orange-600 dark:text-orange-400 "
                    "bg-orange-100 dark:bg-orange-500/20 rounded-lg p-2"
                ),
                "severity": "warning",
            })

    # ----------------------------------------------------------------
    # 3. PENGIRIMAN RETUR HARI INI (CRITICAL)
    #
    # [QW-2 FIX] Ganti func.date(...) == today (NameError karena func tidak
    # di-import) dengan filter range >= today_start, < tomorrow_start.
    # Lebih portable dan tidak butuh cast fungsi DB.
    # ----------------------------------------------------------------
    returns_today = (
        db.query(models.TMSEpodHistory)
        .filter(
            models.TMSEpodHistory.qty_return > 0,
            models.TMSEpodHistory.timestamp >= today_start,
            models.TMSEpodHistory.timestamp < tomorrow_start,
        )
        .all()
    )

    if returns_today:
        total_kg = sum(r.qty_return for r in returns_today)
        alerts.append({
            "title": "Pengiriman Retur",
            "time": "Hari ini",
            "desc": (
                f"{len(returns_today)} Pesanan dikonfirmasi Retur hari ini "
                f"(Total: {total_kg:.1f} Kg). Cek panel Retur."
            ),
            "icon": "assignment_return",
            "bgColor": (
                "bg-red-50/50 dark:bg-red-500/5 "
                "border border-red-100 dark:border-red-500/10"
            ),
            "iconColor": (
                "text-red-600 dark:text-red-400 "
                "bg-red-100 dark:bg-red-500/20 rounded-lg p-2"
            ),
            "severity": "critical",
        })

    # ----------------------------------------------------------------
    # 5, 6, 7. STATUS PERJALANAN PER TRUK (INFO & WARNING)
    #
    # Eager-load vehicle agar tidak N+1 saat akses rute.vehicle.license_plate.
    # ----------------------------------------------------------------
    routes_today = (
        db.query(models.TMSRoutePlan)
        .filter(models.TMSRoutePlan.planning_date == today)
        .options(joinedload(models.TMSRoutePlan.vehicle))
        .all()
    )

    for rute in routes_today:
        total_stops = (
            db.query(models.TMSRouteLine)
            .filter(
                models.TMSRouteLine.route_id == rute.route_id,
                models.TMSRouteLine.sequence > 0,
            )
            .count()
        )

        if total_stops == 0:
            continue

        completed_stops = (
            db.query(models.TMSEpodHistory)
            .join(models.TMSRouteLine)
            .filter(
                models.TMSRouteLine.route_id == rute.route_id,
                models.TMSEpodHistory.status.in_([
                    models.DOStatus.delivered_success,
                    models.DOStatus.delivered_partial,
                ]),
            )
            .count()
        )

        plat = rute.vehicle.license_plate if rute.vehicle else "Unknown"

        if completed_stops == total_stops:
            alerts.append({
                "title": "Rute Selesai",
                "time": "Baru saja",
                "desc": (
                    f"Truk {plat} telah menyelesaikan seluruh tugas "
                    f"pengirimannya ({total_stops} drop) dengan aman."
                ),
                "icon": "task_alt",
                "bgColor": (
                    "bg-emerald-50/50 dark:bg-emerald-500/5 "
                    "border border-emerald-100 dark:border-emerald-500/10"
                ),
                "iconColor": (
                    "text-emerald-600 dark:text-emerald-400 "
                    "bg-emerald-100 dark:bg-emerald-500/20 rounded-lg p-2"
                ),
                "severity": "info",
            })

        elif 0 < completed_stops < total_stops:
            alerts.append({
                "title": "Progress Armada",
                "time": "Live",
                "desc": (
                    f"Truk {plat} masih di jalan. Telah menyelesaikan "
                    f"{completed_stops} dari {total_stops} titik pengiriman."
                ),
                "icon": "local_shipping",
                "bgColor": (
                    "bg-cyan-50/50 dark:bg-cyan-500/5 "
                    "border border-cyan-100 dark:border-cyan-500/10"
                ),
                "iconColor": (
                    "text-cyan-600 dark:text-cyan-400 "
                    "bg-cyan-100 dark:bg-cyan-500/20 rounded-lg p-2"
                ),
                "severity": "info",
            })

        elif completed_stops == 0 and now.hour >= 11:
            alerts.append({
                "title": "Unscheduled Stop",
                "time": "System AI",
                "desc": (
                    f"{plat} belum memulai pengiriman sama sekali "
                    "walau sudah siang. Hubungi driver segera!"
                ),
                "icon": "location_off",
                "bgColor": (
                    "bg-slate-50/50 dark:bg-slate-500/5 "
                    "border border-slate-200 dark:border-slate-800"
                ),
                "iconColor": (
                    "text-slate-600 dark:text-slate-400 "
                    "bg-slate-200 dark:bg-slate-800 rounded-lg p-2"
                ),
                "severity": "warning",
            })

    # ----------------------------------------------------------------
    # Sort: critical dulu, lalu warning, lalu info
    # ----------------------------------------------------------------
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda x: severity_rank.get(x.get("severity", "info"), 3))
    return alerts[:20]