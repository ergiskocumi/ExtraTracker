/**
 * 📄 FLUID PDF VIEWER - Visualizzatore PDF "Liquido"
 * 
 * Rendering PDF che si adatta fluidamente alla larghezza del contenitore.
 * 
 * Clean Code Principles:
 * - Single Responsibility: ogni funzione ha una responsabilità chiara
 * - Separation of Concerns: logica separata dalla presentazione
 * - DRY: nessuna duplicazione di codice
 * - Type Safety: tipi espliciti e sicuri
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// ============================================
// CONSTANTS
// ============================================

const PDFJS_VERSION = '3.11.174';
const DEFAULT_CONTAINER_WIDTH = 800;
const MIN_VALID_WIDTH = 0;

const PDF_OPTIONS = {
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
    httpHeaders: {
        'Accept': 'application/pdf',
    },
    withCredentials: true,
} as const;

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
    
    console.log('📦 PDF.js Worker configurato (CDN):', workerUrl);
    console.log('📦 PDF.js Version:', pdfjs.version);
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
    // Se è null o undefined, ritorna null
    if (!url) return null;
    
    // Se è un oggetto, logga un errore e ritorna null
    if (typeof url !== 'string') {
        console.error('❌ normalizePdfUrl: ricevuto un non-stringa:', typeof url, url);
        return null;
    }
    
    // Se è una stringa vuota, ritorna null
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return null;
    
    // Se è già un URL assoluto, ritorna così com'è
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        return trimmedUrl;
    }
    
    // Se inizia con /, è un percorso assoluto dal root
    if (trimmedUrl.startsWith('/')) {
        return trimmedUrl;
    }
    
    // Altrimenti, aggiungi / all'inizio
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
        console.error('❌ Errore nella verifica PDF:', error);
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

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Hook per gestire il resize del contenitore e calcolare la larghezza
 */
const useContainerWidth = (containerRef: React.RefObject<HTMLDivElement | null>): number => {
    const [width, setWidth] = useState<number>(DEFAULT_CONTAINER_WIDTH);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: entryWidth } = entry.contentRect;
                if (entryWidth > MIN_VALID_WIDTH) {
                    setWidth(entryWidth);
                }
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

// ============================================
// SUB-COMPONENTS
// ============================================

interface ErrorStateProps {
    error: string;
    pdfUrl: string | null;
    onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, pdfUrl, onRetry }) => (
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
);

interface LoadingStateProps {
    pdfUrl: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ pdfUrl }) => (
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
);

const EmptyState: React.FC = () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-white/40">
        <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 flex items-center justify-center bg-violet-500/5">
            <svg className="w-8 h-8 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        </div>
        <p className="text-sm">Nessun PDF disponibile</p>
    </div>
);

interface PageLoadingProps {
    pageNumber: number;
}

const PageLoading: React.FC<PageLoadingProps> = ({ pageNumber }) => (
    <div className="flex items-center justify-center p-8 text-white/40">
        <div className="animate-spin w-6 h-6 border-2 border-violet-500/30 border-t-violet-400 rounded-full mr-3" />
        <p className="text-sm">Caricamento pagina {pageNumber}...</p>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const FluidPDFViewer: React.FC<FluidPDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const documentKeyRef = useRef<number>(0);
    
    const containerWidth = useContainerWidth(containerRef);
    const normalizedPdfUrl = useMemo(() => normalizePdfUrl(pdfUrl), [pdfUrl]);

    // Assicura che il worker sia sempre configurato correttamente
    useEffect(() => {
        // Riconfigura il worker ogni volta che il componente viene montato
        // Questo evita problemi con percorsi relativi
        configurePdfWorker();
    }, []);

    // Verifica accessibilità PDF
    useEffect(() => {
        if (!normalizedPdfUrl) {
            setError('URL del PDF non valido');
            setLoading(false);
            return;
        }

        console.log('📄 FluidPDFViewer - Inizializzazione');
        console.log('   PDF URL originale:', pdfUrl);
        console.log('   PDF URL normalizzato:', normalizedPdfUrl);
        console.log('   Worker configurato:', pdfjs.GlobalWorkerOptions.workerSrc);

        verifyPdfAccessibility(normalizedPdfUrl)
            .then(isAccessible => {
                if (isAccessible) {
                    console.log('✅ PDF accessibile e pronto per il caricamento');
                    setError(null);
                } else {
                    console.warn('⚠️ PDF potrebbe non essere accessibile');
                }
            })
            .catch(err => {
                console.error('❌ Errore nella verifica PDF:', err);
            });
    }, [pdfUrl, normalizedPdfUrl]);

    // Handlers
    const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        console.log('✅ PDF caricato con successo:', numPages, 'pagine');
        setNumPages(numPages);
        setLoading(false);
        setError(null);
        setRetryCount(0);
    }, []);

    const handleDocumentLoadError = useCallback((error: Error) => {
        console.error('❌ PDF Load Error:', error);
        console.error('   PDF URL:', normalizedPdfUrl);
        console.error('   Worker:', pdfjs.GlobalWorkerOptions.workerSrc);
        console.error('   Retry count:', retryCount);
        
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

    // Render pagine
    const renderPages = useMemo(() => {
        if (!numPages || numPages <= 0) return null;

        return (
            <div className="w-full py-4 px-2">
                {Array.from({ length: numPages }, (_, index) => (
                    <div key={`page-wrapper-${index + 1}`} className="mb-6 last:mb-0">
                        <Page
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            width={containerWidth > MIN_VALID_WIDTH ? containerWidth - 16 : DEFAULT_CONTAINER_WIDTH}
                            className="block mx-auto shadow-lg shadow-violet-500/10 rounded-sm"
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            loading={<PageLoading pageNumber={index + 1} />}
                        />
                    </div>
                ))}
            </div>
        );
    }, [numPages, containerWidth]);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-zinc-950 to-zinc-900"
            style={{ width: '100%', height: '100%' }}
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
