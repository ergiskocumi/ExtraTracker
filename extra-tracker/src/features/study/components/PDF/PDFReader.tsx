/**
 * 📄 PDF READER - Visualizzatore PDF Professionale
 * 
 * Implementazione basata su @react-pdf-viewer (Phuoc Nguyen)
 * - Selezione testo nativa (text layer abilitato)
 * - Dark/Light mode dinamico
 * - Performance ottimizzate con virtualizzazione
 * - Controlli standard (zoom, ricerca, navigazione)
 * - Pinch-to-zoom nativo con trackpad
 * - Source Traceability: jump to page and highlight text
 * 
 * CRITICAL: defaultLayoutPlugin() is a HOOK internally (uses React hooks).
 * It MUST be called unconditionally as the FIRST line of the component,
 * before any conditional returns.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { searchPlugin } from '@react-pdf-viewer/search';
import localWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Import CSS required (CRITICAL for dark mode and text layer)
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import './pdfReaderTheme.css';

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
    
    /**
     * Callback chiamato quando la ricerca del testo fallisce
     */
    onSearchError?: (message: string) => void;
}

/**
 * Metodi esposti dal PDFReader tramite ref
 * Permettono al parent di controllare navigazione e ricerca
 */
export interface PDFReaderRef {
    /**
     * Salta a una pagina specifica (0-based index)
     */
    jumpToPage: (pageIndex: number) => void;
    
    /**
     * Cerca ed evidenzia un testo nel PDF
     * @param text - Il testo da cercare
     * @param options - Opzioni di ricerca (case sensitive, whole word, etc.)
     */
    highlightText: (text: string, options?: { caseSensitive?: boolean; wholeWords?: boolean }) => void;
    
    /**
     * Salta a una pagina e poi evidenzia un testo
     * @param pageNumber - Numero di pagina (1-based)
     * @param text - Il testo da evidenziare
     */
    jumpToPageAndHighlight: (pageNumber: number, text: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const PDFJS_VERSION = '3.11.174';
const WORKER_STALL_TIMEOUT_MS = 7000;

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
const toAbsoluteUrl = (url: string): string => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === 'undefined') return url;

    try {
        return new URL(url, window.location.origin).toString();
    } catch {
        return url;
    }
};

const LOCAL_WORKER_URL = toAbsoluteUrl(localWorkerUrl);
const CDN_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
const PRIMARY_WORKER_URL = LOCAL_WORKER_URL || CDN_WORKER_URL;
const HAS_WORKER_FALLBACK = PRIMARY_WORKER_URL !== CDN_WORKER_URL;

// ============================================
// HOOKS
// ============================================

/**
 * Hook per rilevare il tema corrente dell'applicazione
 * Legge l'attributo data-theme su document.documentElement
 */
const useTheme = (): 'dark' | 'light' => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        if (typeof window === 'undefined') return 'dark';
        const root = document.documentElement;
        const dataTheme = root.getAttribute('data-theme');
        return (dataTheme === 'light' ? 'light' : 'dark');
    });

    useEffect(() => {
        const root = document.documentElement;
        
        // Observer per cambiamenti all'attributo data-theme
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    const dataTheme = root.getAttribute('data-theme');
                    setTheme(dataTheme === 'light' ? 'light' : 'dark');
                }
            });
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        // Ascolta anche i cambiamenti del media query (per tema 'system')
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            const dataTheme = root.getAttribute('data-theme');
            if (dataTheme === 'system' || !dataTheme) {
                setTheme(mediaQuery.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleMediaChange);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, []);

    return theme;
};

// ============================================
// UI HELPERS
// ============================================

const isWorkerError = (error: Error): boolean => {
    const message = (error.message || '').toLowerCase();
    return (
        message.includes('worker') ||
        message.includes('mime') ||
        message.includes('failed to fetch') ||
        message.includes('load') ||
        message.includes('network')
    );
};

interface PDFLoadingStateProps {
    progress?: number;
}

const PDFLoadingState: React.FC<PDFLoadingStateProps> = ({ progress }) => (
    <div className="h-full w-full flex items-center justify-center text-theme-secondary">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-theme-default bg-theme-surface px-5 py-4 shadow-theme-sm">
            <div className="w-10 h-10 border-2 border-theme-default border-t-primary-500 rounded-full animate-spin" />
            <p className="text-xs sm:text-sm text-theme-secondary">
                {typeof progress === 'number' ? `Caricamento PDF... ${Math.round(progress)}%` : 'Caricamento PDF...'}
            </p>
        </div>
    </div>
);

interface PDFErrorStateProps {
    error: Error;
    onRetry: () => void;
    onSwitchWorker?: () => void;
    canSwitchWorker: boolean;
    onReportError?: (error: Error) => void;
    onViewerError?: () => void;
    pdfUrl?: string | null;
}

const PDFErrorState: React.FC<PDFErrorStateProps> = ({
    error,
    onRetry,
    onSwitchWorker,
    canSwitchWorker,
    onReportError,
    onViewerError,
    pdfUrl,
}) => {
    useEffect(() => {
        onReportError?.(error);
        onViewerError?.();
    }, [error, onReportError, onViewerError]);

    const showWorkerSwitch = canSwitchWorker && isWorkerError(error);

    return (
        <div className="h-full w-full flex items-center justify-center text-theme-secondary px-6">
            <div className="max-w-md text-center space-y-4 rounded-2xl border border-theme-default bg-theme-surface p-6 shadow-theme-md">
                <div className="w-12 h-12 rounded-full border border-theme-default bg-theme-elevated flex items-center justify-center mx-auto">
                    <span className="text-lg">⚠️</span>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-theme-primary">Errore nel caricamento del PDF</p>
                    <p className="text-xs text-theme-secondary break-words">
                        {error.message || 'Errore sconosciuto'}
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={onRetry}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-theme-elevated hover:bg-theme-card border border-theme-default hover:border-theme-strong text-theme-primary transition"
                    >
                        Riprova
                    </button>
                    {showWorkerSwitch && onSwitchWorker && (
                        <button
                            onClick={onSwitchWorker}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/35 hover:border-primary-500/55 text-theme-primary transition"
                        >
                            Usa worker esterno
                        </button>
                    )}
                    {pdfUrl && (
                        <button
                            onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-theme-elevated hover:bg-theme-card border border-theme-default hover:border-theme-strong text-theme-primary transition"
                        >
                            Apri PDF
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// COMPONENT
// ============================================

export const PDFReader = forwardRef<PDFReaderRef, PDFReaderProps>(({
    pdfUrl,
    onError,
    onLoadSuccess,
    className = '',
}, ref) => {
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
    
    // LINE 1 (CRITICAL): Call the hooks FIRST, before any conditional logic
    // This MUST be the first executable line in the component
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        // Configurazione sidebar (thumbnails)
        sidebarTabs: (defaultTabs) => [
            defaultTabs[0], // Thumbnails tab
            // Puoi aggiungere altri tab se necessario
        ],
    });

    // Initialize page navigation and search plugins
    const pageNavigationPluginInstance = pageNavigationPlugin();
    const searchPluginInstance = searchPlugin();

    // LINE 2: Detect theme (hook, so must be called early)
    const isDarkMode = useTheme() === 'dark';
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomTimeoutRef = useRef<number | null>(null);
    const loadingProgressRef = useRef(0);
    const documentLoadedRef = useRef(false);
    const [workerUrl, setWorkerUrl] = useState(PRIMARY_WORKER_URL);
    const [viewerKey, setViewerKey] = useState(0);

    const handleRetry = useCallback(() => {
        loadingProgressRef.current = 0;
        documentLoadedRef.current = false;
        setViewerKey((prev) => prev + 1);
    }, []);

    const handleSwitchWorker = useCallback(() => {
        setWorkerUrl(CDN_WORKER_URL);
        loadingProgressRef.current = 0;
        documentLoadedRef.current = false;
        setViewerKey((prev) => prev + 1);
    }, []);

    const canSwitchWorker = HAS_WORKER_FALLBACK && workerUrl !== CDN_WORKER_URL;
    const normalizedPdfUrl = useMemo(() => {
        if (!pdfUrl || typeof pdfUrl !== 'string') return null;
        const trimmed = pdfUrl.trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('/')) return trimmed;
        return `/${trimmed}`;
    }, [pdfUrl]);

    // Reset tracking state when a new PDF URL arrives
    useEffect(() => {
        loadingProgressRef.current = 0;
        documentLoadedRef.current = false;
    }, [normalizedPdfUrl]);

    // Auto-fallback: if loader is stuck near 0%, switch to CDN worker automatically
    useEffect(() => {
        if (!normalizedPdfUrl) return;
        if (!HAS_WORKER_FALLBACK || workerUrl === CDN_WORKER_URL) return;

        const timeoutId = window.setTimeout(() => {
            const stalledAtZero = loadingProgressRef.current <= 1;
            if (!stalledAtZero || documentLoadedRef.current) return;

            if (import.meta.env.DEV) {
                console.warn('[PDFReader] Loader bloccato a 0%, switch automatico a worker CDN');
            }

            documentLoadedRef.current = false;
            setWorkerUrl(CDN_WORKER_URL);
            setViewerKey((prev) => prev + 1);
        }, WORKER_STALL_TIMEOUT_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [normalizedPdfUrl, workerUrl]);

    const renderLoader = useCallback((percentages: number) => {
        if (typeof percentages === 'number') {
            loadingProgressRef.current = percentages;
        }
        return <PDFLoadingState progress={typeof percentages === 'number' ? percentages : undefined} />;
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        jumpToPage: (pageIndex: number) => {
            try {
                const jumpToPage = pageNavigationPluginInstance.jumpToPage;
                if (typeof jumpToPage === 'function') {
                    jumpToPage(pageIndex);
                } else {
                    console.warn('[PDFReader] jumpToPage method not available');
                }
            } catch (err) {
                console.error('[PDFReader] Error jumping to page:', err);
            }
        },
        highlightText: (text: string) => {
            try {
                const plugin = searchPluginInstance as any;

                // Clear previous highlights
                if (typeof plugin.clearHighlights === 'function') {
                    plugin.clearHighlights();
                }

                const normalizedText = text.replace(/\s+/g, ' ').trim();
                if (!normalizedText) return;

                // Try highlight method
                if (typeof plugin.highlight === 'function') {
                    plugin.highlight(normalizedText);
                }
            } catch (err) {
                console.error('[PDFReader] Error highlighting text:', err);
            }
        },
        jumpToPageAndHighlight: (pageNumber: number, text: string) => {
            try {
                // Jump to page first (convert 1-based to 0-based)
                const pageIndex = Math.max(0, pageNumber - 1);
                const jumpToPage = pageNavigationPluginInstance.jumpToPage;
                if (typeof jumpToPage === 'function') {
                    jumpToPage(pageIndex);
                }

                // Normalize and get first part of text
                const searchText = text
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 50)
                    .trim();

                if (!searchText || searchText.length < 5) return;

                // Delay to allow page to render, then highlight
                setTimeout(() => {
                    try {
                        const plugin = searchPluginInstance as any;

                        // Clear previous highlights
                        if (typeof plugin.clearHighlights === 'function') {
                            plugin.clearHighlights();
                        }

                        // Use highlight with string (simpler API)
                        if (typeof plugin.highlight === 'function') {
                            plugin.highlight(searchText);
                        }
                    } catch {
                        // Silent fail
                    }
                }, 500);
            } catch (err) {
                console.error('[PDFReader] Error in jumpToPageAndHighlight:', err);
            }
        },
    }), [pageNavigationPluginInstance, searchPluginInstance]);

    // LINE 3: Pinch-to-Zoom handler (trackpad)
    useEffect(() => {
        if (!normalizedPdfUrl || !containerRef.current) return;

        const container = containerRef.current;
        let lastWheelTime = 0;
        let currentScale = 1;

        const handleWheel = (e: WheelEvent) => {
            // Detect pinch gesture (Ctrl/Cmd + wheel on trackpad)
            // On macOS trackpad, pinch gesture sends wheel events with ctrlKey=true
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();

                // Debounce: throttle to ~60fps to prevent excessive renders
                const now = Date.now();
                if (now - lastWheelTime < 16) return;
                lastWheelTime = now;

                // Get zoom plugin from defaultLayoutPlugin instance
                // The plugin structure: defaultLayoutPluginInstance.toolbarPlugin.zoomPlugin
                const toolbarPlugin = (defaultLayoutPluginInstance as any).toolbarPlugin;
                const zoomPlugin = toolbarPlugin?.zoomPlugin;
                
                if (!zoomPlugin) {
                    // Fallback: try direct access
                    const directZoom = (defaultLayoutPluginInstance as any).zoomPlugin;
                    if (!directZoom) return;
                    
                    // Use direct zoom plugin
                    const delta = e.deltaY;
                    const zoomStep = 0.05;
                    const scaleDelta = delta < 0 ? zoomStep : -zoomStep;
                    currentScale = Math.max(0.5, Math.min(3.0, currentScale + scaleDelta));
                    
                    if (zoomTimeoutRef.current) {
                        clearTimeout(zoomTimeoutRef.current);
                    }
                    
                    zoomTimeoutRef.current = setTimeout(() => {
                        try {
                            if (typeof directZoom.zoomTo === 'function') {
                                directZoom.zoomTo(currentScale);
                            }
                        } catch (err) {
                            console.warn('[PDFReader] Error applying zoom:', err);
                        }
                    }, 10);
                    return;
                }

                // Calculate zoom delta
                // Negative deltaY = zoom in (pinch out), positive = zoom out (pinch in)
                const delta = e.deltaY;
                const zoomStep = 0.05; // Smaller steps for smoother zoom
                
                // Get current scale if available
                try {
                    if (typeof zoomPlugin.getCurrentScale === 'function') {
                        const scale = zoomPlugin.getCurrentScale();
                        if (typeof scale === 'number') {
                            currentScale = scale;
                        }
                    }
                } catch {
                    // Fallback if getCurrentScale is not available
                }
                
                // Calculate new scale
                const scaleDelta = delta < 0 ? zoomStep : -zoomStep;
                const newScale = Math.max(0.5, Math.min(3.0, currentScale + scaleDelta));
                currentScale = newScale;

                // Apply zoom with debounce to prevent flashing
                if (zoomTimeoutRef.current) {
                    clearTimeout(zoomTimeoutRef.current);
                }

                zoomTimeoutRef.current = setTimeout(() => {
                    try {
                        // Use zoomTo method if available
                        if (typeof zoomPlugin.zoomTo === 'function') {
                            zoomPlugin.zoomTo(newScale);
                        } else if (typeof zoomPlugin.zoom === 'function') {
                            // Alternative API
                            zoomPlugin.zoom(newScale);
                        }
                    } catch (err) {
                        console.warn('[PDFReader] Error applying zoom:', err);
                    }
                }, 10);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
            if (zoomTimeoutRef.current) {
                clearTimeout(zoomTimeoutRef.current);
            }
        };
    }, [normalizedPdfUrl, defaultLayoutPluginInstance]);

    // LINE 4: Now we can safely handle conditional logic and early returns
    // All hooks have been called, so React's hook order is preserved
    if (!normalizedPdfUrl) {
        return (
            <div className={`h-full w-full flex flex-col items-center justify-center text-theme-secondary gap-3 ${className}`}>
                <div className="w-16 h-16 rounded-full border-2 border-primary-500/25 bg-primary-500/8 backdrop-blur-xl flex items-center justify-center shadow-theme-sm">
                    <svg className="w-8 h-8 text-primary-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-sm text-theme-secondary">Nessun PDF disponibile</p>
            </div>
        );
    }

    // LINE 5: Main render - all hooks have been called
    const themeClass = isDarkMode ? 'pdf-reader-dark' : 'pdf-reader-light';
    const viewerBackground = isDarkMode ? '#0f1220' : '#f8fafc';

    return (
        <div 
            ref={containerRef}
            className={`h-full w-full pdf-reader-shell ${themeClass} ${className}`}
        >
            <Worker workerUrl={workerUrl}>
                <div
                    className="h-full w-full rpv-core__viewer"
                    style={{
                        backgroundColor: viewerBackground,
                        color: isDarkMode ? '#ffffff' : '#000000',
                    }}
                >
                    <Viewer
                        key={`pdf-viewer-${viewerKey}`}
                        fileUrl={normalizedPdfUrl}
                        plugins={[
                            defaultLayoutPluginInstance,
                            pageNavigationPluginInstance,
                            searchPluginInstance,
                        ]}
                        theme={isDarkMode ? 'dark' : undefined}
                        withCredentials={true}
                        characterMap={{
                            isCompressed: true,
                            url: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
                        }}
                        renderLoader={renderLoader}
                        renderError={(error) => (
                            <PDFErrorState
                                error={error as Error}
                                onRetry={handleRetry}
                                onSwitchWorker={canSwitchWorker ? handleSwitchWorker : undefined}
                                canSwitchWorker={canSwitchWorker}
                                onReportError={onError}
                                onViewerError={() => {
                                    documentLoadedRef.current = false;
                                }}
                                pdfUrl={normalizedPdfUrl}
                            />
                        )}
                        onDocumentLoad={(e) => {
                            loadingProgressRef.current = 100;
                            documentLoadedRef.current = true;
                            if (import.meta.env.DEV) {
                                console.log('[PDFReader] PDF caricato:', e.doc.numPages, 'pagine');
                            }
                            onLoadSuccess?.();
                        }}
                    />
                </div>
            </Worker>
        </div>
    );
});

PDFReader.displayName = 'PDFReader';

export default PDFReader;
