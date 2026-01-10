/**
 * 📄 FLUID PDF VIEWER - Visualizzatore PDF "Liquido" (Refactored)
 * 
 * Nuova logica di caricamento PDF con worker locale e gestione errori robusta.
 * 
 * Architettura:
 * - Worker configurato usando il pacchetto locale invece di CDN
 * - Verifica accessibilità PDF prima del caricamento
 * - Gestione errori migliorata con retry automatico
 * - ResizeObserver per adattamento fluido alla larghezza
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configurazione worker - Usa il worker locale dalla cartella public
// Questo evita completamente problemi CORS e dipendenze da CDN esterni
if (typeof window !== 'undefined') {
    // Usa il worker dalla cartella public (servito localmente, nessun problema CORS)
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    
    console.log('📦 PDF.js Worker configurato (locale):', pdfjs.GlobalWorkerOptions.workerSrc);
    console.log('📦 PDF.js Version:', pdfjs.version);
}

interface FluidPDFViewerProps {
    pdfUrl: string;
}

/**
 * Normalizza l'URL del PDF per assicurarsi che sia assoluto e accessibile
 */
const normalizePdfUrl = (url: string | null | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    // Se è già un URL assoluto (http/https), ritorna così com'è
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // Se inizia con /, è un percorso assoluto dal root
    if (url.startsWith('/')) {
        return url;
    }
    
    // Altrimenti, aggiungi / all'inizio
    return `/${url}`;
};

/**
 * Verifica che l'URL del PDF sia accessibile
 */
const verifyPdfAccessibility = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            credentials: 'include', // Include cookies per autenticazione
        });
        const contentType = response.headers.get('content-type');
        return response.ok && (contentType?.includes('application/pdf') ?? false);
    } catch (error) {
        console.error('❌ Errore nella verifica PDF:', error);
        return false;
    }
};

export const FluidPDFViewer: React.FC<FluidPDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(800);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const documentKeyRef = useRef<number>(0); // Per forzare re-render del Document

    // Normalizza l'URL del PDF
    const normalizedPdfUrl = useMemo(() => normalizePdfUrl(pdfUrl), [pdfUrl]);

    // Verifica accessibilità PDF e configurazione worker
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

        // Verifica accessibilità del PDF
        verifyPdfAccessibility(normalizedPdfUrl)
            .then(isAccessible => {
                if (isAccessible) {
                    console.log('✅ PDF accessibile e pronto per il caricamento');
                    setError(null);
                } else {
                    console.warn('⚠️ PDF potrebbe non essere accessibile');
                    // Non bloccare il caricamento, prova comunque
                }
            })
            .catch(err => {
                console.error('❌ Errore nella verifica PDF:', err);
                // Non bloccare il caricamento, prova comunque
            });
    }, [pdfUrl, normalizedPdfUrl]);

    // ResizeObserver per ottenere la width esatta del contenitore
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    setContainerWidth(width);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        // Imposta la width iniziale
        if (containerRef.current) {
            const initialWidth = containerRef.current.clientWidth;
            if (initialWidth > 0) {
                setContainerWidth(initialWidth);
            }
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Funzione chiamata quando il PDF è caricato
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        console.log('✅ PDF caricato con successo:', numPages, 'pagine');
        setNumPages(numPages);
        setLoading(false);
        setError(null);
        setRetryCount(0); // Reset retry count su successo
    }, []);

    // Funzione chiamata in caso di errore
    const onDocumentLoadError = useCallback((error: Error) => {
        console.error('❌ PDF Load Error:', error);
        console.error('   PDF URL:', normalizedPdfUrl);
        console.error('   Worker:', pdfjs.GlobalWorkerOptions.workerSrc);
        console.error('   Retry count:', retryCount);
        
        // Messaggio di errore più dettagliato
        let errorMessage = 'Errore nel caricamento del PDF';
        
        if (error.message.includes('worker') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Errore nel caricamento del worker PDF. Riprova o verifica la connessione.';
        } else if (error.message.includes('Invalid PDF')) {
            errorMessage = 'Il file PDF non è valido o è corrotto.';
        } else if (error.message) {
            errorMessage += `: ${error.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
    }, [normalizedPdfUrl, retryCount]);

    // Reset e retry quando cambia l'URL o si fa retry
    useEffect(() => {
        if (normalizedPdfUrl) {
            setLoading(true);
            setError(null);
            setNumPages(null);
            // Incrementa la key per forzare re-render del Document
            documentKeyRef.current += 1;
        }
    }, [normalizedPdfUrl, retryCount]);

    // Funzione per retry manuale
    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setError(null);
        setLoading(true);
    }, []);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#1a1a1a]"
            style={{ width: '100%', height: '100%' }}
        >
            {error && (
                <div className="h-full w-full flex flex-col items-center justify-center text-red-400 p-8">
                    <p className="text-lg font-semibold mb-2 text-center">{error}</p>
                    <p className="text-sm text-white/40 mt-2 text-center max-w-md break-all">
                        URL: {normalizedPdfUrl || pdfUrl || 'N/A'}
                    </p>
                    <button
                        onClick={handleRetry}
                        className="mt-4 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors font-medium"
                    >
                        Riprova
                    </button>
                </div>
            )}

            {loading && !error && normalizedPdfUrl && (
                <div className="h-full w-full flex flex-col items-center justify-center text-white/40">
                    <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mb-4" />
                    <p>Caricamento PDF...</p>
                    <p className="text-xs mt-2 text-white/20 text-center max-w-md break-all">
                        {normalizedPdfUrl}
                    </p>
                </div>
            )}

            {!normalizedPdfUrl && !loading && (
                <div className="h-full w-full flex items-center justify-center text-white/40">
                    <p>Nessun PDF disponibile</p>
                </div>
            )}

            {normalizedPdfUrl && !error && (
                <Document
                    key={documentKeyRef.current} // Forza re-render su retry
                    file={normalizedPdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="w-full"
                    options={{
                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                        cMapPacked: true,
                        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
                        httpHeaders: {
                            'Accept': 'application/pdf',
                        },
                        withCredentials: true,
                    }}
                >
                    {numPages && numPages > 0 && (
                        <div className="w-full">
                            {Array.from(new Array(numPages), (_, index) => (
                                <Page
                                    key={`page_${index + 1}`}
                                    pageNumber={index + 1}
                                    width={containerWidth > 0 ? containerWidth : 800}
                                    className="block mb-4"
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    loading={
                                        <div className="flex items-center justify-center p-8 text-white/40">
                                            <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full mr-3" />
                                            <p>Caricamento pagina {index + 1}...</p>
                                        </div>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </Document>
            )}
        </div>
    );
};
