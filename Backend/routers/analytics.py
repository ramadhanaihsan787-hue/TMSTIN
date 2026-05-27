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
    format: str = "pdf",
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("manager_logistik", "admin_distribusi"))
):
    """
    Generate laporan logistik dalam format PDF.
    Berisi ringkasan DO, status pengiriman, dan total berat per periode.
    """
    if not startDate: startDate = str(date.today())
    if not endDate:   endDate   = str(date.today())

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        start_dt = datetime.strptime(startDate, "%Y-%m-%d")
        end_dt   = datetime.strptime(endDate,   "%Y-%m-%d").replace(
            hour=23, minute=59, second=59
        )

        orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.created_at >= start_dt,
            models.DeliveryOrder.created_at <= end_dt
        ).order_by(models.DeliveryOrder.created_at).all()

        # ── Build PDF ──────────────────────────────────────────────────────
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            rightMargin=2*cm, leftMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm
        )

        styles  = getSampleStyleSheet()
        PRIMARY = colors.HexColor("#D54B00")  # warna brand

        title_style = ParagraphStyle(
            "Title", parent=styles["Heading1"],
            fontSize=16, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=6
        )
        sub_style = ParagraphStyle(
            "Sub", parent=styles["Normal"],
            fontSize=9, textColor=colors.grey, alignment=TA_CENTER, spaceAfter=20
        )
        label_style = ParagraphStyle(
            "Label", parent=styles["Normal"], fontSize=8, textColor=colors.grey
        )

        elements = []

        # Header
        elements.append(Paragraph("LAPORAN LOGISTIK", title_style))
        elements.append(Paragraph(
            f"PT So Good Food (Fresh) WH Cikupa &nbsp;|&nbsp; "
            f"Periode: {startDate} s/d {endDate}",
            sub_style
        ))
        elements.append(Spacer(1, 0.3*cm))

        # Summary cards row
        total_do      = len(orders)
        delivered_ok  = sum(1 for o in orders
                            if o.status and "delivered_success" in str(o.status))
        delivered_par = sum(1 for o in orders
                            if o.status and "delivered_partial" in str(o.status))
        total_weight  = sum(float(o.weight_total or 0) for o in orders)

        summary_data = [
            ["Total DO", "Sukses", "Parsial", "Total Muatan"],
            [
                str(total_do),
                str(delivered_ok),
                str(delivered_par),
                f"{total_weight:,.1f} KG"
            ],
        ]
        sum_table = Table(summary_data, colWidths=[4*cm]*4)
        sum_table.setStyle(TableStyle([
            ("BACKGROUND",  (0,0), (-1,0), PRIMARY),
            ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
            ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0), (-1,-1), 9),
            ("ALIGN",       (0,0), (-1,-1), "CENTER"),
            ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
            ("ROWHEIGHT",   (0,0), (-1,-1), 20),
            ("BACKGROUND",  (0,1), (-1,1), colors.HexColor("#FFF3EB")),
            ("FONTNAME",    (0,1), (-1,1), "Helvetica-Bold"),
            ("FONTSIZE",    (0,1), (-1,1), 12),
            ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#E0E0E0")),
            ("BOX",         (0,0), (-1,-1), 1,   PRIMARY),
            ("TOPPADDING",  (0,0), (-1,-1), 6),
            ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ]))
        elements.append(sum_table)
        elements.append(Spacer(1, 0.5*cm))

        # Detail table header
        elements.append(Paragraph("Detail Delivery Order", ParagraphStyle(
            "SH", parent=styles["Heading2"], fontSize=10, textColor=PRIMARY, spaceAfter=8
        )))

        if orders:
            table_data = [["No.", "Order ID", "Customer", "Status", "Berat (KG)", "Tiba di Toko"]]
            for idx, o in enumerate(orders, 1):
                cust   = o.customer.store_name if o.customer else "—"
                status = str(o.status.value).replace("_", " ").title() if o.status else "—"
                berat  = f"{float(o.weight_total or 0):,.0f}"
                tiba   = "—"
                try:
                    if o.route_line and o.route_line.actual_arrival_time:
                        tiba = o.route_line.actual_arrival_time.strftime("%d/%m %H:%M")
                except: pass
                table_data.append([str(idx), o.order_id, cust[:28], status, berat, tiba])

            col_w = [1*cm, 3*cm, 6*cm, 3*cm, 2.5*cm, 2*cm]
            det_table = Table(table_data, colWidths=col_w, repeatRows=1)
            det_table.setStyle(TableStyle([
                ("BACKGROUND",   (0,0), (-1,0), PRIMARY),
                ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
                ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",     (0,0), (-1,-1), 7.5),
                ("ALIGN",        (0,0), (1,-1),  "CENTER"),
                ("ALIGN",        (4,0), (5,-1),  "CENTER"),
                ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
                ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, colors.HexColor("#FBF7F5")]),
                ("GRID",         (0,0), (-1,-1), 0.4, colors.HexColor("#E0E0E0")),
                ("BOX",          (0,0), (-1,-1), 0.8, colors.HexColor("#CCCCCC")),
                ("TOPPADDING",   (0,0), (-1,-1), 4),
                ("BOTTOMPADDING",(0,0), (-1,-1), 4),
            ]))
            elements.append(det_table)
        else:
            elements.append(Paragraph(
                f"Tidak ada data Delivery Order untuk periode {startDate} s/d {endDate}.",
                styles["Normal"]
            ))

        # Footer
        elements.append(Spacer(1, 1*cm))
        elements.append(Paragraph(
            f"Digenerate otomatis oleh TMS JAPFA FnB · {datetime.now().strftime('%d %b %Y %H:%M')}",
            ParagraphStyle("Footer", parent=styles["Normal"],
                           fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
        ))

        doc.build(elements)
        buf.seek(0)

        filename = f"Laporan_JAPFA_{startDate}_sd_{endDate}.pdf"
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal generate PDF: {str(e)}")