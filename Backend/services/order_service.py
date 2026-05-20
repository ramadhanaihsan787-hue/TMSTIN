# Backend/services/order_service.py
"""
Order Service — Business logic untuk operasi Delivery Order.
FSM sudah dipindahkan secara total ke services/order_fsm.py
"""
from sqlalchemy.orm import Session
from typing import List
import models
import logging

logger = logging.getLogger(__name__)

# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================
class OrderServiceError(Exception):
    """Base exception untuk semua error di Order Service."""
    pass

class OrderNotFoundError(OrderServiceError):
    """Order ID tidak ditemukan di database."""
    pass

class OrderValidationError(OrderServiceError):
    """Input atau transisi status tidak valid secara bisnis."""
    pass

# ============================================================
# ORDER SERVICE
# ============================================================
class OrderService:
    """
    Service layer untuk operasi DeliveryOrder.
    Semua method menggunakan flush-only policy:
    commit dilakukan di router, bukan di sini.
    """

    @staticmethod
    def update_time_window(
        db: Session,
        order_id: str,
        jam_maksimal: str,
    ) -> models.DeliveryOrder:
        """Ubah batas waktu pengiriman (delivery_window_end) sebuah DO."""
        order = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.order_id == order_id)
            .first()
        )
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        if not jam_maksimal:
            order.delivery_window_end = 1200  # default 20:00
        else:
            try:
                h, m = map(int, jam_maksimal.split(":"))
                order.delivery_window_end = (h * 60) + m
            except (ValueError, AttributeError):
                raise OrderValidationError(
                    "Format jam salah! Gunakan HH:MM (contoh: 14:30)"
                )

        db.flush()
        return order

    @staticmethod
    def update_coordinate(
        db: Session,
        order_id: str,
        lat: float,
        lon: float,
        kode_cust: str,
        nama_cust: str,
    ) -> models.DeliveryOrder | None:
        """Update koordinat DO + sinkronisasi ke MasterCustomer."""
        master = (
            db.query(models.MasterCustomer)
            .filter(models.MasterCustomer.kode_customer == kode_cust)
            .first()
        )
        if master:
            master.latitude = lat
            master.longitude = lon
        else:
            master = models.MasterCustomer(
                kode_customer=kode_cust,
                store_name=nama_cust,
                latitude=lat,
                longitude=lon,
            )
            db.add(master)

        if order_id.startswith("DRAFT-"):
            db.flush()
            return None

        order = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.order_id == order_id)
            .first()
        )
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        order.latitude = lat
        order.longitude = lon
        order.status = models.DOStatus.do_verified

        db.flush()
        return order

    @staticmethod
    def approve_pod(db: Session, order_id: str) -> models.DeliveryOrder:
        """Approve POD → status DO menjadi BILLED."""
        order = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.order_id == order_id)
            .first()
        )
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        valid_statuses = [
            models.DOStatus.delivered_pod_uploaded,
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial,
        ]
        if order.status not in valid_statuses:
            raise OrderValidationError(
                f"Tidak bisa approve POD. Status saat ini: {order.status.value}"
            )

        order.status = models.DOStatus.billed
        if order.route_line and order.route_line.epod:
            order.route_line.epod.status = models.DOStatus.billed

        db.flush()
        return order

    @staticmethod
    def reject_pod(
        db: Session,
        order_id: str,
        reason: str,
        notes: str,
    ) -> models.DeliveryOrder:
        """Reject POD → status DO kembali ke DO_ASSIGNED_TO_ROUTE."""
        order = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.order_id == order_id)
            .first()
        )
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        valid_statuses = [
            models.DOStatus.delivered_pod_uploaded,
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial,
        ]
        if order.status not in valid_statuses:
            raise OrderValidationError(
                f"Tidak bisa reject POD. Status saat ini: {order.status.value}"
            )

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
    def update_weight(
        db: Session,
        order_id: str,
        weight: float,
    ) -> models.DeliveryOrder:
        """Update berat total sebuah DO."""
        order = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.order_id == order_id)
            .first()
        )
        if not order:
            raise OrderNotFoundError(f"Order '{order_id}' tidak ditemukan.")

        if weight <= 0:
            raise OrderValidationError("Berat harus lebih dari 0 KG.")

        order.weight_total = weight
        db.flush()
        return order