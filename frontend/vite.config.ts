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
    // Phones reach the app through the laptop (npm run demo on any network, or
    // npm run dev:lan on home Wi-Fi). API calls go through this server to the
    // backend, so no CORS changes are needed. `vite preview` reuses both settings.
    proxy: { '/api': 'http://localhost:8000' },
    // Vite rejects unknown hostnames; allow Cloudflare quick-tunnel addresses.
    allowedHosts: ['.trycloudflare.com'],
  },
})

