import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    // Untuk dev tunnel (ngrok/localtunnel), tambahkan host di .env atau
    // jalankan: vite --host 0.0.0.0
    // Jangan hardcode URL tunnel di sini — berubah tiap sesi.
    host: true,  // izinkan akses dari network lokal (Docker, LAN)
    port: 5173,
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  }
})