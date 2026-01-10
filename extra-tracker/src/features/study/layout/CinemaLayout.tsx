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
            <div className="h-full w-full flex items-center justify-center text-white/40">
                <p>Nessun PDF disponibile</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-hidden">
            <FluidPDFViewer pdfUrl={pdfSrc} />
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
            {/* Header - Altezza fissa */}
            <header className="h-12 border-b border-white/10 flex-none flex items-center px-4 bg-zinc-950">
                <h1 className="text-sm font-semibold text-white/90">{deck.title}</h1>
            </header>

            {/* Main Body - Container principale con padding per "stacco" visivo */}
            <div className="flex-1 w-full h-full p-4 md:p-6 overflow-hidden">
                {/* Wrapper dell'Area di Lavoro - La "Scatola" fluttuante */}
                <div className="h-full w-full rounded-[2rem] border border-white/10 bg-[#0F0F0F] shadow-2xl overflow-hidden ring-1 ring-white/5">
                    <Group orientation="horizontal" className="h-full w-full">
                        {/* Pannello Sinistro - PDF Viewer */}
                        <Panel 
                            defaultSize={PANEL_SIZES.LEFT_DEFAULT} 
                            minSize={PANEL_SIZES.LEFT_MIN} 
                            className="h-full w-full overflow-hidden"
                        >
                            <PDFPanel pdfSrc={pdfSrc} />
                        </Panel>

                        {/* Resize Handle - Invisibile fino a hover */}
                        <Separator className="w-2 opacity-0 hover:opacity-100 bg-transparent hover:bg-white/5 transition-all cursor-col-resize group relative">
                            <div className="absolute inset-y-0 left-1/2 w-px bg-white/0 group-hover:bg-white/20 transition-colors" />
                        </Separator>

                        {/* Pannello Destro - Tools (Flashcards & Chat) */}
                        <Panel 
                            defaultSize={PANEL_SIZES.RIGHT_DEFAULT} 
                            minSize={PANEL_SIZES.RIGHT_MIN} 
                            className="h-full overflow-hidden border-l border-white/10"
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
