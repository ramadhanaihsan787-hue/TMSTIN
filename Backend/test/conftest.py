# test/conftest.py
import sys, os, pytest, datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base
from dependencies import get_db
import models
from core.security import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_japfa.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # ── Users ────────────────────────────────────────────────────────────
    admin = models.User(username="admin_test",    full_name="Budi Admin",
                        hashed_password=get_password_hash("password123"),
                        role="admin_distribusi")
    kasir = models.User(username="kasir_test",    full_name="Kasir Satu",
                        hashed_password=get_password_hash("password123"),
                        role="kasir")
    mgr   = models.User(username="manager_test",  full_name="Manajer Logistik",
                        hashed_password=get_password_hash("password123"),
                        role="manager_logistik")
    drv_user = models.User(username="driver_test", full_name="Driver Satu",
                           hashed_password=get_password_hash("password123"),
                           role="driver")

    for u in [admin, kasir, mgr, drv_user]:
        db.add(u)
    db.commit()
    for u in [admin, kasir, mgr, drv_user]:
        db.refresh(u)

    # ── Fleet ─────────────────────────────────────────────────────────────
    v1 = models.FleetVehicle(license_plate="B 1234 TST", type="CDD",
                             capacity_kg=2500.0, status="Available",
                             is_internal=True, current_km=300000)
    v2 = models.FleetVehicle(license_plate="B 5678 TST", type="CDE",
                             capacity_kg=8000.0, status="Available",
                             is_internal=True, current_km=150000)
    for v in [v1, v2]:
        db.add(v)
    db.commit()
    for v in [v1, v2]:
        db.refresh(v)

    # ── Drivers ───────────────────────────────────────────────────────────
    d1 = models.HRDriver(name="Yoga Aditya", phone="08111111111",
                         status=True, is_helper=False, user_id=drv_user.id)
    d2 = models.HRDriver(name="Arjun Helper", phone="08222222222",
                         status=True, is_helper=True)
    for d in [d1, d2]:
        db.add(d)
    db.commit()
    for d in [d1, d2]:
        db.refresh(d)

    # ── Customers ─────────────────────────────────────────────────────────
    c1 = models.MasterCustomer(kode_customer="CUST-T01", store_name="Superindo Test",
                                latitude=-6.200000, longitude=106.800000,
                                address="Jl. Test No.1", status="Active")
    c2 = models.MasterCustomer(kode_customer="CUST-T02", store_name="Giant Test",
                                latitude=-6.210000, longitude=106.810000,
                                address="Jl. Uji No.2", status="Active")
    for c in [c1, c2]:
        db.add(c)
    db.commit()
    for c in [c1, c2]:
        db.refresh(c)

    # ── Delivery Orders ───────────────────────────────────────────────────
    o1 = models.DeliveryOrder(order_id="DO-TEST-001", weight_total=500.0,
                               latitude=-6.200000, longitude=106.800000,
                               status=models.DOStatus.so_waiting_verification,
                               store_id=c1.store_id)
    o2 = models.DeliveryOrder(order_id="DO-TEST-002", weight_total=300.0,
                               latitude=-6.210000, longitude=106.810000,
                               status=models.DOStatus.so_waiting_verification,
                               store_id=c2.store_id)
    for o in [o1, o2]:
        db.add(o)
    db.commit()

    # ── SystemSettings ────────────────────────────────────────────────────
    ss = models.SystemSettings(
        id=1, vrp_start_time="06:00", vrp_end_time="20:00",
        vrp_base_drop_time_mins=15, vrp_var_drop_time_mins=1,
        vrp_capacity_buffer_percent=90,
        depo_lat=-6.207356, depo_lon=106.479163,
        jembatan_timbang_lat=-6.206353, jembatan_timbang_lon=106.480681,
        jembatan_timbang_radius_m=30, harga_bbm_per_liter=12500.0
    )
    db.add(ss)
    db.commit()

    # Store refs for fixtures that need IDs
    db._test_refs = {
        "admin": admin, "kasir": kasir, "mgr": mgr, "driver_user": drv_user,
        "v1": v1, "v2": v2, "d1": d1, "d2": d2,
        "c1": c1, "c2": c2, "o1": o1, "o2": o2,
    }

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_japfa.db"):
        os.remove("./test_japfa.db")


@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


def _get_token(client, username, password="password123"):
    r = client.post("/login", data={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed for {username}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client):    return _get_token(client, "admin_test")

@pytest.fixture(scope="module")
def kasir_token(client):    return _get_token(client, "kasir_test")

@pytest.fixture(scope="module")
def manager_token(client):  return _get_token(client, "manager_test")

@pytest.fixture(scope="module")
def driver_token(client):   return _get_token(client, "driver_test")