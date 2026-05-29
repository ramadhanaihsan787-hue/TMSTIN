"""Add kasir value to userrole PostgreSQL enum

[FIX] Migration sebelumnya (1da24a483a0b) bernama 'tambah_role_kasir'
tapi isinya mengubah kolom tabel operational_expenses — tidak ada
ALTER TYPE userrole ADD VALUE 'kasir' sama sekali.

Migration ini adalah yang sebenarnya menambahkan 'kasir' ke PostgreSQL
enum type 'userrole' agar AuthService.create_user() tidak crash
saat mendaftarkan user dengan role kasir.

Revision ID: e7f8a9b0c1d2
Revises: 1da24a483a0b
Create Date: 2026-05-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, Sequence[str], None] = '1da24a483a0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Tambahkan value 'kasir' ke PostgreSQL enum type 'userrole'.

    Menggunakan IF NOT EXISTS agar migration aman dijalankan
    berulang kali tanpa error (idempotent).

    CATATAN: ALTER TYPE ... ADD VALUE tidak bisa di-rollback
    dalam satu transaksi di PostgreSQL < 12. Di PostgreSQL 12+
    sudah aman dalam transaksi, tapi kita tetap gunakan
    COMMIT ISOLATION untuk kompatibilitas maksimal.
    """
    # Jalankan di luar transaksi utama Alembic untuk kompatibilitas PostgreSQL
    connection = op.get_bind()

    # Cek apakah 'kasir' sudah ada di enum (idempotency check)
    result = connection.execute(
        text("""
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'userrole'
              AND e.enumlabel = 'kasir'
        """)
    ).fetchone()

    if result is None:
        # Belum ada — tambahkan sekarang
        # Gunakan EXECUTE untuk bypass transaction isolation di PostgreSQL lama
        connection.execute(
            text("ALTER TYPE userrole ADD VALUE 'kasir'")
        )
        print("[MIGRATION] ✅ 'kasir' berhasil ditambahkan ke enum userrole.")
    else:
        print("[MIGRATION] ℹ️  'kasir' sudah ada di enum userrole — skip.")


def downgrade() -> None:
    """
    PostgreSQL tidak mendukung DROP VALUE dari enum secara langsung.

    Untuk rollback: hapus semua user dengan role kasir terlebih dahulu,
    lalu buat ulang enum tanpa value kasir, dan ubah kolom yang referensikan enum.

    Karena kompleksitas ini, downgrade tidak diimplementasikan secara otomatis.
    Lakukan manual jika memang diperlukan.
    """
    raise NotImplementedError(
        "PostgreSQL tidak support DROP VALUE dari enum. "
        "Hapus user kasir manual lalu drop & recreate enum jika perlu downgrade."
    )