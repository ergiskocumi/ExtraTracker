/**
 * 🎬 CINEMA LAYOUT - Split View "No-Box" Architecture (Ottimizzato)
 * 
 * Layout strutturale per vista cinema con PDF e tools side-by-side.
 * Stile moderno ispirato a BrandStory con gradienti radiali e backdrop blur.
 * 
 * Performance Optimizations:
 * - React.memo per evitare re-render inutili
 * - Memoization dei componenti sub-componenti
 * - Callback memoizzati
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel, Group, Separator } from 'react-resizable-panels';
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

// ============================================
// TYPES
// ============================================

interface CinemaLayoutProps {
    deck: Deck;
    pdfSrc: string | null;
    onAddCard: () => void;
    onUpdateCard: (cardId: string, front: string, back: string) => Promise<void>;
    /**
     * Callback opzionale per la navigazione indietro.
     * Se non fornito, usa la navigazione di default al dettaglio del mazzo.
     */
    onNavigateBack?: () => void;
    /**
     * Callback quando il deck viene aggiornato (riordinamento, inserimento card)
     */
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

    return (
        <div className="relative h-full w-full group/pdf">
            <PDFReader
                ref={pdfReaderRef}
                pdfUrl={normalizedPdfSrc}
                onSearchError={onSearchError}
                className="scrollbar-pdf"
            />

            {/* Overlay page navigation arrows — visibili al hover del panel */}
            {normalizedPdfSrc && (
                <>
                    <button
                        onClick={goToPrev}
                        aria-label="Pagina precedente"
                        className="
                            absolute left-2 top-1/2 -translate-y-1/2 z-20
                            w-9 h-9 rounded-full
                            bg-black/40 hover:bg-black/65 backdrop-blur-sm
                            border border-white/15 hover:border-white/30
                            text-white/80 hover:text-white
                            flex items-center justify-center
                            opacity-0 group-hover/pdf:opacity-100
                            transition-all duration-200
                            focus-visible:opacity-100
                        "
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={goToNext}
                        aria-label="Pagina successiva"
                        className="
                            absolute right-2 top-1/2 -translate-y-1/2 z-20
                            w-9 h-9 rounded-full
                            bg-black/40 hover:bg-black/65 backdrop-blur-sm
                            border border-white/15 hover:border-white/30
                            text-white/80 hover:text-white
                            flex items-center justify-center
                            opacity-0 group-hover/pdf:opacity-100
                            transition-all duration-200
                            focus-visible:opacity-100
                        "
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
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
    onAddCard,
    onUpdateCard,
    onNavigateBack,
    onDeckUpdate,
}) => {
    const navigate = useNavigate();
    const { deckId } = useParams<{ deckId: string }>();
    const pdfReaderRef = useRef<PDFReaderRef>(null);
    const [activeSourceCardId, setActiveSourceCardId] = useState<string | null>(null);
    // Mobile tab switch: 'pdf' | 'cards'
    const [mobileTab, setMobileTab] = useState<'pdf' | 'cards'>('pdf');

    // Keyboard shortcuts: ArrowLeft/Right per navigare le pagine del PDF
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


    /**
     * Handler per tornare al dettaglio del mazzo corrente
     * 
     * Naviga al dettaglio del mazzo che si sta visualizzando in Cinema Mode invece della dashboard principale.
     * Se onNavigateBack è fornito come prop, usa quello, altrimenti usa la navigazione di default.
     * 
     * @returns {void}
     */
    const handleNavigateBack = useCallback(() => {
        if (onNavigateBack) {
            // Usa il callback fornito se disponibile
            onNavigateBack();
        } else if (deckId) {
            // Naviga al dettaglio del mazzo corrente
            navigate(`/study/deck/${deckId}`);
        } else {
            // Fallback alla dashboard se deckId non è disponibile
            navigate('/study');
        }
    }, [onNavigateBack, navigate, deckId]);

    // Memoize callbacks per evitare re-render dei componenti figli
    const handleAddCard = useCallback(() => {
        onAddCard();
    }, [onAddCard]);

    const handleUpdateCard = useCallback(async (cardId: string, front: string, back: string) => {
        await onUpdateCard(cardId, front, back);
    }, [onUpdateCard]);

    /**
     * Handler per mostrare la fonte di una card nel PDF
     * Salta alla pagina corretta e evidenzia il testo
     */
    const handleShowSource = useCallback((card: Card) => {
        if (!card.sourceMetadata || !pdfReaderRef.current) {
            emitToast.error('Informazioni sulla fonte non disponibili per questa card', {
                title: 'Fonte non disponibile',
                duration: 3000,
            });
            return;
        }

        const { pageNumber, originalText } = card.sourceMetadata;

        // Validate sourceMetadata
        if (!pageNumber || pageNumber < 1 || !originalText || originalText.trim().length < 20) {
            emitToast.error('I dati della fonte non sono validi', {
                title: 'Errore',
                duration: 3000,
            });
            return;
        }

        // Set active card for visual feedback
        setActiveSourceCardId(card.id);

        // Jump to page and highlight text
        pdfReaderRef.current.jumpToPageAndHighlight(pageNumber, originalText);

        // Clear active state after 3 seconds
        setTimeout(() => {
            setActiveSourceCardId(null);
        }, 3000);
    }, []);
    
    /**
     * Handler per errori di ricerca nel PDF
     */
    const handleSearchError = useCallback((message: string) => {
        emitToast.error(message, {
            title: 'Ricerca nel PDF',
            duration: 4000,
        });
    }, []);

    return (
        <div
            className="fixed left-0 right-0 bottom-0 bg-theme-base text-theme-primary overflow-hidden flex flex-col"
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

            {/* Mobile: Tab switcher PDF | Card — visibile solo su sm- */}
            <div className="sm:hidden flex-none flex items-center gap-1 px-3 pt-2 pb-1">
                <button
                    onClick={() => setMobileTab('pdf')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                        mobileTab === 'pdf'
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface border border-transparent'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                </button>
                <button
                    onClick={() => setMobileTab('cards')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                        mobileTab === 'cards'
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface border border-transparent'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Card
                </button>
            </div>

            {/* Main Body */}
            <div className="flex-1 w-full min-h-0 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="h-full w-full px-2 sm:px-3 pb-2 sm:pb-3"
                >
                    {/* Desktop: split panel */}
                    <div className="hidden sm:block h-full w-full">
                        <Group orientation="horizontal" className="h-full w-full">
                            <Panel
                                defaultSize={PANEL_SIZES.LEFT_DEFAULT}
                                minSize={PANEL_SIZES.LEFT_MIN}
                                className="h-full w-full overflow-hidden min-w-0 pr-1 sm:pr-2"
                            >
                                <div className="h-full w-full rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-md overflow-hidden">
                                    <PDFPanel
                                        pdfSrc={pdfSrc}
                                        pdfReaderRef={pdfReaderRef}
                                        onSearchError={handleSearchError}
                                    />
                                </div>
                            </Panel>
                            <Separator className="w-2 sm:w-3 bg-transparent cursor-col-resize relative group">
                                <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px bg-theme-surface group-hover:bg-primary-500/70 transition-colors rounded-full" />
                            </Separator>
                            <Panel
                                defaultSize={PANEL_SIZES.RIGHT_DEFAULT}
                                minSize={PANEL_SIZES.RIGHT_MIN}
                                className="h-full overflow-hidden min-w-0 pl-1 sm:pl-2"
                            >
                                <div className="h-full rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-md overflow-hidden">
                                    <StudySidebar
                                        deck={deck}
                                        pdfSrc={pdfSrc}
                                        onAddCard={handleAddCard}
                                        onUpdateCard={handleUpdateCard}
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
                                onAddCard={handleAddCard}
                                onUpdateCard={handleUpdateCard}
                                compactMode={true}
                                onNavigateBack={handleNavigateBack}
                                onDeckUpdate={onDeckUpdate}
                                onShowSource={handleShowSource}
                                activeSourceCardId={activeSourceCardId}
                            />
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
});

CinemaLayout.displayName = 'CinemaLayout';
