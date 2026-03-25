import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, FileText, Layers, GripVertical, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import PDFReader from '../components/PDF/PDFReaderLazy';
import type { PDFReaderRef } from '../components/PDF/PDFReader';
import { StudySidebar } from '../components/Study/StudySidebar';
import type { Deck, Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

// ============================================
// CONSTANTS
// ============================================

const PANEL_SIZES = {
    LEFT_DEFAULT: 70,
    LEFT_MIN: 30,
    RIGHT_DEFAULT: 30,
    RIGHT_MIN: 20,
} as const;

const SOURCE_HIGHLIGHT_DURATION_MS = 3000;

// ============================================
// TYPES
// ============================================

interface CinemaLayoutProps {
    deck: Deck;
    pdfSrc: string | null;
    onUpdateCard: (cardId: string, front: string, back: string) => Promise<void>;
    onNavigateBack?: () => void;
    onDeckUpdate?: (updatedDeck: Deck) => void;
}

// ============================================
// SUB-COMPONENTS (Memoized)
// ============================================

interface PDFPanelProps {
    pdfSrc: string | null;
    pdfReaderRef: React.RefObject<PDFReaderRef>;
    onSearchError?: (message: string) => void;
}

const PDFPanel = memo<PDFPanelProps>(({ pdfSrc, pdfReaderRef, onSearchError }) => {
    const normalizedPdfSrc = (pdfSrc && typeof pdfSrc === 'string') ? pdfSrc : null;

    const goToPrev = useCallback(() => pdfReaderRef.current?.jumpToPreviousPage(), [pdfReaderRef]);
    const goToNext = useCallback(() => pdfReaderRef.current?.jumpToNextPage(), [pdfReaderRef]);
    const zoomIn = useCallback(() => pdfReaderRef.current?.zoomIn(), [pdfReaderRef]);
    const zoomOut = useCallback(() => pdfReaderRef.current?.zoomOut(), [pdfReaderRef]);
    const resetZoom = useCallback(() => pdfReaderRef.current?.zoomToScale(1), [pdfReaderRef]);
    const fitToPage = useCallback(() => pdfReaderRef.current?.fitToPage(), [pdfReaderRef]);
    const fitToWidth = useCallback(() => pdfReaderRef.current?.fitToWidth(), [pdfReaderRef]);

    return (
        <div className="relative h-full w-full group/pdf">
            <PDFReader
                ref={pdfReaderRef}
                pdfUrl={normalizedPdfSrc}
                onSearchError={onSearchError}
                className="scrollbar-pdf"
            />

            {normalizedPdfSrc && (
                <>
                    <button
                        onClick={goToPrev}
                        aria-label="Pagina precedente"
                        className="
                            absolute left-2.5 top-1/2 -translate-y-1/2 z-20
                            w-9 h-9 rounded-full
                            bg-black/50 hover:bg-black/70 backdrop-blur-md
                            border border-white/10 hover:border-white/25
                            text-white/80 hover:text-white
                            flex items-center justify-center
                            opacity-0 group-hover/pdf:opacity-100
                            transition-all duration-200
                            focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500/50
                            active:scale-95
                        "
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNext}
                        aria-label="Pagina successiva"
                        className="
                            absolute right-2.5 top-1/2 -translate-y-1/2 z-20
                            w-9 h-9 rounded-full
                            bg-black/50 hover:bg-black/70 backdrop-blur-md
                            border border-white/10 hover:border-white/25
                            text-white/80 hover:text-white
                            flex items-center justify-center
                            opacity-0 group-hover/pdf:opacity-100
                            transition-all duration-200
                            focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500/50
                            active:scale-95
                        "
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Zoom toolbar (big, student-friendly controls) */}
                    <div
                        className="
                            absolute right-3 top-3 z-30
                            flex flex-col gap-2
                            opacity-100 sm:opacity-0 group-hover/pdf:opacity-100
                            transition-opacity duration-200
                            pointer-events-auto sm:pointer-events-none sm:group-hover/pdf:pointer-events-auto
                        "
                    >
                        <button
                            type="button"
                            onClick={zoomIn}
                            aria-label="Zoom in"
                            title="Zoom in"
                            className="
                                pointer-events-auto
                                w-11 h-11 rounded-xl
                                bg-black/45 hover:bg-black/70 backdrop-blur-md
                                border border-white/10 hover:border-white/25
                                text-white/90 hover:text-white
                                flex items-center justify-center
                                active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
                                transition-all duration-200
                            "
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={zoomOut}
                            aria-label="Zoom out"
                            title="Zoom out"
                            className="
                                pointer-events-auto
                                w-11 h-11 rounded-xl
                                bg-black/45 hover:bg-black/70 backdrop-blur-md
                                border border-white/10 hover:border-white/25
                                text-white/90 hover:text-white
                                flex items-center justify-center
                                active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
                                transition-all duration-200
                            "
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={resetZoom}
                            aria-label="Reset zoom to 100%"
                            title="Reset to 100%"
                            className="
                                pointer-events-auto
                                w-11 h-11 rounded-xl
                                bg-black/35 hover:bg-black/60 backdrop-blur-md
                                border border-white/10 hover:border-white/25
                                text-white/90 hover:text-white
                                flex items-center justify-center
                                active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
                                transition-all duration-200
                            "
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={fitToPage}
                            aria-label="Fit to page"
                            title="Fit to page"
                            className="
                                pointer-events-auto
                                w-11 h-11 rounded-xl
                                bg-black/35 hover:bg-black/60 backdrop-blur-md
                                border border-white/10 hover:border-white/25
                                text-white/90 hover:text-white
                                flex items-center justify-center
                                active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
                                transition-all duration-200
                            "
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={fitToWidth}
                            aria-label="Fit to width"
                            title="Fit to width"
                            className="
                                pointer-events-auto
                                w-11 h-11 rounded-xl
                                bg-black/35 hover:bg-black/60 backdrop-blur-md
                                border border-white/10 hover:border-white/25
                                text-white/90 hover:text-white
                                flex items-center justify-center
                                active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
                                transition-all duration-200
                            "
                        >
                            <Maximize2 className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
});

PDFPanel.displayName = 'PDFPanel';

// ============================================
// MAIN COMPONENT
// ============================================

export const CinemaLayout: React.FC<CinemaLayoutProps> = memo(({
    deck,
    pdfSrc,
    onUpdateCard,
    onNavigateBack,
    onDeckUpdate,
}) => {
    const navigate = useNavigate();
    const { deckId } = useParams<{ deckId: string }>();
    const pdfReaderRef = useRef<PDFReaderRef>(null);
    const [activeSourceCardId, setActiveSourceCardId] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'pdf' | 'cards'>('pdf');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                pdfReaderRef.current?.jumpToPreviousPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                pdfReaderRef.current?.jumpToNextPage();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleNavigateBack = useCallback(() => {
        if (onNavigateBack) {
            onNavigateBack();
        } else if (deckId) {
            navigate(`/study/deck/${deckId}`);
        } else {
            navigate('/study');
        }
    }, [onNavigateBack, navigate, deckId]);

    const handleShowSource = useCallback((card: Card) => {
        if (!card.sourceMetadata || !pdfReaderRef.current) {
            emitToast.error('Informazioni sulla fonte non disponibili per questa card', {
                title: 'Fonte non disponibile',
                duration: 3000,
            });
            return;
        }

        const { pageNumber, originalText } = card.sourceMetadata;

        if (!pageNumber || pageNumber < 1 || !originalText || originalText.trim().length < 20) {
            emitToast.error('I dati della fonte non sono validi', {
                title: 'Errore',
                duration: 3000,
            });
            return;
        }

        setActiveSourceCardId(card.id);
        pdfReaderRef.current.jumpToPageAndHighlight(pageNumber, originalText);

        setTimeout(() => {
            setActiveSourceCardId(null);
        }, SOURCE_HIGHLIGHT_DURATION_MS);
    }, []);

    const handleSearchError = useCallback((message: string) => {
        emitToast.error(message, {
            title: 'Ricerca nel PDF',
            duration: 4000,
        });
    }, []);

    return (
        <div
            className="cinema-layout-enter fixed left-0 right-0 bottom-0 bg-theme-base text-theme-primary overflow-hidden flex flex-col"
            style={{ top: 'var(--app-header-height, 56px)' }}
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse at top, var(--gradient-mesh-1), transparent 55%),
                        radial-gradient(ellipse at bottom, var(--gradient-mesh-2), transparent 60%)
                    `,
                }}
            />

            {/* Mobile: Tab switcher */}
            <div className="sm:hidden flex-none flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
                <button
                    onClick={() => setMobileTab('pdf')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
                        mobileTab === 'pdf'
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface/80 border border-transparent'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    PDF
                </button>
                <button
                    onClick={() => setMobileTab('cards')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
                        mobileTab === 'cards'
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface/80 border border-transparent'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    Card
                    {deck.cards.length > 0 && (
                        <span className="text-[10px] font-bold bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {deck.cards.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Main Body */}
            <div className="flex-1 w-full min-h-0 overflow-hidden">
                <div className="cinema-content-enter h-full w-full px-2 sm:px-3 pb-2 sm:pb-3">
                    {/* Desktop: split panel */}
                    <div className="hidden sm:block h-full w-full">
                        <Group orientation="horizontal" className="h-full w-full">
                            <Panel
                                defaultSize={PANEL_SIZES.LEFT_DEFAULT}
                                minSize={PANEL_SIZES.LEFT_MIN}
                                className="h-full w-full overflow-hidden min-w-0 pr-1 sm:pr-1.5"
                            >
                                <div className="h-full w-full rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-md overflow-hidden">
                                    <PDFPanel
                                        pdfSrc={pdfSrc}
                                        pdfReaderRef={pdfReaderRef}
                                        onSearchError={handleSearchError}
                                    />
                                </div>
                            </Panel>
                            <Separator className="w-3 bg-transparent cursor-col-resize relative group/sep flex items-center justify-center">
                                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-theme-subtle group-hover/sep:bg-primary-500/50 transition-colors duration-200" />
                                <div className="relative z-10 flex flex-col items-center justify-center gap-0.5 w-5 h-10 rounded-lg bg-theme-surface/80 border border-theme-default group-hover/sep:border-primary-500/40 group-hover/sep:bg-theme-card shadow-sm transition-all duration-200 opacity-0 group-hover/sep:opacity-100">
                                    <GripVertical className="w-3 h-3 text-theme-muted group-hover/sep:text-primary-500 transition-colors" />
                                </div>
                            </Separator>
                            <Panel
                                defaultSize={PANEL_SIZES.RIGHT_DEFAULT}
                                minSize={PANEL_SIZES.RIGHT_MIN}
                                className="h-full overflow-hidden min-w-0 pl-1 sm:pl-1.5"
                            >
                                <div className="h-full rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-md overflow-hidden">
                                    <StudySidebar
                                        deck={deck}
                                        pdfSrc={pdfSrc}
                                        onUpdateCard={onUpdateCard}
                                        compactMode={true}
                                        onNavigateBack={handleNavigateBack}
                                        onDeckUpdate={onDeckUpdate}
                                        onShowSource={handleShowSource}
                                        activeSourceCardId={activeSourceCardId}
                                    />
                                </div>
                            </Panel>
                        </Group>
                    </div>

                    {/* Mobile: fullscreen tab singolo */}
                    <div className="sm:hidden h-full w-full rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-md overflow-hidden">
                        {mobileTab === 'pdf' ? (
                            <PDFPanel
                                pdfSrc={pdfSrc}
                                pdfReaderRef={pdfReaderRef}
                                onSearchError={handleSearchError}
                            />
                        ) : (
                            <StudySidebar
                                deck={deck}
                                pdfSrc={pdfSrc}
                                onUpdateCard={onUpdateCard}
                                compactMode={true}
                                onNavigateBack={handleNavigateBack}
                                onDeckUpdate={onDeckUpdate}
                                onShowSource={handleShowSource}
                                activeSourceCardId={activeSourceCardId}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

CinemaLayout.displayName = 'CinemaLayout';
