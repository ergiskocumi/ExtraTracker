import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { AnimatePresence } from 'framer-motion';
import type { Deck, Card } from '../../services/studyService';
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
                <div className="px-4 py-3 border-b border-white/[0.08] backdrop-blur-sm flex items-center justify-between flex-shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium">
                        {deck.cards.length} carte
                    </span>
                    <button
                        onClick={onAddCard}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300 active:scale-95"
                        aria-label="Aggiungi carta"
                        title="Aggiungi carta"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex-1 p-3 md:p-4 overflow-y-auto overscroll-contain">
                {deck.cards.length === 0 ? (
                    <div className="rounded-2xl md:rounded-3xl border border-white/[0.08] backdrop-blur-xl p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
                        }}
                    >
                        <p className="text-sm md:text-base text-slate-400">
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
