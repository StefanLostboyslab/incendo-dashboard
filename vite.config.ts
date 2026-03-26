import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/whatt': {
        target: 'https://whatt.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whatt/, ''),
        secure: false, // In case of SSL issues, though whatt.io is https
      }
    }
  },
  preview: {
    allowedHosts: true,
  }
})
