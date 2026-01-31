/**
 * 📍 SOURCE VIEWER - Modal per visualizzare la fonte nel PDF
 * 
 * Mostra il PDF sorgente con:
 * - Navigazione alla pagina corretta
 * - Evidenziazione del testo sorgente
 * - Controlli zoom e navigazione
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Search } from 'lucide-react';
import PDFReader from '../../../PDF/PDFReaderLazy';
import type { PDFReaderRef } from '../../../PDF/PDFReader';

// ============================================
// TYPES
// ============================================

export interface SourceViewerProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    pageNumber?: number; // 1-based
    highlightText?: string;
    cardQuestion?: string; // Per mostrare il contesto
}

// ============================================
// COMPONENT
// ============================================

export const SourceViewer: React.FC<SourceViewerProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    pageNumber,
    highlightText,
    cardQuestion,
}) => {
    const pdfReaderRef = useRef<PDFReaderRef>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Quando il PDF è caricato, salta alla pagina e evidenzia il testo
    useEffect(() => {
        if (isLoaded && pdfReaderRef.current && pageNumber) {
            // Delay minimo per rendering
            const timer = setTimeout(() => {
                if (highlightText && highlightText.length >= 100) {
                    // Se abbiamo testo sufficiente (1-2 righe), salta e evidenzia
                    pdfReaderRef.current?.jumpToPageAndHighlight(pageNumber, highlightText);
                } else {
                    // Altrimenti salta solo alla pagina
                    pdfReaderRef.current?.jumpToPage(pageNumber - 1); // 0-based
                }
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [isLoaded, pageNumber, highlightText]);

    const handleLoadSuccess = () => {
        setIsLoaded(true);
        setError(null);
    };

    const handleError = (err: Error) => {
        setError(err.message || 'Errore nel caricamento del PDF');
        setIsLoaded(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-5xl h-[85vh] bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/80 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
                                <FileText className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Fonte nel PDF
                                </h3>
                                <p className="text-xs text-white/50">
                                    {pageNumber ? `Pagina ${pageNumber}` : 'Visualizzazione documento'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Context Info */}
                    {cardQuestion && (
                        <div className="px-6 py-3 border-b border-white/5 bg-amber-500/5">
                            <p className="text-xs text-white/50 mb-1">Domanda correlata:</p>
                            <p className="text-sm text-amber-300 font-medium line-clamp-2">
                                "{cardQuestion}"
                            </p>
                        </div>
                    )}

                    {/* Highlight Preview */}
                    {highlightText && highlightText.length >= 100 && (
                        <div className="px-6 py-3 border-b border-white/5 bg-violet-500/5">
                            <div className="flex items-center gap-2 mb-1">
                                <Search className="w-3.5 h-3.5 text-violet-400" />
                                <p className="text-xs text-white/50">Testo evidenziato nel PDF:</p>
                            </div>
                            <p className="text-sm text-violet-300 italic line-clamp-4">
                                "{highlightText.substring(0, 300)}{highlightText.length > 300 ? '...' : ''}"
                            </p>
                        </div>
                    )}

                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                    <p className="text-red-400 text-sm mb-2">{error}</p>
                                    <p className="text-white/50 text-xs">
                                        Il PDF potrebbe non essere più disponibile
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <PDFReader
                                ref={pdfReaderRef}
                                pdfUrl={pdfUrl}
                                onLoadSuccess={handleLoadSuccess}
                                onError={handleError}
                                className="h-full"
                            />
                        )}
                    </div>

                    {/* Footer with instructions */}
                    <div className="px-6 py-3 border-t border-white/5 bg-zinc-900/80 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-white/40">
                                💡 Usa Ctrl+F per cercare nel documento • Scroll per navigare
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SourceViewer;
