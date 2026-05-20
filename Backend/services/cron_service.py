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

def _get_db_settings(db=None):
    """
    Helper aman buat ambil setting. 
    Kalo 'db' yang dikirim ternyata object 'Depends' atau None, kita buka session sendiri.
    """
    # Periksa apakah 'db' adalah session yang valid (punya method .query)
    is_valid_db = db is not None and hasattr(db, 'query')
    current_db = db if is_valid_db else SessionLocal()
    
    try:
        row = current_db.query(models.SystemSettings).filter(models.SystemSettings.id == 1).first()
        return row if row is not None else env_settings 
    except Exception as e:
        logger.warning(f"⚠️ [SETTINGS] Gagal query DB: {str(e)}. Menggunakan fallback ENV.")
        return env_settings
    finally:
        # Cuma close kalau session ini kita yang buka (bukan session dari router)
        if not is_valid_db:
            current_db.close()

# ==========================================
# 🌟 CRON JOB SAFE WRAPPER
# ==========================================
def safe_cron_job(job_name: str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                logger.info(f"⏳ [CRON START] Memulai job: {job_name}")
                return func(*args, **kwargs)
            except SQLAlchemyError as db_err:
                logger.error(f"🚨 [CRON DB ERROR] Job '{job_name}' gagal: {str(db_err)}", exc_info=True)
            except Exception as e:
                logger.error(f"🚨 [CRON FATAL] Job '{job_name}' gagal: {str(e)}", exc_info=True)
        return wrapper
    return decorator

@safe_cron_job(job_name="Razia POD Rejected")
def job_check_rejected_pods():
    db = SessionLocal()
    count_failed = 0 # 🌟 FIX NAME ERROR: Inisialisasi dulu!
    try:
        cfg = _get_db_settings(db)
        timeout_mins = cfg.alert_delay_mins if cfg.alert_delay_mins else 120
        threshold = datetime.datetime.now() - datetime.timedelta(minutes=timeout_mins)

        suspect_orders = (
            db.query(models.DeliveryOrder)
            .filter(models.DeliveryOrder.status.cast(models.String).in_(["failed", "FAILED", "Failed"]))
            .limit(50)
            .all()
        )

        for order in suspect_orders:
            last_epod = (
                db.query(models.TMSEpodHistory)
                .join(models.TMSRouteLine)
                .filter(models.TMSRouteLine.order_id == order.order_id)
                .order_by(models.TMSEpodHistory.timestamp.desc())
                .first()
            )

            if last_epod and last_epod.timestamp <= threshold:
                order.status = models.DOStatus.delivered_partial
                db.add(
                    models.SystemAuditLog(
                        user_id=None,
                        action="SYSTEM_AUTO_FAIL_POD",
                        entity_type="DeliveryOrder",
                        entity_id=order.order_id,
                        new_values='{"reason": "Timeout tanpa re-submission POD"}',
                        ip_address="system_cron",
                    )
                )
                count_failed += 1

        if count_failed > 0:
            db.commit()
            logger.info("[CRON] %d POD di-Auto-Failed karena timeout.", count_failed)

    except Exception as exc:
        db.rollback()
        raise exc 
    finally:
        db.close()

def start_system_scheduler():
    # Multi-instance safe: jadwal disimpan di DB
    jobstores = {
        "default": SQLAlchemyJobStore(engine=engine, tablename="apscheduler_jobs")
    }
    scheduler = BackgroundScheduler(jobstores=jobstores)

    # Baca interval dari DB
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
    logger.info("[SYSTEM] Scheduler AKTIF — interval: %d menit.", interval_mins)
    return scheduler