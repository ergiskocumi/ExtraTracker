import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Read version from environment variable (VITE_APP_VERSION) or fallback to package.json
    // Priority: VITE_APP_VERSION > npm_package_version > default fallback
    __APP_VERSION__: JSON.stringify(
      process.env.VITE_APP_VERSION ?? 
      process.env.npm_package_version ?? 
      '0.0.4'
    ),
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      format: {
        comments: false,
      },
    } as any,
    cssCodeSplit: true,
    reportCompressedSize: false,
    // RIMOSSO manualChunks - lascia che Vite gestisca automaticamente
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        xfwd: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})