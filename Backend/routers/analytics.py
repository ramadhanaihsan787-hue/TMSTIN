# routers/analytics.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse 
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
import io
import pandas as pd 

import models
import schemas
from dependencies import get_db, get_settings, get_current_user, require_role

# 🌟 PASTIKAN SEMUA SERVICE TER-IMPORT
from services import analytics_service, driver_performance_service
from services import kpi_calculator
from services import metrics_service

# 🌟 FIX CTO: Hapus prefix biar kita bebas bikin 2 pintu masuk di setiap rute!
router = APIRouter(tags=["Analytics"])

# ==========================================
# ENDPOINT 1: KPI SUMMARY (TAB 1 - OVERVIEW)
# ==========================================
@router.get("/analytics/kpi-summary")
@router.get("/api/analytics/kpi-summary")
def get_kpi_summary(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None,   
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
): 
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())
    
    settings = get_settings()
    # 🌟 Ganti ke kpi_calculator (asumsi dipindah ke sini saat refactor)
    return kpi_calculator.get_kpi_summary(db, startDate, endDate, settings)

# ==========================================
# ENDPOINT 2: HOURLY DELIVERY VOLUME
# ==========================================
@router.get("/analytics/delivery-volume")
@router.get("/api/analytics/delivery-volume")
def get_delivery_volume(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None,   
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())

    # 🌟 Arahkan ke metrics_service
    return metrics_service.get_delivery_volume(db, startDate, endDate)

# ==========================================
# ENDPOINT 3: FLEET UTILIZATION
# ==========================================
@router.get("/analytics/fleet-utilization")
@router.get("/api/analytics/fleet-utilization")
def get_fleet_utilization(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())
    
    # 🌟 Arahkan ke metrics_service
    return metrics_service.get_fleet_utilization(db, startDate, endDate)

# ==========================================
# ENDPOINT 4: DRIVER PERFORMANCE
# ==========================================
@router.get("/analytics/driver-performance")
@router.get("/api/analytics/driver-performance")
def get_driver_performance(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())
    
    # Memang pakai driver_performance_service (Aman)
    return driver_performance_service.get_real_driver_performance(db, startDate, endDate)

# ==========================================
# ENDPOINT 5: RETURNS DASHBOARD (TAB 2)
# ==========================================
@router.get("/analytics/returns-dashboard", response_model=schemas.ReturnDashboardResponse)
@router.get("/api/analytics/returns-dashboard", response_model=schemas.ReturnDashboardResponse)
def get_returns_dashboard(db: Session = Depends(get_db)):
    # 🌟 Arahkan ke metrics_service
    data = metrics_service.get_returns_dashboard(db)
    return {"status": "success", "data": data}

# ==========================================
# ENDPOINT 6: EFFICIENCY DASHBOARD (TAB 3)
# ==========================================
@router.get("/analytics/efficiency-dashboard", response_model=schemas.EfficiencyDashboardResponse)
@router.get("/api/analytics/efficiency-dashboard", response_model=schemas.EfficiencyDashboardResponse)
def get_efficiency_dashboard(db: Session = Depends(get_db)):
    settings = get_settings()
    
    # ❌ SEBELUMNYA (Tadi gw arahin ke analytics_service karena blm liat file ini)
    # data = analytics_service.get_efficiency_dashboard(db, settings)
    
    # ✅ UBAH JADI INI:
    data = kpi_calculator.get_efficiency_dashboard(db, settings)
    
    return {"status": "success", "data": data}

# ==========================================
# ENDPOINT 7: MONITORING ALERTS
# ==========================================
@router.get("/analytics/monitoring-alerts")
@router.get("/api/analytics/monitoring-alerts")
def get_monitoring_alerts(db: Session = Depends(get_db)):
    # Memang pakai analytics_service sesuai file terlampir (Aman)
    data_alerts = analytics_service.get_realtime_alerts(db)
    return {
        "status": "success",
        "data": data_alerts
    }

# ==========================================
# ENDPOINT 8: REJECTION ANALYSIS (LEGACY)
# ==========================================
@router.get("/analytics/rejections")
@router.get("/api/analytics/rejections")
def get_rejection_analysis(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())
    
    # 🌟 Arahkan ke metrics_service
    return metrics_service.get_rejection_analysis(db, startDate, endDate)

# ==========================================
# ENDPOINT 9: MANAGER OVERVIEW (LEGACY)
# ==========================================
@router.get("/analytics/manager/overview")
@router.get("/api/analytics/manager/overview")
def get_manager_overview(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(require_role("manager_logistik"))
):
    # 🌟 Arahkan ke metrics_service
    return metrics_service.get_manager_overview(db)


# =========================================================================
# CETAK EXCEL REPORT NYATA 
# =========================================================================
@router.get("/analytics/export")
@router.get("/api/analytics/export")
def export_analytics_data(
    format: str = "xlsx", 
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("manager_logistik", "admin_distribusi"))
):
    if not startDate: startDate = str(date.today())
    if not endDate: endDate = str(date.today())

    try:
        start_dt = datetime.strptime(startDate, "%Y-%m-%d")
        end_dt = datetime.strptime(endDate, "%Y-%m-%d")

        orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.created_at >= start_dt,
            models.DeliveryOrder.created_at <= end_dt
        ).all()
        
        export_data = []
        for o in orders:
            export_data.append({
                "Order ID": o.order_id,
                "Customer": (
                    o.customer.store_name
                    if o.customer
                    else "Unknown"
                ),
                "Status": o.status.value if o.status else "Unknown",
                "Total Weight (KG)": o.weight_total,
                "Tiba di Toko": (
                    o.route_line.actual_arrival_time.strftime("%Y-%m-%d %H:%M:%S")
                    if (
                        o.route_line and
                        o.route_line.actual_arrival_time
                    )
                    else "Belum Tiba"
                ),  
            })

        if not export_data:
            export_data.append({"Info": f"Tidak ada data DO untuk periode {startDate} hingga {endDate}"})

        df = pd.DataFrame(export_data)

        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Delivery Orders', index=False)
            
        stream.seek(0)

        filename = f"JAPFA_Logistics_Report_{startDate}_to_{endDate}.xlsx"
        
        return StreamingResponse(
            stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal generate Excel: {str(e)}")