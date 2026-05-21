"""
wait_for_db.py — tunggu PostgreSQL siap sebelum alembic jalan.
Dipakai di docker-compose command sebelum 'alembic upgrade head'.
"""
import os
import sys
import time

import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "")
MAX_RETRIES = 30
WAIT_SECONDS = 3

print("[DB WAIT] Menunggu PostgreSQL siap...", flush=True)

for attempt in range(1, MAX_RETRIES + 1):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.close()
        print(f"[DB WAIT] ✅ PostgreSQL siap setelah {attempt} percobaan.", flush=True)
        sys.exit(0)
    except Exception as e:
        print(
            f"[DB WAIT] ⏳ Percobaan {attempt}/{MAX_RETRIES}: {e}",
            flush=True,
        )
        time.sleep(WAIT_SECONDS)

print("[DB WAIT] ❌ PostgreSQL tidak siap setelah batas maksimum. Abort.", flush=True)
sys.exit(1)