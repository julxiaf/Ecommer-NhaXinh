import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://127.0.0.1:8080'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/address-kit': {
          target: 'https://production.cas.so',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          // Gắn X-Forwarded-Host/Proto = IP:port client để backend dựng URL VNPay trả về đúng máy khách
          xfwd: true,
        },
        '/media': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
