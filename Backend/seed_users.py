"""
seed_users.py — Suntik user testing ke DB TMS JAPFA
Jalankan dari folder Backend:
  cd D:\IPB Document\TMSJapfa\TMSJapfaFnB-main\Backend
  python seed_users.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from core.security import get_password_hash
import models

# ── Data user testing ─────────────────────────────────────────────────────────
# Format: (full_name, role, username, password, is_driver, is_helper)
USERS = [
    # ── DRIVER / HELPER ──────────────────────────────────────────────────────
    ("Oman Surahman",            "driver", "oman",     "oman123",     True,  False),
    ("Wanto Alfrian",            "driver", "wanto",    "wanto123",    True,  False),
    ("Suwondo",                  "driver", "suwondo",  "suwondo123",  True,  False),
    ("Martono",                  "driver", "martono",  "martono123",  True,  False),
    ("Witanto Setiawan",         "driver", "witanto",  "witanto123",  True,  False),
    ("Muhammad Maulana Hakiki",  "driver", "muhammad", "muhammad123", True,  False),
    ("Yoga Dwi Aditya",          "driver", "yoga",     "yoga123",     True,  False),
    ("Joko Wiyono",              "driver", "joko",     "joko123",     True,  False),
    ("Eko Prasetyo",             "driver", "eko",      "eko123",      True,  False),
    ("Lestari Primadani",        "driver", "lestari",  "lestari123",  True,  False),   
    ("Nanang Prianto",           "driver", "nanang",   "nanang123",   True,  False),   
    ("Ari Zasmara",              "driver", "ari",      "ari123",      True,  False),
    ("Santoso",                  "driver", "santoso",  "santoso123",  True,  False),
    ("Fauzan",                   "driver", "fauzan",   "fauzan123",   True,  False),

    # ── MANAGER ──────────────────────────────────────────────────────────────
    ("Maryadi",    "manager_logistik", "manager1", "japfa123", False, False),
    ("Gilang",     "manager_logistik", "manager2", "japfa123", False, False),
    ("Mudji",      "manager_logistik", "manager3", "japfa123", False, False),
    ("Aziz",       "manager_logistik", "manager4", "japfa123", False, False),

    # ── ADMIN DISTRIBUSI (username dibedakan biar tidak bentrok) ──────────────
    ("Ahmad",   "admin_distribusi", "admin.distribusi",  "japfa123", False, False),
    ("Nurdin",  "admin_distribusi", "admin.distribusi2", "japfa123", False, False),

    # ── ADMIN POD ────────────────────────────────────────────────────────────
    ("Dede", "admin_pod", "admin.pod", "japfa123", False, False),

    # ── KASIR ─────────────────────────────────────────────────────────────────
    ("Ovie", "kasir", "kasir1", "japfa123", False, False),
]

def seed(db: Session):
    created_users = 0
    created_drivers = 0
    skipped = 0

    for full_name, role, username, password, is_driver_record, is_helper in USERS:
        # Cek apakah sudah ada
        existing = db.query(models.User).filter(models.User.username == username).first()
        if existing:
            print(f"  ⚠️  SKIP (sudah ada): {username}")
            skipped += 1
            continue

        # Buat user
        user = models.User(
            username      = username,
            full_name     = full_name,
            hashed_password = get_password_hash(password),
            role          = models.UserRole[role],
        )
        db.add(user)
        db.flush()   # dapat user.id sebelum commit

        created_users += 1
        print(f"  ✅ User: {username:20s} [{role:20s}] → id={user.id}")

        # Buat entri HRDriver untuk driver/helper agar bisa di-assign ke truk
        if is_driver_record:
            existing_drv = db.query(models.HRDriver).filter(
                models.HRDriver.user_id == user.id
            ).first()
            if not existing_drv:
                drv = models.HRDriver(
                    name      = full_name,
                    user_id   = user.id,
                    status    = True,
                    is_helper = is_helper,
                )
                db.add(drv)
                created_drivers += 1
                print(f"     ↳ HRDriver: {'Helper' if is_helper else 'Driver'} entry dibuat")

    db.commit()
    print(f"\n{'='*55}")
    print(f"✅ Selesai! Users dibuat: {created_users}, Drivers: {created_drivers}, Skip: {skipped}")
    print(f"{'='*55}")


if __name__ == "__main__":
    print("\n🚀 Seeding user testing TMS JAPFA...\n")
    db = SessionLocal()
    try:
        seed(db)
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()