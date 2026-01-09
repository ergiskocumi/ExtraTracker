/**
 * 📄 CONTINUOUS PDF VIEWER (Flashka.ai Style)
 * ===========================================
 * 
 * PDF viewer con scroll continuo verticale (tutte le pagine in sequenza).
 * Supporta evidenziazione testo e scroll automatico alla sezione evidenziata.
 * 
 * FEATURES:
 * - Tutte le pagine renderizzate in un unico scroll
 * - Evidenziazione testo della risposta flashcard
 * - Menu contestuale per selezione testo
 * - Scroll automatico alla sezione evidenziata
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, X } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker setup per Vite
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ContinuousPDFViewerProps {
    src: string;
    /** Testo da evidenziare nel PDF (es. risposta della flashcard) */
    highlightText?: string;
    /** Callback quando l'utente seleziona testo e clicca "Chiedi AI" */
    onAskAI: (selectedText: string) => void;
    /** Callback quando l'utente seleziona testo e clicca "Crea Flashcard" */
    onCreateFlashcard: (selectedText: string) => void;
    className?: string;
}

type MenuPosition = { x: number; y: number };

// ─────────────────────────────────────────────────────────────
// Highlight CSS (iniettato una sola volta)
// ─────────────────────────────────────────────────────────────

const HIGHLIGHT_STYLES = `
    .pdf-highlight-match {
        background-color: rgba(250, 204, 21, 0.4) !important;
        border-radius: 2px;
        box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
        transition: background-color 0.3s ease;
    }
    .react-pdf__Page__textContent {
        user-select: text !important;
    }
    .react-pdf__Page__textContent span {
        cursor: text;
    }
`;

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const ContinuousPDFViewer: React.FC<ContinuousPDFViewerProps> = ({
    src,
    highlightText,
    onAskAI,
    onCreateFlashcard,
    className = '',
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [numPages, setNumPages] = useState<number>(0);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedText, setSelectedText] = useState<string>('');
    const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
    const [pdfLoaded, setPdfLoaded] = useState(false);

    // ─── Inject highlight styles ─────────────────────────────

    useEffect(() => {
        const styleId = 'pdf-highlight-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = HIGHLIGHT_STYLES;
            document.head.appendChild(style);
        }
    }, []);

    // ─── Track container width ───────────────────────────────

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => {
            const width = el.getBoundingClientRect().width;
            setContainerWidth(width);
        };
        update();

        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(el);

        return () => resizeObserver.disconnect();
    }, []);

    // ─── Clear selection ─────────────────────────────────────

    const clearSelection = useCallback(() => {
        try {
            window.getSelection()?.removeAllRanges();
        } catch {
            // ignore
        }
        setSelectedText('');
        setMenuPos(null);
    }, []);

    // ─── Handle text selection (mouseup) ─────────────────────

    const handleMouseUp = useCallback(() => {
        // Delay per permettere alla selezione di essere completata
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                return;
            }

            const text = selection.toString().trim();
            if (text.length < 3) {
                return;
            }

            // Verifica che la selezione sia dentro il container PDF
            const range = selection.getRangeAt(0);
            if (!containerRef.current?.contains(range.commonAncestorContainer)) {
                return;
            }

            const rect = range.getBoundingClientRect();
            setSelectedText(text);
            setMenuPos({
                x: rect.left + rect.width / 2,
                y: rect.top,
            });
        }, 10);
    }, []);

    // ─── Close menu on click outside ─────────────────────────

    useEffect(() => {
        if (!menuPos) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target)) return;
            clearSelection();
        };

        // Delay per non intercettare il click che ha aperto il menu
        const timeout = setTimeout(() => {
            window.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuPos, clearSelection]);

    // ─── Highlight text in PDF ───────────────────────────────

    useEffect(() => {
        if (!pdfLoaded || !containerRef.current) return;

        // Rimuovi highlight precedenti
        const oldHighlights = containerRef.current.querySelectorAll('.pdf-highlight-match');
        oldHighlights.forEach((el) => el.classList.remove('pdf-highlight-match'));

        if (!highlightText || highlightText.length < 10) return;

        // Normalizza il testo da cercare
        const normalizeText = (text: string) =>
            text.toLowerCase().replace(/\s+/g, ' ').trim();

        const searchNormalized = normalizeText(highlightText);
        // Usa solo i primi 80 caratteri per evitare falsi negativi
        const searchSnippet = searchNormalized.slice(0, 80);

        // Cerca in tutti i text layer
        const textLayers = containerRef.current.querySelectorAll('.react-pdf__Page__textContent');
        let foundElement: HTMLElement | null = null;

        textLayers.forEach((layer) => {
            if (foundElement) return; // Già trovato

            const spans = layer.querySelectorAll('span');
            let pageText = '';
            const spanRanges: Array<{ span: HTMLElement; start: number; end: number }> = [];

            spans.forEach((span) => {
                const start = pageText.length;
                const text = span.textContent || '';
                pageText += text + ' ';
                spanRanges.push({
                    span: span as HTMLElement,
                    start,
                    end: pageText.length,
                });
            });

            const normalizedPage = normalizeText(pageText);
            const matchIndex = normalizedPage.indexOf(searchSnippet);

            if (matchIndex !== -1) {
                // Evidenzia gli span che contengono il match
                const matchEnd = matchIndex + searchSnippet.length;

                spanRanges.forEach(({ span, start, end }) => {
                    // Normalizza le posizioni
                    const spanTextNorm = normalizeText(pageText.slice(0, start)).length;
                    const spanEndNorm = normalizeText(pageText.slice(0, end)).length;

                    if (spanTextNorm < matchEnd && spanEndNorm > matchIndex) {
                        span.classList.add('pdf-highlight-match');
                        if (!foundElement) {
                            foundElement = span;
                        }
                    }
                });
            }
        });

        // Scrolla all'elemento trovato
        if (foundElement) {
            setTimeout(() => {
                foundElement?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
        }
    }, [highlightText, pdfLoaded, numPages]);

    // ─── Handlers ────────────────────────────────────────────

    const handleDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
        setNumPages(n);
        setPdfLoaded(true);
    }, []);

    const handleAskAI = useCallback(() => {
        if (selectedText) {
            onAskAI(selectedText);
            clearSelection();
        }
    }, [selectedText, onAskAI, clearSelection]);

    const handleCreateFlashcard = useCallback(() => {
        if (selectedText) {
            onCreateFlashcard(selectedText);
            clearSelection();
        }
    }, [selectedText, onCreateFlashcard, clearSelection]);

    // ─── Render ──────────────────────────────────────────────

    const pageWidth = containerWidth > 0 ? Math.max(300, containerWidth - 48) : undefined;

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-y-auto bg-zinc-100 ${className}`}
            onMouseUp={handleMouseUp}
        >
            <Document
                file={src}
                onLoadSuccess={handleDocumentLoadSuccess}
                loading={
                    <div className="flex items-center justify-center min-h-[60vh] p-8">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-4 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                            <p className="text-sm text-zinc-600">Caricamento PDF...</p>
                        </div>
                    </div>
                }
                error={
                    <div className="flex items-center justify-center min-h-[60vh] p-8">
                        <div className="text-center max-w-md">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <p className="text-sm text-red-600">Impossibile caricare il PDF</p>
                        </div>
                    </div>
                }
                className="w-full"
            >
                {/* Render tutte le pagine in sequenza */}
                <div className="flex flex-col items-center gap-4 py-6 px-4">
                    {Array.from({ length: numPages }, (_, i) => (
                        <div
                            key={`page-${i + 1}`}
                            className="bg-white shadow-lg rounded-lg overflow-hidden"
                        >
                            <Page
                                pageNumber={i + 1}
                                width={pageWidth}
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                                loading={
                                    <div
                                        className="flex items-center justify-center bg-zinc-50"
                                        style={{
                                            width: pageWidth || 600,
                                            height: (pageWidth || 600) * 1.4,
                                        }}
                                    >
                                        <p className="text-sm text-zinc-400">Pagina {i + 1}...</p>
                                    </div>
                                }
                            />
                        </div>
                    ))}
                </div>
            </Document>

            {/* Context Menu (floating) */}
            <AnimatePresence>
                {menuPos && selectedText && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[100] flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl"
                        style={{
                            left: Math.min(Math.max(menuPos.x, 120), window.innerWidth - 120),
                            top: Math.max(menuPos.y - 12, 60),
                            transform: 'translateX(-50%) translateY(-100%)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleAskAI}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition-all text-sm"
                        >
                            <Bot className="w-4 h-4 text-violet-400" />
                            <span>Chiedi AI</span>
                        </button>
                        <button
                            onClick={handleCreateFlashcard}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition-all text-sm"
                        >
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>Flashcard</span>
                        </button>
                        <button
                            onClick={clearSelection}
                            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ContinuousPDFViewer;
