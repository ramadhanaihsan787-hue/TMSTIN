# Backend/services/route_service.py
"""
Route Service - Route management and confirmation (Enterprise Grade)
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any
import logging
import models

logger = logging.getLogger(__name__)

# ==========================================
# 🌟 MASALAH 2: CUSTOM EXCEPTIONS (Error Handling Dewa)
# ==========================================
class RouteServiceError(Exception):
    """Base exception buat semua error di Route Service"""
    pass

class EntityNotFoundError(RouteServiceError):
    """Dipakai kalau ID Truk, Supir, atau DO ngga ketemu"""
    pass

class RouteValidationError(RouteServiceError):
    """Dipakai kalau ada salah input dari sisi bisnis logik"""
    pass

# ==========================================
# 🌟 MASALAH 3: CONSTANTS / ENUM (Anti-Typo)
# ==========================================
class RouteStatus:
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class RouteService:
    """Service for route operations"""
    
    @staticmethod
    def create_route(
        db: Session,
        vehicle_id: int,
        driver_id: int,
        route_date: str,
        route_data: Dict[str, Any]
    ) -> models.TMSRoutePlan:
        from datetime import datetime
        
        # 🌟 MASALAH 4: VALIDASI EXISTENCE (Cek dulu sebelum bikin)
        vehicle = db.query(models.FleetVehicle).filter(models.FleetVehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            raise EntityNotFoundError(f"Armada dengan ID '{vehicle_id}' tidak ditemukan di database.")
            
        driver = db.query(models.HRDriver).filter(models.HRDriver.driver_id == driver_id).first()
        if not driver:
            raise EntityNotFoundError(f"Supir dengan ID '{driver_id}' tidak ditemukan di database.")

        try:
            # Note: Disesuaikan dengan penamaan kolom di models.py (planning_date, total_distance_km)
            route = models.TMSRoutePlan(
                vehicle_id=vehicle_id,
                driver_id=driver_id,
                planning_date=datetime.strptime(route_date, "%Y-%m-%d").date(),
                total_distance_km=route_data.get("total_distance", 0),
                total_weight=route_data.get("total_weight", 0)
                # status=RouteStatus.PLANNED  # Buka comment ini kalau di models lu ada kolom status
            )
            
            db.add(route)
            
            # 🌟 MASALAH 1: FLUSH (Simpan di memory sementara, commitnya di Router!)
            db.flush() 
            
            return route
            
        except SQLAlchemyError as e:
            logger.error(f"🚨 [CREATE ROUTE FAILED]: {str(e)}")
            raise RouteServiceError("Gagal membuat rute karena masalah internal database.")
    
    @staticmethod
    def get_route(db: Session, route_id: str) -> models.TMSRoutePlan:
        route = db.query(models.TMSRoutePlan).filter(models.TMSRoutePlan.route_id == route_id).first()
        if not route:
            raise EntityNotFoundError(f"Rute dengan ID '{route_id}' tidak ditemukan.")
        return route
    
    @staticmethod
    def get_routes_by_date(db: Session, route_date: str) -> List[models.TMSRoutePlan]:
        from datetime import datetime
        date_obj = datetime.strptime(route_date, "%Y-%m-%d").date()
        return db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.planning_date == date_obj
        ).all()
    
    @staticmethod
    def get_routes_by_vehicle(
        db: Session,
        vehicle_id: int,
        route_date: str = None
    ) -> List[models.TMSRoutePlan]:
        
        # Validasi Truk
        vehicle = db.query(models.FleetVehicle).filter(models.FleetVehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            raise EntityNotFoundError("Armada tidak ditemukan.")

        query = db.query(models.TMSRoutePlan).filter(
            models.TMSRoutePlan.vehicle_id == vehicle_id
        )
        
        if route_date:
            from datetime import datetime
            date_obj = datetime.strptime(route_date, "%Y-%m-%d").date()
            query = query.filter(models.TMSRoutePlan.planning_date == date_obj)
        
        return query.all()
    
    @staticmethod
    def update_route_status(
        db: Session,
        route_id: str,
        status: str
    ) -> models.TMSRoutePlan:
        
        # Validasi enum secara manual jika status berupa string bebas
        valid_statuses = [RouteStatus.PLANNED, RouteStatus.IN_PROGRESS, RouteStatus.COMPLETED]
        if status not in valid_statuses:
            raise RouteValidationError(f"Status '{status}' tidak valid.")

        try:
            route = db.query(models.TMSRoutePlan).filter(
                models.TMSRoutePlan.route_id == route_id
            ).first()
            
            if not route:
                raise EntityNotFoundError(f"Rute ID '{route_id}' tidak ditemukan.")
                
            # route.status = status # Buka comment ini kalau di models lu beneran ada kolom status
            
            # 🌟 MASALAH 1: FLUSH
            db.flush()
            return route
            
        except SQLAlchemyError as e:
            logger.error(f"🚨 [UPDATE ROUTE STATUS FAILED]: {str(e)}")
            raise RouteServiceError("Gagal mengupdate status rute.")
    
    @staticmethod
    def confirm_route_delivery(
        db: Session,
        route_id: str,
        order_id: str,
        delivery_status: str
    ) -> models.DeliveryOrder:
        
        try:
            order = db.query(models.DeliveryOrder).join(
                models.TMSRouteLine, models.DeliveryOrder.order_id == models.TMSRouteLine.order_id
            ).filter(
                models.DeliveryOrder.order_id == order_id,
                models.TMSRouteLine.route_id == route_id
            ).first()
            
            if not order:
                raise EntityNotFoundError(f"Order '{order_id}' di Rute '{route_id}' tidak ditemukan.")
            
            # 🌟 MASALAH 3: PAKE ENUM DOStatus YANG UDAH ADA DI MODELS
            if delivery_status == "success":
                order.status = models.DOStatus.delivered_success
            elif delivery_status == "partial":
                order.status = models.DOStatus.delivered_partial
            else:
                order.status = models.DOStatus.failed
            
            # 🌟 MASALAH 1: FLUSH
            db.flush()
            return order
            
        except SQLAlchemyError as e:
            logger.error(f"🚨 [CONFIRM ROUTE DELIVERY FAILED]: {str(e)}")
            raise RouteServiceError("Gagal mengonfirmasi pengiriman rute.")