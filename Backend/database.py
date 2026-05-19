"""
Database module - SQLAlchemy configuration and session management
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from core.config import settings

# ==========================================
# 🌟 DATABASE ENGINE WITH CONNECTION POOLING
# ==========================================
engine = create_engine(
    settings.DATABASE_URL,

    # ==========================================
    # 🌟 CONNECTION POOL SETTINGS
    # ==========================================
    pool_pre_ping=True,     # Cek koneksi sebelum dipakai
    pool_recycle=3600,      # Refresh koneksi tiap 1 jam

    # ==========================================
    # 🌟 POOL SIZE
    # ==========================================
    pool_size=10,           # Jumlah koneksi standby
    max_overflow=20,        # Extra koneksi saat spike traffic

    # ==========================================
    # 🌟 DEBUG
    # ==========================================
    echo=False
)

# ==========================================
# 🌟 SESSION FACTORY
# ==========================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ==========================================
# 🌟 BASE MODEL
# ==========================================
Base = declarative_base()