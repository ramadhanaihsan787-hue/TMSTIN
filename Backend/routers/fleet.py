# routers/fleet.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import requests
import logging
import uuid # 🌟 FIX CTO: Buat generate ID expense

import models
import schemas 
from dependencies import get_db, get_settings, get_current_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Fleet Management"])

live_telematics_cache = {}

class OnCallFleetRequest(BaseModel):
    plate_number: str
    vehicle_type: str
    capacity_kg: int
    box_length_cm: int = 400
    box_width_cm: int = 200
    box_height_cm: int = 200

class FuelLogCreate(BaseModel):
    km_awal: int
    km_akhir: int
    liters: float
    cost_rp: float
    station_name: str

class VehicleStatusUpdate(BaseModel):
    status: str

def calculate_efficiency(distance_km: float, liters: float) -> float:
    if not liters or liters == 0 or distance_km == 0:
        return 0.0
    return round(distance_km / liters, 1)

@router.get("/fleet", response_model=schemas.FleetListResponse)
def get_all_fleet(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    today = date.today()
    vehicles = db.query(models.FleetVehicle).all()
    result = []

    for v in vehicles:
        # Ambil rute hari ini beserta driver, helper, dan stop count
        route_today = db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.vehicle_id == v.vehicle_id,
            models.TMSRoutePlan.planning_date == today
        ).first()

        current_load = float(route_today.total_weight) if route_today else 0.0
        load_pct = round((current_load / float(v.capacity_kg)) * 100, 1) if v.capacity_kg else 0

        # Driver & helper hari ini (dari rute yang sudah di-dispatch)
        driver_name = None
        helper_name = None
        route_id_today = None
        total_stops_today = 0
        eta_last = None

        if route_today:
            route_id_today = route_today.route_id
            if route_today.driver_id:
                driver = db.query(models.HRDriver).filter(
                    models.HRDriver.driver_id == route_today.driver_id
                ).first()
                driver_name = driver.name if driver else None
            if route_today.helper_id:
                helper = db.query(models.HRDriver).filter(
                    models.HRDriver.driver_id == route_today.helper_id
                ).first()
                helper_name = helper.name if helper else None

            # Hitung total stop & ETA terakhir hari ini
            lines = db.query(models.TMSRouteLine).filter(
                models.TMSRouteLine.route_id == route_today.route_id,
                models.TMSRouteLine.sequence > 0,
                models.TMSRouteLine.order_id != None
            ).order_by(models.TMSRouteLine.sequence).all()

            total_stops_today = len(lines)
            if lines:
                last_line = lines[-1]
                if last_line.est_arrival:
                    eta_last = f"{last_line.est_arrival.hour:02d}:{last_line.est_arrival.minute:02d}"

        # Biaya BBM dari OperationalExpense
        expenses = db.query(models.OperationalExpense).filter(
            models.OperationalExpense.vehicle_id == v.vehicle_id,
            models.OperationalExpense.bbm > 0
        ).order_by(desc(models.OperationalExpense.date)).all()

        latest_fuel = expenses[0] if expenses else None
        fuel_history = []
        if latest_fuel:
            for fh in expenses[:5]:
                fuel_history.append({
                    "date": str(fh.date),
                    "km": 0,
                    "liters": 0.0,
                    "cost": f"Rp{fh.bbm:,.0f}" if fh.bbm else "Rp0",
                    "station": fh.notes or "-"
                })

        result.append({
            "id": str(v.vehicle_id),
            "plateNumber": v.license_plate,
            "model": v.type,
            "capacity": float(v.capacity_kg) if v.capacity_kg else 0,
            "currentLoad": current_load,
            "loadPercent": load_pct,
            "status": v.status or "Available",
            "isInternal": v.is_internal if v.is_internal is not None else True,
            "isOncall": not (v.is_internal if v.is_internal is not None else True),
            "kmAwalHariIni": v.current_km or 0,
            "kmAkhirHariIni": None,
            "boxDimensions": {
                "length": v.box_length_cm or 400,
                "width": v.box_width_cm or 200,
                "height": v.box_height_cm or 200
            },
            # Driver & helper hari ini
            "driverName": driver_name,
            "helperName": helper_name,
            "routeIdToday": route_id_today,
            "totalStopsToday": total_stops_today,
            "etaLast": eta_last,
            # Fuel info
            "lastFuelDate": str(latest_fuel.date) if latest_fuel else "-",
            "lastFuelCost": f"Rp{latest_fuel.bbm:,.0f}" if latest_fuel and latest_fuel.bbm else "-",
            "fuelEfficiency": 0.0,
            "history": fuel_history
        })

    return {"status": "success", "data": result}

@router.post("/fleet/oncall", response_model=schemas.FleetActionResponse)
def add_on_call_fleet(
    data: OnCallFleetRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    existing = db.query(models.FleetVehicle).filter(
        models.FleetVehicle.license_plate == data.plate_number
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Plat nomor sudah terdaftar!")

    new_vehicle = models.FleetVehicle(
        license_plate=data.plate_number,
        type=data.vehicle_type,
        capacity_kg=data.capacity_kg,
        status="Available",
        is_internal=False,
        box_length_cm=data.box_length_cm,
        box_width_cm=data.box_width_cm,
        box_height_cm=data.box_height_cm
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return {
        "message": f"Armada {data.plate_number} berhasil ditambahkan!",
        "vehicle_id": new_vehicle.vehicle_id
    }

@router.put("/fleet/{truck_id}/status", response_model=schemas.FleetActionResponse)
def update_truck_status(
    truck_id: int,
    status_data: VehicleStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    truck = db.query(models.FleetVehicle).filter(
        models.FleetVehicle.vehicle_id == truck_id
    ).first()

    if not truck:
        raise HTTPException(status_code=404, detail="Truk tidak ditemukan!")

    truck.status = status_data.status
    db.commit()

    return {"message": f"Status truk {truck.license_plate} → {status_data.status}"}

@router.post("/fleet/{truck_id}/fuel", response_model=schemas.FleetActionResponse)
def add_fuel_log(
    truck_id: int,
    data: FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik", "driver"))
):
    truck = db.query(models.FleetVehicle).filter(
        models.FleetVehicle.vehicle_id == truck_id
    ).first()

    if not truck:
        raise HTTPException(status_code=404, detail="Truk tidak ditemukan!")

    # Update KM Truk
    truck.current_km = data.km_akhir

    # 🌟 FIX CTO: Simpan sebagai OperationalExpense (Jadi nyambung ke Modul Kasir!)
    expense_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
    new_expense = models.OperationalExpense(
        id=expense_id,
        time=datetime.now().strftime("%H:%M"),
        date=date.today(),
        vehicle_id=truck_id,
        driver_id=truck.default_driver_id,
        bbm=data.cost_rp,
        total=data.cost_rp, # Total sementara cuma BBM
        notes=f"Isi BBM di {data.station_name} ({data.liters}L)"
    )

    db.add(new_expense)
    db.commit()

    return {
        "message": f"Biaya BBM Rp{data.cost_rp} di {data.station_name} berhasil dicatat ke pengeluaran operasional!",
        "log_id": expense_id,
        "efficiency": calculate_efficiency(data.km_akhir - data.km_awal, data.liters)
    }

@router.get("/fleet/{truck_id}/fuel-history")
def get_fuel_history(
    truck_id: int, limit: int = 30, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    # 🌟 FIX CTO: Narik dari OperationalExpense
    logs = db.query(models.OperationalExpense).filter(
        models.OperationalExpense.vehicle_id == truck_id,
        models.OperationalExpense.bbm > 0
    ).order_by(desc(models.OperationalExpense.date)).limit(limit).all()

    return {
        "status": "success",
        "data": [
            {
                "logId": l.id,
                "date": str(l.date),
                "kmStart": 0,
                "kmEnd": 0,
                "distance": 0,
                "liters": 0.0,
                "costRp": f"Rp{l.bbm:,.0f}",
                "efficiency": 0.0,
                "station": l.notes or "-"
            } for l in logs
        ]
    }

@router.get("/fleet/summary", response_model=schemas.FleetSummaryResponse)
def get_fleet_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    today = date.today()

    total_trucks = db.query(models.FleetVehicle).count() or 1
    active_today = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.planning_date == today).count()
    in_maintenance = db.query(models.FleetVehicle).filter(models.FleetVehicle.status == "Maintenance").count()

    return {
        "status": "success",
        "totalFleet": total_trucks,
        "activeToday": active_today,
        "inMaintenance": in_maintenance,
        "available": total_trucks - active_today - in_maintenance
    }

@router.get("/fleet/telematics/{truck_plate}", response_model=schemas.TelematicsResponse)
def get_live_telematics(truck_plate: str, db: Session = Depends(get_db)):
    # 🌟 FIX: Ambil settings dari DATABASE, bukan dari Pydantic / Env
    db_settings = db.query(models.SystemSettings).first()
    
    # Kalau settingan di DB belum ada, pakai nilai default 4.0
    max_temp = db_settings.alert_max_temp_celsius if db_settings and db_settings.alert_max_temp_celsius else 4.0
    api_url = db_settings.api_temp_sensor if db_settings else None
    
    default_telematics = {
        "temperature": 2.5,
        "isTempWarning": False,
        "compressorStatus": "ON",
        "gpsSignal": "STRONG",
        "doorLocked": True,
        "lastUpdate": datetime.now().isoformat()
    }

    try:
        # Hanya tembak API Vendor kalau URL-nya diisi di database
        if api_url:
            url_vendor = f"{api_url}?plate={truck_plate}" 
            response = requests.get(url_vendor, timeout=5)
            
            if response.status_code == 200:
                vendor_data = response.json()
                current_temp = float(vendor_data.get("suhu_sekarang", 2.5)) 
                
                return {
                    "temperature": current_temp,
                    "isTempWarning": current_temp > max_temp,
                    "compressorStatus": "ON" if current_temp > 2.0 else "OFF",
                    "gpsSignal": "STRONG", 
                    "doorLocked": vendor_data.get("pintu_terkunci", True),
                    "lastUpdate": datetime.now().isoformat()
                }
    except Exception as e:
        logger.error(f"⚠️ Gagal narik data dari API Vendor Truk {truck_plate}: {str(e)}")
        pass

    return default_telematics