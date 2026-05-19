import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadPorts } from '../config/ports'

const ports = loadPorts()

process.env.PHOTOFRAME_SERVER_PORT = String(ports.serverPort)
process.env.PHOTOFRAME_CLIENT_PORT = String(ports.clientPort)
process.env.PHOTOFRAME_CLIENT_HOST = ports.clientHost

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'PHOTOFRAME_',
  server: {
    port: ports.clientPort,
    strictPort: true,
    proxy: {
      '/api': ports.serverOrigin,
      '/health': ports.serverOrigin,
    },
  },
})
