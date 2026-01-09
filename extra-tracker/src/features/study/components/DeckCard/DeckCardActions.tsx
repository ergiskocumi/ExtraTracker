import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Play, BookOpen } from 'lucide-react';
import type { Deck } from '../../services/studyService';

interface DeckCardActionsProps {
    deck: Deck;
    totalCards: number;
    hasDueCards: boolean;
    hasPdf: boolean;
    onStudy: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onSplitStudy: (deckId: string) => void;
}

export const DeckCardActions: React.FC<DeckCardActionsProps> = ({
    deck,
    totalCards,
    hasDueCards,
    hasPdf,
    onStudy,
    onMagicGenerate,
    onAddCard,
    onSplitStudy,
}) => {
    return (
        <div className="space-y-2 sm:space-y-2.5 mt-auto">
            {/* Primary CTA: Study / Review / Magic Generate */}
            {totalCards === 0 ? (
                // Deck vuoto: Magic Generate prominente + Aggiungi carta
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMagicGenerate(deck);
                        }}
                        className="
                            w-full flex items-center justify-center gap-2 sm:gap-2.5 
                            px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                            font-semibold text-sm sm:text-base transition-all
                            bg-gradient-to-r from-amber-500 to-orange-600 text-white 
                            shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40
                            active:scale-[0.98] touch-manipulation
                            min-h-[48px] sm:min-h-[52px]
                        "
                    >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>✨ magic Generate</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddCard(deck.id);
                        }}
                        className="
                            w-full flex items-center justify-center gap-2 sm:gap-2.5 
                            px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                            font-semibold text-sm sm:text-base transition-all
                            bg-gradient-to-r from-violet-500/80 to-violet-600/80 text-white 
                            border border-violet-500/30
                            hover:from-violet-500 hover:to-violet-600
                            active:scale-[0.98] touch-manipulation
                            min-h-[48px] sm:min-h-[52px]
                        "
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>Aggiungi carta</span>
                    </button>
                </>
            ) : (
                // Deck con carte: Studia/Ripassa + Add via AI sempre visibile
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStudy(deck.id);
                        }}
                        className={`
                            w-full flex items-center justify-center gap-2 sm:gap-2.5 
                            px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                            font-semibold text-sm sm:text-base transition-all
                            active:scale-[0.98] touch-manipulation
                            min-h-[48px] sm:min-h-[52px]
                            ${hasDueCards
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                : 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35'
                            }
                        `}
                    >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>{hasDueCards ? 'Ripassa Ora' : 'Studia'}</span>
                    </button>
                    
                    {/* Add via AI - Sempre visibile per mazzi con carte */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMagicGenerate(deck);
                            }}
                            className="
                                flex-1 flex items-center justify-center gap-1.5 sm:gap-2 
                                px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl
                                font-medium text-xs sm:text-sm transition-all
                                bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white 
                                border border-amber-500/30
                                hover:from-amber-500 hover:to-orange-500
                                active:scale-[0.98] touch-manipulation
                                min-h-[40px] sm:min-h-[44px]
                            "
                        >
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="hidden sm:inline">➕ Add via AI</span>
                            <span className="sm:hidden">➕ AI</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddCard(deck.id);
                            }}
                            className="
                                flex-1 flex items-center justify-center gap-1.5 sm:gap-2 
                                px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl
                                font-medium text-xs sm:text-sm transition-all
                                bg-gradient-to-r from-violet-500/80 to-violet-600/80 text-white 
                                border border-violet-500/30
                                hover:from-violet-500 hover:to-violet-600
                                active:scale-[0.98] touch-manipulation
                                min-h-[40px] sm:min-h-[44px]
                            "
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="hidden sm:inline">Aggiungi carta</span>
                            <span className="sm:hidden">➕</span>
                        </button>
                    </div>
                </>
            )}

            {/* Secondary CTA: Split Study (if PDF exists) */}
            {hasPdf && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSplitStudy(deck.id);
                    }}
                    className="
                        w-full flex items-center justify-center gap-2 sm:gap-2.5 
                        px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                        font-semibold text-sm sm:text-base transition-all
                        bg-gradient-to-r from-blue-500/90 to-indigo-500/90 
                        text-white shadow-lg shadow-blue-500/20
                        hover:from-blue-500 hover:to-indigo-500
                        active:scale-[0.98] touch-manipulation
                        min-h-[48px] sm:min-h-[52px]
                    "
                >
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="hidden sm:inline">📖 Leggi & Studia</span>
                    <span className="sm:hidden">Leggi & Studia</span>
                </button>
            )}
        </div>
    );
};
