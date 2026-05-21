/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { CLIENT_DEV_PORT, SERVER_ORIGIN } from '../config/ports'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(clientRoot, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    port: CLIENT_DEV_PORT,
    strictPort: true,
    proxy: {
      '/api': SERVER_ORIGIN,
      '/health': SERVER_ORIGIN,
    },
  },
  preview: {
    port: CLIENT_DEV_PORT,
    strictPort: true,
    proxy: {
      '/api': SERVER_ORIGIN,
      '/health': SERVER_ORIGIN,
    },
  },
})
