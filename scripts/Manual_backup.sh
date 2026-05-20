#!/bin/sh
# ============================================================
# TMS JAPFA — Manual Backup (dijalankan SEBELUM upgrade)
# [MR-14] Wajib dijalankan sebelum upgrade PG12 → PG16
#
# USAGE:
#   chmod +x scripts/manual_backup.sh
#   ./scripts/manual_backup.sh
#
# Akan buat 2 file:
#   backups/PRE_UPGRADE_schema_<timestamp>.sql  — DDL saja
#   backups/PRE_UPGRADE_full_<timestamp>.dump   — full data (pg_dump custom)
# ============================================================

set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backups"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-tms_japfa}"
DB_USER="${POSTGRES_USER:-japfa_user}"

mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "[PRE-UPGRADE BACKUP] Start: $(date)"
echo "[PRE-UPGRADE BACKUP] Host: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "=========================================="

# 1. Schema-only backup (cepat, buat verifikasi DDL)
SCHEMA_FILE="${BACKUP_DIR}/PRE_UPGRADE_schema_${TIMESTAMP}.sql"
echo "[STEP 1/2] Dump schema only → ${SCHEMA_FILE}"
pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --schema-only \
  --file="${SCHEMA_FILE}"

echo "[STEP 1/2] DONE — schema: $(du -sh ${SCHEMA_FILE} | cut -f1)"

# 2. Full data backup (custom format, compressed)
FULL_FILE="${BACKUP_DIR}/PRE_UPGRADE_full_${TIMESTAMP}.dump"
echo "[STEP 2/2] Dump full data → ${FULL_FILE}"
pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --file="${FULL_FILE}"

echo "[STEP 2/2] DONE — full: $(du -sh ${FULL_FILE} | cut -f1)"

echo ""
echo "=========================================="
echo "[PRE-UPGRADE BACKUP] SELESAI"
echo "  Schema : ${SCHEMA_FILE}"
echo "  Full   : ${FULL_FILE}"
echo ""
echo "  Simpan file PRE_UPGRADE_full_*.dump di lokasi LAIN (bukan di server ini)"
echo "  sebelum lanjut upgrade. Ini satu-satunya rollback path kamu."
echo "=========================================="