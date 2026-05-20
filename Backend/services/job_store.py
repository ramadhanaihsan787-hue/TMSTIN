# Backend/services/job_store.py
"""
Job Store — Satu-satunya tempat state VRP & Traffic validation disimpan.

ATURAN: TIDAK ADA file lain yang boleh mendeklarasikan VRP_JOBS atau
TRAFFIC_JOBS sendiri. Semua baca/tulis harus lewat modul ini.

Import di file lain:
    from services.job_store import VRP_JOBS, TRAFFIC_JOBS, update_job_status
"""
import datetime
import logging

logger = logging.getLogger(__name__)

# ============================================================
# 🗄️ SHARED STATE — SATU SUMBER KEBENARAN
# ============================================================

# Menyimpan status setiap VRP optimization job.
# Key  : job_id (UUID string)
# Value: {status, phase, progress, message, data, updated_at}
VRP_JOBS: dict = {}

# Menyimpan status setiap Traffic validation job.
# Key  : job_id (UUID string — sama dengan VRP_JOBS key-nya)
# Value: {status, progress, message, data/warnings, updated_at}
TRAFFIC_JOBS: dict = {}


# ============================================================
# 🛠️ HELPER — Update status dengan cara yang konsisten
# ============================================================

def update_job_status(
    job_store: dict,
    job_id: str,
    status: str,
    progress: int = 0,
    message: str = "",
    data=None,
) -> None:
    """
    Update satu entry di job_store secara aman.

    Args:
        job_store : VRP_JOBS atau TRAFFIC_JOBS
        job_id    : UUID job yang mau di-update
        status    : "processing" | "completed" | "failed" | "queued"
        progress  : 0-100
        message   : Pesan singkat untuk ditampilkan di frontend
        data      : (opsional) Payload hasil akhir job
    """
    if job_id not in job_store:
        job_store[job_id] = {}

    job_store[job_id]["status"] = status
    job_store[job_id]["progress"] = progress
    job_store[job_id]["message"] = message
    job_store[job_id]["updated_at"] = str(datetime.datetime.now())

    if data is not None:
        job_store[job_id]["data"] = data

    logger.debug(
        f"[job_store] {job_id[:8]}... → status={status} progress={progress}%"
    )