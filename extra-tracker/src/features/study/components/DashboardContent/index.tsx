import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { DeckGridSkeleton } from '../../../../shared/components/skeleton';
import { DashboardEmptyState } from '../Dashboard/DashboardEmptyState';
import { DeckGrid } from '../Deck/DeckGrid';
import { DeckCard } from '../DeckCard';
import type { Deck, Tag } from '../../services/studyService';

interface DashboardContentProps {
    isLoading: boolean;
    error: string | null;
    decks: Deck[];
    filteredDecks: Deck[];
    tags: Tag[];
    filter: 'all' | 'due' | 'mastered' | 'recent';
    searchQuery: string;
    onRetry: () => void;
    onCreateDeck: () => void;
    onFilterReset: () => void;
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
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
    isLoading,
    error,
    decks,
    filteredDecks,
    tags,
    filter,
    searchQuery,
    onRetry,
    onCreateDeck,
    onFilterReset,
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
}) => {
    if (isLoading) {
        return <DeckGridSkeleton count={6} />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <p className="text-white/60 mb-6 text-lg">{error}</p>
                <button
                    onClick={onRetry}
                    className="px-6 py-3 rounded-xl bg-theme-elevated text-theme-primary hover:bg-theme-surface transition-all"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (decks.length === 0) {
        return (
            <DashboardEmptyState 
                onCreateDeck={onCreateDeck}
            />
        );
    }

    if (filteredDecks.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
            >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-theme-surface border border-theme-default flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-theme-muted" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                    Nessun mazzo corrisponde ai filtri
                </h3>
                <p className="text-white/50 text-sm sm:text-base mb-6 max-w-md">
                    {searchQuery 
                        ? `Nessun risultato per "${searchQuery}"`
                        : filter === 'due'
                        ? 'Non ci sono mazzi con carte da ripassare'
                        : filter === 'mastered'
                        ? 'Non ci sono mazzi completati'
                        : filter === 'recent'
                        ? 'Non ci sono mazzi recenti'
                        : 'Prova a modificare i filtri o la ricerca'
                    }
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={onFilterReset}
                        className="px-6 py-3 rounded-xl bg-theme-elevated text-theme-primary hover:bg-theme-surface transition-all font-medium"
                    >
                        Mostra tutti i mazzi
                    </button>
                    {decks.length === 0 && (
                        <button
                            onClick={onCreateDeck}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg shadow-primary-500/30 transition-all font-medium"
                        >
                            Crea il primo mazzo
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <DeckGrid
            decks={filteredDecks}
            tags={tags}
            DeckCardComponent={DeckCard}
            onStudy={onStudy}
            onRead={onRead}
            onMagicGenerate={onMagicGenerate}
            onAddCard={onAddCard}
            onViewDetail={onViewDetail}
            onDelete={onDelete}
            onExamSolver={onExamSolver}
            onUpdate={onUpdate}
            isFolderSelected={isFolderSelected}
            onTogglePin={onTogglePin}
        />
    );
};
