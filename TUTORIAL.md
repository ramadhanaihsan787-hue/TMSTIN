# 🚀 PANDUAN MENYALAKAN SERVER TMS JAPFA (BACKEND & FRONTEND)

Panduan praktis ini akan membantu Anda menyalakan kembali seluruh ekosistem **TMS JAPFA** (Backend FastAPI & Frontend Vite React) setelah Anda menutup atau membuka kembali Code Editor.

---

## 🏗️ Persyaratan Awal (Prerequisites)
Pastikan database **PostgreSQL** Anda sudah menyala di background.
*   **Database URL**: `postgresql://postgres:1234@localhost:5432/tms_japfa`
*   *Catatan*: Biasanya PostgreSQL berjalan otomatis sebagai Windows Service. Jika ada masalah koneksi, pastikan service `postgresql-x64` dalam status **Running** di Windows Services.

---

## ⚡ Langkah 1: Menyalakan Server Backend (FastAPI)

Backend berfungsi sebagai penyedia API dan penghubung utama ke database PostgreSQL.

1.  **Buka PowerShell** atau **Command Prompt** (Terminal).
2.  Masuk ke folder backend project:
    ```powershell
    cd "C:\Users\MyBook Hype AMD\Downloads\mtstin\TMSTIN\Backend"
    ```
3.  **Aktifkan Virtual Environment (venv)**:
    *   Jika menggunakan **PowerShell**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   Jika menggunakan **Command Prompt (CMD)**:
        ```cmd
        .\venv\Scripts\activate.bat
        ```
    *(Tanda `(venv)` akan muncul di ujung kiri baris terminal Anda)*.

4.  **Jalankan Server Uvicorn**:
    ```powershell
    uvicorn main:app --reload
    ```
    *   **Port Default**: `http://localhost:8000`
    *   **Swagger API Docs**: `http://localhost:8000/docs` (untuk melihat & mengetes semua API secara langsung)

> [!TIP]
> Jangan tutup jendela terminal ini! Biarkan terminal tetap terbuka dan berjalan agar server Backend terus aktif melayani permintaan dari Frontend.

---

## 💻 Langkah 2: Menyalakan Server Frontend (React Vite)

Frontend adalah tampilan antarmuka (User Interface) aplikasi yang interaktif dan responsif.

1.  **Buka jendela terminal (PowerShell/CMD) baru** (jangan campur dengan terminal Backend).
2.  Masuk ke folder frontend project:
    ```powershell
    cd "C:\Users\MyBook Hype AMD\Downloads\mtstin\TMSTIN\Frontend"
    ```
3.  **Jalankan Server Development Vite**:
    ```powershell
    npm run dev
    ```
4.  Setelah berhasil dijalankan, buka browser pilihan Anda dan akses alamat berikut:
    *   **URL Aplikasi**: `http://localhost:5173`

---

## 🔑 Kredensial Default Sistem (Daftar Akun)

Berikut adalah daftar akun yang siap digunakan untuk masuk ke dalam aplikasi:

| Peran (Role) | Username | Password | Deskripsi Tugas |
| :--- | :--- | :--- | :--- |
| **Kasir** | `kasir` | `japfa123` | Mencatat, memperbarui, mengekspor BOP & Biaya Operasional |
| **Admin Distribusi** | `admin_distribusi` | `japfa123` | Mengatur rute armada, mengalokasikan pesanan & load planner |
| **Manager** | `manager` | `japfa123` | Melihat analitik global, laporan dashboard & performance |
| **Admin POD** | `admin_pod` | `japfa123` | Mengaudit surat jalan, retur barang, dan status e-POD |

---

## 🛠️ Verifikasi Database Terhubung (No Dummy Data)

Aplikasi kasir ini sekarang **100% terhubung secara live** ke database PostgreSQL Anda. Anda bisa memverifikasinya melalui langkah berikut:
1.  Masuk sebagai `kasir`.
2.  Buka dropdown **No. Polisi** dan **Nama Driver**.
3.  Daftar yang tampil adalah data real dari tabel master `FleetVehicle` dan `HRDriver` di PostgreSQL (Bukan lagi dummy hardcoded).
4.  Setiap pengisian BOP baru akan langsung tersimpan di database dan otomatis langsung tampil pada tabel **"Input Terakhir Hari Ini"**.

---

*Selamat bekerja! Jika ada kendala koneksi atau error di terminal, pastikan kedua terminal (Backend & Frontend) tetap aktif bersamaan.*
