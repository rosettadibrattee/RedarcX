import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devApiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:18000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
