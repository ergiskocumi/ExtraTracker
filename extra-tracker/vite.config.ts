import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.3'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  // OTTIMIZZATO: Build optimizations per performance
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Rimuove console.log in produzione
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separazione chunk per librerie pesanti
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-icons': ['lucide-react', 'react-icons/fi'],
          'vendor-charts': ['recharts'], // Se usato
          'vendor-pdf': ['react-pdf'], // Se usato
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disabilita sourcemap in produzione per performance
  },
  server: {
    host: true, // <--- AGGIUNGI QUESTA RIGA. Dice al server: "fatti vedere dalla rete"
    port: 5173, // Opzionale, per fissare la porta
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
  }
})
