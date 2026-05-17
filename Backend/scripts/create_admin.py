"""
Create Default Admin Users
"""
import logging
from database import SessionLocal
from core.security import get_password_hash
from models import UserRole
import models

# 🌟 SETUP LOGGER KHUSUS SCRIPT
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def create_default_users():
    """Create default admin and test users"""
    db = SessionLocal()
    
    try:
        # Define default users
        default_users = [
            {
                "username": "manager",
                "password": "japfa123",
                "full_name": "Manager Logistik",
                "role": UserRole.manager_logistik
            },
            {
                "username": "admin_distribusi",
                "password": "japfa123",
                "full_name": "Admin Distribusi",
                "role": UserRole.admin_distribusi
            },
            {
                "username": "admin_pod",
                "password": "japfa123",
                "full_name": "Admin POD",
                "role": UserRole.admin_pod
            },
            {
                "username": "driver01",
                "password": "japfa123",
                "full_name": "Supir Satu",
                "role": UserRole.driver
            },
            {
                "username": "kasir",
                "password": "japfa123",
                "full_name": "Mbak Kasir",
                "role": UserRole.kasir
            }
        ]
        
        # Create users if they don't exist
        for user_data in default_users:
            existing = db.query(models.User).filter_by(username=user_data["username"]).first()
            if existing:
                logger.info(f"⚠️  User already exists: {user_data['username']} ({existing.role.value})")
                continue
                
            new_user = models.User(
                username=user_data["username"],
                hashed_password=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"]
            )
            db.add(new_user)
            logger.info(f"✅ Created user: {user_data['username']}")
        
        db.commit()
        logger.info("\n✅ Proses inisialisasi user selesai!")
        
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_default_users()