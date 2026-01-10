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

import React, { memo, useMemo, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { FluidPDFViewer } from '../components/PDF/FluidPDFViewer';
import { StudySidebar } from '../components/Study/StudySidebar';
import type { Deck } from '../services/studyService';

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
}

// ============================================
// SUB-COMPONENTS (Memoized)
// ============================================

interface PDFPanelProps {
    pdfSrc: string | null;
}

const PDFPanel = memo<PDFPanelProps>(({ pdfSrc }) => {
    // Verifica che pdfSrc sia una stringa valida
    if (!pdfSrc || typeof pdfSrc !== 'string') {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/40 gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 bg-violet-500/5 backdrop-blur-xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <svg className="w-8 h-8 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-400">Nessun PDF disponibile</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden p-4">
            <div className="h-full w-full rounded-3xl overflow-hidden border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative scrollbar-macos"
                style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
                }}
            >
                <FluidPDFViewer pdfUrl={pdfSrc} />
            </div>
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
}) => {
    // Memoize deck title per evitare re-render inutili
    const deckTitle = useMemo(() => deck.title, [deck.title]);

    // Memoize callbacks per evitare re-render dei componenti figli
    const handleAddCard = useCallback(() => {
        onAddCard();
    }, [onAddCard]);

    const handleUpdateCard = useCallback(async (cardId: string, front: string, back: string) => {
        await onUpdateCard(cardId, front, back);
    }, [onUpdateCard]);

    return (
        <div className="fixed inset-0 h-screen w-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-black text-white overflow-hidden flex flex-col">
            {/* Header - Stile moderno con backdrop blur */}
            <header className="
                h-14 
                border-b border-white/[0.08] 
                flex-none flex items-center px-6 
                backdrop-blur-2xl
                relative
                bg-gradient-to-r from-slate-900/80 via-[#050505]/80 to-black/80
            ">
                <h1 className="text-sm font-semibold text-white relative z-10 flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgb(139,92,246,0.5)] animate-pulse" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
                        {deckTitle}
                    </span>
                </h1>
            </header>

            {/* Main Body - Container principale con stile moderno */}
            <div className="flex-1 w-full h-full p-4 md:p-6 lg:p-8 overflow-hidden">
                {/* Wrapper dell'Area di Lavoro - Container moderno con gradiente radiale */}
                <div className="
                    h-full w-full 
                    rounded-3xl 
                    border border-white/[0.08]
                    backdrop-blur-2xl
                    overflow-hidden 
                    shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                    relative
                "
                style={{
                    background: 'radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.1) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.5) 100%)',
                }}
                >
                    <Group orientation="horizontal" className="h-full w-full">
                        {/* Pannello Sinistro - PDF Viewer */}
                        <Panel 
                            defaultSize={PANEL_SIZES.LEFT_DEFAULT} 
                            minSize={PANEL_SIZES.LEFT_MIN} 
                            className="h-full w-full overflow-hidden"
                        >
                            <PDFPanel pdfSrc={pdfSrc} />
                        </Panel>

                        {/* Resize Handle - Stile moderno discreto */}
                        <Separator className="
                            w-3 
                            opacity-0 hover:opacity-100 
                            bg-transparent hover:bg-white/[0.05] 
                            transition-all duration-300 
                            cursor-col-resize 
                            group relative
                        ">
                            <div className="
                                absolute inset-y-0 left-1/2 -translate-x-1/2 
                                w-0.5 
                                bg-violet-400/0 group-hover:bg-violet-400/40 
                                transition-all duration-300
                                shadow-lg shadow-violet-400/30
                            " />
                        </Separator>

                        {/* Pannello Destro - Tools (Flashcards & Chat) */}
                        <Panel 
                            defaultSize={PANEL_SIZES.RIGHT_DEFAULT} 
                            minSize={PANEL_SIZES.RIGHT_MIN} 
                            className="h-full overflow-hidden border-l border-white/[0.08]"
                        >
                            <StudySidebar
                                deck={deck}
                                pdfSrc={pdfSrc}
                                onAddCard={handleAddCard}
                                onUpdateCard={handleUpdateCard}
                                compactMode={true}
                            />
                        </Panel>
                    </Group>
                </div>
            </div>
        </div>
    );
});

CinemaLayout.displayName = 'CinemaLayout';
