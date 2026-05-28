# services/driver_performance_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date, datetime, timedelta

import models
from utils.helpers import menit_ke_jam

def get_real_driver_performance(db: Session, start_date_str: str, end_date_str: str):
    # Parsing Tanggal (Tetep ada buat jaga-jaga kalau mau filter ke belakang)
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

    today = date.today()
    drivers = db.query(models.HRDriver).all()
    hasil = []

    for d in drivers:
        # Cek apakah driver bertugas sebagai DRIVER atau HELPER hari ini
        # Priority: cari sebagai driver dulu, fallback ke helper
        rute_today = db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.driver_id == d.driver_id,
            models.TMSRoutePlan.planning_date == today
        ).first()

        # Kalau tidak ditemukan sebagai driver, cek sebagai helper
        _as_helper = False
        if not rute_today:
            rute_today = db.query(models.TMSRoutePlan).filter(
                models.TMSRoutePlan.helper_id == d.driver_id,
                models.TMSRoutePlan.planning_date == today
            ).first()
            if rute_today:
                _as_helper = True

        truck_plate = "-"
        status = "Offline"
        jarak_today = 0.0
        do_total_today = 0
        do_completed_today = 0
        ontime_count_today = 0
        
        last_loc = "📍 Menunggu Penugasan"
        last_time = "-"

        if rute_today:
            status = "On Route"
            jarak_today = rute_today.total_distance_km or 0.0
            if rute_today.vehicle:
                truck_plate = rute_today.vehicle.license_plate

            # 🌟 2. CARI TITIK DO HARI INI (doTotal)
            lines_today = db.query(models.TMSRouteLine).filter(
                models.TMSRouteLine.route_id == rute_today.route_id,
                models.TMSRouteLine.sequence > 0
            ).order_by(models.TMSRouteLine.sequence).all()

            do_total_today = len(lines_today)

            # 🌟 3. CARI PROGRESS EPOD (doCompleted & Last Location)
            for line in lines_today:
                epod = db.query(models.TMSEpodHistory).filter(models.TMSEpodHistory.line_id == line.line_id).first()
                if epod:
                    # Kalau udah nyampe (Sukses/Parsial/Retur)
                    if epod.status in [models.DOStatus.delivered_success, models.DOStatus.delivered_partial, models.DOStatus.failed]:
                        do_completed_today += 1
                        
                        # Set Update Terakhir (Karena order by sequence, ini akan nimpa jadi yang paling akhir)
                        last_loc = line.order.customer.store_name if line.order and line.order.customer else f"DO #{line.order_id}"
                        last_time = epod.timestamp.strftime("%H:%M")

                    # Hitung On-Time (Toleransi 15 menit dari jam Tiba)
                    if epod.timestamp and line.est_arrival:
                        actual_m = epod.timestamp.hour * 60 + epod.timestamp.minute
                        est_m    = line.est_arrival.hour * 60 + line.est_arrival.minute
                        if (actual_m - est_m) <= 15:
                            ontime_count_today += 1
            
            # Kalau semua DO udah selesai, ubah status
            if do_total_today > 0 and do_completed_today == do_total_today:
                status = "Resting"
                last_loc = "📍 Kembali ke Depo (Selesai)"

        # 🌟 4. KALKULASI SCORE & RATE
        # on_time_rate: % delivery yang tiba dalam toleransi 15 menit dari ETA
        ontime_rate = round((ontime_count_today / do_total_today) * 100) if do_total_today > 0 else 0

        # score = progress pengiriman hari ini (berapa % toko sudah diselesaikan)
        # - Kalau ada 10 toko hari ini dan sudah 7 selesai → 70%
        # - Driver Offline / tidak ada rute → score kosong (None)
        # - Score 100% = semua toko sudah selesai hari ini
        if status == "Offline" or do_total_today == 0:
            score = None  # kosong, bukan 0 — belum/tidak bertugas hari ini
        else:
            score = round((do_completed_today / do_total_today) * 100)
        
        # Bikin ID format 3 digit
        drv_id_str = f"DRV-{d.driver_id:03d}"

        hasil.append({
            "id":     drv_id_str,
            "name":   d.name,
            "role":   "Helper" if _as_helper else "Driver",  # untuk UI labeling
            "avatar": f"https://ui-avatars.com/api/?name={d.name.replace(' ', '+')}&background={'16a34a' if _as_helper else '0D8ABC'}&color=fff",
            "status": status,
            "score":  score,
            "ontime": f"{ontime_rate}%" if do_total_today > 0 else ("-" if status == "Offline" else "0%"),
            "doSuccess": f"{do_completed_today}",
            "truck":  truck_plate,
            "distanceToday": round(jarak_today, 1),
            "doCompleted": do_completed_today,
            "doTotal": do_total_today,
            "lastLocation": last_loc,
            "lastUpdate": last_time
        })

    # Sort biar yang lagi jalan (On Route) muncul di atas
    sort_order = {"On Route": 1, "Resting": 2, "Offline": 3}
    hasil.sort(key=lambda x: sort_order.get(x["status"], 4))

    return {"status": "success", "data": hasil}