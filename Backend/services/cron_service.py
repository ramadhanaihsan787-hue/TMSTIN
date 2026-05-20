# Backend/services/cron_service.py
import datetime
import logging
from functools import wraps
from sqlalchemy.exc import SQLAlchemyError
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
import models
from database import SessionLocal, engine
from core.config import env_settings

logger = logging.getLogger(__name__)

def _get_db_settings(db):
    # ... (kode lu tetap sama)
    pass

# ==========================================
# 🌟 CRON JOB SAFE WRAPPER
# ==========================================
def safe_cron_job(job_name: str):
    """Decorator untuk memastikan job gagal tidak membunuh APScheduler"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                logger.info(f"⏳ [CRON START] Memulai job: {job_name}")
                return func(*args, **kwargs)
            except SQLAlchemyError as db_err:
                logger.error(f"🚨 [CRON DB ERROR] Job '{job_name}' gagal karena masalah DB: {str(db_err)}", exc_info=True)
            except Exception as e:
                logger.error(f"🚨 [CRON FATAL] Job '{job_name}' gagal secara tidak terduga: {str(e)}", exc_info=True)
        return wrapper
    return decorator


@safe_cron_job(job_name="Razia POD Rejected")
def job_check_rejected_pods():
    """
    Razia POD Rejected yang sudah expired.
    Baca alert_delay_mins dari DB agar nilai runtime mengikuti Settings UI.
    """
    db = SessionLocal()
    try:
        cfg = _get_db_settings(db)
        timeout_mins = cfg.alert_delay_mins if cfg.alert_delay_mins else 120
        threshold = datetime.datetime.now() - datetime.timedelta(minutes=timeout_mins)

        # ... (query suspect_orders dan perulangan check epod lu tetap sama)

        if count_failed > 0:
            db.commit()
            logger.info("[CRON] %d POD di-Auto-Failed karena timeout.", count_failed)

    except SQLAlchemyError as sqle:
        db.rollback()
        # Biarkan decorator yang handle logging penuh
        raise sqle 
    except Exception as exc:
        db.rollback()
        # Lempar ke decorator untuk exc_info=True
        raise exc 
    finally:
        db.close()

def start_system_scheduler():
    """
    Nyalakan background scheduler saat server start.
    Interval dibaca dari DB agar Settings UI bisa mengubahnya.
    Gunakan DB jobstore untuk multi-instance safety.
    """
    # Multi-instance safe: jadwal disimpan di DB
    jobstores = {
        "default": SQLAlchemyJobStore(engine=engine, tablename="apscheduler_jobs")
    }
    scheduler = BackgroundScheduler(jobstores=jobstores)

    # Baca interval dari DB; fallback ke env_settings
    db = SessionLocal()
    try:
        cfg = _get_db_settings(db)
        raw_interval = cfg.sync_interval_sec if cfg.sync_interval_sec else 900
    finally:
        db.close()

    interval_mins = max(raw_interval // 60, 1)

    scheduler.add_job(
        job_check_rejected_pods,
        "interval",
        minutes=interval_mins,
        id="job_razia_pod_harian",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "[SYSTEM] Scheduler AKTIF — interval: %d menit.", interval_mins
    )
    return scheduler