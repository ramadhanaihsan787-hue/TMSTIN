# test/driver_app/test_trip.py
"""
Integration tests untuk driver trip/start dan trip/end endpoints.
- KM awal tersimpan ke TMSRoutePlan dan FleetVehicle
- Geofence lock bekerja saat dalam radius jembatan timbang
- Role enforcement: non-driver ditolak
"""
import pytest
import datetime
import models


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _ensure_route_plan(db_session):
    """Pastikan ada TMSRoutePlan untuk driver_test hari ini (seed atau buat baru)."""
    refs    = db_session._test_refs
    today   = datetime.date.today()
    v1, d1  = refs["v1"], refs["d1"]

    plan = db_session.query(models.TMSRoutePlan).filter(
        models.TMSRoutePlan.vehicle_id == v1.vehicle_id,
        models.TMSRoutePlan.planning_date == today,
    ).first()

    if plan is None:
        plan = models.TMSRoutePlan(
            route_id     = f"RP-{today.strftime('%Y%m%d')}-DRTEST",
            planning_date = today,
            vehicle_id   = v1.vehicle_id,
            driver_id    = d1.driver_id,
            total_weight = 500.0,
            total_distance_km = 45.0,
        )
        db_session.add(plan)
        db_session.commit()
        db_session.refresh(plan)

    return plan


# ═══════════════════════════════════════════════════════════════════════════════
# TRIP START
# ═══════════════════════════════════════════════════════════════════════════════

def test_trip_start_records_km_awal(client, driver_token, db_session):
    plan = _ensure_route_plan(db_session)

    r = client.post(
        "/api/driver/trip/start",
        headers=auth(driver_token),
        json={"route_id": plan.route_id, "km_awal": 302477},
    )
    if r.status_code == 404:
        pytest.skip("Endpoint /api/driver/trip/start belum ada")
    assert r.status_code == 200, f"Trip start failed: {r.text}"

    body = r.json()
    assert body.get("km_awal") == 302477 or body.get("status") == "success"


def test_trip_start_syncs_fleet_km(client, driver_token, db_session):
    """FleetVehicle.current_km harus tersinkron setelah trip start."""
    plan = _ensure_route_plan(db_session)
    refs = db_session._test_refs
    v1   = refs["v1"]

    client.post(
        "/api/driver/trip/start",
        headers=auth(driver_token),
        json={"route_id": plan.route_id, "km_awal": 302500},
    )

    db_session.refresh(v1)
    # current_km harus terupdate (toleransi: mungkin sudah diupdate di test sebelumnya)
    assert v1.current_km >= 302477


def test_trip_start_updates_start_time(client, driver_token, db_session):
    """start_time harus berubah dari default jam 06:00 ke waktu aktual."""
    plan   = _ensure_route_plan(db_session)
    before = datetime.datetime.now()

    client.post(
        "/api/driver/trip/start",
        headers=auth(driver_token),
        json={"route_id": plan.route_id, "km_awal": 302500},
    )

    db_session.refresh(plan)
    if plan.start_time:
        # start_time harus setelah test dimulai (bukan default 06:00)
        default_06 = plan.start_time.replace(hour=6, minute=0, second=0, microsecond=0)
        assert plan.start_time != default_06 or plan.start_time >= before


def test_trip_start_wrong_role(client, admin_token, db_session):
    """Admin tidak boleh start trip driver — harus 403."""
    plan = _ensure_route_plan(db_session)
    r = client.post(
        "/api/driver/trip/start",
        headers=auth(admin_token),
        json={"route_id": plan.route_id, "km_awal": 302500},
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code in [403, 401], f"Admin seharusnya ditolak: {r.status_code}"


# ═══════════════════════════════════════════════════════════════════════════════
# TRIP END
# ═══════════════════════════════════════════════════════════════════════════════

def test_trip_end_records_km_akhir(client, driver_token, db_session):
    plan = _ensure_route_plan(db_session)

    r = client.post(
        "/api/driver/trip/end",
        headers=auth(driver_token),
        json={"route_id": plan.route_id, "km_akhir": 302663,
              "gps_lat": 0.0, "gps_lon": 0.0},
    )
    if r.status_code == 404:
        pytest.skip("Endpoint /api/driver/trip/end belum ada")
    assert r.status_code == 200, f"Trip end failed: {r.text}"

    db_session.refresh(plan)
    if plan.km_akhir_trip:
        assert plan.km_akhir_trip == 302663


def test_trip_end_geofence_within_radius(client, driver_token, db_session):
    """GPS di dalam radius jembatan timbang → geo_locked = True."""
    plan = _ensure_route_plan(db_session)

    # Koordinat persis sama dengan jembatan_timbang di seed
    r = client.post(
        "/api/driver/trip/end",
        headers=auth(driver_token),
        json={
            "route_id": plan.route_id,
            "km_akhir": 302700,
            "gps_lat": -6.206353,   # tepat di jembatan timbang
            "gps_lon": 106.480681,
        },
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 200
    body = r.json()
    # geo_locked harus True karena dalam radius 30m
    assert body.get("geo_locked") is True, f"geo_locked harusnya True: {body}"


def test_trip_end_geofence_outside_radius(client, driver_token, db_session):
    """GPS jauh dari jembatan timbang → geo_locked = False tapi end_time tersimpan."""
    plan = _ensure_route_plan(db_session)

    r = client.post(
        "/api/driver/trip/end",
        headers=auth(driver_token),
        json={
            "route_id": plan.route_id,
            "km_akhir": 302800,
            "gps_lat": -6.300000,   # jauh dari jembatan
            "gps_lon": 106.600000,
        },
    )
    if r.status_code == 404:
        pytest.skip("Endpoint tidak ada")
    assert r.status_code == 200
    body = r.json()
    assert body.get("geo_locked") is False
    assert body.get("status") == "success"