#!/bin/sh
# ============================================================
# TMS JAPFA — Automated PostgreSQL Backup Script
# [MR-14] Backup strategy: pg_dump harian, retensi 7 hari
#
# Dijalankan dari: service 'backup' di docker-compose.yml
# Schedule       : tiap hari jam 02:00 WIB (19:00 UTC)
# Output dir     : ./backups/
# Format         : custom (-Fc) — bisa pg_restore secara selective
# Retensi        : BACKUP_RETENTION_DAYS (default 7 hari)
#
# CARA RESTORE:
#   pg_restore -h localhost -U japfa_user -d tms_japfa_restore \
#     /backups/tms_japfa_2026-05-20_19-00-00.dump
# ============================================================

set -e   # exit langsung kalau ada command yang gagal

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="${BACKUP_DIR}/tms_japfa_${TIMESTAMP}.dump"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "[BACKUP] Start: $(date)"
echo "[BACKUP] Target: ${FILENAME}"
echo "=========================================="

# ----------------------------------------------------------
# 1. Run pg_dump
# ----------------------------------------------------------
pg_dump \
  --host="${POSTGRES_HOST:-postgres}" \
  --username="${POSTGRES_USER:-japfa_user}" \
  --dbname="${POSTGRES_DB:-tms_japfa}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${FILENAME}"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "${FILENAME}" | cut -f1)
  echo "[BACKUP] SUCCESS: ${FILENAME} (${SIZE})"
else
  echo "[BACKUP] FAILED — pg_dump returned non-zero exit"
  exit 1
fi

# ----------------------------------------------------------
# 2. Verifikasi: pastikan file tidak kosong
# ----------------------------------------------------------
if [ ! -s "${FILENAME}" ]; then
  echo "[BACKUP] FAILED — file kosong (0 bytes)"
  rm -f "${FILENAME}"
  exit 1
fi

# ----------------------------------------------------------
# 3. Hapus backup lama (lebih dari RETENTION hari)
# ----------------------------------------------------------
echo "[BACKUP] Membersihkan backup > ${RETENTION} hari..."
find "${BACKUP_DIR}" -name "tms_japfa_*.dump" -mtime "+${RETENTION}" -type f | while read OLD_FILE; do
  echo "[BACKUP] Hapus: ${OLD_FILE}"
  rm -f "${OLD_FILE}"
done

# ----------------------------------------------------------
# 4. Tampilkan semua backup yang ada
# ----------------------------------------------------------
echo "[BACKUP] Daftar backup tersimpan:"
ls -lh "${BACKUP_DIR}"/tms_japfa_*.dump 2>/dev/null || echo "  (tidak ada file)"
echo "[BACKUP] Selesai: $(date)"
echo "=========================================="