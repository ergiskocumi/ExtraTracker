/**
 * 📚 DECKS DASHBOARD PAGE - Bento Grid Premium Design
 * 
 * Ispirazione: Flashka.ai - Minimalista, cards fisiche, stats hero
 * 
 * Features:
 * - Hero stats section (Streak, Total Cards, Due Cards)
 * - Bento Grid layout per mazzi
 * - Cards con effetto "physical" e shadow eleganti
 * - Mini progress bars per mastery %
 * - Empty state accogliente
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus,
    FiPlay,
    FiLayers,
    FiClock,
    FiX,
    FiBookOpen,
    FiTag,
    FiAlertCircle,
    FiZap,
    FiTrash2,
    FiEye
} from 'react-icons/fi';
import { studyService, type Deck, type CreateDeckPayload, type AddCardPayload } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { CreateDeckModal } from '../components/CreateDeckModal';
import { MagicGenerateModal } from '../components/MagicGenerateModal';
import { StudyModeSelector, type StudyMode } from '../components/StudyModeSelector';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';

// ============================================
// HERO STATS COMPONENT - Bento Style
// ============================================

interface HeroStatsProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
}

const HeroStats: React.FC<HeroStatsProps> = ({ totalDecks, totalCards, dueCards }) => {
    const stats = [
        {
            label: 'Mazzi',
            value: totalDecks,
            icon: FiLayers,
            bgClass: 'bg-primary-500/15',
            textClass: 'text-primary-400',
            iconClass: 'text-primary-400',
            borderClass: 'border-primary-500/20',
        },
        {
            label: 'Carte Totali',
            value: totalCards,
            icon: FiBookOpen,
            bgClass: 'bg-blue-500/15',
            textClass: 'text-blue-400',
            iconClass: 'text-blue-400',
            borderClass: 'border-blue-500/20',
        },
        {
            label: 'Da Ripassare',
            value: dueCards,
            icon: FiClock,
            bgClass: dueCards > 0 ? 'bg-orange-500/15' : 'bg-white/[0.05]',
            textClass: dueCards > 0 ? 'text-orange-400' : 'text-white/50',
            iconClass: dueCards > 0 ? 'text-orange-400' : 'text-white/40',
            borderClass: dueCards > 0 ? 'border-orange-500/30 ring-2 ring-orange-500/10' : 'border-white/[0.08]',
            highlight: dueCards > 0,
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-10">
            {stats.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`
                        relative p-5 sm:p-6 rounded-2xl border transition-all duration-300
                        ${stat.bgClass} ${stat.borderClass}
                    `}
                >
                    <stat.icon className={`w-6 h-6 ${stat.iconClass} mb-3`} />
                    <p className={`text-2xl sm:text-3xl font-bold ${stat.textClass}`}>
                        {stat.value}
                    </p>
                    <p className="text-sm sm:text-base text-white/60 mt-1">{stat.label}</p>
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// DECK CARD COMPONENT - Physical Card Feel
// ============================================

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onAddCard: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, onStudy, onMagicGenerate, onViewDetail, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteryPercent = totalCards > 0 ? Math.round(((totalCards - (deck.dueCount ?? 0)) / totalCards) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                group relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-300
                ${hasDueCards 
                    ? 'border-orange-500/30 shadow-lg shadow-orange-500/10' 
                    : 'border-white/[0.08] hover:border-white/[0.15]'
                }
            `}
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}
        >
            {/* Hover Action Bar - Top */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-b from-black/60 to-transparent"
                    >
                        <button
                            onClick={() => onStudy(deck.id)}
                            disabled={totalCards === 0}
                            className="p-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/40 text-primary-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Studia"
                        >
                            <FiPlay className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onViewDetail(deck.id)}
                            className="p-2 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] text-white/80 transition-all"
                            title="Visualizza carte"
                        >
                            <FiEye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onMagicGenerate(deck)}
                            className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 transition-all"
                            title="✨ Magic Generate"
                        >
                            <FiZap className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(deck)}
                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
                            title="Elimina mazzo"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Due Badge */}
            {hasDueCards && (
                <div className="absolute top-3 right-3 z-10">
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold"
                    >
                        <FiZap className="w-3 h-3" />
                        {deck.dueCount}
                    </motion.span>
                </div>
            )}

            {/* Card Content - Clickable */}
            <div 
                className="p-6 cursor-pointer"
                onClick={() => onViewDetail(deck.id)}
            >
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                    <div className={`
                        p-3 rounded-xl transition-colors
                        ${hasDueCards ? 'bg-orange-500/15' : 'bg-primary-500/15'}
                    `}>
                        <FiLayers className={`w-6 h-6 ${hasDueCards ? 'text-orange-400' : 'text-primary-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                            {deck.title}
                        </h3>
                        {deck.description && (
                            <p className="text-sm text-white/50 mt-1 line-clamp-2">
                                {deck.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Mini Stats */}
                <div className="flex items-center gap-6 mb-5 text-sm text-white/50">
                    <div className="flex items-center gap-2">
                        <FiBookOpen className="w-4 h-4 text-white/40" />
                        <span>{totalCards} carte</span>
                    </div>
                    {deck.tags && deck.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <FiTag className="w-4 h-4 text-white/30" />
                            <span className="text-xs text-white/40">
                                {deck.tags.slice(0, 2).join(', ')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Mastery Progress Bar */}
                {totalCards > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/50">Padronanza</span>
                            <span className="text-sm font-medium text-white/70">{masteryPercent}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${masteryPercent === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                            />
                        </div>
                    </div>
                )}

                {/* Quick Action - Study Button */}
                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStudy(deck.id);
                        }}
                        disabled={totalCards === 0}
                        className={`
                            w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-medium transition-all text-sm
                            ${hasDueCards
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                                : totalCards > 0
                                    ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
                                    : 'bg-white/[0.03] text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        <FiPlay className="w-4 h-4" />
                        {hasDueCards ? 'Ripassa' : totalCards > 0 ? 'Studia' : 'Nessuna carta'}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// ADD CARD MODAL - Clean White Design
// ============================================

interface AddCardModalProps {
    isOpen: boolean;
    deckId: string | null;
    deckTitle: string;
    onClose: () => void;
    onSubmit: (deckId: string, data: AddCardPayload) => Promise<void>;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ 
    isOpen, 
    deckId, 
    deckTitle, 
    onClose, 
    onSubmit 
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!front.trim() || !back.trim() || !deckId) return;

        setIsSubmitting(true);
        try {
            await onSubmit(deckId, { front: front.trim(), back: back.trim() });
            setFront('');
            setBack('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFront('');
        setBack('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && deckId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.98) 100%)' }}
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-white/[0.08] flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Nuova Carta</h2>
                                <p className="text-sm text-white/50">{deckTitle}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Fronte (Domanda) <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={front}
                                    onChange={e => setFront(e.target.value)}
                                    placeholder="Cosa vuoi memorizzare?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Retro (Risposta) <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={back}
                                    onChange={e => setBack(e.target.value)}
                                    placeholder="La risposta..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-5 py-3.5 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all"
                                >
                                    Chiudi
                                </button>
                                <button
                                    type="submit"
                                    disabled={!front.trim() || !back.trim() || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {isSubmitting ? 'Aggiungendo...' : 'Aggiungi Carta'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// EMPTY STATE - Welcoming
// ============================================

const EmptyState: React.FC<{ onCreateDeck: () => void }> = ({ onCreateDeck }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
        <div className="w-20 h-20 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center mb-6">
            <FiLayers className="w-10 h-10 text-primary-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
            Inizia il tuo viaggio
        </h3>
        <p className="text-white/50 max-w-sm mb-8">
            Crea il tuo primo mazzo di flashcard e usa la ripetizione spaziata per ricordare tutto.
        </p>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateDeck}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 transition-all"
        >
            <FiPlus className="w-5 h-5" />
            Crea il Primo Mazzo
        </motion.button>
    </motion.div>
);

// ============================================
// SKELETON LOADER - Clean
// ============================================

const DeckSkeleton: React.FC = () => (
    <div 
        className="rounded-2xl border border-white/[0.08] p-5 animate-pulse"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
    >
        <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-white/10 rounded-lg" />
                <div className="w-1/2 h-3 bg-white/5 rounded-lg" />
            </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-3 bg-white/5 rounded-lg" />
        </div>
        <div className="h-1.5 bg-white/5 rounded-full mb-4" />
        <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-white/5 rounded-xl" />
            <div className="w-10 h-10 bg-white/5 rounded-xl" />
        </div>
    </div>
);

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [dueCardCount, setDueCardCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [isMagicGenerateOpen, setIsMagicGenerateOpen] = useState(false);
    const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
    const [studyDeck, setStudyDeck] = useState<Deck | null>(null);

    // Computed stats
    const totalCards = decks.reduce((sum, d) => sum + (d.totalCards ?? d.cards?.length ?? 0), 0);

    // Carica mazzi
    const loadDecks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const dashboardData = await studyService.getDashboard();
            setDecks(dashboardData.decks);
            setDueCardCount(dashboardData.dueCardCount);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento dei mazzi');
            emitToast.error('Impossibile caricare i mazzi');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDecks();
    }, [loadDecks]);

    // Handlers
    const handleStudy = (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        setStudyDeck(deck);
        setIsStudyModeOpen(true);
    };

    const handleViewDetail = (deckId: string) => {
        navigate(`/study/deck/${deckId}`);
    };

    const handleAddCard = (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
            setSelectedDeck(deck);
            setIsAddCardModalOpen(true);
        }
    };

    const handleMagicGenerate = (deck: Deck) => {
        setSelectedDeck(deck);
        setIsMagicGenerateOpen(true);
    };

    const handleMagicGenerateSuccess = async (_generatedCount: number) => {
        // Ricarica i mazzi per riflettere le nuove carte
        await loadDecks();
    };

    const handleStartSession = (config: { mode: StudyMode; shuffle: boolean; reverse: boolean }) => {
        if (!studyDeck) return;
        const params = new URLSearchParams();
        params.set('mode', config.mode);
        params.set('shuffle', config.shuffle ? 'true' : 'false');
        params.set('reverse', config.reverse ? 'true' : 'false');
        navigate(`/study/${studyDeck.id}/session?${params.toString()}`);
        setIsStudyModeOpen(false);
        setStudyDeck(null);
    };

    const handleDeleteDeck = async () => {
        if (!deletingDeck) return;
        try {
            await studyService.deleteDeck(deletingDeck.id);
            setDecks(prev => prev.filter(d => d.id !== deletingDeck.id));
            setDeletingDeck(null);
            emitToast.success('Mazzo eliminato!');
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
        }
    };

    const handleCreateDeck = async (data: CreateDeckPayload) => {
        const newDeck = await studyService.createDeck(data);
        setDecks(prev => [...prev, newDeck]);
        emitToast.success('Mazzo creato con successo!', { title: 'Nuovo Mazzo 📚' });
    };

    const handleSubmitCard = async (deckId: string, data: AddCardPayload) => {
        try {
            const updatedDeck = await studyService.addCard(deckId, data);
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            emitToast.success('Carta aggiunta!', { duration: 2000 });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiunta della carta');
            throw err;
        }
    };

    // ========== RENDER ==========

    return (
        <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-5xl mx-auto">
                {/* ═══ HEADER ═══ */}
                <header className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs font-semibold text-primary-400 uppercase tracking-[0.2em] mb-1">
                                Learning
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">
                                Flashcards
                            </h1>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-3 px-5 sm:px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 transition-all text-sm sm:text-base"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span className="hidden sm:inline">Nuovo Mazzo</span>
                        </motion.button>
                    </div>

                    {/* Hero Stats */}
                    {!isLoading && decks.length > 0 && (
                        <HeroStats 
                            totalDecks={decks.length}
                            totalCards={totalCards}
                            dueCards={dueCardCount}
                        />
                    )}
                </header>

                {/* ═══ CONTENT ═══ */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        {[...Array(6)].map((_, i) => (
                            <DeckSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <FiAlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <p className="text-white/60 mb-4">{error}</p>
                        <button
                            onClick={loadDecks}
                            className="px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
                        >
                            Riprova
                        </button>
                    </div>
                ) : decks.length === 0 ? (
                    <EmptyState onCreateDeck={() => setIsCreateModalOpen(true)} />
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8"
                    >
                        {decks.map((deck, index) => (
                            <motion.div
                                key={deck.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <DeckCard
                                    deck={deck}
                                    onStudy={handleStudy}
                                    onAddCard={handleAddCard}
                                    onMagicGenerate={handleMagicGenerate}
                                    onViewDetail={handleViewDetail}
                                    onDelete={setDeletingDeck}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* ═══ MODALS ═══ */}
                <CreateDeckModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateDeck}
                />

                <AddCardModal
                    isOpen={isAddCardModalOpen}
                    deckId={selectedDeck?.id ?? null}
                    deckTitle={selectedDeck?.title ?? ''}
                    onClose={() => {
                        setIsAddCardModalOpen(false);
                        setSelectedDeck(null);
                    }}
                    onSubmit={handleSubmitCard}
                />

                <MagicGenerateModal
                    isOpen={isMagicGenerateOpen}
                    deckId={selectedDeck?.id ?? ''}
                    deckTitle={selectedDeck?.title ?? ''}
                    onClose={() => {
                        setIsMagicGenerateOpen(false);
                        setSelectedDeck(null);
                    }}
                    onSuccess={handleMagicGenerateSuccess}
                />

                <StudyModeSelector
                    isOpen={isStudyModeOpen}
                    deckTitle={studyDeck?.title}
                    onClose={() => {
                        setIsStudyModeOpen(false);
                        setStudyDeck(null);
                    }}
                    onStart={handleStartSession}
                />

                <ConfirmationModal
                    isOpen={!!deletingDeck}
                    title="Elimina Mazzo"
                    description={`Sei sicuro di voler eliminare "${deletingDeck?.title}"? Tutte le carte verranno eliminate permanentemente.`}
                    confirmLabel="Elimina"
                    destructive
                    onConfirm={handleDeleteDeck}
                    onCancel={() => setDeletingDeck(null)}
                />
            </div>
        </div>
    );
};

export default DecksDashboardPage;
