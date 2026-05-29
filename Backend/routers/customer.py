# routers/customers.py
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
from io import BytesIO
import pandas as pd

import models
import schemas # 🌟 SUNTIKAN PYDANTIC!
from dependencies import get_db, get_current_user, require_role

router = APIRouter(prefix="/api/customers", tags=["Master Customers"])

# ==========================================
# SCHEMAS INPUT
# ==========================================
class CustomerCreate(BaseModel):
    kode_customer: str
    store_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    admin_name: Optional[str] = None
    status: str = "Active"

class CustomerUpdate(BaseModel):
    store_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    admin_name: Optional[str] = None
    status: Optional[str] = None

# ==========================================
# ENDPOINT 1: LIST CUSTOMERS
# ==========================================
@router.get("", response_model=schemas.CustomerListResponse) # 🌟 SUNTIK SINI
def list_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.MasterCustomer)

    if search:
        filter_text = f"%{search}%"
        query = query.filter(
            or_(
                models.MasterCustomer.store_name.ilike(filter_text),
                models.MasterCustomer.kode_customer.ilike(filter_text),
                models.MasterCustomer.city.ilike(filter_text)
            )
        )

    total = query.count()
    customers = query.offset(skip).limit(limit).all()

    return {
        "status": "success",
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "storeId": c.store_id,
                "kodeCustomer": c.kode_customer,
                "storeName": c.store_name,
                "latitude": float(c.latitude) if c.latitude else None,
                "longitude": float(c.longitude) if c.longitude else None,
                "address": c.address,
                "district": c.district,
                "city": c.city,
                "adminName": c.admin_name,
                "status": c.status or "Active"
            }
            for c in customers
        ]
    }

# ==========================================
# ENDPOINT 2: GET SINGLE CUSTOMER
# ==========================================
@router.get("/{store_id}", response_model=schemas.CustomerDetailResponse) # 🌟 SUNTIK SINI
def get_customer(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    customer = db.query(models.MasterCustomer).filter(
        models.MasterCustomer.store_id == store_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan!")

    return {
        "status": "success",
        "data": {
            "storeId": customer.store_id,
            "kodeCustomer": customer.kode_customer,
            "storeName": customer.store_name,
            "latitude": float(customer.latitude) if customer.latitude else None,
            "longitude": float(customer.longitude) if customer.longitude else None,
            "address": customer.address,
            "district": customer.district,
            "city": customer.city,
            "adminName": customer.admin_name,
            "status": customer.status or "Active"
        }
    }

# ==========================================
# ENDPOINT 3: CREATE CUSTOMER
# ==========================================
@router.post("", response_model=schemas.CustomerCreateResponse) # 🌟 SUNTIK SINI
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    existing = db.query(models.MasterCustomer).filter(
        models.MasterCustomer.kode_customer == data.kode_customer
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail=f"Kode customer '{data.kode_customer}' sudah terdaftar!")

    new_cust = models.MasterCustomer(
        kode_customer=data.kode_customer,
        store_name=data.store_name,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        district=data.district,
        city=data.city,
        admin_name=data.admin_name,
        status=data.status
    )

    db.add(new_cust)
    db.commit()
    db.refresh(new_cust)

    return {
        "message": f"Pelanggan '{data.store_name}' berhasil ditambahkan!",
        "storeId": new_cust.store_id,
        "kodeCustomer": new_cust.kode_customer
    }

# ==========================================
# ENDPOINT 4: UPDATE CUSTOMER
# ==========================================
@router.put("/{store_id}", response_model=schemas.CustomerActionResponse) # 🌟 SUNTIK SINI
def update_customer(
    store_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    customer = db.query(models.MasterCustomer).filter(
        models.MasterCustomer.store_id == store_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan!")

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()

    if data.latitude and data.longitude:
        orphan_orders = db.query(models.DeliveryOrder).filter(
            models.DeliveryOrder.store_id == store_id,
            models.DeliveryOrder.latitude.is_(None)
        ).all()

        for order in orphan_orders:
            order.latitude  = data.latitude
            order.longitude = data.longitude

        db.commit()

    return {"message": "Data pelanggan berhasil diperbarui!", "storeId": store_id}

# ==========================================
# ENDPOINT 5: SOFT DELETE
# ==========================================
@router.patch("/by-code/{kode_customer}/coordinate")
def update_coordinate_by_code(
    kode_customer: str,
    lat: float,
    lon: float,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Quick-save koordinat toko berdasarkan kode_customer.
    Dipanggil saat admin pin lokasi toko di peta routing.
    Otomatis update MasterCustomer sehingga berlaku untuk routing berikutnya.
    """
    # Validasi bounding box Indonesia
    if not (-12.0 <= lat <= 7.0 and 94.0 <= lon <= 142.0):
        raise HTTPException(
            status_code=400,
            detail=f"Koordinat ({lat}, {lon}) di luar bounding box Indonesia."
        )

    customer = db.query(models.MasterCustomer).filter(
        models.MasterCustomer.kode_customer == kode_customer
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail=f"Toko dengan kode '{kode_customer}' tidak ditemukan."
        )

    customer.latitude  = lat
    customer.longitude = lon
    db.commit()

    logger.info(
        f"📍 Koordinat diupdate: {kode_customer} ({customer.store_name}) "
        f"→ ({lat:.6f}, {lon:.6f}) oleh {current_user.username}"
    )

    return {
        "status": "success",
        "message": f"Koordinat {customer.store_name} berhasil disimpan.",
        "kode_customer": kode_customer,
        "store_name": customer.store_name,
        "latitude": lat,
        "longitude": lon,
    }


@router.delete("/{store_id}", response_model=schemas.CustomerActionResponse) # 🌟 SUNTIK SINI
def deactivate_customer(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("manager_logistik"))
):
    customer = db.query(models.MasterCustomer).filter(
        models.MasterCustomer.store_id == store_id
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan!")

    customer.status = "Inactive"
    db.commit()

    return {
        "message": f"Pelanggan '{customer.store_name}' dinonaktifkan.",
        "note": "Data historis tetap tersimpan."
    }

# ==========================================
# ENDPOINT 6: BATCH IMPORT EXCEL
# ==========================================
@router.post("/batch-import", response_model=schemas.BatchImportResponse) # 🌟 SUNTIK SINI
async def batch_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin_distribusi", "manager_logistik"))
):
    contents = await file.read()

    try:
        df = (pd.read_csv(BytesIO(contents))
              if file.filename.endswith('.csv')
              else pd.read_excel(BytesIO(contents)))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal baca file: {str(e)}")

    df.columns = df.columns.str.lower().str.strip()

    imported = 0
    updated  = 0
    errors   = []

    for idx, row in df.iterrows():
        try:
            kode = str(row.get('kode_cust', '')).strip()
            nama = str(row.get('nama_toko', '')).strip()

            if not kode or not nama:
                continue

            lat = float(row['lat']) if pd.notna(row.get('lat')) else None
            lon = float(row['lon']) if pd.notna(row.get('lon')) else None

            existing = db.query(models.MasterCustomer).filter(
                models.MasterCustomer.kode_customer == kode
            ).first()

            if existing:
                existing.store_name = nama
                if lat: existing.latitude  = lat
                if lon: existing.longitude = lon
                if pd.notna(row.get('alamat')):   existing.address  = row['alamat']
                if pd.notna(row.get('kecamatan')): existing.district = row['kecamatan']
                if pd.notna(row.get('kota')):      existing.city     = row['kota']
                updated += 1
            else:
                new_c = models.MasterCustomer(
                    kode_customer=kode,
                    store_name=nama,
                    latitude=lat,
                    longitude=lon,
                    address=row.get('alamat'),
                    district=row.get('kecamatan'),
                    city=row.get('kota')
                )
                db.add(new_c)
                imported += 1

        except Exception as e:
            errors.append(f"Row {idx + 2}: {str(e)}")
            continue

    db.commit()

    return {
        "message": "Batch import selesai!",
        "imported": imported,
        "updated": updated,
        "errors": errors[:10]
    }