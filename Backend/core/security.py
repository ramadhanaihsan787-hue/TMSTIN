"""
Security module - Password hashing and JWT token management
"""
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

# 🌟 UBAH 1: Panggil 'settings' utuh dari config
from .config import env_settings

# ==========================================
# PASSWORD CONTEXT
# ==========================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# PASSWORD FUNCTIONS
# ==========================================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify if plain password matches hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a plain password
    """
    return pwd_context.hash(password)


# ==========================================
# JWT TOKEN FUNCTIONS
# ==========================================
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 🌟 UBAH 2: Ambil menit expired dari settings
        expire = datetime.utcnow() + timedelta(minutes=env_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # 🌟 UBAH 3: Ambil SECRET_KEY dan ALGORITHM dari settings
    encoded_jwt = jwt.encode(to_encode, env_settings.SECRET_KEY, algorithm=env_settings.ALGORITHM)
    
    return encoded_jwt


# [QW-1] Fungsi khusus untuk membuat REFRESH token.
# Sengaja dipisah dari create_access_token() karena pakai kunci yang berbeda.
# Jangan gabung ke satu fungsi — beda kunci = beda fungsi.
def create_refresh_token(data: dict) -> str:
    """
    Buat JWT refresh token dengan REFRESH_SECRET_KEY (bukan SECRET_KEY).
    Umur: REFRESH_TOKEN_EXPIRE_DAYS hari (default 7 hari).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=env_settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        env_settings.REFRESH_SECRET_KEY,   # ← kunci berbeda!
        algorithm=env_settings.ALGORITHM,
    )


def decode_refresh_token(token: str) -> dict:
    """
    Decode dan verifikasi JWT refresh token dengan REFRESH_SECRET_KEY.
    Pisah dari decode_token() agar access token tidak bisa dipakai
    sebagai refresh token meskipun belum expired.
    """
    payload = jwt.decode(
        token,
        env_settings.REFRESH_SECRET_KEY,   # ← kunci berbeda!
        algorithms=[env_settings.ALGORITHM],
    )
    return payload


def decode_token(token: str) -> dict:
    """
    Decode JWT token with strict expiry enforcement
    """
    try:
        # 🌟 UBAH 4: Ambil SECRET_KEY dan ALGORITHM dari settings
        payload = jwt.decode(token, env_settings.SECRET_KEY, algorithms=[env_settings.ALGORITHM])
        
        # 🌟 FIX ISSUE #10: DOUBLE-CHECK PROTECTION (Validasi Manual Epoch Timestamp)
        exp_time = payload.get("exp")
        if exp_time:

            if isinstance(exp_time, datetime):
                exp_timestamp = exp_time.timestamp()
            else:
                exp_timestamp = float(exp_time)

            if datetime.utcnow().timestamp() > exp_timestamp:
                raise jwt.ExpiredSignatureError("Token expired")
            
        return payload
        
    except jwt.ExpiredSignatureError as e:
        # Lempar error spesifik agar dicatch dependencies.py menjadi HTTPException(401)
        raise jwt.ExpiredSignatureError("Token expired") from e
    except jwt.JWTError as e:
        raise e