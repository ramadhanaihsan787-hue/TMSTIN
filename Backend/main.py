# Backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from contextlib import asynccontextmanager
import os

# 🌟 1. IMPORT SATPAM ANTI-DDoS (SLOWAPI)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 🌟 2. INISIALISASI LIMITER DI SINI (Wajib sebelum import routers biar gak Circular Import!)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# FIX CTO POINT 5: CRON SERVICE IMPORT (Supaya main.py bersih)
from services.cron_service import start_system_scheduler

# Core & Config
from core.config import settings
from core.exceptions import setup_exception_handlers

# Database
from database import engine, Base

# 🌟 3. BARU KITA IMPORT ROUTERS AMAN JAYA
from routers import (
    auth as auth_router,
    orders as orders_router,
    vrp_jobs as vrp_jobs_router,
    vrp_routes as vrp_routes_router,
    fleet as fleet_router,
    analytics as analytics_router,
    dashboard as dashboard_router,
    settings as settings_router,
    customer as customer_router,
    driver as driver_router,
    finance as finance_router,
    tracking as tracking_router
)

# ==========================================
# 1. CREATE TABLES (DATABASE)
# ==========================================
Base.metadata.create_all(bind=engine)


# ==========================================
# 🌟 SUNTIKAN CTO POINT 5: LIFESPAN
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP EVENT ---
    # Nyalain robot background dari file services/cron_service.py
    scheduler = start_system_scheduler()
    
    yield # <-- Aplikasi FastAPI jalan selama posisi ini
    
    # --- SHUTDOWN EVENT ---
    scheduler.shutdown()
    print("🛑 [SYSTEM] Robot Background Worker dimatikan.")


# ==========================================
# 2. INITIALIZE APP
# ==========================================
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan # 🌟 TEMPELIN LIFESPAN DI SINI
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
setup_exception_handlers(app)

# ==========================================
# 3. MIDDLEWARE (CORS) & STATIC FILES
# ==========================================
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allow_headers=["*"],
)

os.makedirs("static/uploads/epod", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ==========================================
# 4. CUSTOM OPENAPI (BEARER TOKEN)
# ==========================================
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ==========================================
# 5. INCLUDE ROUTERS
# ==========================================
app.include_router(auth_router.router, tags=["Authentication"])
app.include_router(orders_router.router, tags=["Orders"])
app.include_router(vrp_jobs_router.router, tags=["VRP Jobs"])
app.include_router(vrp_routes_router.router, tags=["VRP Routes"])
app.include_router(fleet_router.router, tags=["Fleet"])
app.include_router(analytics_router.router, tags=["Analytics"])
app.include_router(dashboard_router.router, tags=["Dashboard"])
app.include_router(settings_router.router, tags=["Settings"])
app.include_router(customer_router.router, tags=["Customers"])
app.include_router(driver_router.router, tags=["Drivers"])
app.include_router(finance_router.router, tags=["Finance & Expenses"])
app.include_router(tracking_router.router, tags=["Tracking"])

# ==========================================
# 6. SYSTEM ENDPOINTS
# ==========================================
@app.get("/health", tags=["System"])
@limiter.limit("5/minute")
def health_check(request: Request):
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@app.get("/", tags=["System"])
def read_root(request: Request):
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }