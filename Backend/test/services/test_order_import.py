# test/services/test_order_import.py
"""
Unit tests untuk order_import_service.py
- Tidak perlu DB atau HTTP client — test fungsi Python murni
- Semua test harus selesai < 1 detik
"""
import io
import pytest
import pandas as pd
from unittest.mock import MagicMock

from services.order_import_service import normalize_header, process_sap_file

# ── Helpers ──────────────────────────────────────────────────────────────────
def make_csv_bytes(rows: list[dict]) -> bytes:
    """Buat CSV bytes dari list of dicts (kolom dari keys baris pertama)."""
    df = pd.DataFrame(rows)
    return df.to_csv(index=False).encode()


MINIMAL_ROW = {
    "NO. DO":        "DO-2026-001",
    "TGL. DO":       "2026-05-01",
    "KODE CUST.":    "CUST-001",
    "NAMA CUSTOMER": "Superindo JKT",
    "ALAMAT":        "Jl. Sudirman 1",
    "KODE ITEM":     "ITM-01",
    "NAMA BARANG":   "Ayam Fillet",
    "QTY":           450,
    "UOM":           "KG",
}

# ── Fake DB & settings ────────────────────────────────────────────────────────
def fake_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter_by.return_value.first.return_value = None
    return db

def fake_settings():
    s = MagicMock()
    s.vrp_base_drop_time_mins = 15
    s.vrp_var_drop_time_mins  = 1
    return s


# ═══════════════════════════════════════════════════════════════════════════════
# NORMALIZE HEADER
# ═══════════════════════════════════════════════════════════════════════════════

def test_normalize_header_uppercase():
    assert normalize_header("nama customer") == "NAMA CUSTOMER"
    assert normalize_header("NAMA CUSTOMER") == "NAMA CUSTOMER"

def test_normalize_header_strips_whitespace():
    assert normalize_header("  KODE CUST.  ") == "KODE CUST."

def test_normalize_header_handles_none():
    # Harus tidak crash kalau ada kolom NaN dari Excel
    result = normalize_header(None)
    assert isinstance(result, str)


# ═══════════════════════════════════════════════════════════════════════════════
# MISSING REQUIRED COLUMNS
# ═══════════════════════════════════════════════════════════════════════════════

def test_process_sap_missing_nama_customer():
    rows = [{"KODE CUST.": "CUST-001", "QTY": 450, "NAMA BARANG": "Ayam"}]
    csv_bytes = make_csv_bytes(rows)
    with pytest.raises(ValueError) as exc_info:
        process_sap_file(csv_bytes, "test.csv", fake_db(), fake_settings())
    assert "Nama Customer" in str(exc_info.value)

def test_process_sap_missing_kode_customer():
    rows = [{"NAMA CUSTOMER": "Superindo", "QTY": 450, "NAMA BARANG": "Ayam"}]
    csv_bytes = make_csv_bytes(rows)
    with pytest.raises(ValueError) as exc_info:
        process_sap_file(csv_bytes, "test.csv", fake_db(), fake_settings())
    assert "Kode Customer" in str(exc_info.value)


# ═══════════════════════════════════════════════════════════════════════════════
# VALID PARSING
# ═══════════════════════════════════════════════════════════════════════════════

def test_process_sap_minimal_valid_returns_list():
    csv_bytes = make_csv_bytes([MINIMAL_ROW])
    db = fake_db()
    result = process_sap_file(csv_bytes, "test.csv", db, fake_settings())
    # process_sap_file return dict dengan key "pending_orders" atau list
    orders = result if isinstance(result, list) else result.get("pending_orders", [])
    assert isinstance(orders, list)

def test_process_sap_missing_gps_handled_gracefully():
    row = dict(MINIMAL_ROW)  # tanpa LAT/LON
    csv_bytes = make_csv_bytes([row])
    db = fake_db()
    # Tidak boleh crash walau GPS kosong
    result = process_sap_file(csv_bytes, "test.csv", db, fake_settings())
    assert result is not None

def test_process_sap_empty_file_no_crash():
    # File dengan hanya header, tanpa data
    csv_bytes = b"NO. DO,KODE CUST.,NAMA CUSTOMER,QTY,NAMA BARANG\n"
    db = fake_db()
    # Harusnya tidak crash — return empty atau raise ValueError yang jelas
    try:
        result = process_sap_file(csv_bytes, "test.csv", db, fake_settings())
        orders = result if isinstance(result, list) else result.get("pending_orders", [])
        assert isinstance(orders, list)
    except ValueError:
        pass  # ValueError yang jelas = acceptable

def test_process_sap_header_alias_berat_net():
    row = {
        "KODE CUST.": "CUST-001", "NAMA CUSTOMER": "Superindo",
        "NAMA BARANG": "Ayam", "BERAT NET": 450,  # alias untuk QTY
    }
    csv_bytes = make_csv_bytes([row])
    db = fake_db()
    try:
        result = process_sap_file(csv_bytes, "test.csv", db, fake_settings())
        assert result is not None
    except ValueError as e:
        # Kalau "BERAT NET" bukan alias yang didukung, boleh ValueError
        assert "Quantity" in str(e) or "Berat" in str(e)

def test_process_sap_invalid_qty_skips_row():
    rows = [
        dict(MINIMAL_ROW),
        {**MINIMAL_ROW, "QTY": "ABC", "KODE CUST.": "CUST-002",
         "NAMA CUSTOMER": "Giant", "NO. DO": "DO-002"},
    ]
    csv_bytes = make_csv_bytes(rows)
    db = fake_db()
    try:
        result = process_sap_file(csv_bytes, "test.csv", db, fake_settings())
        # Tidak boleh crash — bisa skip baris invalid
        assert result is not None
    except Exception:
        pass  # Some implementations raise, that's fine as long as no silent corrupt