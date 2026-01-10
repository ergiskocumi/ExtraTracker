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
const WORKER_PATH = '/pdf.worker.min.mjs';
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

const configurePdfWorker = (): void => {
    if (typeof window === 'undefined') return;
    
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_PATH;
        console.log('📦 PDF.js Worker configurato (locale):', WORKER_PATH);
        console.log('📦 PDF.js Version:', pdfjs.version);
    }
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
 */
const normalizePdfUrl = (url: string | null | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    if (url.startsWith('/')) {
        return url;
    }
    
    return `/${url}`;
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
    
    if (message.includes('worker') || message.includes('failed to fetch')) {
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
        'worker': 'Errore nel caricamento del worker PDF. Riprova o verifica la connessione.',
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
    <div className="h-full w-full flex flex-col items-center justify-center text-red-400 p-8">
        <p className="text-lg font-semibold mb-2 text-center">{error}</p>
        <p className="text-sm text-white/40 mt-2 text-center max-w-md break-all">
            URL: {pdfUrl || 'N/A'}
        </p>
        <button
            onClick={onRetry}
            className="mt-4 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors font-medium"
        >
            Riprova
        </button>
    </div>
);

interface LoadingStateProps {
    pdfUrl: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ pdfUrl }) => (
    <div className="h-full w-full flex flex-col items-center justify-center text-white/40">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mb-4" />
        <p>Caricamento PDF...</p>
        <p className="text-xs mt-2 text-white/20 text-center max-w-md break-all">
            {pdfUrl}
        </p>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center text-white/40">
        <p>Nessun PDF disponibile</p>
    </div>
);

interface PageLoadingProps {
    pageNumber: number;
}

const PageLoading: React.FC<PageLoadingProps> = ({ pageNumber }) => (
    <div className="flex items-center justify-center p-8 text-white/40">
        <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full mr-3" />
        <p>Caricamento pagina {pageNumber}...</p>
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
            <div className="w-full">
                {Array.from({ length: numPages }, (_, index) => (
                    <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={containerWidth > MIN_VALID_WIDTH ? containerWidth : DEFAULT_CONTAINER_WIDTH}
                        className="block mb-4"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={<PageLoading pageNumber={index + 1} />}
                    />
                ))}
            </div>
        );
    }, [numPages, containerWidth]);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#1a1a1a]"
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
