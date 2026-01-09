import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';
import type { Deck, Card } from '../services/studyService';
import { FlashcardItem } from './FlashcardItem';

interface FlashcardListProps {
    deck: Deck;
    onAddCard: () => void;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onCardClick?: (card: Card) => void;
    showHeader?: boolean;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({
    deck,
    onAddCard,
    onUpdate,
    onCardClick,
    showHeader = false,
}) => {
    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-white/50">
                        {deck.cards.length} carte
                    </p>
                    <button
                        onClick={onAddCard}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/20 hover:from-primary-400 hover:to-primary-500 transition-all active:scale-95"
                        aria-label="Aggiungi carta"
                        title="Aggiungi carta"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex-1 p-3 md:p-4 overflow-y-auto overscroll-contain">
                {deck.cards.length === 0 ? (
                    <div className="rounded-2xl md:rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
                        <p className="text-sm md:text-base text-white/70">
                            Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 md:space-y-4">
                        <AnimatePresence mode="popLayout">
                            {deck.cards.map((card) => (
                                <FlashcardItem 
                                    key={card.id} 
                                    card={card} 
                                    onUpdate={onUpdate}
                                    onClick={() => onCardClick?.(card)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardList;
