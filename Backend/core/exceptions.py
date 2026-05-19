import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# 🌟 INISIALISASI LOGGER
logger = logging.getLogger(__name__)

def setup_exception_handlers(app: FastAPI):
    
    # 1. Nangkep Error HTTP biasa (Misal 404, 400, 401)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTP Error {exc.status_code}: {exc.detail} di rute {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                    "details": None
                }
            },
        )

    # 2. Nangkep Error Validasi Pydantic (Misal password kurang panjang, email salah format)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation Error di rute {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {
                    "code": 422,
                    "message": "Data yang dikirim tidak valid!",
                    "details": exc.errors()
                }
            },
        )

    # 3. Nangkep Error 500 (Fatal Crash di Server)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # 🌟 PAKE LOGGER ERROR + exc_info=True Biar Tracebacknya Kecatet Semua!
        logger.error(f"🚨 FATAL SERVER ERROR: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": 500,
                    "message": "Terjadi kesalahan internal pada server. Silakan hubungi admin.",
                    "details": None
                }
            },
        )