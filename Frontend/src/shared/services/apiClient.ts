import axios from "axios";

export const api = axios.create({
  // 🌟 FIX CTO (QW-5): Jangan kunci ke localhost! Baca dari .env Vite
  // Kalau VITE_API_URL ngga ada (misal pas dev), fallback ke localhost:8000
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000", 
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

// 🛡️ INTERCEPTOR REQUEST: Selipin KTP (Token) otomatis
api.interceptors.request.use((config) => {
  // Ambil dua-duanya biar aman!
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 🛡️ INTERCEPTOR RESPONSE: Tangkep Error Global (Token Mati = Tendang)
api.interceptors.response.use(
    (response) => response, 
    (error) => {
        if (error.response?.status === 401) {
            console.warn("🚨 Sesi habis atau belum login! Menendang ke /login...");
            localStorage.removeItem("token");
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

// ============================================================
// [Item 4] downloadFile — helper untuk download binary (Excel/PDF)
//
// Kenapa tidak pakai raw fetch()?
//   fetch() tidak baca baseURL dari apiClient, jadi hardcode localhost.
//   Fungsi ini pakai instance 'api' (axios) yang sudah ada interceptor
//   token otomatis dan baseURL dari VITE_API_URL.
//
// Usage:
//   await downloadFile('/api/routes/export-excel?date=2026-05-20', 'Manifest.xlsx');
//   await downloadFile('/api/analytics/export?format=xlsx&startDate=...', 'Report.xlsx');
// ============================================================
export async function downloadFile(
  endpoint: string,
  filename: string
): Promise<void> {
  // responseType: 'blob' = axios return binary data, bukan parse sebagai JSON
  const response = await api.get(endpoint, { responseType: 'blob' });

  // Fix ts(2322): response.headers['content-type'] bisa bertipe AxiosHeaders | string | number | boolean
  // Cast ke string dulu agar kompatibel dengan Blob({ type: string })
  const contentType = String(
    response.headers['content-type'] ||
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  const blob = new Blob([response.data], { type: contentType });

  // Trigger download di browser
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}