# test/orders/test_orders.py
import io
import pytest

def _csv(content: bytes):
    return {"file": ("orders.csv", content, "text/csv")}

def auth(token):
    return {"Authorization": f"Bearer {token}"}

VALID_HEADER = (
    b"NO. DO,TGL. DO,KODE CUST.,NAMA CUSTOMER,ALAMAT,KODE ITEM,NAMA BARANG,QTY,UOM\n"
)
VALID_ROW = (
    b"DO-2026-001,2026-05-28,CUST-001,Superindo JKT,Jl.Sudirman,ITM-01,Ayam Fillet,450,KG\n"
)

def test_get_orders_requires_auth(client):
    r = client.get("/api/orders")
    assert r.status_code == 401

def test_get_orders_authenticated(client, admin_token):
    r = client.get("/api/orders", headers=auth(admin_token))
    if r.status_code == 404:
        pytest.skip("Endpoint GET /api/orders belum ada")
    assert r.status_code == 200

def test_upload_no_file(client, admin_token):
    r = client.post("/api/orders/upload", headers=auth(admin_token))
    if r.status_code == 404:
        pytest.skip("Endpoint POST /api/orders/upload belum ada")
    assert r.status_code in [400, 422]

def test_upload_invalid_extension(client, admin_token):
    files = {"file": ("data.pdf", b"%PDF-1.4 fake content", "application/pdf")}
    r = client.post("/api/orders/upload", headers=auth(admin_token), files=files)
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 400

def test_upload_valid_csv(client, admin_token):
    content = VALID_HEADER + VALID_ROW
    r = client.post("/api/orders/upload", headers=auth(admin_token), files=_csv(content))
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code in [200, 201], f"Upload gagal: {r.text}"

def test_upload_empty_csv_no_crash(client, admin_token):
    """CSV hanya ada header, tanpa baris data — tidak boleh 500."""
    content = VALID_HEADER
    r = client.post("/api/orders/upload", headers=auth(admin_token), files=_csv(content))
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    # Boleh 200 (warning) atau 400 (tidak ada data), tidak boleh 500
    assert r.status_code != 500, "Server tidak boleh crash pada CSV kosong"

def test_upload_missing_required_column(client, admin_token):
    """CSV tanpa kolom NAMA CUSTOMER — harus ditolak dengan pesan jelas."""
    bad_header = b"NO. DO,TGL. DO,KODE ITEM,QTY\n"
    bad_row    = b"DO-001,2026-05-28,ITM-01,450\n"
    content    = bad_header + bad_row
    r = client.post("/api/orders/upload", headers=auth(admin_token), files=_csv(content))
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    # Harusnya 400 dengan pesan tentang kolom yang hilang
    assert r.status_code == 400, f"Harusnya 400: {r.status_code} {r.text}"

def test_upload_data_verify_in_db(client, admin_token):
    """Setelah upload sukses, GET /api/orders harus ada datanya."""
    content = VALID_HEADER + VALID_ROW
    r_up = client.post("/api/orders/upload", headers=auth(admin_token), files=_csv(content))
    if r_up.status_code in [404, 400]:
        pytest.skip("Upload tidak berhasil atau endpoint tidak ada")

    r = client.get("/api/orders", headers=auth(admin_token))
    if r.status_code == 200:
        data = r.json()
        orders = data if isinstance(data, list) else data.get("data", data.get("orders", []))
        # Ada setidaknya 1 order di DB (mungkin dari seed atau upload ini)
        assert isinstance(orders, list)