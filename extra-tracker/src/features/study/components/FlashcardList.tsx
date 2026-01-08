import React from 'react';
import { FiPlus } from 'react-icons/fi';
import type { Deck } from '../services/studyService';
import { FlashcardItem } from './FlashcardItem';

interface FlashcardListProps {
    deck: Deck;
    onAddCard: () => void;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    showHeader?: boolean;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({
    deck,
    onAddCard,
    onUpdate,
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
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/20"
                        aria-label="Aggiungi carta"
                        title="Aggiungi carta"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex-1 p-4 overflow-auto">
                {deck.cards.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-white/70">
                        Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deck.cards.map((card) => (
                            <FlashcardItem key={card.id} card={card} onUpdate={onUpdate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardList;
