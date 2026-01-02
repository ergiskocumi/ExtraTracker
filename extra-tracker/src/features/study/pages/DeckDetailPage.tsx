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
import {
    FiArrowLeft,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiCopy,
    FiCheck,
    FiX,
    FiPlay,
    FiZap,
    FiBookOpen,
    FiSearch,
    FiAlertCircle
} from 'react-icons/fi';
import { studyService, type Deck, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';

// ============================================
// CARD ITEM COMPONENT - Editable Card View
// ============================================

interface CardItemProps {
    card: Card;
    onEdit: (card: Card) => void;
    onDelete: (cardId: string) => void;
    onDuplicate: (card: Card) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onEdit, onDelete, onDuplicate }) => {
    const [isHovered, setIsHovered] = useState(false);

    const statusConfig = {
        new: { label: 'Nuova', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        learning: { label: 'Studio', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
        review: { label: 'Ripasso', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
        mastered: { label: 'Padroneggiata', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    };

    const status = statusConfig[card.status] || statusConfig.new;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 overflow-hidden"
        >
            {/* Action Buttons - Hover */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 z-10"
                    >
                        <button
                            onClick={() => onDuplicate(card)}
                            className="p-1.5 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white/60 hover:text-white transition-all"
                            title="Duplica"
                        >
                            <FiCopy className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onEdit(card)}
                            className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all"
                            title="Modifica"
                        >
                            <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(card.id)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                            title="Elimina"
                        >
                            <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Badge */}
            <div className="absolute top-3 left-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border}`}>
                    {status.label}
                </span>
            </div>

            {/* Card Content */}
            <div className="p-5 pt-10">
                {/* Front - Question */}
                <div className="mb-4">
                    <p className="text-sm font-semibold text-white leading-relaxed">
                        {card.front}
                    </p>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.08] my-3" />

                {/* Back - Answer */}
                <div>
                    <p className="text-sm text-white/70 leading-relaxed">
                        {card.back}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// EDIT CARD MODAL
// ============================================

interface EditCardModalProps {
    isOpen: boolean;
    card: Card | null;
    onClose: () => void;
    onSave: (cardId: string, front: string, back: string) => Promise<void>;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ isOpen, card, onClose, onSave }) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (card) {
            setFront(card.front);
            setBack(card.back);
        }
    }, [card]);

    const handleSave = async () => {
        if (!card || !front.trim() || !back.trim()) return;
        setIsSaving(true);
        try {
            await onSave(card.id, front.trim(), back.trim());
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && card && (
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
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20">
                                    <FiEdit2 className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Modifica Carta</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Fronte (Domanda)
                                </label>
                                <textarea
                                    value={front}
                                    onChange={e => setFront(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
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
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-3 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!front.trim() || !back.trim() || isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <FiCheck className="w-4 h-4" />
                                    {isSaving ? 'Salvando...' : 'Salva Modifiche'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// ADD CARD INLINE
// ============================================

interface AddCardInlineProps {
    onAdd: (front: string, back: string) => Promise<void>;
}

const AddCardInline: React.FC<AddCardInlineProps> = ({ onAdd }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!front.trim() || !back.trim()) return;
        setIsAdding(true);
        try {
            await onAdd(front.trim(), back.trim());
            setFront('');
            setBack('');
            setIsExpanded(false);
        } finally {
            setIsAdding(false);
        }
    };

    if (!isExpanded) {
        return (
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsExpanded(true)}
                className="w-full h-full min-h-[200px] rounded-2xl border-2 border-dashed border-white/[0.15] hover:border-primary-500/40 bg-white/[0.02] hover:bg-primary-500/5 flex flex-col items-center justify-center gap-3 transition-all"
            >
                <div className="p-3 rounded-xl bg-primary-500/15 border border-primary-500/20">
                    <FiPlus className="w-6 h-6 text-primary-400" />
                </div>
                <span className="text-sm font-medium text-white/50">Aggiungi Carta</span>
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-primary-500/30 bg-primary-500/5 p-4"
        >
            <div className="space-y-3">
                <textarea
                    value={front}
                    onChange={e => setFront(e.target.value)}
                    placeholder="Domanda..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all resize-none"
                    autoFocus
                />
                <textarea
                    value={back}
                    onChange={e => setBack(e.target.value)}
                    placeholder="Risposta..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all resize-none"
                />
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/[0.1] transition-all"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!front.trim() || !back.trim() || isAdding}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium disabled:opacity-40 transition-all"
                    >
                        <FiPlus className="w-4 h-4" />
                        {isAdding ? 'Aggiungendo...' : 'Aggiungi'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

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

    // Modal state
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

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

    const handleDuplicateCard = async (card: Card) => {
        await handleAddCard(card.front + ' (copia)', card.back);
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

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <FilterTabs active={filter} onChange={setFilter} counts={counts} />
                        <div className="relative flex-1 max-w-xs">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cerca carte..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                </header>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Add Card Button - Always First */}
                    <AddCardInline onAdd={handleAddCard} />

                    {/* Cards */}
                    <AnimatePresence mode="popLayout">
                        {filteredCards.map(card => (
                            <CardItem
                                key={card.id}
                                card={card}
                                onEdit={setEditingCard}
                                onDelete={setDeletingCardId}
                                onDuplicate={handleDuplicateCard}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredCards.length === 0 && deck.cards.length > 0 && (
                    <div className="text-center py-12">
                        <p className="text-white/50">Nessuna carta corrisponde ai filtri</p>
                    </div>
                )}

                {/* Modals */}
                <EditCardModal
                    isOpen={!!editingCard}
                    card={editingCard}
                    onClose={() => setEditingCard(null)}
                    onSave={handleEditCard}
                />

                <ConfirmationModal
                    isOpen={!!deletingCardId}
                    title="Elimina Carta"
                    description="Sei sicuro di voler eliminare questa carta? L'azione non può essere annullata."
                    confirmLabel="Elimina"
                    destructive
                    onConfirm={handleDeleteCard}
                    onCancel={() => setDeletingCardId(null)}
                />
            </div>
        </div>
    );
};

export default DeckDetailPage;
