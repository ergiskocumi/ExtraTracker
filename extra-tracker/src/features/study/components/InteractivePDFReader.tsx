/**
 * 📄 INTERACTIVE PDF READER
 * ========================
 *
 * Reader basato su react-pdf con selezione testo + menu contestuale flottante.
 * Ottimizzato: pagina singola + controlli navigazione/zoom (no scroll infinito).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    ChevronLeft,
    ChevronRight,
    X,
    Zap,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vite-friendly worker setup via CDN (evita warning/build issues con import.meta.url)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface InteractivePDFReaderProps {
    src: string;
    onAskAI: (selectedText: string) => void;
    onCreateFlashcard: (selectedText: string) => void;
    className?: string;
}

type MenuPosition = { x: number; y: number };

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getSelectionRect = (range: Range): DOMRect => {
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) return range.getBoundingClientRect();

    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    return new DOMRect(left, top, right - left, bottom - top);
};

export const InteractivePDFReader: React.FC<InteractivePDFReaderProps> = ({
    src,
    onAskAI,
    onCreateFlashcard,
    className,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pageAreaRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageInput, setPageInput] = useState<string>('1');
    const [zoom, setZoom] = useState<number>(1);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [selectedText, setSelectedText] = useState<string>('');
    const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

    const clearSelection = useCallback(() => {
        try {
            window.getSelection()?.removeAllRanges();
        } catch {
            // ignore
        }
        setSelectedText('');
        setMenuPos(null);
    }, []);

    const scrollViewerToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const scrollEl = containerRef.current?.parentElement;
        if (!scrollEl) return;
        try {
            scrollEl.scrollTo({ top: 0, left: 0, behavior });
        } catch {
            scrollEl.scrollTop = 0;
            scrollEl.scrollLeft = 0;
        }
    }, []);

    // Track width for responsive rendering (fit-to-container)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => setContainerWidth(el.getBoundingClientRect().width);
        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    // Reset state when switching PDF
    useEffect(() => {
        setNumPages(0);
        setPageNumber(1);
        setPageInput('1');
        setZoom(1);
        clearSelection();
    }, [clearSelection, src]);

    // Keep page input in sync with state changes (next/prev, clamp after load, etc.)
    useEffect(() => {
        setPageInput(String(pageNumber));
    }, [pageNumber]);

    // Close menu on scroll/click outside
    useEffect(() => {
        if (!menuPos) return;

        const container = containerRef.current;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (menuRef.current?.contains(target)) return;
            clearSelection();
        };

        const onScroll = () => {
            clearSelection();
        };

        window.addEventListener('mousedown', onPointerDown, true);
        window.addEventListener('scroll', onScroll, true);
        container?.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('mousedown', onPointerDown, true);
            window.removeEventListener('scroll', onScroll, true);
            container?.removeEventListener('scroll', onScroll);
        };
    }, [clearSelection, menuPos]);

    const pageWidth = useMemo(() => {
        const base = containerWidth > 0 ? Math.max(280, Math.floor(containerWidth - 24)) : undefined;
        if (!base) return undefined;
        return Math.floor(base * zoom);
    }, [containerWidth, zoom]);

    const goToPage = useCallback(
        (next: number) => {
            const safeTotal = Math.max(1, numPages || 1);
            setPageNumber(clamp(next, 1, safeTotal));
        },
        [numPages]
    );

    const commitPageInput = useCallback(() => {
        const safeTotal = Math.max(1, numPages || 1);
        const parsed = Number.parseInt(pageInput.trim(), 10);

        if (!Number.isFinite(parsed)) {
            setPageInput(String(pageNumber));
            return;
        }

        const clamped = clamp(parsed, 1, safeTotal);
        setPageNumber(clamped);
        setPageInput(String(clamped));
        clearSelection();
        scrollViewerToTop();
    }, [clearSelection, numPages, pageInput, pageNumber, scrollViewerToTop]);

    const canPrev = pageNumber > 1;
    const canNext = numPages > 0 && pageNumber < numPages;

    const handlePrev = () => {
        if (!canPrev) return;
        clearSelection();
        goToPage(pageNumber - 1);
        scrollViewerToTop();
    };

    const handleNext = () => {
        if (!canNext) return;
        clearSelection();
        goToPage(pageNumber + 1);
        scrollViewerToTop();
    };

    const zoomIn = () => {
        clearSelection();
        setZoom((z) => clamp(Number((z + ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
    };

    const zoomOut = () => {
        clearSelection();
        setZoom((z) => clamp(Number((z - ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        const pageArea = pageAreaRef.current;
        if (!selection || !pageArea) return;

        const text = selection.toString().trim();
        if (text.length <= 2) {
            clearSelection();
            return;
        }

        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const common = range.commonAncestorContainer;
        if (!pageArea.contains(common)) {
            clearSelection();
            return;
        }

        const rect = getSelectionRect(range);
        if (!rect || (rect.width === 0 && rect.height === 0)) return;

        // Coordinate viewport (per menu "fixed" preciso anche con scroll/container)
        const x = rect.left + rect.width / 2;
        const y = rect.top;

        setSelectedText(text);
        setMenuPos({ x, y });
    };

    return (
        <div ref={containerRef} onMouseUp={handleMouseUp} className={className}>
            <div className="relative">
                <Document
                    file={src}
                    onLoadSuccess={({ numPages: n }) => {
                        setNumPages(n);
                        setPageNumber((prev) => clamp(prev, 1, Math.max(1, n)));
                    }}
                    loading={
                        <div className="h-[70vh] flex items-center justify-center text-sm text-white/60">
                            Caricamento PDF...
                        </div>
                    }
                    error={
                        <div className="h-[70vh] flex items-center justify-center text-sm text-rose-300">
                            Impossibile caricare il PDF.
                        </div>
                    }
                >
                    <div className="py-6">
                        <div className="flex justify-center">
                            <div
                                ref={pageAreaRef}
                                className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/10"
                            >
                                <Page
                                    className="relative"
                                    pageNumber={pageNumber}
                                    width={pageWidth}
                                    renderAnnotationLayer={false}
                                    renderTextLayer
                                    devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
                                    loading={
                                        <div className="h-[70vh] w-[min(900px,100%)] flex items-center justify-center text-sm text-white/60">
                                            Rendering pagina...
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </Document>

                {/* Floating menu */}
                <AnimatePresence>
                    {menuPos && selectedText && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.96, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -6 }}
                            transition={{ duration: 0.12 }}
                            className="fixed z-50"
                            style={{
                                left: clamp(menuPos.x, 16, window.innerWidth - 16),
                                top: Math.max(12, menuPos.y - 10),
                                transform: 'translate(-50%, -100%)',
                            }}
                        >
                            <div className="flex items-center gap-1 rounded-full bg-zinc-900/90 border border-white/10 backdrop-blur px-2 py-1 shadow-xl shadow-black/30">
                                <button
                                    onClick={() => {
                                        onAskAI(selectedText);
                                        clearSelection();
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full text-white hover:bg-white/10 transition-colors"
                                    title="Chiedi AI"
                                >
                                    <Bot className="w-4 h-4" />
                                    <span className="text-xs font-medium hidden sm:inline">Chiedi AI</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onCreateFlashcard(selectedText);
                                        clearSelection();
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full text-white hover:bg-white/10 transition-colors"
                                    title="Crea Flashcard"
                                >
                                    <Zap className="w-4 h-4" />
                                    <span className="text-xs font-medium hidden sm:inline">Flashcard</span>
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Chiudi"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom controls (dock) */}
                {numPages > 0 && (
                    <div className="sticky bottom-24 md:bottom-4 z-20 flex justify-center pb-4 pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur px-3 py-2 shadow-xl shadow-black/40">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={!canPrev}
                                className="p-2 rounded-xl text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Pagina precedente"
                                title="Pagina precedente"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-xs text-white/80">
                                <span className="hidden sm:inline">Pagina</span>
                                <input
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                                    onBlur={commitPageInput}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            commitPageInput();
                                        }
                                    }}
                                    inputMode="numeric"
                                    className="w-14 text-center px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                                    aria-label="Numero pagina"
                                />
                                <span className="text-white/50">di</span>
                                <span className="tabular-nums">{numPages}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canNext}
                                className="p-2 rounded-xl text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Pagina successiva"
                                title="Pagina successiva"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <div className="w-px h-7 bg-white/10 mx-1" />

                            <button
                                type="button"
                                onClick={zoomOut}
                                disabled={zoom <= MIN_ZOOM}
                                className="p-2 rounded-xl text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Zoom meno"
                                title="Zoom meno"
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={zoomIn}
                                disabled={zoom >= MAX_ZOOM}
                                className="p-2 rounded-xl text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Zoom più"
                                title="Zoom più"
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>

                            <div className="text-xs text-white/60 tabular-nums w-12 text-center">
                                {Math.round(zoom * 100)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InteractivePDFReader;
