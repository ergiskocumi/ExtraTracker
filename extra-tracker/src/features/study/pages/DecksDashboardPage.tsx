/**
 * 📚 DECKS DASHBOARD PAGE - User-Friendly Redesign
 * 
 * Redesign completo con focus su UX:
 * - Card grandi e leggibili
 * - Azioni SEMPRE visibili (no hover-only)
 * - Pulsanti touch-friendly (min 44px)
 * - Mobile-first responsive design
 * - Visual hierarchy chiara
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Play,
    Layers,
    Clock,
    BookOpen,
    AlertCircle,
    Zap,
    Trash2,
    Search,
    Filter,
    CheckCircle,
    BarChart2,
    ChevronRight,
    Sparkles,
    GraduationCap,
    MoreHorizontal,
    Eye,
    Settings,
    X
} from 'lucide-react';
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
// HERO STATS - Compact & Clear
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
            label: 'Mazzi',
            value: totalDecks,
            icon: Layers,
            color: 'violet',
            bgClass: 'bg-violet-500/10 border-violet-500/20',
            iconClass: 'text-violet-400',
            valueClass: 'text-violet-400',
        },
        {
            label: 'Carte',
            value: totalCards,
            icon: BookOpen,
            color: 'blue',
            bgClass: 'bg-blue-500/10 border-blue-500/20',
            iconClass: 'text-blue-400',
            valueClass: 'text-blue-400',
        },
        {
            label: 'Da Ripassare',
            value: dueCards,
            icon: Clock,
            color: 'orange',
            bgClass: dueCards > 0 ? 'bg-orange-500/15 border-orange-500/30' : 'bg-white/5 border-white/10',
            iconClass: dueCards > 0 ? 'text-orange-400' : 'text-white/40',
            valueClass: dueCards > 0 ? 'text-orange-400' : 'text-white/50',
            pulse: dueCards > 0,
        },
        {
            label: 'Completati',
            value: masteredDecks,
            icon: CheckCircle,
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            iconClass: 'text-emerald-400',
            valueClass: 'text-emerald-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {stats.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative p-4 rounded-2xl border ${stat.bgClass} transition-all`}
                >
                    {stat.pulse && (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-400"
                        />
                    )}
                    <stat.icon className={`w-5 h-5 ${stat.iconClass} mb-2`} />
                    <p className={`text-2xl sm:text-3xl font-bold ${stat.valueClass}`}>
                        {stat.value}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// DECK CARD - User-Friendly Design
// ============================================

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
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
    const [showMenu, setShowMenu] = useState(false);
    
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteredCards = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    const hasPdf = !!deck.pdfUrl;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative rounded-2xl sm:rounded-3xl border overflow-hidden
                transition-all duration-300 hover:shadow-xl
                ${hasDueCards 
                    ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent shadow-lg shadow-orange-500/10' 
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                }
            `}
        >
            {/* Badge - Due Cards */}
            {hasDueCards && (
                <div className="absolute top-3 right-3 z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg"
                    >
                        <Clock className="w-3 h-3" />
                        {deck.dueCount} da ripassare
                    </motion.div>
                </div>
            )}

            {/* More Menu Button */}
            <div className="absolute top-3 left-3 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-2 rounded-xl bg-black/20 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/40 transition-all"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {showMenu && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40"
                                onClick={() => setShowMenu(false)}
                            />
                            {/* Menu */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute left-0 top-full mt-2 z-50 w-48 py-2 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetail(deck.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Visualizza Dettagli
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMagicGenerate(deck);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Magic Generate
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Analytics
                                        onViewDetail(deck.id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    Statistiche
                                </button>
                                <div className="my-2 border-t border-white/10" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(deck);
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Elimina Mazzo
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content - Clickable */}
            <div 
                className="p-5 sm:p-6 cursor-pointer"
                onClick={() => onViewDetail(deck.id)}
            >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4 mt-8 sm:mt-6">
                    <div className={`
                        p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0
                        ${hasDueCards 
                            ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30' 
                            : 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30'
                        }
                    `}>
                        <Layers className={`w-6 h-6 sm:w-7 sm:h-7 ${hasDueCards ? 'text-orange-400' : 'text-violet-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate mb-1">
                            {deck.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-white/50">
                            <span className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" />
                                {totalCards} carte
                            </span>
                            {hasPdf && (
                                <span className="flex items-center gap-1 text-blue-400">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    PDF
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {totalCards > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2 text-sm">
                            <span className="text-white/50">Padronanza</span>
                            <span className={`font-bold ${
                                masteryPercent === 100 ? 'text-emerald-400' : 'text-white/70'
                            }`}>
                                {masteryPercent}%
                            </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    masteryPercent === 100 
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                                        : 'bg-gradient-to-r from-violet-400 to-violet-500'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* ═══ ACTION BUTTONS - SEMPRE VISIBILI ═══ */}
                <div className="space-y-2.5">
                    {/* Primary CTA: Study / Review */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStudy(deck.id);
                        }}
                        disabled={totalCards === 0}
                        className={`
                            w-full flex items-center justify-center gap-2.5 
                            px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                            font-semibold text-base transition-all
                            active:scale-[0.98]
                            ${hasDueCards
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                : totalCards > 0
                                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        <Play className="w-5 h-5" />
                        {hasDueCards ? 'Ripassa Ora' : totalCards > 0 ? 'Studia' : 'Aggiungi carte'}
                    </button>

                    {/* Secondary CTA: Split Study (if PDF exists) */}
                    {hasPdf && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSplitStudy(deck.id);
                            }}
                            className="
                                w-full flex items-center justify-center gap-2.5 
                                px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                                font-semibold text-base transition-all
                                bg-gradient-to-r from-blue-500/90 to-indigo-500/90 
                                text-white shadow-lg shadow-blue-500/20
                                hover:from-blue-500 hover:to-indigo-500
                                active:scale-[0.98]
                            "
                        >
                            <BookOpen className="w-5 h-5" />
                            📖 Leggi & Studia
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// SEARCH & FILTER BAR - Simplified
// ============================================

interface FilterBarProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    dueCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    dueCount,
}) => {
    const filters: { key: FilterType; label: string; count?: number }[] = [
        { key: 'all', label: 'Tutti' },
        { key: 'due', label: 'Da Ripassare', count: dueCount },
        { key: 'mastered', label: 'Completati' },
        { key: 'recent', label: 'Recenti' },
    ];

    return (
        <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Cerca mazzi..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Filters - Horizontal Scroll on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {filters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => onFilterChange(filter.key)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                            ${activeFilter === filter.key
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10'
                            }
                        `}
                    >
                        <Filter className="w-4 h-4" />
                        {filter.label}
                        {filter.count !== undefined && filter.count > 0 && (
                            <span className={`
                                px-2 py-0.5 rounded-full text-xs font-bold
                                ${activeFilter === filter.key
                                    ? 'bg-violet-500/30 text-violet-200'
                                    : 'bg-orange-500/20 text-orange-400'
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white">Nuova Carta</h2>
                                <p className="text-sm text-white/50">{deckTitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Fronte (Domanda)
                                </label>
                                <textarea
                                    value={front}
                                    onChange={e => setFront(e.target.value)}
                                    placeholder="Cosa vuoi memorizzare?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Retro (Risposta)
                                </label>
                                <textarea
                                    value={back}
                                    onChange={e => setBack(e.target.value)}
                                    placeholder="La risposta..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-all font-medium"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={!front.trim() || !back.trim() || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-violet-500 text-white font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-40 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    {isSubmitting ? 'Aggiungendo...' : 'Aggiungi'}
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
        className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
    >
        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 flex items-center justify-center mb-6"
        >
            <GraduationCap className="w-12 h-12 sm:w-14 sm:h-14 text-violet-400" />
        </motion.div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Inizia a studiare
        </h3>
        <p className="text-white/50 max-w-md mb-8 text-base sm:text-lg">
            Crea il tuo primo mazzo di flashcard e usa la ripetizione spaziata per ricordare tutto.
        </p>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreateDeck}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold shadow-xl shadow-violet-500/30 text-lg"
        >
            <Plus className="w-6 h-6" />
            Crea il Primo Mazzo
        </motion.button>
    </motion.div>
);

// ============================================
// SKELETON LOADER
// ============================================

const DeckSkeleton: React.FC = () => (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 animate-pulse">
        <div className="flex items-start gap-4 mb-4 mt-8">
            <div className="w-14 h-14 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-white/10 rounded-lg" />
                <div className="w-1/3 h-4 bg-white/5 rounded-lg" />
            </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full mb-5" />
        <div className="space-y-2.5">
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-14 bg-white/5 rounded-xl" />
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
                    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
                break;
        }

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

    // Load decks
    const loadDecks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const dashboardData = await studyService.getDashboard();
            setDecks(dashboardData.decks);
            setDueCardCount(dashboardData.dueCardCount);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento');
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

    const handleMagicGenerateSuccess = async () => {
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
            await loadDecks();
            emitToast.success(`Mazzo "${deckTitle}" eliminato`);
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
        }
    };

    const handleCreateDeck = async (data: CreateDeckPayload) => {
        const newDeck = await studyService.createDeck(data);
        setDecks(prev => [...prev, newDeck]);
        emitToast.success('Mazzo creato!');
    };

    const handleSubmitCard = async (deckId: string, data: AddCardPayload) => {
        try {
            const updatedDeck = await studyService.addCard(deckId, data);
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message);
            throw err;
        }
    };

    // ========== RENDER ==========

    return (
        <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-6xl mx-auto">
                {/* ═══ HEADER ═══ */}
                <header className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                                Learning & Study
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">
                                Flashcards
                            </h1>
                            <p className="text-white/50 mt-1 text-sm sm:text-base">
                                Gestisci i tuoi mazzi e migliora la memoria
                            </p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center justify-center gap-2.5 px-5 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold shadow-xl shadow-violet-500/30 text-base"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuovo Mazzo</span>
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
                        />
                    )}
                </header>

                {/* ═══ CONTENT ═══ */}
                {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {[...Array(4)].map((_, i) => (
                            <DeckSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-20 h-20 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <p className="text-white/60 mb-6 text-lg">{error}</p>
                        <button
                            onClick={loadDecks}
                            className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all"
                        >
                            Riprova
                        </button>
                    </div>
                ) : decks.length === 0 ? (
                    <EmptyState onCreateDeck={() => setIsCreateModalOpen(true)} />
                ) : filteredDecks.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-white/50 text-lg">
                            Nessun mazzo corrisponde ai filtri
                        </p>
                        <button
                            onClick={() => {
                                setFilter('all');
                                setSearchQuery('');
                            }}
                            className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10"
                        >
                            Mostra tutti
                        </button>
                    </div>
                ) : (
                    /* ═══ DECK GRID - 2 colonne max per card più grandi ═══ */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredDecks.map((deck, index) => (
                                <motion.div
                                    key={deck.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <DeckCard
                                        deck={deck}
                                        onStudy={handleStudy}
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
                    description={`Sei sicuro di voler eliminare "${deletingDeck?.title}"? Tutte le carte verranno eliminate.`}
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
