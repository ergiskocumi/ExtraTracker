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

import React, { memo, useCallback, useRef, useState } from 'react';
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
    /**
     * Keep PDFReader mounted to preserve its internal state.
     * It safely handles a null pdfUrl internally.
     */
    
    // Normalize pdfSrc to ensure it's either a valid string or null
    const normalizedPdfSrc = (pdfSrc && typeof pdfSrc === 'string') ? pdfSrc : null;

    return (
        <div className="h-full w-full">
            {/* Always render PDFReader - it handles null pdfUrl internally */}
            <PDFReader 
                ref={pdfReaderRef} 
                pdfUrl={normalizedPdfSrc}
                onSearchError={onSearchError}
                className="scrollbar-pdf"
            />
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
            {/* Main Body - Container principale con stile moderno */}
            <div className="flex-1 w-full h-full overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="h-full w-full px-2 sm:px-3 pb-2 sm:pb-3"
                >
                    <Group orientation="horizontal" className="h-full w-full">
                        {/* Pannello Sinistro - PDF Viewer */}
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

                        {/* Resize Handle - Stile moderno discreto */}
                        <Separator className="w-2 sm:w-3 bg-transparent cursor-col-resize relative group">
                            <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px bg-theme-surface group-hover:bg-primary-500/70 transition-colors rounded-full" />
                        </Separator>

                        {/* Pannello Destro - Tools (Flashcards & Chat) */}
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
                </motion.div>
            </div>
        </div>
    );
});

CinemaLayout.displayName = 'CinemaLayout';
