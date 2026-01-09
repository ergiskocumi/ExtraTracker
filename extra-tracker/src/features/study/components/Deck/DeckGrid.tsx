import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Deck, Tag } from '../../services/studyService';

// Import DeckCard from the main file for now (will be extracted later if needed)
// This is a wrapper component for the grid layout

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onSplitStudy: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    tags?: Tag[];
}

interface DeckGridProps {
    decks: Deck[];
    tags?: Tag[];
    DeckCardComponent: React.ComponentType<DeckCardProps>;
    onStudy: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onSplitStudy: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    isFolderSelected?: boolean;
}

export const DeckGrid: React.FC<DeckGridProps> = ({
    decks,
    tags = [],
    DeckCardComponent,
    onStudy,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onSplitStudy,
    onDelete,
    onUpdate,
    isFolderSelected = false,
}) => {
    if (decks.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-white/50 text-lg">
                    Nessun mazzo corrisponde ai filtri
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
        >
            <AnimatePresence mode="popLayout">
                {decks.map((deck, index) => (
                    <motion.div
                        key={deck.id}
                        initial={{ 
                            opacity: 0, 
                            y: isFolderSelected ? 100 : 20,
                            scale: isFolderSelected ? 0.9 : 1
                        }}
                        animate={{ 
                            opacity: 1, 
                            y: 0,
                            scale: 1
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                            delay: index * 0.05,
                            duration: isFolderSelected ? 0.5 : 0.3,
                            ease: isFolderSelected ? 'easeOut' : 'easeInOut'
                        }}
                    >
                        <DeckCardComponent
                            deck={deck}
                            onStudy={onStudy}
                            onMagicGenerate={onMagicGenerate}
                            onAddCard={onAddCard}
                            onViewDetail={onViewDetail}
                            onSplitStudy={onSplitStudy}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            tags={tags}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};
