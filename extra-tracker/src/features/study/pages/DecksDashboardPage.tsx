/**
 * 📚 DECKS DASHBOARD PAGE - Premium Modern Design
 * 
 * Dashboard migliorata con:
 * - Design moderno e pulito
 * - Filtri e ricerca avanzati
 * - Statistiche prominenti
 * - Quick actions migliorati
 * - Animazioni fluide
 * - Vista organizzata
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    FiEye,
    FiSearch,
    FiFilter,
    FiCheckCircle,
    FiBarChart2,
} from 'react-icons/fi';
import { studyService, type Deck, type CreateDeckPayload, type AddCardPayload } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { CreateDeckModal } from '../components/CreateDeckModal';
import { MagicGenerateModal } from '../components/MagicGenerateModal';
import { StudyModeSelector, type StudyMode } from '../components/StudyModeSelector';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';

// ============================================
// TYPES
// ============================================

type FilterType = 'all' | 'due' | 'mastered' | 'recent';

// ============================================
// ENHANCED HERO STATS - Modern Cards
// ============================================

interface HeroStatsProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    masteredDecks: number;
}

const HeroStats: React.FC<HeroStatsProps> = ({ totalDecks, totalCards, dueCards, masteredDecks }) => {
    const stats = [
        {
            label: 'Mazzi Totali',
            value: totalDecks,
            icon: FiLayers,
            color: 'primary',
            gradient: 'from-primary-500/20 to-primary-600/10',
            borderColor: 'border-primary-500/30',
            textColor: 'text-primary-400',
        },
        {
            label: 'Carte Totali',
            value: totalCards,
            icon: FiBookOpen,
            color: 'blue',
            gradient: 'from-blue-500/20 to-blue-600/10',
            borderColor: 'border-blue-500/30',
            textColor: 'text-blue-400',
        },
        {
            label: 'Da Ripassare',
            value: dueCards,
            icon: FiClock,
            color: 'orange',
            gradient: dueCards > 0 ? 'from-orange-500/20 to-orange-600/10' : 'from-white/5 to-white/2',
            borderColor: dueCards > 0 ? 'border-orange-500/40 ring-2 ring-orange-500/20' : 'border-white/10',
            textColor: dueCards > 0 ? 'text-orange-400' : 'text-white/50',
            highlight: dueCards > 0,
        },
        {
            label: 'Padroneggiati',
            value: masteredDecks,
            icon: FiCheckCircle,
            color: 'emerald',
            gradient: 'from-emerald-500/20 to-emerald-600/10',
            borderColor: 'border-emerald-500/30',
            textColor: 'text-emerald-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className={`
                        relative p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300
                        bg-gradient-to-br ${stat.gradient} ${stat.borderColor}
                        ${stat.highlight ? 'shadow-lg shadow-orange-500/20' : ''}
                    `}
                >
                    <div className="flex items-start justify-between mb-3">
                        <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                        {stat.highlight && (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-2 h-2 rounded-full bg-orange-400"
                            />
                        )}
                    </div>
                    <p className={`text-3xl font-bold ${stat.textColor} mb-1`}>
                        {stat.value}
                    </p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// ENHANCED DECK CARD - Premium Design
// ============================================

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onAddCard: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onViewDetail: (deckId: string) => void;
    onSplitStudy: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ 
    deck, 
    onStudy, 
    onMagicGenerate, 
    onViewDetail, 
    onSplitStudy, 
    onDelete 
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteredCards = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    const hasPdf = !!deck.pdfUrl;
    const isNew = deck.createdAt && new Date(deck.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.01 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                group relative overflow-hidden rounded-3xl backdrop-blur-xl border transition-all duration-300
                ${hasDueCards 
                    ? 'border-orange-500/40 shadow-xl shadow-orange-500/20' 
                    : 'border-white/[0.12] hover:border-white/[0.20]'
                }
            `}
            style={{ 
                background: hasDueCards
                    ? 'linear-gradient(145deg, rgba(251, 146, 60, 0.1) 0%, rgba(255,255,255,0.05) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
            }}
        >
            {/* Badges - Top Right (solo quando non in hover) */}
            {!isHovered && (
                <>
                    {hasDueCards && (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute top-4 right-4 z-20"
                        >
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 border border-orange-400/50 text-white text-xs font-bold shadow-lg shadow-orange-500/30">
                                <FiZap className="w-3 h-3" />
                                <span>{deck.dueCount} da ripassare</span>
                            </div>
                        </motion.div>
                    )}
                    {isNew && !hasDueCards && (
                        <div className="absolute top-4 right-4 z-20">
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                                Nuovo
                            </span>
                        </div>
                    )}
                </>
            )}

            {/* Hover Actions - Top Bar */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-b from-black/80 via-black/60 to-transparent backdrop-blur-sm"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail(deck.id);
                            }}
                            className="p-2 rounded-lg bg-white/[0.15] hover:bg-white/[0.25] text-white/90 transition-all"
                            title="Dettagli"
                        >
                            <FiEye className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail(deck.id);
                            }}
                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all"
                            title="Analytics"
                        >
                            <FiBarChart2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMagicGenerate(deck);
                            }}
                            className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-all"
                            title="✨ Magic Generate"
                        >
                            <FiZap className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(deck);
                            }}
                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                            title="Elimina"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Card Content */}
            <div 
                className="p-6 cursor-pointer"
                onClick={() => onViewDetail(deck.id)}
            >
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                    <div className={`
                        p-3.5 rounded-xl transition-all
                        ${hasDueCards 
                            ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30' 
                            : 'bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30'
                        }
                    `}>
                        <FiLayers className={`w-6 h-6 ${hasDueCards ? 'text-orange-400' : 'text-primary-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pr-20">
                        <h3 className="text-lg font-bold text-white truncate group-hover:text-primary-400 transition-colors mb-1">
                            {deck.title}
                        </h3>
                        {deck.description && (
                            <p className="text-sm text-white/50 line-clamp-2">
                                {deck.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-5 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                        <FiBookOpen className="w-4 h-4" />
                        <span className="font-medium">{totalCards}</span>
                        <span className="text-white/40">carte</span>
                    </div>
                    {deck.tags && deck.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <FiTag className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-xs text-white/40">
                                {deck.tags.slice(0, 2).join(', ')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Mastery Progress */}
                {totalCards > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-white/60">Padronanza</span>
                            <span className="text-sm font-bold text-white/80">{masteryPercent}%</span>
                        </div>
                        <div className="h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    masteryPercent === 100 
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                                        : 'bg-gradient-to-r from-primary-500 to-primary-600'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStudy(deck.id);
                        }}
                        disabled={totalCards === 0}
                        className={`
                            w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold transition-all text-sm
                            ${hasDueCards
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                : totalCards > 0
                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/35'
                                    : 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        <FiPlay className="w-4 h-4" />
                        {hasDueCards ? 'Ripassa Ora' : totalCards > 0 ? 'Studia' : 'Nessuna carta'}
                    </motion.button>

                    {hasPdf && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSplitStudy(deck.id);
                            }}
                            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-medium transition-all text-sm bg-gradient-to-r from-blue-500/80 to-violet-500/80 text-white hover:from-blue-500 hover:to-violet-500 shadow-md shadow-blue-500/15"
                        >
                            <FiBookOpen className="w-4 h-4" />
                            📖 Leggi & Studia
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// FILTER & SEARCH BAR
// ============================================

interface FilterBarProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    dueCount: number;
    masteredCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    dueCount,
    masteredCount,
}) => {
    const filters: { key: FilterType; label: string; count?: number }[] = [
        { key: 'all', label: 'Tutti' },
        { key: 'due', label: 'Da Ripassare', count: dueCount },
        { key: 'mastered', label: 'Padroneggiati', count: masteredCount },
        { key: 'recent', label: 'Recenti' },
    ];

    return (
        <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Cerca mazzi..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {filters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => onFilterChange(filter.key)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                            ${activeFilter === filter.key
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white/70 border border-white/[0.1]'
                            }
                        `}
                    >
                        <FiFilter className="w-4 h-4" />
                        {filter.label}
                        {filter.count !== undefined && filter.count > 0 && (
                            <span className={`
                                px-2 py-0.5 rounded-full text-xs font-bold
                                ${activeFilter === filter.key
                                    ? 'bg-primary-500/30 text-primary-300'
                                    : 'bg-white/10 text-white/60'
                                }
                            `}>
                                {filter.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ============================================
// ADD CARD MODAL
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
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && deckId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.98) 100%)' }}
                    >
                        <div className="px-8 py-6 border-b border-white/[0.08] flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Nuova Carta</h2>
                                <p className="text-sm text-white/50">{deckTitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

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
                                    onClick={onClose}
                                    className="px-5 py-3.5 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all"
                                >
                                    Annulla
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
// EMPTY STATE
// ============================================

const EmptyState: React.FC<{ onCreateDeck: () => void }> = ({ onCreateDeck }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
        <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 flex items-center justify-center mb-6"
        >
            <FiLayers className="w-12 h-12 text-primary-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-3">
            Inizia il tuo viaggio di apprendimento
        </h3>
        <p className="text-white/60 max-w-md mb-8 text-lg">
            Crea il tuo primo mazzo di flashcard e usa la ripetizione spaziata per ricordare tutto ciò che impari.
        </p>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreateDeck}
            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-xl shadow-primary-500/30 transition-all text-lg"
        >
            <FiPlus className="w-6 h-6" />
            Crea il Primo Mazzo
        </motion.button>
    </motion.div>
);

// ============================================
// SKELETON LOADER
// ============================================

const DeckSkeleton: React.FC = () => (
    <div 
        className="rounded-3xl border border-white/[0.08] p-6 animate-pulse"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}
    >
        <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-white/10 rounded-lg" />
                <div className="w-1/2 h-3 bg-white/5 rounded-lg" />
            </div>
        </div>
        <div className="flex items-center gap-4 mb-5">
            <div className="w-20 h-3 bg-white/5 rounded-lg" />
        </div>
        <div className="h-2.5 bg-white/5 rounded-full mb-6" />
        <div className="h-12 bg-white/5 rounded-xl" />
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
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

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
    const masteredDecks = decks.filter(d => {
        const total = d.totalCards ?? d.cards?.length ?? 0;
        const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
        return total > 0 && mastered === total;
    }).length;

    // Filtered decks
    const filteredDecks = useMemo(() => {
        let result = [...decks];

        // Apply filter
        switch (filter) {
            case 'due':
                result = result.filter(d => (d.dueCount ?? 0) > 0);
                break;
            case 'mastered':
                result = result.filter(d => {
                    const total = d.totalCards ?? d.cards?.length ?? 0;
                    const mastered = d.cards?.filter(c => c.status === 'mastered').length ?? 0;
                    return total > 0 && mastered === total;
                });
                break;
            case 'recent':
                result = result
                    .filter(d => d.createdAt && new Date(d.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .sort((a, b) => {
                        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return bTime - aTime;
                    });
                break;
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(d => 
                d.title.toLowerCase().includes(query) ||
                d.description?.toLowerCase().includes(query) ||
                d.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return result;
    }, [decks, filter, searchQuery]);

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

    const handleSplitStudy = (deckId: string) => {
        navigate(`/study/${deckId}/split`);
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
            const deckTitle = deletingDeck.title;
            setDeletingDeck(null);
            // Ricarica i dati dal server per assicurare sincronizzazione
            await loadDecks();
            emitToast.success(`Mazzo "${deckTitle}" eliminato con successo`, {
                title: 'Mazzo Eliminato',
                duration: 3000
            });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione del mazzo', {
                title: 'Errore',
                duration: 5000
            });
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
            <div className="max-w-7xl mx-auto">
                {/* ═══ HEADER ═══ */}
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs font-bold text-primary-400 uppercase tracking-[0.2em] mb-2">
                                Learning & Study
                            </p>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                                Flashcards
                            </h1>
                            <p className="text-white/50">
                                Gestisci i tuoi mazzi e migliora la tua memoria
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-xl shadow-primary-500/30 transition-all"
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
                            masteredDecks={masteredDecks}
                        />
                    )}

                    {/* Filter & Search */}
                    {!isLoading && decks.length > 0 && (
                        <FilterBar
                            activeFilter={filter}
                            onFilterChange={setFilter}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            dueCount={decks.filter(d => (d.dueCount ?? 0) > 0).length}
                            masteredCount={masteredDecks}
                        />
                    )}
                </header>

                {/* ═══ CONTENT ═══ */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <DeckSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <FiAlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <p className="text-white/60 mb-6 text-lg">{error}</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={loadDecks}
                            className="px-6 py-3 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
                        >
                            Riprova
                        </motion.button>
                    </div>
                ) : filteredDecks.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white/50 text-lg">
                            {searchQuery || filter !== 'all' 
                                ? 'Nessun mazzo corrisponde ai filtri' 
                                : 'Nessun mazzo trovato'
                            }
                        </p>
                    </div>
                ) : decks.length === 0 ? (
                    <EmptyState onCreateDeck={() => setIsCreateModalOpen(true)} />
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredDecks.map((deck, index) => (
                                <motion.div
                                    key={deck.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <DeckCard
                                        deck={deck}
                                        onStudy={handleStudy}
                                        onAddCard={handleAddCard}
                                        onMagicGenerate={handleMagicGenerate}
                                        onViewDetail={handleViewDetail}
                                        onSplitStudy={handleSplitStudy}
                                        onDelete={setDeletingDeck}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
