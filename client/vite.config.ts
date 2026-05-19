import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { CLIENT_DEV_PORT, SERVER_ORIGIN } from '../config/ports'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: CLIENT_DEV_PORT,
    strictPort: true,
    proxy: {
      '/api': SERVER_ORIGIN,
      '/health': SERVER_ORIGIN,
    },
  },
})
