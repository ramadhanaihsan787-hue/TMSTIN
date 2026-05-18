# Backend/services/order_service.py
"""
Order Service - Delivery order processing and management (Enterprise Grade)
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime

import models
from schemas import OrderCreate
from utils.helpers import classify_store, time_str_to_minutes
import logging

logger = logging.getLogger(__name__)

# ==========================================
# 🌟 CUSTOM EXCEPTIONS
# ==========================================
class OrderServiceError(Exception):
    pass

class OrderNotFoundError(OrderServiceError):
    pass

class OrderValidationError(OrderServiceError):
    pass


class OrderService:
    """Service for order operations (Flush-Only Policy)"""
    
    # ==========================================
    # KUMPULAN FUNGSI LAMA (UDAH DI-UPGRADE KE FLUSH)
    # ==========================================
    @staticmethod
    def create_order(db: Session, order_data: OrderCreate) -> models.DeliveryOrder:
        is_mall = classify_store(order_data.customer_name)
        
        order = models.DeliveryOrder(
            order_id=order_data.order_id,
            customer_name=order_data.customer_name,
            latitude=order_data.latitude,
            longitude=order_data.longitude,
            weight_total=order_data.weight_total,
            service_type=order_data.service_type,
            delivery_window_start=order_data.delivery_window_start,
            delivery_window_end=order_data.delivery_window_end,
            store_id=order_data.store_id if order_data.store_id else (1 if is_mall else 0),
            status=models.DOStatus.so_waiting_verification
        )
        
        db.add(order)
        db.flush() # 🌟 Upgrade: Biar Router yang nge-commit
        return order
    
    @staticmethod
    def get_order(db: Session, order_id: str) -> models.DeliveryOrder:
        return db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
    
    @staticmethod
    def get_orders_by_date(db: Session, date_str: str) -> List[models.DeliveryOrder]:
        from datetime import datetime as dt
        date_obj = dt.strptime(date_str, "%Y-%m-%d").date()
        
        return db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.created_at >= dt.combine(date_obj, dt.min.time()),
            models.DeliveryOrder.created_at < dt.combine(date_obj, dt.max.time())
        ).all()
    
    @staticmethod
    def update_order_status(db: Session, order_id: str, status: models.DOStatus) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")
            
        order.status = status
        db.flush() # 🌟 Upgrade
        return order
    
    @staticmethod
    def assign_order_to_route(db: Session, order_id: str, route_id: str, driver_id: int) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")
            
        order.route_id = route_id
        order.driver_id = driver_id
        order.status = models.DOStatus.do_assigned_to_route
        db.flush() # 🌟 Upgrade
        return order
    
    @staticmethod
    def get_pending_orders(db: Session) -> List[models.DeliveryOrder]:
        return db.query(models.DeliveryOrder).filter(models.DeliveryOrder.status == models.DOStatus.do_verified).all()

    # ==========================================
    # KUMPULAN FUNGSI BARU (DARI HASIL REFACTORING KITA)
    # ==========================================
    @staticmethod
    def update_time_window(db: Session, order_id: str, jam_maksimal: str) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        if not jam_maksimal:
            order.delivery_window_end = 1200 
        else:
            try:
                h, m = map(int, jam_maksimal.split(":"))
                order.delivery_window_end = (h * 60) + m
            except Exception:
                raise OrderValidationError("Format jam salah! Gunakan format HH:MM (contoh: 14:30)")
        
        db.flush() 
        return order

    @staticmethod
    def update_coordinate(db: Session, order_id: str, lat: float, lon: float, kode_cust: str, nama_cust: str):
        # 🌟 Gabungan update koordinat + Sinkronisasi Master Customer
        master = db.query(models.MasterCustomer).filter(models.MasterCustomer.kode_customer == kode_cust).first()
        if master:
            master.latitude, master.longitude = lat, lon
        else:
            master = models.MasterCustomer(kode_customer=kode_cust, store_name=nama_cust, latitude=lat, longitude=lon)
            db.add(master)

        if order_id.startswith("DRAFT-"):
            db.flush()
            return None

        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        order.latitude = lat
        order.longitude = lon
        order.status = models.DOStatus.do_verified
        
        db.flush() 
        return order

    @staticmethod
    def approve_pod(db: Session, order_id: str) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")
        
        valid_statuses = [
            models.DOStatus.delivered_pod_uploaded,
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial
        ]
        if order.status not in valid_statuses:
            raise OrderValidationError(f"Tidak bisa approve POD. Status DO saat ini: {order.status.value}")

        order.status = models.DOStatus.billed

        if order.route_line and order.route_line.epod:
            order.route_line.epod.status = models.DOStatus.billed

        db.flush() 
        return order

    @staticmethod
    def reject_pod(db: Session, order_id: str, reason: str, notes: str) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")
        
        valid_statuses = [
            models.DOStatus.delivered_pod_uploaded,
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial
        ]
        if order.status not in valid_statuses:
            raise OrderValidationError(f"Tidak bisa reject POD. Status DO saat ini: {order.status.value}")

        order.status = models.DOStatus.do_assigned_to_route
        
        if order.route_line and order.route_line.epod:
            rejection_note = f"DITOLAK ADMIN. Alasan: {reason}"
            if notes:
                rejection_note += f" ({notes})"
            
            order.route_line.epod.status = models.DOStatus.do_assigned_to_route
            if order.route_line.epod.driver_notes:
                order.route_line.epod.driver_notes += f" | {rejection_note}"
            else:
                order.route_line.epod.driver_notes = rejection_note
        
        db.flush() 
        return order

    @staticmethod
    def update_weight(db: Session, order_id: str, weight: float) -> models.DeliveryOrder:
        order = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.order_id == order_id).first()
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")
        
        order.weight_total = weight
        db.flush() 
        return order