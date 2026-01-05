import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.3'),
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
    rollupOptions: {
      output: {
        // SEMPLIFICATO: Non separare React dalle sue dipendenze
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Raggruppa TUTTO React insieme (core + ecosystem)
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Framer Motion - separato (pesante ma non dipende da React al load time)
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            // Recharts - separato (molto pesante)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-recharts';
            }
            // PDF - separato
            if (id.includes('react-pdf') || id.includes('pdfjs')) {
              return 'vendor-pdf';
            }
            // Tutto il resto insieme
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
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
  }
})