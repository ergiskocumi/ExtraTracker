/**
 * 🎬 CINEMA LAYOUT - Split View "No-Box" Architecture
 * 
 * Layout strutturale per vista cinema con PDF e tools side-by-side.
 * 
 * Clean Code Principles:
 * - Single Responsibility: gestisce solo il layout strutturale
 * - Separation of Concerns: layout separato dalla logica di business
 * - DRY: costanti riutilizzabili per stili comuni
 * 
 * Filosofia "No-Box":
 * - Nessun wrapper inutile
 * - Width/Height sempre espliciti (100vw, 100vh, 100%)
 * - Overflow rigoroso: solo il pannello scrolla, mai la pagina
 */

import React from 'react';
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
// SUB-COMPONENTS
// ============================================

interface PDFPanelProps {
    pdfSrc: string | null;
}

const PDFPanel: React.FC<PDFPanelProps> = ({ pdfSrc }) => {
    if (!pdfSrc) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/40 gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-sm">Nessun PDF disponibile</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden p-4">
            <div className="h-full w-full rounded-2xl overflow-hidden border border-violet-500/20 bg-zinc-950/50 shadow-inner">
                <FluidPDFViewer pdfUrl={pdfSrc} />
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CinemaLayout: React.FC<CinemaLayoutProps> = ({
    deck,
    pdfSrc,
    onAddCard,
    onUpdateCard,
}) => {
    return (
        <div className="fixed inset-0 h-screen w-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
            {/* Header - Altezza fissa con stile viola */}
            <header className="
                h-14 
                border-b border-violet-500/30 
                flex-none flex items-center px-6 
                bg-gradient-to-r from-zinc-950 via-zinc-950 to-zinc-950
                backdrop-blur-sm
                relative
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-violet-500/5 before:via-transparent before:to-transparent before:pointer-events-none
            ">
                <h1 className="text-sm font-semibold text-white/90 relative z-10 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    {deck.title}
                </h1>
            </header>

            {/* Main Body - Container principale con padding per "stacco" visivo */}
            <div className="flex-1 w-full h-full p-4 md:p-6 lg:p-8 overflow-hidden">
                {/* Wrapper dell'Area di Lavoro - Container viola elegante */}
                <div className="
                    h-full w-full 
                    rounded-3xl 
                    border-2 border-violet-500/60 
                    bg-gradient-to-br from-zinc-900/95 via-zinc-950/98 to-zinc-900/95
                    shadow-2xl shadow-violet-500/20
                    overflow-hidden 
                    ring-2 ring-violet-500/30
                    backdrop-blur-sm
                    relative
                    before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-violet-500/5 before:via-transparent before:to-violet-500/5 before:pointer-events-none
                ">
                    <Group orientation="horizontal" className="h-full w-full">
                        {/* Pannello Sinistro - PDF Viewer */}
                        <Panel 
                            defaultSize={PANEL_SIZES.LEFT_DEFAULT} 
                            minSize={PANEL_SIZES.LEFT_MIN} 
                            className="h-full w-full overflow-hidden bg-zinc-900/30"
                        >
                            <PDFPanel pdfSrc={pdfSrc} />
                        </Panel>

                        {/* Resize Handle - Stile viola elegante */}
                        <Separator className="
                            w-3 
                            opacity-0 hover:opacity-100 
                            bg-transparent hover:bg-violet-500/10 
                            transition-all duration-300 
                            cursor-col-resize 
                            group relative
                        ">
                            <div className="
                                absolute inset-y-0 left-1/2 -translate-x-1/2 
                                w-0.5 
                                bg-violet-400/0 group-hover:bg-violet-400/60 
                                transition-all duration-300
                                shadow-lg shadow-violet-400/50
                            " />
                        </Separator>

                        {/* Pannello Destro - Tools (Flashcards & Chat) */}
                        <Panel 
                            defaultSize={PANEL_SIZES.RIGHT_DEFAULT} 
                            minSize={PANEL_SIZES.RIGHT_MIN} 
                            className="h-full overflow-hidden border-l border-violet-500/20 bg-zinc-900/20"
                        >
                            <StudySidebar
                                deck={deck}
                                pdfSrc={pdfSrc}
                                onAddCard={onAddCard}
                                onUpdateCard={onUpdateCard}
                                compactMode={true}
                            />
                        </Panel>
                    </Group>
                </div>
            </div>
        </div>
    );
};
