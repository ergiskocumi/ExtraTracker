/**
 * 📋 DECK DETAIL PAGE - Vista completa delle Flashcard
 * 
 * Mostra tutte le card di un mazzo in una griglia modificabile.
 * 
 * Features:
 * - Griglia di card con domanda/risposta
 * - Modifica inline delle card
 * - Eliminazione card con conferma
 * - Filtri per stato (nuove, da ripassare, padroneggiate)
 * - Aggiunta rapida di nuove card
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollToTop } from '../../../shared/hooks/useScrollToTop';
import {
    FiArrowLeft,
    FiPlay,
    FiZap,
    FiBookOpen,
    FiSearch,
    FiAlertCircle,
    FiBarChart2,
    FiSettings,
    FiFileText
} from 'react-icons/fi';
import { studyService, type Deck, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { DeckAnalytics } from '../components/Deck/DeckAnalytics';
import { DeckSettings } from '../components/Deck/DeckSettings';
import { DeckNotifications } from '../components/Deck/DeckNotifications';
import { FlashcardList } from '../components/Flashcard/FlashcardList';
import { ExamSolverModal, type ExamSolverStats } from '../components/Modals/ExamSolver';

// ============================================
// FILTER TABS
// ============================================

type FilterType = 'all' | 'new' | 'learning' | 'review' | 'mastered';

interface FilterTabsProps {
    active: FilterType;
    onChange: (filter: FilterType) => void;
    counts: Record<FilterType, number>;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ active, onChange, counts }) => {
    const tabs: { key: FilterType; label: string; color: string }[] = [
        { key: 'all', label: 'Tutte', color: 'text-white/70' },
        { key: 'new', label: 'Nuove', color: 'text-blue-400' },
        { key: 'learning', label: 'Studio', color: 'text-amber-400' },
        { key: 'review', label: 'Ripasso', color: 'text-purple-400' },
        { key: 'mastered', label: 'Padroneggiate', color: 'text-emerald-400' },
    ];

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                        ${active === tab.key 
                            ? 'bg-white/[0.1] ' + tab.color
                            : 'text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                        }
                    `}
                >
                    {tab.label}
                    <span className={`text-xs ${active === tab.key ? 'opacity-100' : 'opacity-50'}`}>
                        {counts[tab.key]}
                    </span>
                </button>
            ))}
        </div>
    );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export const DeckDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'cards' | 'analytics' | 'settings'>('cards');

    // Modal state
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
    const [isExamSolverOpen, setIsExamSolverOpen] = useState(false);

    // Load deck
    const loadDeck = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const deckData = await studyService.getDeckById(id);
            setDeck(deckData);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento del mazzo');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDeck();
    }, [loadDeck]);

    // Scroll to top when navigating to this page or when deck ID changes
    useScrollToTop([id]);

    // Filtered cards
    const filteredCards = deck?.cards.filter(card => {
        // Filter by status
        if (filter !== 'all' && card.status !== filter) return false;
        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return card.front.toLowerCase().includes(query) || 
                   card.back.toLowerCase().includes(query);
        }
        return true;
    }) || [];

    // Counts
    const counts: Record<FilterType, number> = {
        all: deck?.cards.length || 0,
        new: deck?.cards.filter(c => c.status === 'new').length || 0,
        learning: deck?.cards.filter(c => c.status === 'learning').length || 0,
        review: deck?.cards.filter(c => c.status === 'review').length || 0,
        mastered: deck?.cards.filter(c => c.status === 'mastered').length || 0,
    };

    // Handlers
    const handleAddCard = async (front: string, back: string) => {
        if (!id) return;
        try {
            const updatedDeck = await studyService.addCard(id, { front, back });
            setDeck(updatedDeck);
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message);
        }
    };

    const handleEditCard = async (cardId: string, front: string, back: string) => {
        if (!id) return;
        try {
            const updatedDeck = await studyService.updateCard(id, cardId, { front, back });
            setDeck(updatedDeck);
            emitToast.success('Carta modificata!');
        } catch (err: any) {
            emitToast.error(err.message);
        }
    };

    const handleDeleteCard = async () => {
        if (!id || !deletingCardId) return;
        try {
            const updatedDeck = await studyService.deleteCard(id, deletingCardId);
            setDeck(updatedDeck);
            setDeletingCardId(null);
            emitToast.success('Carta eliminata!');
        } catch (err: any) {
            emitToast.error(err.message);
        }
    };


    // ========== RENDER ==========

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !deck) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <FiAlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-white/60">{error || 'Mazzo non trovato'}</p>
                <button
                    onClick={() => navigate('/study')}
                    className="px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
                >
                    Torna ai Mazzi
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate('/study')}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">
                                {deck.title}
                            </h1>
                            {deck.description && (
                                <p className="text-sm text-white/50 mt-0.5">{deck.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsExamSolverOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium shadow-lg shadow-amber-500/30 transition-all"
                            >
                                <FiFileText className="w-4 h-4" />
                                <span className="hidden sm:inline">Exam Solver</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/study/${id}`)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 transition-all"
                            >
                                <FiPlay className="w-4 h-4" />
                                <span className="hidden sm:inline">Studia il mazzo</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 text-sm text-white/50 mb-4">
                        <div className="flex items-center gap-2">
                            <FiBookOpen className="w-4 h-4" />
                            <span>{deck.totalCards} carte</span>
                        </div>
                        {deck.dueCount > 0 && (
                            <div className="flex items-center gap-2 text-orange-400">
                                <FiZap className="w-4 h-4" />
                                <span>{deck.dueCount} da ripassare</span>
                            </div>
                        )}
                    </div>

                    {/* Notifiche Carte in Scadenza */}
                    {deck.dueCount > 0 && (
                        <DeckNotifications
                            deckId={deck.id}
                            dueCardsCount={deck.dueCount}
                            deckTitle={deck.title}
                        />
                    )}

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-6 border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('cards')}
                            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                                activeTab === 'cards'
                                    ? 'border-primary-500 text-primary-400'
                                    : 'border-transparent text-white/50 hover:text-white/70'
                            }`}
                        >
                            Carte
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
                                activeTab === 'analytics'
                                    ? 'border-primary-500 text-primary-400'
                                    : 'border-transparent text-white/50 hover:text-white/70'
                            }`}
                        >
                            <FiBarChart2 className="w-4 h-4" />
                            Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
                                activeTab === 'settings'
                                    ? 'border-primary-500 text-primary-400'
                                    : 'border-transparent text-white/50 hover:text-white/70'
                            }`}
                        >
                            <FiSettings className="w-4 h-4" />
                            Impostazioni
                        </button>
                    </div>

                    {/* Filters & Search - Solo per tab Cards */}
                    {activeTab === 'cards' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                            <FilterTabs active={filter} onChange={setFilter} counts={counts} />
                            <div className="relative flex-1 max-w-sm">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cerca carte..."
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}
                </header>

                {/* Tab Content */}
                {activeTab === 'cards' && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden min-h-[600px]">
                        <FlashcardList
                            deck={deck}
                            filteredCards={filteredCards.length > 0 || searchQuery ? filteredCards : undefined}
                            viewMode="grid"
                            onAddCard={async () => {
                                const front = window.prompt('Domanda:');
                                if (!front?.trim()) return;
                                const back = window.prompt('Risposta:');
                                if (!back?.trim()) return;
                                await handleAddCard(front.trim(), back.trim());
                            }}
                            onUpdate={handleEditCard}
                                        onDelete={setDeletingCardId}
                            onDeckUpdate={(updatedDeck) => {
                                setDeck(updatedDeck);
                            }}
                        />
                            </div>
                )}

                {activeTab === 'analytics' && id && (
                    <div className="max-w-5xl mx-auto">
                        <DeckAnalytics deckId={id} />
                    </div>
                )}

                {activeTab === 'settings' && deck && (
                    <div className="max-w-3xl mx-auto">
                        <DeckSettings 
                            deck={deck} 
                            onUpdate={async (updatedDeck) => {
                                // Aggiorna lo stato locale
                                setDeck(updatedDeck);
                                // Ricarica il deck dal server per avere i dati aggiornati
                                await loadDeck();
                            }} 
                        />
                    </div>
                )}

                {/* Modals */}
                <ConfirmationModal
                    isOpen={!!deletingCardId}
                    title="Elimina Carta"
                    description="Sei sicuro di voler eliminare questa carta? L'azione non può essere annullata."
                    confirmLabel="Elimina"
                    destructive
                    onConfirm={handleDeleteCard}
                    onCancel={() => setDeletingCardId(null)}
                />

                <ExamSolverModal
                    isOpen={isExamSolverOpen}
                    onClose={() => setIsExamSolverOpen(false)}
                    onSuccess={async (deckId, stats) => {
                        await loadDeck();
                        emitToast.success(
                            `✅ Exam Solver completato! ${stats.totalFlashcards} flashcard generate (${stats.answersFound} risposte trovate, ${stats.answersNotFound} non trovate)`,
                            { title: 'Exam Solver', duration: 5000 }
                        );
                    }}
                    existingDecks={deck ? [{ id: deck.id, title: deck.title }] : []}
                    goalId={deck?.goalId}
                    preselectedDeckId={deck?.id}
                />
            </div>
        </div>
    );
};

export default DeckDetailPage;
