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

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { searchPlugin } from '@react-pdf-viewer/search';

// Import CSS required (CRITICAL for dark mode and text layer)
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

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
// COMPONENT
// ============================================

export const PDFReader = forwardRef<PDFReaderRef, PDFReaderProps>(({
    pdfUrl,
    onError,
    onLoadSuccess,
    className = '',
    onSearchError,
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
        highlightText: (text: string, options?: { caseSensitive?: boolean; wholeWords?: boolean }) => {
            try {
                // The search plugin API: use keyword property and clearHighlights/highlight methods
                const plugin = searchPluginInstance as any;
                
                // Clear previous highlights
                if (typeof plugin.clearHighlights === 'function') {
                    plugin.clearHighlights();
                }
                
                // Normalize text for robust search (handle whitespace differences)
                const normalizeText = (str: string): string => {
                    return str
                        .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with single space
                        .replace(/\n+/g, ' ') // Replace newlines with space
                        .replace(/\r+/g, ' ') // Replace carriage returns with space
                        .replace(/\t+/g, ' ') // Replace tabs with space
                        .trim();
                };
                
                const normalizedText = normalizeText(text);
                
                // Set keyword (this triggers the search automatically in some versions)
                // For @react-pdf-viewer/search, we need to use the keyword setter
                if (plugin.keyword !== normalizedText) {
                    if (typeof plugin.setKeyword === 'function') {
                        plugin.setKeyword(normalizedText);
                    } else if (plugin.keyword !== undefined) {
                        plugin.keyword = normalizedText;
                    }
                }
                
                // Set match case and whole words - use flexible options for robust search
                // Default: case insensitive, not whole words (to handle partial matches)
                const matchCase = options?.caseSensitive ?? false;
                const wholeWords = options?.wholeWords ?? false;
                
                if (typeof plugin.setMatchCase === 'function') {
                    plugin.setMatchCase(matchCase);
                } else if (plugin.matchCase !== undefined) {
                    plugin.matchCase = matchCase;
                }
                
                if (typeof plugin.setWholeWords === 'function') {
                    plugin.setWholeWords(wholeWords);
                } else if (plugin.wholeWords !== undefined) {
                    plugin.wholeWords = wholeWords;
                }
                
                // Trigger highlight/search
                if (typeof plugin.highlight === 'function') {
                    plugin.highlight(normalizedText);
                } else if (typeof plugin.search === 'function') {
                    plugin.search(normalizedText);
                }
            } catch (err) {
                console.error('[PDFReader] Error highlighting text:', err);
                onSearchError?.('Errore durante la ricerca del testo');
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
                
                // Normalize text for robust search
                const normalizeText = (str: string): string => {
                    return str
                        .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with single space
                        .replace(/\n+/g, ' ') // Replace newlines with space
                        .replace(/\r+/g, ' ') // Replace carriage returns with space
                        .replace(/\t+/g, ' ') // Replace tabs with space
                        .trim();
                };
                
                const normalizedText = normalizeText(text);
                
                // Strategy: Try multiple search approaches with increasing flexibility
                let fallbackTimeout: number | null = null;
                const attemptHighlight = (searchText: string, attempt: number = 0) => {
                    // Clear any pending fallback
                    if (fallbackTimeout) {
                        clearTimeout(fallbackTimeout);
                        fallbackTimeout = null;
                    }
                    
                    try {
                        const plugin = searchPluginInstance as any;
                        
                        // Clear previous highlights
                        if (typeof plugin.clearHighlights === 'function') {
                            plugin.clearHighlights();
                        }
                        
                        // Set keyword
                        if (typeof plugin.setKeyword === 'function') {
                            plugin.setKeyword(searchText);
                        } else if (plugin.keyword !== undefined) {
                            plugin.keyword = searchText;
                        }
                        
                        // Set flexible search options (case insensitive, not whole words)
                        if (typeof plugin.setMatchCase === 'function') {
                            plugin.setMatchCase(false);
                        } else if (plugin.matchCase !== undefined) {
                            plugin.matchCase = false;
                        }
                        
                        if (typeof plugin.setWholeWords === 'function') {
                            plugin.setWholeWords(false);
                        } else if (plugin.wholeWords !== undefined) {
                            plugin.wholeWords = false;
                        }
                        
                        // Trigger highlight/search
                        if (typeof plugin.highlight === 'function') {
                            plugin.highlight(searchText);
                        } else if (typeof plugin.search === 'function') {
                            plugin.search(searchText);
                        }
                        
                        // Schedule fallback only if this is the first attempt and text is long enough
                        // The fallback will try progressively shorter substrings
                        if (attempt === 0 && searchText.length > 40) {
                            fallbackTimeout = setTimeout(() => {
                                // Try with first 30 chars + last 30 chars (handles line breaks)
                                const firstPart = searchText.substring(0, 30).trim();
                                const lastPart = searchText.substring(searchText.length - 30).trim();
                                const fallbackText = `${firstPart} ${lastPart}`;
                                attemptHighlight(fallbackText, 1);
                            }, 1500); // Give initial search time to work
                        } else if (attempt === 1 && searchText.length > 20) {
                            fallbackTimeout = setTimeout(() => {
                                // Try with just first 20 chars
                                const shortText = searchText.substring(0, 20).trim();
                                attemptHighlight(shortText, 2);
                            }, 1500);
                        } else if (attempt === 2) {
                            // Final fallback - notify user after a delay
                            fallbackTimeout = setTimeout(() => {
                                onSearchError?.('Impossibile localizzare la frase esatta nel testo');
                            }, 2000);
                        }
                    } catch (err) {
                        console.error(`[PDFReader] Error highlighting (attempt ${attempt}):`, err);
                        if (attempt === 0 && normalizedText.length > 40) {
                            // Try fallback on first error
                            const firstPart = normalizedText.substring(0, 30).trim();
                            const lastPart = normalizedText.substring(normalizedText.length - 30).trim();
                            const fallbackText = `${firstPart} ${lastPart}`;
                            setTimeout(() => attemptHighlight(fallbackText, 1), 300);
                        } else if (attempt === 1 && normalizedText.length > 20) {
                            const shortText = normalizedText.substring(0, 20).trim();
                            setTimeout(() => attemptHighlight(shortText, 2), 300);
                        } else {
                            onSearchError?.('Impossibile localizzare la frase esatta nel testo');
                        }
                    }
                };
                
                // Wait for page to render, then attempt highlight
                setTimeout(() => {
                    attemptHighlight(normalizedText, 0);
                }, 600); // Increased delay to ensure page is fully rendered
            } catch (err) {
                console.error('[PDFReader] Error in jumpToPageAndHighlight:', err);
                onSearchError?.('Errore durante la navigazione al testo');
            }
        },
    }), [pageNavigationPluginInstance, searchPluginInstance]);

    // LINE 3: Pinch-to-Zoom handler (trackpad)
    useEffect(() => {
        if (!pdfUrl || !containerRef.current) return;

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
                } catch (err) {
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
    }, [pdfUrl, defaultLayoutPluginInstance]);

    // LINE 4: Now we can safely handle conditional logic and early returns
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

    // LINE 5: Main render - all hooks have been called
    const themeClass = isDarkMode ? 'pdf-reader-dark' : 'pdf-reader-light';
    const viewerBackground = isDarkMode ? '#0a0a0a' : '#ffffff';
    const pageBackground = isDarkMode ? '#1a1a1a' : '#f5f5f5';

    return (
        <div 
            ref={containerRef}
            className={`h-full w-full ${themeClass} ${className}`}
        >
            <Worker workerUrl={WORKER_URL}>
                <div
                    className="h-full w-full rpv-core__viewer"
                    style={{
                        backgroundColor: viewerBackground,
                        color: isDarkMode ? '#ffffff' : '#000000',
                    }}
                >
                    <Viewer
                        fileUrl={pdfUrl}
                        plugins={[
                            defaultLayoutPluginInstance,
                            pageNavigationPluginInstance,
                            searchPluginInstance,
                        ]}
                        theme={isDarkMode ? 'dark' : undefined}
                        onDocumentLoad={(e) => {
                            console.log('[PDFReader] PDF caricato:', e.doc.numPages, 'pagine');
                            onLoadSuccess?.();
                        }}
                    />
                </div>
            </Worker>
            {/* Dynamic Theme Styles */}
            <style>{`
                /* Dark Mode Styles */
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
                .pdf-reader-dark .rpv-core__icon {
                    color: #ffffff !important;
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

                /* Light Mode Styles */
                .pdf-reader-light .rpv-core__viewer {
                    background-color: #ffffff !important;
                }
                .pdf-reader-light .rpv-core__inner-pages {
                    background-color: #ffffff !important;
                }
                .pdf-reader-light .rpv-core__page-layer {
                    background-color: #f5f5f5 !important;
                }
                .pdf-reader-light .rpv-core__text-layer {
                    color: transparent !important;
                }
                .pdf-reader-light .rpv-core__text-layer span {
                    color: transparent !important;
                }
                /* Toolbar light mode - CRITICAL: icons must be dark */
                .pdf-reader-light .rpv-default-layout__toolbar {
                    background-color: #f9fafb !important;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
                }
                .pdf-reader-light .rpv-default-layout__toolbar button {
                    color: #1f2937 !important;
                }
                .pdf-reader-light .rpv-default-layout__toolbar button:hover {
                    background-color: rgba(0, 0, 0, 0.05) !important;
                }
                .pdf-reader-light .rpv-core__icon {
                    color: #1f2937 !important;
                }
                .pdf-reader-light .rpv-core__icon svg {
                    fill: #1f2937 !important;
                    stroke: #1f2937 !important;
                }
                /* Sidebar light mode */
                .pdf-reader-light .rpv-default-layout__sidebar {
                    background-color: #f9fafb !important;
                    border-right: 1px solid rgba(0, 0, 0, 0.1) !important;
                }
                .pdf-reader-light .rpv-default-layout__sidebar-tabs {
                    background-color: #f9fafb !important;
                }
                .pdf-reader-light .rpv-default-layout__sidebar-tab {
                    color: #1f2937 !important;
                }
                .pdf-reader-light .rpv-default-layout__sidebar-tab--active {
                    background-color: rgba(139, 92, 246, 0.1) !important;
                }

                /* Fix Black Flash on Zoom - White background during canvas redraw */
                .rpv-core__page-layer {
                    background-color: var(--page-bg, #f5f5f5) !important;
                    transition: background-color 0.1s ease;
                }
                .pdf-reader-dark .rpv-core__page-layer {
                    --page-bg: #1a1a1a;
                }
                .pdf-reader-light .rpv-core__page-layer {
                    --page-bg: #f5f5f5;
                }
            `}</style>
        </div>
    );
});

PDFReader.displayName = 'PDFReader';

export default PDFReader;
