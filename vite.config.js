import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // string separado por comas (.env) a array
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim())
    : ['localhost']

  return {
    plugins: [react()],
    define: {
      'process.env': {},
    },
    server: {
      host: true,
      port: 5173,
      https: false,
      allowedHosts,
    },
  }
})
