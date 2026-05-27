# Backend/main.py
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles

# 1. RATE LIMITER — inisialisasi SEBELUM import routers (cegah circular import)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# 2. INTERNAL IMPORTS (urutan penting: config → db → services → routers)
from core.config import env_settings as settings  # infra-only fields (APP_NAME, UPLOAD_DIR, dll)
from core.exceptions import setup_exception_handlers

from database import engine  # noqa: F401 — engine tetap diimport untuk koneksi pool

from services.cron_service import start_system_scheduler

from routers import (
    analytics as analytics_router,
    auth as auth_router,
    customer as customer_router,
    dashboard as dashboard_router,
    driver as driver_router,
    finance as finance_router,
    fleet as fleet_router,
    orders as orders_router,
    settings as settings_router,
    tracking as tracking_router,
    vrp_jobs as vrp_jobs_router,
    vrp_routes as vrp_routes_router,
)

logger = logging.getLogger(__name__)


# ==========================================
# LIFESPAN — startup & shutdown hooks
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    logger.info("🚀 [SYSTEM] TMS JAPFA starting up...")
    logger.info(
        "ℹ️  [DB] Schema dikelola Alembic. "
        "Pastikan 'alembic upgrade head' sudah dijalankan sebelum server ini."
    )
    scheduler = start_system_scheduler()

    yield  # app berjalan di sini

    # --- SHUTDOWN ---
    scheduler.shutdown()
    logger.info("🛑 [SYSTEM] Background scheduler dimatikan.")


# ==========================================
# APP INITIALIZATION
# ==========================================
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
setup_exception_handlers(app)


# ==========================================
# CORS & STATIC FILES
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
# OPENAPI — tambahkan BearerAuth scheme
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
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# ==========================================
# ROUTERS
# ==========================================
app.include_router(auth_router.router,         tags=["Authentication"])
app.include_router(orders_router.router,       tags=["Orders"])
app.include_router(vrp_jobs_router.router,     tags=["VRP Jobs"])
app.include_router(vrp_routes_router.router,   tags=["VRP Routes"])
app.include_router(fleet_router.router,        tags=["Fleet"])
app.include_router(analytics_router.router,    tags=["Analytics"])
app.include_router(dashboard_router.router,    tags=["Dashboard"])
app.include_router(settings_router.router,     tags=["Settings"])
app.include_router(customer_router.router,     tags=["Customers"])
app.include_router(driver_router.router,       tags=["Drivers"])
app.include_router(finance_router.router,      tags=["Finance & Expenses"])
app.include_router(tracking_router.router,     tags=["Tracking"])


# ==========================================
# SYSTEM ENDPOINTS
# ==========================================
@app.get("/health", tags=["System"])
@limiter.limit("5/minute")
def health_check(request: Request):
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["System"])
def read_root(request: Request):
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }