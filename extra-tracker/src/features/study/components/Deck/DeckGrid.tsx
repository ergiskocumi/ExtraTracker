import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Deck, Tag } from '../../services/studyService';

// Import DeckCard from the main file for now (will be extracted later if needed)
// This is a wrapper component for the grid layout

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    tags?: Tag[];
    onTogglePin?: (deck: Deck) => void;
}

interface DeckGridProps {
    decks: Deck[];
    tags?: Tag[];
    DeckCardComponent: React.ComponentType<DeckCardProps>;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    isFolderSelected?: boolean;
    onTogglePin?: (deck: Deck) => void;
    viewMode?: 'grid' | 'list';
}

export const DeckGrid: React.FC<DeckGridProps> = ({
    decks,
    tags = [],
    DeckCardComponent,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onExamSolver,
    isFolderSelected = false,
    onTogglePin,
    viewMode = 'grid',
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
            className={
                viewMode === 'list'
                    ? 'space-y-3 sm:space-y-4'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'
            }
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
                            onRead={onRead}
                            onMagicGenerate={onMagicGenerate}
                            onAddCard={onAddCard}
                            onViewDetail={onViewDetail}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            onExamSolver={onExamSolver}
                            tags={tags}
                            onTogglePin={onTogglePin}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};
