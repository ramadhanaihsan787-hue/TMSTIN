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