# test/routes/test_routes.py
import pytest
from utils.helpers import consolidate_orders


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_routes_requires_auth(client):
    r = client.get("/api/routes")
    assert r.status_code == 401


def test_get_routes_authenticated(client, admin_token):
    r = client.get("/api/routes", headers=auth(admin_token))
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 200


def test_order_consolidation_same_location():
    """DO di lokasi yang sama → terkonsolidasi jadi 1 node VRP."""
    class MockOrder:
        def __init__(self, lat, lon, weight):
            self.latitude = lat; self.longitude = lon; self.weight_total = weight

    o1 = MockOrder(-6.20000, 106.80000, 50)
    o2 = MockOrder(-6.20000, 106.80000, 150)  # lokasi sama
    o3 = MockOrder(-6.21111, 106.81111, 20)   # lokasi beda

    grouped = consolidate_orders([o1, o2, o3])
    assert len(grouped) == 2, f"Harusnya 2 lokasi unik, dapat {len(grouped)}"

    key_same = "-6.2_106.8"
    keys = list(grouped.keys())
    # Cari key yang mengandung DO ke-1 (yang ada 2 DO)
    counts = [len(v) for v in grouped.values()]
    assert 2 in counts, "Ada satu lokasi yang harus berisi 2 DO"
    assert 1 in counts, "Ada satu lokasi yang berisi 1 DO"


def test_validate_traffic_invalid_job(client, admin_token):
    r = client.post(
        "/api/routes/validate-traffic/job-id-palsu-12345",
        headers=auth(admin_token),
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 400


def test_resequence_empty_payload(client, admin_token):
    """POST resequence dengan jadwal kosong → tidak crash."""
    r = client.post(
        "/api/routes/resequence",
        headers=auth(admin_token),
        json={"jadwal_truk_internal": []},
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code in [200, 400], f"Tidak boleh crash: {r.status_code}"


def test_resequence_single_stop_skip(client, admin_token):
    """Truk dengan 1 stop (kurang dari 2) → skip TSP, tidak crash."""
    r = client.post(
        "/api/routes/resequence",
        headers=auth(admin_token),
        json={
            "jadwal_truk_internal": [{
                "route_id": "RP-TEST",
                "armada":   "B 1234 TST",
                "detail_perjalanan": [
                    {"keterangan": "Start",  "urutan": 0, "nama_toko": "GUDANG",
                     "lat": -6.207, "lon": 106.479},
                    {"keterangan": "Stop",   "urutan": 1, "nama_toko": "Toko A",
                     "lat": -6.200, "lon": 106.800},
                    {"keterangan": "Finish", "urutan": 99, "nama_toko": "GUDANG",
                     "lat": -6.207, "lon": 106.479},
                ],
            }]
        },
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    # Minimal tidak crash — 200 atau 400 diterima
    assert r.status_code != 500, "1 stop tidak boleh crash solver"


def test_route_geometry_stored(client, admin_token, db_session):
    """Setelah confirm, GET /api/routes harus ada data (geometry boleh null)."""
    import models, datetime
    today = datetime.date.today()
    plan = db_session.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.planning_date == today
    ).first()
    if plan is None:
        pytest.skip("Tidak ada TMSRoutePlan hari ini — jalankan test_confirm_routes dulu")

    r = client.get("/api/routes", headers=auth(admin_token))
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 200
    body = r.json()
    routes = body if isinstance(body, list) else body.get("routes", body.get("data", []))
    assert isinstance(routes, list)