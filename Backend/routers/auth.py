# Backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel # 🌟 Jangan lupa import ini

# Kita butuh jwt buat bongkar token refresh-nya
from jose import jwt, JWTError

import models
import schemas 
from dependencies import get_db, get_current_user, require_role
from services.auth_service import AuthService

# 🌟 Coba tarik SECRET_KEY dari modul security lu
try:
    from core.security import SECRET_KEY, ALGORITHM
except ImportError:
    # Fallback kalau ga nemu
    SECRET_KEY = "SECRET_KEY_RAHASIA_LU_YANG_ADA_DI_ENV"
    ALGORITHM = "HS256"

router = APIRouter(tags=["Authentication"])

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah!",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 🌟 SEKARANG KITA CETAK 2 TOKEN SEKALIGUS!
    access_token = AuthService.create_access_token_for_user(user)
    refresh_token = AuthService.create_refresh_token_for_user(user)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token, # 🌟 MUNCUL DI SINI!
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name,
        "user_id": user.id
    }

# ==========================================================
# 🌟 ENDPOINT BARU CTO: REFRESH TOKEN (BIAR SUPIR GA MATI LOGINNYA)
# ==========================================================
class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/auth/refresh")
def refresh_access_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token tidak valid atau sudah kadaluarsa!",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Bongkar tokennya
        payload = jwt.decode(data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # Validasi beneran token refresh ngga?
        if username is None or token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    # Cek user di database
    user = AuthService.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception

    # 🌟 CETAK ACCESS TOKEN BARU YANG SEGAR (Umur 2 Jam lagi)
    new_access_token = AuthService.create_access_token_for_user(user)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

# ==========================================================
# GEMBOK ENDPOINT REGISTER (SAMA KAYA KEMAREN)
# ==========================================================
@router.post("/auth/register", status_code=201, response_model=schemas.RegisterResponse)
def register_user(
    data: schemas.RegisterRequest,
    db: Session = Depends(get_db),
    #current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    VALID_ROLES = ["manager_logistik", "admin_distribusi", "admin_pod", "driver", "kasir"]
    
    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role tidak valid! Valid roles: {', '.join(VALID_ROLES)}"
        )

    try:
        user = AuthService.create_user(db, data.username, data.password, data.full_name, data.role)
        return {
            "message": f"User '{data.username}' berhasil dibuat!",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/auth/me", response_model=schemas.UserProfileResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role.value
    }

@router.get("/auth/users", response_model=schemas.UserListResponse)
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("manager_logistik"))
):
    users = AuthService.get_all_users(db)
    
    return {
        "status": "success",
        "count": len(users),
        "data": [
            {
                "user_id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "role": u.role.value
            }
            for u in users
        ]
    }

@router.get("/auth/preferences", response_model=schemas.UserPreferencesResponse)
def get_user_preferences(current_user: models.User = Depends(get_current_user)):
    return {
        "status": "success",
        "data": {
            "autoAdvance": current_user.auto_advance if current_user.auto_advance is not None else False,
            "soundAlert": current_user.sound_alert if current_user.sound_alert is not None else True,
            "dataDensity": current_user.data_density if current_user.data_density else "normal"
        }
    }

@router.put("/auth/preferences", response_model=schemas.GenericResponse)
def update_user_preferences(
    prefs: schemas.UserPreferences, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    current_user.auto_advance = prefs.autoAdvance
    current_user.sound_alert = prefs.soundAlert
    current_user.data_density = prefs.dataDensity
    
    db.commit()
    
    return {
        "status": "success", 
        "message": "Preferensi pengguna berhasil disimpan!"
    }