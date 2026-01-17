/**
 * 📄 PDF READER - Visualizzatore PDF Professionale
 * 
 * Implementazione basata su @react-pdf-viewer (Phuoc Nguyen)
 * - Selezione testo nativa (text layer abilitato)
 * - Dark mode integrato
 * - Performance ottimizzate con virtualizzazione
 * - Controlli standard (zoom, ricerca, navigazione)
 * 
 * CRITICAL: defaultLayoutPlugin() is a HOOK internally (uses React hooks).
 * It MUST be called unconditionally as the FIRST line of the component,
 * before any conditional returns.
 */

import React from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import CSS required (CRITICAL for dark mode and text layer)
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// ============================================
// TYPES
// ============================================

interface PDFReaderProps {
    /**
     * URL o path del file PDF da visualizzare
     */
    pdfUrl: string | null;
    
    /**
     * Callback chiamato quando si verifica un errore nel caricamento
     */
    onError?: (error: Error) => void;
    
    /**
     * Callback chiamato quando il PDF viene caricato con successo
     */
    onLoadSuccess?: () => void;
    
    /**
     * Classe CSS personalizzata per il container
     */
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const PDFJS_VERSION = '3.11.174';

/**
 * Worker URL Configuration
 * 
 * WHY EXTERNAL WORKER URL?
 * ------------------------
 * 1. **Performance**: PDF.js worker runs in a separate thread, avoiding blocking the main UI thread.
 *    Bundling it locally would require complex Webpack/Vite configuration for worker chunks.
 * 
 * 2. **MIME Type Issues**: Local .mjs files can cause MIME type errors in dev environments.
 *    Using .js from a reliable CDN (unpkg) ensures correct Content-Type headers.
 * 
 * 3. **CORS & Path Resolution**: Local workers require proper CORS setup and correct path resolution.
 *    External CDN eliminates these configuration headaches.
 * 
 * 4. **Version Pinning**: Using unpkg with exact version ensures consistency across environments.
 *    The .js extension is more universally supported than .mjs.
 * 
 * 5. **Bundle Size**: Keeping worker external reduces main bundle size and improves initial load.
 */
const WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

// ============================================
// COMPONENT
// ============================================

export const PDFReader: React.FC<PDFReaderProps> = ({
    pdfUrl,
    onError,
    onLoadSuccess,
    className = '',
}) => {
    /**
     * CRITICAL: defaultLayoutPlugin() IS A HOOK (uses React hooks internally).
     * 
     * Even though it doesn't start with "use", it contains hooks like useState/useMemo inside.
     * React's Rules of Hooks require:
     * 1. Hooks must be called in the same order every render
     * 2. Hooks cannot be called conditionally or after early returns
     * 
     * SOLUTION: Call defaultLayoutPlugin() as the FIRST line, unconditionally.
     * Do NOT wrap it in useMemo or call it conditionally.
     */
    
    // LINE 1 (CRITICAL): Call the hook FIRST, before any conditional logic
    // This MUST be the first executable line in the component
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        // Configurazione sidebar (thumbnails)
        sidebarTabs: (defaultTabs) => [
            defaultTabs[0], // Thumbnails tab
            // Puoi aggiungere altri tab se necessario
        ],
    });

    // LINE 2: Now we can safely handle conditional logic and early returns
    // All hooks have been called, so React's hook order is preserved
    if (!pdfUrl) {
        return (
            <div className={`h-full w-full flex flex-col items-center justify-center text-white/40 gap-3 ${className}`}>
                <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 bg-violet-500/5 backdrop-blur-xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <svg className="w-8 h-8 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-400">Nessun PDF disponibile</p>
            </div>
        );
    }

    // LINE 3: Main render - all hooks have been called
    return (
        <div className={`h-full w-full pdf-reader-dark ${className}`}>
            <Worker workerUrl={WORKER_URL}>
                <div
                    className="h-full w-full rpv-core__viewer"
                    style={{
                        backgroundColor: '#0a0a0a', // Dark background
                        color: '#ffffff', // Testo chiaro per dark mode
                    }}
                >
                    <Viewer
                        fileUrl={pdfUrl}
                        plugins={[defaultLayoutPluginInstance]}
                        onDocumentLoad={(e) => {
                            console.log('[PDFReader] PDF caricato:', e.doc.numPages, 'pagine');
                            onLoadSuccess?.();
                        }}
                        onDocumentLoadError={(error) => {
                            console.error('[PDFReader] Errore nel caricamento documento:', error);
                            onError?.(error as Error);
                        }}
                    />
                </div>
            </Worker>
            {/* Dark Mode Styles */}
            <style>{`
                .pdf-reader-dark .rpv-core__viewer {
                    background-color: #0a0a0a !important;
                }
                .pdf-reader-dark .rpv-core__inner-pages {
                    background-color: #0a0a0a !important;
                }
                .pdf-reader-dark .rpv-core__page-layer {
                    background-color: #1a1a1a !important;
                }
                .pdf-reader-dark .rpv-core__text-layer {
                    color: transparent !important;
                }
                .pdf-reader-dark .rpv-core__text-layer span {
                    color: transparent !important;
                }
                /* Toolbar dark mode */
                .pdf-reader-dark .rpv-default-layout__toolbar {
                    background-color: #1a1a1a !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .pdf-reader-dark .rpv-default-layout__toolbar button {
                    color: #ffffff !important;
                }
                .pdf-reader-dark .rpv-default-layout__toolbar button:hover {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                }
                /* Sidebar dark mode */
                .pdf-reader-dark .rpv-default-layout__sidebar {
                    background-color: #1a1a1a !important;
                    border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .pdf-reader-dark .rpv-default-layout__sidebar-tabs {
                    background-color: #1a1a1a !important;
                }
                .pdf-reader-dark .rpv-default-layout__sidebar-tab {
                    color: #ffffff !important;
                }
                .pdf-reader-dark .rpv-default-layout__sidebar-tab--active {
                    background-color: rgba(139, 92, 246, 0.2) !important;
                }
            `}</style>
        </div>
    );
};

export default PDFReader;
