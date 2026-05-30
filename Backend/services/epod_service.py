# Backend/services/epod_service.py
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import models

logger = logging.getLogger(__name__)

# 🌟 FIX CTO: STATE MACHINE (Kamus Transisi Status yang Sah)
# Format: { Status_Saat_Ini : [Daftar_Status_Tujuan_Yang_Diizinkan] }
ALLOWED_POD_TRANSITIONS = {
    # Step 1: driver kirim foto → masuk antrean review admin POD
    models.DOStatus.do_assigned_to_route: [
        models.DOStatus.delivered_pod_uploaded,
    ],
    # Step 2: admin POD review → final verdict
    models.DOStatus.delivered_pod_uploaded: [
        models.DOStatus.delivered_success,
        models.DOStatus.delivered_partial,
        models.DOStatus.failed,
    ],
}

def submit_epod_with_ai(db: Session, line_id: int, qty_delivered: float, qty_return: float, reason: str, photo_url: str):
    line = db.query(models.TMSRouteLine).get(line_id)
    if not line:
        return {"status": "error", "msg": "Rute tidak ditemukan"}

    order = line.order
    if not order:
        return {"status": "error", "msg": "Delivery Order tidak ditemukan pada rute ini"}

    # 🌟 IMPLEMENTASI STATE MACHINE VALIDATOR
    # Driver submit foto → status intermediate "menunggu review admin POD"
    # Admin POD yang akan approve (→ delivered_success/partial) atau reject
    target_status = models.DOStatus.delivered_pod_uploaded
    
    allowed_next_states = ALLOWED_POD_TRANSITIONS.get(order.status, [])
    if target_status not in allowed_next_states:
        logger.warning(f"⚠️ Illegal State Transition! DO {order.order_id} mencoba pindah dari {order.status.value} ke {target_status.value}")
        return {
            "status": "error", 
            "msg": f"Transisi ilegal! DO dengan status '{order.status.value}' tidak bisa diubah menjadi '{target_status.value}'."
        }

    customer = order.customer
    settings = db.query(models.SystemSettings).first()
    now = datetime.now()

    try:
        # 1. BIKIN RECORD E-POD
        new_epod = models.TMSEpodHistory(
            line_id=line.line_id,
            status=target_status,
            timestamp=now,
            photo_url=photo_url,
            qty_delivered=qty_delivered,
            qty_return=qty_return,
            return_reason=reason
        )
        db.add(new_epod)

        # 2. UPDATE STATUS ORDER
        order.status = target_status

        # 3. AI ANOMALY REJECTION & SERVICE TIME CALCULATION
        if line.actual_arrival_time:
            service_minutes = (now - line.actual_arrival_time).total_seconds() / 60.0
            line.actual_service_minutes = service_minutes

            weight_kg = float(order.weight_total) if order.weight_total else 1.0
            avg_kg_time = float(customer.avg_service_time_per_kg) if customer.avg_service_time_per_kg else 0.5 
            expected_time = avg_kg_time * weight_kg
            
            tolerance = (settings.anomaly_tolerance_percent / 100.0) if settings else 2.0
            max_allowed_time = expected_time * tolerance
            
            if service_minutes > max_allowed_time or service_minutes < 2.0:
                line.is_anomaly = True
            else:
                line.is_anomaly = False
                current_speed_per_kg = service_minutes / weight_kg
                
                if customer.avg_service_time_per_kg == 0.0:
                    customer.avg_service_time_per_kg = current_speed_per_kg
                else:
                    new_avg = (float(customer.avg_service_time_per_kg) * 0.8) + (current_speed_per_kg * 0.2)
                    customer.avg_service_time_per_kg = new_avg

        db.commit()
        
        if getattr(line, 'is_anomaly', False):
            return {"status": "success_with_warning", "msg": "E-POD sukses, tapi waktu bongkar ditandai sebagai ANOMALI."}
        
        return {"status": "success", "msg": "E-POD sukses dan AI berhasil belajar!"}

    except Exception as e:
        db.rollback()
        logger.error(f"🚨 [EPOD SUBMIT ERROR]: {str(e)}", exc_info=True)
        return {"status": "error", "msg": "Gagal menyimpan data E-POD karena kesalahan internal database."}