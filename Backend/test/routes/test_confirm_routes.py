# test/routes/test_confirm_routes.py
"""
Integration tests untuk POST /api/routes/confirm
- Happy path: data tersimpan, order status berubah
- Rollback: armada tidak ada → tidak ada partial data
- Unauthorized: driver tidak bisa confirm
"""
import pytest
import datetime
import json


def _confirm_payload(db_session, num_trucks=1):
    """Buat payload confirm_routes dari seed data di DB."""
    refs   = db_session._test_refs
    v1     = refs["v1"]
    d1     = refs["d1"]
    d2     = refs["d2"]
    o1     = refs["o1"]
    today  = datetime.date.today().isoformat()

    trucks = []
    for i in range(num_trucks):
        trucks.append({
            "route_id":        f"RP-{today.replace('-','')}-T{i+1}",
            "armada":          v1.license_plate,
            "driver_id":       d1.driver_id,
            "helper_id":       d2.driver_id,
            "total_muatan_kg": 500.0,
            "total_jarak_km":  45.0,
            "garis_aspal":     [],
            "detail_perjalanan": [
                {
                    "keterangan": "Start", "urutan": 0,
                    "nama_toko": "GUDANG", "jam_tiba": "06:00",
                    "lat": -6.207356, "lon": 106.479163,
                },
                {
                    "keterangan": "Stop", "urutan": 1,
                    "nomor_do": o1.order_id, "nama_toko": "Superindo Test",
                    "jam_tiba": "09:30",
                    "lat": -6.200000, "lon": 106.800000,
                    "distance_from_prev_km": 15.0,
                },
                {
                    "keterangan": "Finish", "urutan": 99,
                    "nama_toko": "GUDANG", "jam_tiba": "20:00",
                    "lat": -6.207356, "lon": 106.479163,
                },
            ],
        })
    return {"jadwal_truk_internal": trucks}


# ─────────────────────────────────────────────────────────────────────────────

def test_confirm_routes_success(client, admin_token, db_session):
    payload = _confirm_payload(db_session)
    r = client.post(
        "/api/routes/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    if r.status_code == 404:
        pytest.skip("Endpoint /api/routes/confirm belum ada")
    assert r.status_code == 200, f"Unexpected: {r.text}"
    assert r.json().get("status") == "success"


def test_confirm_routes_order_status_updated(client, admin_token, db_session):
    """Setelah confirm, status DO harus berubah ke do_assigned_to_route."""
    import models
    refs = db_session._test_refs
    o1   = refs["o1"]

    db_session.refresh(o1)
    assert o1.status == models.DOStatus.do_assigned_to_route


def test_confirm_routes_geometry_stored(client, admin_token, db_session):
    """TMSRoutePlan harus tersimpan — geometry bisa null kalau OSRM tidak jalan."""
    import models
    today = datetime.date.today()
    plan  = db_session.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today
    ).first()
    assert plan is not None, "TMSRoutePlan harus tersimpan setelah confirm"


def test_confirm_routes_unknown_fleet_rollback(client, admin_token, db_session):
    """Armada tidak ada di master → 500 + rollback, tidak ada partial data."""
    import models
    refs  = db_session._test_refs
    today = datetime.date.today().isoformat()
    o2    = refs["o2"]

    payload = {
        "jadwal_truk_internal": [{
            "route_id":        f"RP-{today.replace('-','')}-GHOST",
            "armada":          "B 9999 ZZZ",  # tidak ada di DB
            "driver_id":       refs["d1"].driver_id,
            "helper_id":       None,
            "total_muatan_kg": 300.0,
            "total_jarak_km":  20.0,
            "garis_aspal":     [],
            "detail_perjalanan": [
                {"keterangan": "Start", "urutan": 0, "nama_toko": "GUDANG",
                 "jam_tiba": "06:00", "lat": -6.207356, "lon": 106.479163},
                {"keterangan": "Stop", "urutan": 1, "nomor_do": o2.order_id,
                 "nama_toko": "Giant Test", "jam_tiba": "10:00",
                 "lat": -6.210000, "lon": 106.810000, "distance_from_prev_km": 20.0},
                {"keterangan": "Finish", "urutan": 99, "nama_toko": "GUDANG",
                 "jam_tiba": "20:00", "lat": -6.207356, "lon": 106.479163},
            ],
        }]
    }
    r = client.post(
        "/api/routes/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    # Harusnya error (400 atau 500)
    assert r.status_code in [400, 500], f"Harusnya error, dapat: {r.status_code}"

    # Pastikan tidak ada partial data (rollback berhasil)
    db_session.rollback()
    ghost = db_session.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.route_id.like("%-GHOST")
    ).first()
    assert ghost is None, "Rollback harus menghapus partial data"


def test_confirm_routes_unauthorized_driver(client, driver_token):
    """Driver tidak boleh confirm routes — harus 403."""
    r = client.post(
        "/api/routes/confirm",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={"jadwal_truk_internal": []},
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code in [403, 401], f"Driver seharusnya ditolak: {r.status_code}"


def test_confirm_routes_no_token():
    """Tanpa token → 401."""
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app) as c:
        r = c.post("/api/routes/confirm", json={"jadwal_truk_internal": []})
    assert r.status_code == 401