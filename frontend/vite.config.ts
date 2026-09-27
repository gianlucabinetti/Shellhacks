import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Phones reach the app through the laptop (npm run dev:lan on home Wi-Fi, or
    // npm run tunnel on campus/public Wi-Fi). API calls go through this dev server
    // to the backend, so no CORS changes are needed.
    proxy: { '/api': 'http://localhost:8000' },
    // Vite rejects unknown hostnames; allow Cloudflare quick-tunnel addresses.
    allowedHosts: ['.trycloudflare.com'],
  },
})

