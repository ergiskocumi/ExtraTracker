import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { Deck } from '../../services/studyService';

// ============================================
// TYPES
// ============================================

interface DeckCardPinButtonProps {
    deck: Deck;
    onTogglePin: (deck: Deck) => void;
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const DeckCardPinButton: React.FC<DeckCardPinButtonProps> = ({
    deck,
    onTogglePin,
    className = '',
}) => {
    const isPinned = deck.pinned === true;

    return (
        <motion.button
            onClick={(e) => {
                e.stopPropagation();
                onTogglePin(deck);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
                p-1.5 rounded-lg transition-all
                ${isPinned
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-theme-surface text-theme-muted hover:bg-theme-surface-hover hover:text-theme-primary border border-theme-subtle'
                }
                ${className}
            `}
            title={isPinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        >
            <Star 
                className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`}
            />
        </motion.button>
    );
};
