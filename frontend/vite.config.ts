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
    // Lets phones on the same Wi-Fi use the app (npm run dev:lan): API calls go
    // through this dev server to the backend on the laptop, so no CORS changes are needed.
    proxy: { '/api': 'http://localhost:8000' },
  },
})

