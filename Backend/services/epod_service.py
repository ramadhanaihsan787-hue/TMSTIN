# services/epod_service.py
from datetime import datetime
from sqlalchemy.orm import Session
import models

def submit_epod_with_ai(db: Session, line_id: int, qty_delivered: float, qty_return: float, reason: str, photo_url: str):
    line = db.query(models.TMSRouteLine).get(line_id)
    if not line:
        return {"status": "error", "msg": "Rute tidak ditemukan"}

    order = line.order
    customer = order.customer
    settings = db.query(models.SystemSettings).first()

    now = datetime.now()

    # 1. BIKIN RECORD E-POD
    new_epod = models.TMSEpodHistory(
        line_id=line.line_id,
        status=models.DOStatus.delivered_success if qty_return == 0 else models.DOStatus.delivered_partial,
        timestamp=now,
        photo_url=photo_url,
        qty_delivered=qty_delivered,
        qty_return=qty_return,
        return_reason=reason
    )
    db.add(new_epod)

    # 2. UPDATE STATUS ORDER
    order.status = new_epod.status

    # 🌟 3. AI ANOMALY REJECTION & SERVICE TIME CALCULATION
    if line.actual_arrival_time:
        # Hitung murni berapa lama dia bongkar (dari Auto-Arrival sampai detik pencet submit)
        service_minutes = (now - line.actual_arrival_time).total_seconds() / 60.0
        line.actual_service_minutes = service_minutes

        weight_kg = float(order.weight_total) if order.weight_total else 1.0
        
        # Cek kebiasaan toko ini (Berapa menit biasanya buat 1 KG?)
        avg_kg_time = float(customer.avg_service_time_per_kg) if customer.avg_service_time_per_kg else 0.5 # Asumsi default 0.5 mnt/kg
        
        expected_time = avg_kg_time * weight_kg
        
        # Batas Kewajaran (Default: 200% dari waktu normal / telat parah)
        tolerance = (settings.anomaly_tolerance_percent / 100.0) if settings else 2.0
        max_allowed_time = expected_time * tolerance
        
        # Jika barang dikit tapi waktu bongkar sampe berjam-jam -> PASTI NGAKALIN / NGOPI!
        if service_minutes > max_allowed_time or service_minutes < 2.0:
            line.is_anomaly = True
            # DATANYA KITA BUANG DARI PEMBELAJARAN AI (Tidak update ke customer)
            # Dosen lu pasti tepuk tangan liat logika ini!
        else:
            line.is_anomaly = False
            
            # DATANYA VALID! Mari kita ajarkan ke Database pakai EMA (Exponential Moving Average)
            current_speed_per_kg = service_minutes / weight_kg
            
            if customer.avg_service_time_per_kg == 0.0:
                customer.avg_service_time_per_kg = current_speed_per_kg
            else:
                # Rumus EMA: 80% Historis Lama + 20% Data Hari Ini (Biar transisinya mulus)
                new_avg = (float(customer.avg_service_time_per_kg) * 0.8) + (current_speed_per_kg * 0.2)
                customer.avg_service_time_per_kg = new_avg

    db.commit()
    
    # Kalau anomali, kita kembalikan status khusus biar Frontend/Admin tau
    if getattr(line, 'is_anomaly', False):
        return {"status": "success_with_warning", "msg": "E-POD sukses, tapi waktu bongkar ditandai sebagai ANOMALI."}
    
    return {"status": "success", "msg": "E-POD sukses dan AI berhasil belajar!"}