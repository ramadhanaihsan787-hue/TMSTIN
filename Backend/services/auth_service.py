# Backend/services/auth_service.py
from sqlalchemy.orm import Session
from datetime import timedelta 
from core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
import models

class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> models.User:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> models.User:
        return db.query(models.User).filter(models.User.username == username).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> models.User:
        return db.query(models.User).filter(models.User.id == user_id).first()
    
    @staticmethod
    def create_user(db: Session, username: str, password: str, full_name: str, role: str) -> models.User:
        existing = db.query(models.User).filter(models.User.username == username).first()
        if existing:
            raise ValueError(f"Username '{username}' already exists!")
        
        new_user = models.User(
            username=username,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=models.UserRole(role)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    
    @staticmethod
    def create_access_token_for_user(user: models.User) -> str:
        # 🌟 SUNTIKAN CTO: ACCESS TOKEN UMUR PENDEK (2 JAM AJA BIAR AMAN DARI HACKER)
        token_lifespan = timedelta(minutes=120)
        return create_access_token(
            data={
                "sub": user.username,
                "role": user.role.value,
                "user_id": user.id,
                "type": "access" # Flag ini token akses
            },
            expires_delta=token_lifespan 
        )

    # =======================================================
    # 🌟 SUNTIKAN CTO BARU: FUNGSI REFRESH TOKEN (UMUR PANJANG)
    # =======================================================
    @staticmethod
    def create_refresh_token_for_user(user: models.User) -> str:
        # [QW-1] Pakai create_refresh_token() — kunci BERBEDA dari access token
        # Umur dan signing pakai REFRESH_SECRET_KEY (diatur di core/security.py)
        return create_refresh_token(
            data={
                "sub": user.username,
                "role": user.role.value,
                "user_id": user.id,
                "type": "refresh",
            }
        )
    
    @staticmethod
    def get_all_users(db: Session) -> list:
        return db.query(models.User).all()
    
    @staticmethod
    def update_user_password(db: Session, user_id: int, new_password: str) -> models.User:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.hashed_password = get_password_hash(new_password)
            db.commit()
            db.refresh(user)
        return user