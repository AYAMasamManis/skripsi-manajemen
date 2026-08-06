import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Base URL lokal dari .env.development; path diteruskan utuh ke Laragon.
      '/skripsi-manajemen/api': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
      // Tetap mendukung VITE_API_BASE_URL=/api saat pengujian konfigurasi hosting.
      '/api': {
        target: 'http://localhost/skripsi-manajemen', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
