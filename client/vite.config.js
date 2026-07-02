import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Ini buat ngehubungin React ke Laragon pas lagi ngoding (npm run dev)
      '/api': {
        target: 'http://localhost/skripsi-manajemen', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})