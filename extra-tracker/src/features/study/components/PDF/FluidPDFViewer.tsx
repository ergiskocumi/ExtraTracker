/**
 * 📄 FLUID PDF VIEWER - Visualizzatore PDF "Liquido" (Ottimizzato)
 * 
 * Rendering PDF che si adatta fluidamente alla larghezza del contenitore.
 * 
 * Performance Optimizations:
 * - Lazy loading delle pagine PDF (solo quelle visibili)
 * - Memoization dei componenti per evitare re-render inutili
 * - Intersection Observer per caricare pagine on-demand
 * - Debounced resize observer
 * - Text layer disabilitato per ridurre carico worker
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// ============================================
// CONSTANTS
// ============================================

const PDFJS_VERSION = '3.11.174';
const DEFAULT_CONTAINER_WIDTH = 800;
const MIN_VALID_WIDTH = 0;
const RESIZE_DEBOUNCE_MS = 150; // Debounce per resize observer

// ============================================
// WORKER CONFIGURATION
// ============================================

/**
 * Configura il worker PDF.js
 * Usa sempre CDN per evitare problemi con MIME type, CORS e percorsi relativi
 * IMPORTANTE: Forza sempre la configurazione per evitare percorsi relativi errati
 */
const configurePdfWorker = (): void => {
    if (typeof window === 'undefined') return;
    
    // Forza SEMPRE l'uso del CDN (non controllare se già configurato)
    // Questo evita problemi con percorsi relativi quando si naviga in route diverse
    const workerVersion = pdfjs.version || PDFJS_VERSION;
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`;
    
    // Imposta sempre, anche se già configurato (per evitare percorsi relativi)
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    
};

// Configura il worker una sola volta all'avvio
configurePdfWorker();

// ============================================
// TYPES
// ============================================

interface FluidPDFViewerProps {
    pdfUrl: string;
}

type ErrorType = 'worker' | 'invalid-pdf' | 'network' | 'unknown';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalizza l'URL del PDF per assicurarsi che sia assoluto e accessibile
 * Gestisce anche casi in cui viene passato un oggetto per errore
 */
const normalizePdfUrl = (url: string | null | undefined | unknown): string | null => {
    if (!url) return null;
    if (typeof url !== 'string') {
        if (import.meta.env.DEV) {
            console.error('❌ normalizePdfUrl: ricevuto un non-stringa:', typeof url, url);
        }
        return null;
    }
    
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return null;
    
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        return trimmedUrl;
    }
    
    if (trimmedUrl.startsWith('/')) {
        return trimmedUrl;
    }
    
    return `/${trimmedUrl}`;
};

/**
 * Verifica che l'URL del PDF sia accessibile
 */
const verifyPdfAccessibility = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            credentials: 'include',
        });
        const contentType = response.headers.get('content-type');
        return response.ok && (contentType?.includes('application/pdf') ?? false);
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('❌ Errore nella verifica PDF:', error);
        }
        return false;
    }
};

/**
 * Classifica il tipo di errore per fornire messaggi più specifici
 */
const classifyError = (error: Error): ErrorType => {
    const message = error.message.toLowerCase();
    
    if (message.includes('worker') || message.includes('failed to fetch') || message.includes('mime type')) {
        return 'worker';
    }
    if (message.includes('invalid pdf')) {
        return 'invalid-pdf';
    }
    if (message.includes('network') || message.includes('fetch')) {
        return 'network';
    }
    
    return 'unknown';
};

/**
 * Genera un messaggio di errore user-friendly basato sul tipo
 */
const getErrorMessage = (error: Error, errorType: ErrorType): string => {
    const errorMessages: Record<ErrorType, string> = {
        'worker': 'Errore nel caricamento del worker PDF. Il documento potrebbe non essere interattivo. Riprova o verifica la connessione.',
        'invalid-pdf': 'Il file PDF non è valido o è corrotto.',
        'network': 'Errore di connessione. Verifica la tua connessione internet.',
        'unknown': `Errore nel caricamento del PDF: ${error.message || 'Errore sconosciuto'}`,
    };
    
    return errorMessages[errorType];
};

/**
 * Debounce function per ottimizzare resize observer
 */
const debounce = <T extends (...args: any[]) => void>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Hook per gestire il resize del contenitore con debounce
 */
const useContainerWidth = (containerRef: React.RefObject<HTMLDivElement | null>): number => {
    const [width, setWidth] = useState<number>(DEFAULT_CONTAINER_WIDTH);

    useEffect(() => {
        if (!containerRef.current) return;

        const debouncedSetWidth = debounce((newWidth: number) => {
            if (newWidth > MIN_VALID_WIDTH) {
                setWidth(newWidth);
            }
        }, RESIZE_DEBOUNCE_MS);

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: entryWidth } = entry.contentRect;
                debouncedSetWidth(entryWidth);
            }
        });

        resizeObserver.observe(containerRef.current);

        // Imposta la width iniziale
        const initialWidth = containerRef.current.clientWidth;
        if (initialWidth > MIN_VALID_WIDTH) {
            setWidth(initialWidth);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef]);

    return width;
};

/**
 * Hook per gestire lo scroll e determinare quali pagine renderizzare
 * Carica le prime pagine immediatamente, poi carica le altre durante lo scroll
 */
const usePageVisibility = (
    numPages: number | null,
    containerRef: React.RefObject<HTMLDivElement | null>
): Set<number> => {
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!numPages) return;

        // Carica sempre le prime 5 pagine immediatamente
        const initialPages = new Set<number>();
        for (let i = 1; i <= Math.min(5, numPages); i++) {
            initialPages.add(i);
        }
        setVisiblePages(initialPages);

        if (!containerRef.current) return;

        // Handler per scroll - carica pagine man mano che si scrolla
        const handleScroll = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const scrollTop = container.scrollTop;

            // Stima quale pagina è visibile basandosi sulla posizione dello scroll
            // Assumendo che ogni pagina abbia circa 1000px di altezza (approssimativo)
            const estimatedPageHeight = 1000;
            const currentPage = Math.floor(scrollTop / estimatedPageHeight) + 1;
            
            setVisiblePages(prev => {
                const newVisiblePages = new Set(prev);
                
                // Carica la pagina corrente e quelle vicine (pre-loading)
                for (let i = Math.max(1, currentPage - 2); i <= Math.min(numPages, currentPage + 5); i++) {
                    newVisiblePages.add(i);
                }

                return newVisiblePages;
            });
        };

        // Throttle scroll handler
        let ticking = false;
        const throttledHandleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        containerRef.current.addEventListener('scroll', throttledHandleScroll, { passive: true });
        handleScroll(); // Chiama subito per caricare le prime pagine

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('scroll', throttledHandleScroll);
            }
        };
    }, [numPages, containerRef]);

    return visiblePages;
};

// ============================================
// SUB-COMPONENTS (Memoized)
// ============================================

interface ErrorStateProps {
    error: string;
    pdfUrl: string | null;
    onRetry: () => void;
}

const ErrorState = memo<ErrorStateProps>(({ error, pdfUrl, onRetry }) => (
    <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 max-w-md">
            <div className="w-16 h-16 rounded-full border-2 border-red-500/30 flex items-center justify-center bg-red-500/10">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p className="text-lg font-semibold text-red-400 text-center">{error}</p>
            <p className="text-sm text-white/40 text-center break-all">
                URL: {pdfUrl || 'N/A'}
            </p>
            <button
                onClick={onRetry}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 rounded-xl text-sm transition-all font-medium text-red-300 hover:text-red-200 shadow-lg shadow-red-500/10"
            >
                Riprova
            </button>
        </div>
    </div>
));

ErrorState.displayName = 'ErrorState';

interface LoadingStateProps {
    pdfUrl: string;
}

const LoadingState = memo<LoadingStateProps>(({ pdfUrl }) => (
    <div className="h-full w-full flex flex-col items-center justify-center text-white/40">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="animate-spin w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-400 rounded-full" />
                <div 
                    className="absolute inset-0 animate-spin w-12 h-12 border-[3px] border-transparent border-r-violet-600/40 rounded-full" 
                    style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} 
                />
            </div>
            <div className="flex flex-col items-center gap-2">
                <p className="text-base font-medium text-white/60">Caricamento PDF...</p>
                <p className="text-xs text-white/30 text-center max-w-md break-all px-4">
                    {pdfUrl}
                </p>
            </div>
        </div>
    </div>
));

LoadingState.displayName = 'LoadingState';

const EmptyState = memo(() => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-white/40">
        <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 flex items-center justify-center bg-violet-500/5">
            <svg className="w-8 h-8 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        </div>
        <p className="text-sm">Nessun PDF disponibile</p>
    </div>
));

EmptyState.displayName = 'EmptyState';

interface PageLoadingProps {
    pageNumber: number;
}

const PageLoading = memo<PageLoadingProps>(({ pageNumber }) => (
    <div className="flex items-center justify-center p-8 text-white/40">
        <div className="animate-spin w-6 h-6 border-2 border-violet-500/30 border-t-violet-400 rounded-full mr-3" />
        <p className="text-sm">Caricamento pagina {pageNumber}...</p>
    </div>
));

PageLoading.displayName = 'PageLoading';

interface PDFPageProps {
    pageNumber: number;
    width: number;
    isVisible: boolean;
}

const PDFPage = memo<PDFPageProps>(({ pageNumber, width, isVisible }) => {
    if (!isVisible) {
        // Placeholder leggero per pagine non ancora visibili
        return (
            <div 
                data-page-number={pageNumber}
                className="mb-6 last:mb-0 flex items-center justify-center"
                style={{ 
                    height: Math.max(400, width * 1.414), // Aspect ratio approssimativo A4
                    minHeight: 400,
                }}
            >
                <div className="text-white/20 text-sm">Pagina {pageNumber}</div>
            </div>
        );
    }

    return (
        <div key={`page-wrapper-${pageNumber}`} data-page-number={pageNumber} className="mb-6 last:mb-0">
            <Page
                key={`page_${pageNumber}`}
                pageNumber={pageNumber}
                width={width > MIN_VALID_WIDTH ? width - 16 : DEFAULT_CONTAINER_WIDTH}
                className="block mx-auto shadow-lg shadow-violet-500/10 rounded-sm"
                renderTextLayer={false}
                renderAnnotationLayer={true}
                loading={<PageLoading pageNumber={pageNumber} />}
            />
        </div>
    );
});

PDFPage.displayName = 'PDFPage';

// ============================================
// MAIN COMPONENT
// ============================================

const PDF_OPTIONS = {
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
    httpHeaders: {
        'Accept': 'application/pdf',
    },
    withCredentials: true,
} as const;

export const FluidPDFViewer: React.FC<FluidPDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const documentKeyRef = useRef<number>(0);
    
    const containerWidth = useContainerWidth(containerRef);
    const normalizedPdfUrl = useMemo(() => {
        if (typeof pdfUrl !== 'string') {
            if (import.meta.env.DEV) {
                console.error('❌ FluidPDFViewer: pdfUrl non è una stringa:', typeof pdfUrl, pdfUrl);
            }
            return null;
        }
        return normalizePdfUrl(pdfUrl);
    }, [pdfUrl]);

    // Lazy loading delle pagine visibili
    const visiblePages = usePageVisibility(numPages, containerRef);

    // Assicura che il worker sia sempre configurato correttamente
    useEffect(() => {
        configurePdfWorker();
    }, []);

    // Verifica accessibilità PDF (solo in dev)
    useEffect(() => {
        if (!normalizedPdfUrl || !import.meta.env.DEV) return;

        verifyPdfAccessibility(normalizedPdfUrl)
            .then(isAccessible => {
                if (!isAccessible) {
                    console.warn('⚠️ PDF potrebbe non essere accessibile');
                }
            })
            .catch(() => {
                // Silently fail in production
            });
    }, [normalizedPdfUrl]);

    // Handlers
    const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
        setRetryCount(0);
    }, []);

    const handleDocumentLoadError = useCallback((error: Error) => {
        if (import.meta.env.DEV) {
            console.error('❌ PDF Load Error:', error);
            console.error('   PDF URL:', normalizedPdfUrl);
            console.error('   Worker:', pdfjs.GlobalWorkerOptions.workerSrc);
            console.error('   Retry count:', retryCount);
        }
        
        const errorType = classifyError(error);
        const errorMessage = getErrorMessage(error, errorType);
        
        setError(errorMessage);
        setLoading(false);
    }, [normalizedPdfUrl, retryCount]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setError(null);
        setLoading(true);
    }, []);

    // Reset quando cambia l'URL o si fa retry
    useEffect(() => {
        if (normalizedPdfUrl) {
            setLoading(true);
            setError(null);
            setNumPages(null);
            documentKeyRef.current += 1;
        }
    }, [normalizedPdfUrl, retryCount]);

    // Render pagine con lazy loading
    const renderPages = useMemo(() => {
        if (!numPages || numPages <= 0) return null;

        return (
            <div className="w-full py-4 px-2">
                {Array.from({ length: numPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                        <PDFPage
                            key={`page-${pageNumber}`}
                            pageNumber={pageNumber}
                            width={containerWidth > MIN_VALID_WIDTH ? containerWidth - 16 : DEFAULT_CONTAINER_WIDTH}
                            isVisible={visiblePages.has(pageNumber)}
                        />
                    );
                })}
            </div>
        );
    }, [numPages, containerWidth, visiblePages]);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-pdf"
            style={{ 
                width: '100%', 
                height: '100%',
                background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%)',
            }}
        >
            {error && (
                <ErrorState 
                    error={error} 
                    pdfUrl={normalizedPdfUrl || pdfUrl} 
                    onRetry={handleRetry} 
                />
            )}

            {loading && !error && normalizedPdfUrl && (
                <LoadingState pdfUrl={normalizedPdfUrl} />
            )}

            {!normalizedPdfUrl && !loading && <EmptyState />}

            {normalizedPdfUrl && !error && (
                <Document
                    key={documentKeyRef.current}
                    file={normalizedPdfUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                    loading={null}
                    className="w-full"
                    options={PDF_OPTIONS}
                >
                    {renderPages}
                </Document>
            )}
        </div>
    );
};
