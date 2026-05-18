# routers/finance.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
import uuid
import json

import models
import schemas
from dependencies import get_db, get_current_user, require_role
import logging
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
        except Exception:
            # notes bukan JSON, biarkan notes tetap teks biasa
            pass

    # Fallback ke real DB relationships jika plate/driver masih default N/A
    if plate == "N/A" and e.vehicle:
        plate = e.vehicle.license_plate or "N/A"
        vehicle_type = e.vehicle.type or "CDD"
    if driver == "N/A" and e.driver:
        driver = e.driver.name or "N/A"

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
        "notes": notes,
        "total": e.total
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

# 1. BIKIN PENGELUARAN BARU
@router.post("/expenses", response_model=schemas.GenericResponse)
def create_expense(
    data: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik", "kasir"))
):
    try:
        new_expense = models.OperationalExpense(
            id=data.id if data.id else str(uuid.uuid4()),
            time=data.time,
            date=datetime.strptime(data.date, "%Y-%m-%d").date(),
            
            # 🌟 FIX CTO: Simpan ID relasinya, bukan string manual!
            vehicle_id=data.vehicle_id,
            driver_id=data.driver_id,
            
            is_oncall=data.isOncall,
            bbm=data.bbm,
            tol=data.tol,
            parkir=data.parkir,
            parkir_liar=data.parkirLiar,
            kuli_angkut=data.kuliAngkut,
            lain_lain=data.lainLain,
            helper_name=data.helperName,
            notes=data.notes,
            total=data.total
        )
        db.add(new_expense)
        db.commit()
        return {"status": "success", "message": "Biaya operasional berhasil dicatat."}
    except Exception as e:
        db.rollback()
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
        expense.time = data.time
        expense.date = datetime.strptime(data.date, "%Y-%m-%d").date()
        
        # 🌟 FIX CTO: Update ID relasinya
        expense.vehicle_id = data.vehicle_id
        expense.driver_id = data.driver_id
        
        expense.is_oncall = data.isOncall
        expense.bbm = data.bbm
        expense.tol = data.tol
        expense.parkir = data.parkir
        expense.parkir_liar = data.parkirLiar
        expense.kuli_angkut = data.kuliAngkut
        expense.lain_lain = data.lainLain
        expense.helper_name = data.helperName
        expense.notes = data.notes
        expense.total = data.total
        
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
        except: pass
        
    if end_date:
        try:
            end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(models.OperationalExpense.date <= end_d)
        except: pass
        
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
        
    db.delete(expense)
    db.commit()
    return {"status": "success", "message": "Biaya operasional berhasil dihapus."}