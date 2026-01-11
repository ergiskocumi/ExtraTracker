import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DeckSkeleton } from '../DeckSkeleton';
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
    isFolderSelected?: boolean;
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
    isFolderSelected = false,
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                    <DeckSkeleton key={i} />
                ))}
            </div>
        );
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
                    className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (decks.length === 0) {
        return <DashboardEmptyState onCreateDeck={onCreateDeck} />;
    }

    if (filteredDecks.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-white/50 text-lg">
                    Nessun mazzo corrisponde ai filtri
                </p>
                <button
                    onClick={onFilterReset}
                    className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10"
                >
                    Mostra tutti
                </button>
            </div>
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
            onUpdate={onUpdate}
            isFolderSelected={isFolderSelected}
        />
    );
};
