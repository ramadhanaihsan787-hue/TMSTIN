import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# 🌟 INISIALISASI LOGGER
logger = logging.getLogger(__name__)

# 🌟 FIX CTO: CORS headers harus ikut di setiap error response!
# Tanpa ini, browser memblokir error response dan menampilkan "CORS error"
# padahal sebenarnya itu 401/500/dll.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
}

def setup_exception_handlers(app: FastAPI):
    
    # 1. Nangkep Error HTTP biasa (Misal 404, 400, 401)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTP Error {exc.status_code}: {exc.detail} di rute {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error", 
                "code": exc.status_code, 
                "message": exc.detail
            },
            headers=CORS_HEADERS,
        )

    # 2. Nangkep Error Validasi Pydantic (Misal password kurang panjang, email salah format)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation Error di rute {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "status": "error", 
                "code": 422, 
                "message": "Data yang dikirim tidak valid!", 
                "details": exc.errors()
            },
            headers=CORS_HEADERS,
        )

    # 3. Nangkep Error 500 (Fatal Crash di Server)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # 🌟 PAKE LOGGER ERROR + exc_info=True Biar Tracebacknya Kecatet Semua!
        logger.error(f"🚨 FATAL SERVER ERROR: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "code": 500, 
                "message": "Terjadi kesalahan internal pada server. Silakan hubungi admin."
            },
            headers=CORS_HEADERS,
        )