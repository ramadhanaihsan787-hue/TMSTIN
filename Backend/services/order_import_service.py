# Backend/services/order_import_service.py
import pandas as pd
import json
import time
import re
from io import BytesIO
from sqlalchemy.orm import Session
import models
from utils.helpers import time_str_to_minutes

def parse_time_window(keterangan: str, default_start: int, default_end: int):
    if not keterangan:
        return default_start, default_end, False

    text = str(keterangan).strip().upper()

    if "DIAMBIL CUST" in text:
        return None, None, False

    window_start = default_start
    window_end   = default_end
    priority_first = False

    if "PERTAMA" in text or "FIRST" in text:
        priority_first = True

    match_hhmm = re.search(r'\b([0-2]?\d):([0-5]\d)\b', text)
    if match_hhmm:
        hour   = int(match_hhmm.group(1))
        minute = int(match_hhmm.group(2))
        if 6 <= hour <= 20:
            window_end = hour * 60 + minute
            return window_start, window_end, priority_first

    match_hour = re.search(r'\b([0-2]?\d)\b', text)
    if match_hour:
        hour = int(match_hour.group(1))
        if 6 <= hour <= 20:
            window_end = hour * 60
            return window_start, window_end, priority_first

    if "PAGI" in text:
        window_end = 600
    elif "SIANG" in text:
        window_end = 720
    elif "SORE" in text:
        window_end = 900

    return window_start, window_end, priority_first

def process_sap_file(file_bytes: bytes, filename: str, db: Session, settings):
    """
    Service khusus untuk mengekstrak, memvalidasi, dan menyimpan data dari Excel SAP JAPFA.
    """
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file_bytes))
        else:
            df = pd.read_excel(BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Gagal membaca format file: {str(e)}")

    df.columns = df.columns.astype(str).str.upper().str.strip()
    df = df.dropna(how='all')

    def find_column(aliases):
        for alias in aliases:
            if alias in df.columns:
                return alias
        return None

    col_nama = find_column(['NAMA CUSTOMER', 'NAME OF SOLD-TO PARTY', 'PELANGGAN', 'CUSTOMER', 'NAMA'])
    col_kode = find_column(['KODE CUST.', 'KODE CUST', 'SOLD-TO PT', 'CUSTOMER CODE', 'CODE', 'KODE'])
    col_desc = find_column(['VALIDASI', 'MATERIAL DESCRIPTION', 'ITEM', 'BARANG', 'DESKRIPSI'])
    col_qty  = find_column(['QTY', 'QUANTITY', 'NET', 'JML BRG', 'BERAT'])
    col_ket  = find_column(['KETERANGAN', 'NOTES', 'CATATAN'])

    missing_cols = []
    if not col_nama: missing_cols.append("Nama Customer")
    if not col_kode: missing_cols.append("Kode Customer")
    if not col_qty: missing_cols.append("Quantity/Berat")
    if not col_desc: missing_cols.append("Item/Validasi")

    if missing_cols:
        raise ValueError(f"Format Excel berubah/salah! Sistem tidak menemukan kolom: {', '.join(missing_cols)}")

    for col in ['LATITUDE', 'LONGITUDE']:
        if col not in df.columns:
            df[col] = None

    df = df.dropna(subset=[col_desc])

    default_start = time_str_to_minutes(settings.vrp_start_time)
    default_end   = time_str_to_minutes(settings.vrp_end_time)  

    # Hapus DO lama yang masih gantung
    db.query(models.DeliveryOrder).filter(
        models.DeliveryOrder.status.in_([
            models.DOStatus.so_waiting_verification,
            models.DOStatus.do_verified
        ])
    ).delete(synchronize_session=False)

    df[col_nama] = df[col_nama].ffill()
    df[col_kode] = df[col_kode].ffill()

    orders_dict = {}
    for _, row in df.iterrows():
        kode_cust_val = row.get(col_kode)
        if pd.isna(kode_cust_val) or str(kode_cust_val).strip() == '':
            continue

        keterangan_teks = str(row.get(col_ket, '')).strip().upper() if col_ket else ""
        window_start, window_end, priority_first = parse_time_window(keterangan_teks, default_start, default_end)

        if window_start is None:
            continue

        kode_cust = str(kode_cust_val).split('.')[0]
        nama_toko = str(row.get(col_nama, 'Unknown')).strip()
        cust_key  = f"{kode_cust}_{nama_toko}"

        if cust_key not in orders_dict:
            orders_dict[cust_key] = {
                "kode": kode_cust, "nama": nama_toko, "lat": None, "lon": None,
                "berat": 0.0, "items": [], "tw_start": window_start, "tw_end": window_end
            }

        lat_val = row.get('LATITUDE')
        lon_val = row.get('LONGITUDE')
        qty_val = row.get(col_qty)
        desc_val = row.get(col_desc)

        if pd.notna(lat_val) and str(lat_val).strip() not in ['-', 'LATITUDE']:
            try:
                orders_dict[cust_key]["lat"] = float(str(lat_val).replace(',', '.'))
                orders_dict[cust_key]["lon"] = float(str(lon_val).replace(',', '.'))
            except: pass

        if orders_dict[cust_key]["lat"] is None:
            master = db.query(models.MasterCustomer).filter(models.MasterCustomer.kode_customer == kode_cust).first()
            if master and master.latitude and master.longitude:
                orders_dict[cust_key]["lat"] = float(master.latitude)
                orders_dict[cust_key]["lon"] = float(master.longitude)

        if pd.notna(qty_val):
            try:
                str_qty = str(qty_val).replace(',', '.')
                if str_qty.count('.') > 1:
                    str_qty = str_qty.replace('.', '', str_qty.count('.') - 1)
                q = float(str_qty)
                if q > 0:
                    orders_dict[cust_key]["items"].append({"nama_barang": str(desc_val) if pd.notna(desc_val) else "Item SAP", "qty": f"{q} KG"})
                    orders_dict[cust_key]["berat"] += q
            except: pass

    success_list, failed_list, count = [], [], 0

    for cust_key, data in orders_dict.items():
        if data["berat"] <= 0: continue
        menit_ke_jamstr = lambda m: f"{m // 60:02d}:{m % 60:02d}"

        if data["lat"] and data["lon"]:
            master = db.query(models.MasterCustomer).filter(models.MasterCustomer.kode_customer == data['kode']).first()
            if not master:
                master = models.MasterCustomer(
                    kode_customer=data['kode'],
                    store_name=data['nama'],
                    latitude=data['lat'],
                    longitude=data['lon']
                )
                db.add(master)
                db.commit()
                db.refresh(master)

            new_do = models.DeliveryOrder(
                order_id=f"DO-{data['kode']}-{int(time.time())}-{count}",
                store_id=master.store_id, 
                latitude=data['lat'], 
                longitude=data['lon'],
                weight_total=data['berat'], 
                service_type=json.dumps(data['items']),
                delivery_window_start=data['tw_start'], 
                delivery_window_end=data['tw_end'],
                status=models.DOStatus.do_verified
            )
            db.add(new_do)
            count += 1
            success_list.append({
                "order_id": new_do.order_id, "kode_customer": data['kode'], "nama_toko": data['nama'],
                "berat": round(data['berat'], 2), "kordinat": f"{data['lat']}, {data['lon']}",
                "jam_maks": menit_ke_jamstr(data['tw_end']), "items": data['items']
            })
        else:
            failed_list.append({
                "kode_customer": data['kode'], "nama_toko": data['nama'], "berat": round(data['berat'], 2),
                "items": data['items'], "jam_maks": menit_ke_jamstr(data['tw_end']), "alasan": "Koordinat GPS Kosong / Format Salah"
            })

    db.commit()
    return count, success_list, failed_list