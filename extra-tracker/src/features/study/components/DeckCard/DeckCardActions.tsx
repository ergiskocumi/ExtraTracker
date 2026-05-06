import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Play, Monitor } from 'lucide-react';
import type { Deck } from '../../services/studyService';

interface DeckCardActionsProps {
    deck: Deck;
    totalCards: number;
    hasDueCards: boolean;
    hasPdf: boolean;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
}

export const DeckCardActions: React.FC<DeckCardActionsProps> = ({
    deck,
    totalCards,
    hasDueCards,
    hasPdf,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
}) => {
    const primaryButtonBaseClass = `
        study-deck-primary-btn
        w-full flex items-center justify-center gap-2
        px-3 py-2.5 rounded-xl
        font-semibold text-sm transition-all
        active:scale-[0.98] touch-manipulation
        min-h-[44px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45 focus-visible:ring-offset-2
    `;

    const secondaryButtonBaseClass = `
        study-deck-secondary-btn
        flex items-center justify-center gap-1.5
        px-2 py-2 rounded-lg
        font-medium text-xs transition-all
        active:scale-[0.95] touch-manipulation
        min-h-[36px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2
    `;

    return (
        <div className="space-y-2 sm:space-y-2.5 mt-auto">
            {/* Primary CTA: Study / Review / Magic Generate */}
            {totalCards === 0 ? (
                // Deck vuoto: Magic Generate principale + Aggiungi carta piccolo
                <>
                    {/* Pulsante principale - Ben visibile con effetto glitterato intenso */}
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMagicGenerate(deck);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`${primaryButtonBaseClass} study-deck-primary-btn--ai relative overflow-hidden`}
                    >
                        {/* Effetto shimmer glitterato arancione */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                transform: 'skewX(-20deg)',
                            }}
                        />
                        
                        {/* Multiple shimmer layers per effetto più intenso */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent"
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'linear',
                                delay: 0.5,
                            }}
                            style={{
                                transform: 'skewX(-15deg)',
                            }}
                        />
                        
                        
                        {/* Contenuto del pulsante */}
                        <span className="relative z-10 flex items-center gap-2 sm:gap-2.5 truncate">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <span className="truncate">Genera con AI</span>
                        </span>
                    </motion.button>
                    
                    {/* Pulsante secondario - Piccolo e semi-trasparente */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddCard(deck.id);
                        }}
                        className="study-deck-secondary-btn study-deck-secondary-btn--wide w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-[0.95] touch-manipulation min-h-[36px] sm:min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2"
                        title="Aggiungi carta"
                    >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Aggiungi carta</span>
                    </button>
                </>
            ) : (
                // Deck con carte
                <>
                    {hasPdf && onRead ? (
                        // CASO A: Deck con PDF - "Studia (Cinema Mode)" come principale
                        <>
                            {/* Pulsante principale - "Studia (Cinema Mode)" */}
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRead(deck.id);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`${primaryButtonBaseClass} study-deck-primary-btn--focus`}
                            >
                                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span>Focus & Flow</span>
                            </motion.button>
                            
                            {/* Pulsanti secondari - Piccoli e semi-trasparenti */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStudy(deck.id);
                                    }}
                                    className={`${secondaryButtonBaseClass} study-deck-secondary-btn--compact flex-1`}
                                    title="Ripassa (Flashcards)"
                                >
                                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Ripassa</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMagicGenerate(deck);
                                    }}
                                    className={`${secondaryButtonBaseClass} study-deck-secondary-btn--compact study-deck-secondary-btn--ai flex-1 text-[9px] sm:text-[10px] text-center leading-tight`}
                                    title="Magic AI"
                                >
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Magic AI</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddCard(deck.id);
                                    }}
                                    className={`${secondaryButtonBaseClass} study-deck-secondary-btn--compact flex-1`}
                                    title="Aggiungi carta"
                                >
                                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Aggiungi</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        // CASO B: Deck senza PDF - "Ripassa Ora"/"Studia" come principale
                        <>
                            {/* Pulsante principale - "Ripassa Ora"/"Studia" */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStudy(deck.id);
                                }}
                                className={`
                                    ${primaryButtonBaseClass}
                                    ${hasDueCards
                                        ? 'study-deck-primary-btn--review-urgent'
                                        : 'study-deck-primary-btn--review-calm'
                                    }
                                `}
                            >
                                <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span>{hasDueCards ? 'Ripassa Ora' : 'Studia'}</span>
                            </button>
                            
                            {/* Pulsanti secondari - Piccoli e semi-trasparenti */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMagicGenerate(deck);
                                    }}
                                    className={`${secondaryButtonBaseClass} study-deck-secondary-btn--compact study-deck-secondary-btn--ai w-full sm:flex-1`}
                                    title="Genera con AI"
                                >
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="truncate">AI</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddCard(deck.id);
                                    }}
                                    className={`${secondaryButtonBaseClass} study-deck-secondary-btn--compact w-full sm:flex-1`}
                                    title="Aggiungi carta"
                                >
                                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Aggiungi</span>
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
