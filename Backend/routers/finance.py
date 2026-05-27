# Backend/routers/finance.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
import uuid
import json
import logging

import models
import schemas
from dependencies import get_db, get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/finance", tags=["Finance & Expenses"])

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def expense_to_dict(e: models.OperationalExpense) -> dict:
    """Helper buat mapping data DB ke format Frontend biar DRY dengan JSON Serialization Fallback"""
    plate = "N/A"
    vehicle_type = "N/A"
    driver = "N/A"
    helper = e.helper_name or ""
    notes = e.notes or ""

    if e.notes:
        try:
            # Coba parse notes sebagai JSON block untuk temporary/on-call data
            notes_data = json.loads(e.notes)
            if isinstance(notes_data, dict):
                plate = notes_data.get("plate", "N/A")
                vehicle_type = notes_data.get("vehicleType", "N/A")
                driver = notes_data.get("driver", "N/A")
                helper = notes_data.get("helper", helper)
                notes = notes_data.get("notes", "")
        except Exception as e:
            logger.warning(
                f"⚠️ Gagal parse notes JSON untuk expense {e.id}: {str(e)}"
            )

    # Fallback ke real DB relationships jika plate/driver masih default N/A
    if plate == "N/A" and e.vehicle:
        plate = e.vehicle.license_plate or "N/A"
        vehicle_type = getattr(e.vehicle, "type", "CDD") or "CDD"
    if driver == "N/A" and e.driver:
        driver = getattr(e.driver, "name", "N/A") or "N/A"

    return {
        "id": e.id,
        "time": e.time,
        "date": str(e.date),
        "plate": plate,
        "vehicleType": vehicle_type,
        "driver": driver,
        "isOncall": e.is_oncall,
        "bbm": e.bbm,
        "tol": e.tol,
        "parkir": e.parkir,
        "parkirLiar": e.parkir_liar,
        "kuliAngkut": e.kuli_angkut,
        "lainLain": e.lain_lain,
        "helperName": helper,
        "notes":         notes,
        "total":         e.total,
        "kmAwal":        e.km_awal,
        "kmAkhir":       e.km_akhir,
        "jamBerangkat":  e.jam_berangkat,
        "jamPulang":     e.jam_pulang,
    }

# ==========================================
# MASTER DATA ENDPOINTS
# ==========================================
@router.get("/master-data")
def get_finance_master_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve actual active vehicles and drivers list for cashier drop-downs"""
    vehicles = db.query(models.FleetVehicle).all()
    drivers = db.query(models.HRDriver).all()
    return {
        "status": "success",
        "data": {
            "fleets": [
                {
                    "id": v.vehicle_id,
                    "plate": v.license_plate,
                    "type": v.type or "CDD"
                } for v in vehicles
            ],
            "drivers": [
                {
                    "id": d.driver_id,
                    "name": d.name
                } for d in drivers
            ]
        }
    }

# 0. BOP AUTOFILL — ambil data trip dari driver app untuk plat tertentu hari ini
@router.get("/bop-autofill")
def get_bop_autofill(
    plate: str,
    tanggal: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Auto-fill data perjalanan (jam_berangkat, jam_pulang, km_awal, km_akhir)
    dari TMSRoutePlan hari ini untuk plat nomor tertentu.
    Kasir bisa override nilai ini di form.
    """
    target_date = date.today()
    if tanggal:
        try:
            target_date = datetime.strptime(tanggal, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Cari kendaraan berdasarkan plat
    vehicle = db.query(models.FleetVehicle).filter(
        models.FleetVehicle.license_plate == plate
    ).first()

    if not vehicle:
        return {"status": "success", "data": None,
                "message": "Kendaraan tidak ditemukan di master armada"}

    # Cari rute hari ini untuk kendaraan ini
    plan = db.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.vehicle_id == vehicle.vehicle_id,
        models.TMSRoutePlan.planning_date == target_date
    ).first()

    if not plan:
        return {"status": "success", "data": None,
                "message": "Belum ada rute terdispatch untuk armada ini hari ini"}

    # Ambil nama driver & helper
    driver_name = plan.driver.name if plan.driver else None
    helper_name = plan.helper.name if plan.helper else None

    # jam_berangkat dari start_time aktual (bukan default 06:00)
    jam_berangkat = None
    if plan.start_time:
        default_06 = plan.start_time.replace(hour=6, minute=0, second=0, microsecond=0)
        if plan.start_time != default_06:
            jam_berangkat = plan.start_time.strftime("%H:%M")

    # jam_pulang dari end_time
    jam_pulang = plan.end_time.strftime("%H:%M") if plan.end_time else None

    return {
        "status": "success",
        "data": {
            "plate":          vehicle.license_plate,
            "vehicle_type":   vehicle.type or "CDD",
            "vehicle_id":     vehicle.vehicle_id,
            "driver_name":    driver_name,
            "driver_id":      plan.driver_id,
            "helper_name":    helper_name,
            "helper_id":      plan.helper_id,
            "route_id":       plan.route_id,
            "tanggal":        str(target_date),
            # Trip data — dari driver app (bisa null kalau driver belum input)
            "jam_berangkat":  jam_berangkat,
            "jam_pulang":     jam_pulang,
            "km_awal":        plan.km_awal_trip,
            "km_akhir":       plan.km_akhir_trip,
            "source": "driver_app" if (jam_berangkat or plan.km_awal_trip) else "belum_ada_data",
        }
    }


# 1. BIKIN PENGELUARAN BARU
@router.post("/expenses", response_model=schemas.GenericResponse)
def create_expense(
    data: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik", "kasir"))
):
    try:
        # 🌟 FIX CTO: Validasi Tipe Data FK Mencegah Postgres DataError
        # Kalau frontend ngirim string kosong "", "0", atau None, kita jadikan Python None (NULL)
        safe_vehicle_id = int(data.vehicle_id) if getattr(data, 'vehicle_id', None) else None
        safe_driver_id = int(data.driver_id) if getattr(data, 'driver_id', None) else None

        new_expense = models.OperationalExpense(
            id=data.id if getattr(data, 'id', None) else str(uuid.uuid4()),
            time=data.time,
            date=datetime.strptime(data.date, "%Y-%m-%d").date(),
            
            vehicle_id=safe_vehicle_id,
            driver_id=safe_driver_id,
            
            is_oncall=getattr(data, 'isOncall', False),
            bbm=getattr(data, 'bbm', 0.0) or 0.0,
            tol=getattr(data, 'tol', 0.0) or 0.0,
            parkir=getattr(data, 'parkir', 0.0) or 0.0,
            parkir_liar=getattr(data, 'parkirLiar', 0.0) or 0.0,
            kuli_angkut=getattr(data, 'kuliAngkut', 0.0) or 0.0,
            lain_lain=getattr(data, 'lainLain', 0.0) or 0.0,
            helper_name  = getattr(data, 'helperName', ""),
            notes        = getattr(data, 'notes', ""),
            total        = getattr(data, 'total', 0.0) or 0.0,
            km_awal      = getattr(data, 'kmAwal', None) or None,
            km_akhir     = getattr(data, 'kmAkhir', None) or None,
            jam_berangkat= getattr(data, 'jamBerangkat', None) or None,
            jam_pulang   = getattr(data, 'jamPulang', None) or None,
        )
        db.add(new_expense)
        db.commit()
        return {"status": "success", "message": "Biaya operasional berhasil dicatat."}
    except Exception as e:
        db.rollback() # Wajib ada biar koneksi DB ga nyangkut
        logger.error(f"🚨 [CREATE EXPENSE] DB Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal server saat mencatat pengeluaran.")

# 2. UPDATE PENGELUARAN
@router.put("/expenses/{expense_id}", response_model=schemas.GenericResponse)
def update_expense(
    expense_id: str,
    data: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik", "kasir"))
):
    expense = db.query(models.OperationalExpense).filter(models.OperationalExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Data pengeluaran tidak ditemukan!")

    try:
        # 🌟 FIX CTO: Pelindung Optional Fields
        safe_vehicle_id = int(data.vehicle_id) if getattr(data, 'vehicle_id', None) else None
        safe_driver_id = int(data.driver_id) if getattr(data, 'driver_id', None) else None

        expense.time = data.time
        expense.date = datetime.strptime(data.date, "%Y-%m-%d").date()
        
        expense.vehicle_id = safe_vehicle_id
        expense.driver_id = safe_driver_id
        
        expense.is_oncall = getattr(data, 'isOncall', False)
        expense.bbm = getattr(data, 'bbm', 0.0) or 0.0
        expense.tol = getattr(data, 'tol', 0.0) or 0.0
        expense.parkir = getattr(data, 'parkir', 0.0) or 0.0
        expense.parkir_liar = getattr(data, 'parkirLiar', 0.0) or 0.0
        expense.kuli_angkut = getattr(data, 'kuliAngkut', 0.0) or 0.0
        expense.lain_lain = getattr(data, 'lainLain', 0.0) or 0.0
        expense.helper_name   = getattr(data, 'helperName', "")
        expense.notes         = getattr(data, 'notes', "")
        expense.total         = getattr(data, 'total', 0.0) or 0.0
        expense.km_awal       = getattr(data, 'kmAwal', None) or None
        expense.km_akhir      = getattr(data, 'kmAkhir', None) or None
        expense.jam_berangkat = getattr(data, 'jamBerangkat', None) or None
        expense.jam_pulang    = getattr(data, 'jamPulang', None) or None
        
        db.commit()
        return {"status": "success", "message": "Biaya operasional berhasil diupdate."}
    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [UPDATE EXPENSE] DB Error untuk ID {expense_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal server saat mengupdate pengeluaran.")

# 3. GET SEMUA PENGELUARAN (Bisa di-filter berdasarkan tanggal)
@router.get("/expenses", response_model=schemas.ExpenseListResponse)
def get_expenses(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.OperationalExpense)
    
    if start_date:
        try:
            start_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(models.OperationalExpense.date >= start_d)
        except Exception as e:
            logger.warning(
                f"⚠️ Invalid start_date filter: {start_date}"
            )
            raise HTTPException(
                status_code=400,
                detail="Format start_date harus YYYY-MM-DD"
            )
        
    if end_date:
        try:
            end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(models.OperationalExpense.date <= end_d)
        except Exception as e:
            logger.warning(
                f"⚠️ Invalid end_date filter: {end_date}"
            )
            raise HTTPException(
                status_code=400,
                detail="Format end_date harus YYYY-MM-DD"
            )

    expenses = query.order_by(models.OperationalExpense.created_at.desc()).all()
    
    results = [expense_to_dict(e) for e in expenses]
    return {"status": "success", "data": results}

# 4. GET PENGELUARAN HARI INI
@router.get("/expenses/today", response_model=schemas.ExpenseListResponse)
def get_today_expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    expenses = db.query(models.OperationalExpense).filter(models.OperationalExpense.date == today).order_by(models.OperationalExpense.created_at.desc()).all()
    
    results = [expense_to_dict(e) for e in expenses]
    return {"status": "success", "data": results}

# 5. HAPUS PENGELUARAN
@router.delete("/expenses/{expense_id}", response_model=schemas.GenericResponse)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("manager_logistik", "admin_distribusi", "kasir"))
):
    expense = db.query(models.OperationalExpense).filter(models.OperationalExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Data pengeluaran tidak ditemukan!")
        
    try:
        db.delete(expense)
        db.commit()
        return {"status": "success", "message": "Biaya operasional berhasil dihapus."}
    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [DELETE EXPENSE] DB Error untuk ID {expense_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal server saat menghapus pengeluaran.")