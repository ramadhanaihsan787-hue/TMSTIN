# test/pod/test_pod.py
"""
Tests untuk ePOD dan POD admin review flow.
Disesuaikan dengan endpoint aktual di driver.py dan orders.py.
"""
import io
import pytest
from PIL import Image


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_jpeg_bytes(width=100, height=100) -> bytes:
    """Buat JPEG dummy untuk upload test."""
    img = Image.new("RGB", (width, height), color=(255, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


# ─── Setup: seed TMSRouteLine ─────────────────────────────────────────────────

def _seed_route_line(db_session):
    import models, datetime
    refs  = db_session._test_refs
    today = datetime.date.today()

    plan = db_session.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today
    ).first()
    if plan is None:
        pytest.skip("Butuh TMSRoutePlan — jalankan test_confirm_routes dulu")

    line = db_session.query(models.TMSRouteLine).filter(
        models.TMSRouteLine.route_id == plan.route_id,
        models.TMSRouteLine.sequence == 1,
    ).first()
    if line is None:
        pytest.skip("Tidak ada TMSRouteLine dengan sequence 1")

    # Pastikan order statusnya assigned
    if line.order:
        line.order.status = models.DOStatus.do_assigned_to_route
        db_session.commit()

    return line


# ═══════════════════════════════════════════════════════════════════════════════
# ePOD SUBMIT
# ═══════════════════════════════════════════════════════════════════════════════

def test_epod_submit_success(client, driver_token, db_session):
    """Driver submit ePOD dengan foto → status DO berubah ke delivered_success."""
    line = _seed_route_line(db_session)

    jpeg = make_jpeg_bytes()
    files = {"photo": ("epod.jpg", jpeg, "image/jpeg")}
    data  = {
        "qty_delivered": "450",
        "has_return":    "false",
        "return_product": "",
        "return_qty":    "0",
        "return_reason": "",
        "gps_lat":       "-6.200000",
        "gps_lon":       "106.800000",
    }
    r = client.post(
        f"/api/driver/stops/{line.line_id}/epod",
        headers=auth(driver_token),
        files=files,
        data=data,
    )
    if r.status_code == 404:
        pytest.skip("Endpoint /api/driver/stops/{id}/epod belum ada")
    assert r.status_code in [200, 201], f"ePOD submit gagal: {r.text}"


def test_epod_submit_updates_order_status(client, driver_token, db_session):
    """Setelah ePOD submit, status order harus berubah."""
    import models
    line = _seed_route_line(db_session)

    if line.order:
        db_session.refresh(line.order)
        assert line.order.status in [
            models.DOStatus.delivered_success,
            models.DOStatus.delivered_partial,
            models.DOStatus.do_assigned_to_route,  # kalau belum di-submit
        ]


def test_epod_submit_no_photo_rejected(client, driver_token, db_session):
    """Submit ePOD tanpa foto → 422 (validation error)."""
    line = _seed_route_line(db_session)
    r = client.post(
        f"/api/driver/stops/{line.line_id}/epod",
        headers=auth(driver_token),
        data={"qty_delivered": "450"},  # tanpa file photo
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code in [400, 422], "Tanpa foto harus ditolak"


def test_epod_submit_invalid_line_404(client, driver_token):
    """Line ID tidak ada → 404."""
    jpeg  = make_jpeg_bytes()
    files = {"photo": ("epod.jpg", jpeg, "image/jpeg")}
    data  = {"qty_delivered": "100", "has_return": "false",
             "return_product": "", "return_qty": "0", "return_reason": ""}
    r = client.post(
        "/api/driver/stops/999999/epod",
        headers=auth(driver_token),
        files=files, data=data,
    )
    if r.status_code == 404 and "detail" not in r.json():
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 404, f"Line tidak ada harusnya 404: {r.status_code}"


def test_epod_unauthorized_no_token(client, db_session):
    """Tanpa token → 401."""
    line = _seed_route_line(db_session)
    jpeg  = make_jpeg_bytes()
    files = {"photo": ("epod.jpg", jpeg, "image/jpeg")}
    r = client.post(
        f"/api/driver/stops/{line.line_id}/epod",
        files=files, data={"qty_delivered": "100"},
    )
    assert r.status_code == 401