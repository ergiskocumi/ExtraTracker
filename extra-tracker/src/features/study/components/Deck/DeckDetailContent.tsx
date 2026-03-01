/**
 * DECK DETAIL CONTENT - Contenuto principale della pagina dettaglio mazzo
 * 
 * Layout:
 * - Header con statistiche (DeckDetailHeader)
 * - Area principale con griglia card
 * - Sidebar con statistiche e azioni
 * - Editor modale per modificare le carte
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    AlertCircle,
    Sparkles,
    Settings,
    Download,
    Share2,
    RotateCcw,
} from 'lucide-react';
import type { Deck, Card } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { DeckDetailHeader } from './DeckDetailHeader';
import { DeckStatsPanel } from './DeckStatsPanel';
import { DeckCardFilters, type FilterStatus, type SortOption } from './DeckCardFilters';
import { CardEditorModal } from './CardEditorModal';
import { FlashcardItem } from '../Flashcard/FlashcardItem';

// ============================================
// TYPES
// ============================================

interface DeckDetailContentProps {
    deck: Deck;
    onBack: () => void;
    onStudy: () => void;
    onGenerateQuiz?: () => void;
    onExamSolver?: () => void;
    onReadPdf?: () => void;
    onMagicGenerate?: () => void;
    onDeckUpdate: (deck: Deck) => void;
    onDeleteDeck?: () => void;
    onSettings?: () => void;
    onExport?: () => void;
    onShare?: () => void;
    onResetProgress?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const DeckDetailContent: React.FC<DeckDetailContentProps> = ({
    deck,
    onBack,
    onStudy,
    onGenerateQuiz,
    onExamSolver,
    onReadPdf,
    onMagicGenerate,
    onDeckUpdate,
    onDeleteDeck,
    onSettings,
    onExport,
    onShare,
    onResetProgress,
}) => {
    // Filter & sort state (solo vista lista)
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('order');

    // Editor State
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

    // Calculate stats
    const stats = useMemo(() => {
        const cards = deck.cards || [];
        return {
            all: cards.length,
            new: cards.filter(c => c.status === 'new').length,
            learning: cards.filter(c => c.status === 'learning').length,
            review: cards.filter(c => c.status === 'review').length,
            mastered: cards.filter(c => c.status === 'mastered').length,
        };
    }, [deck.cards]);

    // Filter and sort cards
    const filteredCards = useMemo(() => {
        let cards = [...(deck.cards || [])];

        // Apply status filter
        if (filter !== 'all') {
            cards = cards.filter(c => c.status === filter);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            cards = cards.filter(c => 
                c.front.toLowerCase().includes(query) ||
                c.back.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'alphabetical':
                cards.sort((a, b) => a.front.localeCompare(b.front));
                break;
            case 'created':
                cards.sort((a, b) => {
                    const aTs = new Date((a as Card & { createdAt?: string }).createdAt || 0).getTime();
                    const bTs = new Date((b as Card & { createdAt?: string }).createdAt || 0).getTime();
                    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
                });
                break;
            case 'interval':
                cards.sort((a, b) => b.interval - a.interval);
                break;
            case 'order':
            default:
                // Keep original order
                break;
        }

        return cards;
    }, [deck.cards, filter, searchQuery, sortBy]);

    // Handlers
    const handleAddCard = useCallback(() => {
        setEditingCard({
            id: 'temp-new',
            front: '',
            back: '',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        });
        setIsEditorOpen(true);
    }, []);

    const handleEditCard = useCallback((card: Card) => {
        setEditingCard(card);
        setIsEditorOpen(true);
    }, []);

    const handleSaveCard = useCallback(async (front: string, back: string) => {
        if (!editingCard) return;

        try {
            if (editingCard.id === 'temp-new') {
                // Create new card
                const updatedDeck = await studyService.addCard(deck.id, { front, back });
                onDeckUpdate(updatedDeck);
                emitToast.success('Carta aggiunta!');
            } else {
                // Update existing card
                const updatedDeck = await studyService.updateCard(deck.id, editingCard.id, { front, back });
                onDeckUpdate(updatedDeck);
                emitToast.success('Carta aggiornata!');
            }
            setIsEditorOpen(false);
            setEditingCard(null);
        } catch (error: any) {
            emitToast.error(error.message || 'Errore nel salvare la carta');
            throw error;
        }
    }, [editingCard, deck.id, onDeckUpdate]);

    const handleDeleteCard = useCallback(async () => {
        if (!deletingCardId) return;

        try {
            const updatedDeck = await studyService.deleteCard(deck.id, deletingCardId);
            onDeckUpdate(updatedDeck);
            emitToast.success('Carta eliminata!');
            setDeletingCardId(null);
            setIsEditorOpen(false);
            setEditingCard(null);
        } catch (error: any) {
            emitToast.error(error.message || 'Errore nell\'eliminare la carta');
        }
    }, [deletingCardId, deck.id, onDeckUpdate]);

    const handleEditorDelete = useCallback(() => {
        if (editingCard && editingCard.id !== 'temp-new') {
            setDeletingCardId(editingCard.id);
        }
    }, [editingCard]);

    // Find current card index for navigation
    const currentCardIndex = useMemo(() => {
        if (!editingCard || editingCard.id === 'temp-new') return -1;
        return deck.cards?.findIndex(c => c.id === editingCard.id) ?? -1;
    }, [editingCard, deck.cards]);

    const handleNavigateCard = useCallback((direction: 'prev' | 'next') => {
        if (currentCardIndex === -1) return;
        
        const newIndex = direction === 'prev' 
            ? currentCardIndex - 1 
            : currentCardIndex + 1;
        
        const cards = deck.cards || [];
        if (newIndex >= 0 && newIndex < cards.length) {
            // Save current card first
            setEditingCard(cards[newIndex]);
        }
    }, [currentCardIndex, deck.cards]);

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <DeckDetailHeader
                deck={deck}
                onBack={onBack}
                onStudy={onStudy}
                onGenerateQuiz={onGenerateQuiz}
                onExamSolver={onExamSolver}
                onAddCard={handleAddCard}
                onReadPdf={onReadPdf}
                onMagicGenerate={onMagicGenerate}
                onDeleteDeck={onDeleteDeck}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Cards Area */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Filters */}
                    <DeckCardFilters
                        activeFilter={filter}
                        onFilterChange={setFilter}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        counts={stats}
                    />

                    {/* Cards List */}
                    <div className="rounded-2xl border border-theme-default bg-theme-surface overflow-hidden min-h-[500px] p-4 sm:p-5 flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredCards.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="col-span-full flex flex-col items-center justify-center py-16 text-center"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-theme-surface border border-theme-default flex items-center justify-center mb-4">
                                        {searchQuery ? (
                                            <AlertCircle className="w-10 h-10 text-theme-muted" />
                                        ) : (
                                            <Sparkles className="w-10 h-10 text-primary-500/70" />
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-theme-primary mb-2">
                                        {searchQuery 
                                            ? 'Nessuna carta trovata'
                                            : filter !== 'all'
                                                ? `Nessuna carta ${filter}`
                                                : 'Nessuna carta'
                                        }
                                    </h3>
                                    <p className="text-sm text-theme-secondary max-w-sm mb-6">
                                        {searchQuery 
                                            ? 'Prova a modificare i termini di ricerca'
                                            : 'Crea la tua prima carta per iniziare a studiare'
                                        }
                                    </p>
                                    {!searchQuery && filter === 'all' && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleAddCard}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>Crea Prima Carta</span>
                                        </motion.button>
                                    )}
                                </motion.div>
                            ) : (
                                filteredCards.map((card, index) => (
                                    <motion.div
                                        key={card.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <FlashcardItem
                                            card={card}
                                            onUpdate={async (id, front, back) => {
                                                const updatedDeck = await studyService.updateCard(deck.id, id, { front, back });
                                                onDeckUpdate(updatedDeck);
                                            }}
                                            onClick={() => handleEditCard(card)}
                                            onDelete={setDeletingCardId}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Floating Add Button (mobile) */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddCard}
                        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white shadow-xl shadow-primary-500/40 flex items-center justify-center z-40"
                    >
                        <Plus className="w-6 h-6" />
                    </motion.button>
                </div>

                {/* Sidebar - Desktop */}
                <div className="hidden lg:block space-y-5">
                    <DeckStatsPanel
                        deck={deck}
                        onSettings={onSettings}
                        onExport={onExport}
                        onShare={onShare}
                        onResetProgress={onResetProgress}
                    />
                </div>
            </div>

            {/* Mobile Actions Drawer */}
            <div className="lg:hidden mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">
                    Azioni Rapide
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {onSettings && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onSettings}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-theme-card border border-theme-default text-theme-primary"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="text-sm">Impostazioni</span>
                        </motion.button>
                    )}
                    {onExport && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onExport}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-theme-card border border-theme-default text-theme-primary"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Esporta</span>
                        </motion.button>
                    )}
                    {onShare && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onShare}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-theme-card border border-theme-default text-theme-primary"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="text-sm">Condividi</span>
                        </motion.button>
                    )}
                    {onResetProgress && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={onResetProgress}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-theme-card border border-theme-default text-orange-600 dark:text-orange-300"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-sm">Reset</span>
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Card Editor Modal */}
            <CardEditorModal
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingCard(null);
                }}
                frontContent={editingCard?.front || ''}
                backContent={editingCard?.back || ''}
                onSave={handleSaveCard}
                onDelete={editingCard?.id !== 'temp-new' ? handleEditorDelete : undefined}
                title={editingCard?.id === 'temp-new' ? 'Nuova Carta' : 'Modifica Carta'}
                cardNumber={currentCardIndex !== -1 ? currentCardIndex + 1 : undefined}
                totalCards={deck.cards?.length}
                onNavigate={currentCardIndex !== -1 ? handleNavigateCard : undefined}
            />

            {/* Delete Confirmation */}
            {deletingCardId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-md p-6 rounded-2xl bg-theme-elevated border border-theme-default shadow-theme-lg"
                    >
                        <h3 className="text-lg font-bold text-theme-primary mb-2">Elimina Carta</h3>
                        <p className="text-theme-secondary text-sm mb-6">
                            Sei sicuro di voler eliminare questa carta? L'azione non può essere annullata.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeletingCardId(null)}
                                className="px-4 py-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-theme-default transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDeleteCard}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
                            >
                                Elimina
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default DeckDetailContent;
