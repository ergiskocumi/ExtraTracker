import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.3'),
  },
  // OTTIMIZZATO: Build optimizations per performance
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Rimuove console.log in produzione
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Rimuove console specifici
        passes: 2, // Più passaggi per migliore compressione
      },
      format: {
        comments: false, // Rimuove commenti
      },
    } as any, // Type workaround per terserOptions
    cssCodeSplit: true, // Code splitting anche per CSS
    reportCompressedSize: false, // Disabilita per build più veloce (opzionale)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // OTTIMIZZATO: Separazione chunk più granulare per miglior tree-shaking
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor-react-core';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Framer Motion - separato perché pesante
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            // Recharts - separato perché molto pesante
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            // Lucide React - separato per tree-shaking
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            // React Icons - separato
            if (id.includes('react-icons')) {
              return 'vendor-icons';
            }
            // React PDF - separato perché pesante
            if (id.includes('react-pdf')) {
              return 'vendor-pdf';
            }
            // Altri vendor
            return 'vendor-other';
          }
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
