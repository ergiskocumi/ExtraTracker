/**
 * 🎴 FLASHCARD LIST (Continuous View)
 * ====================================
 * 
 * Mostra TUTTE le flashcard in una lista scrollabile continua.
 * Permette confronto rapido e editing inline per migliorare l'UX.
 * 
 * FEATURES:
 * - Vista continua di tutte le card
 * - Card espandibile per vedere la risposta
 * - Editing inline per ogni card
 * - Scroll automatico alla card selezionata
 * - Highlight della card attiva (sincronizzata col PDF)
 * - Search/filter cards
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Edit3,
    Check,
    X,
    Search,
    Layers,
    Eye,
    EyeOff
} from 'lucide-react';
import type { Card, Deck } from '../../services/studyService';
import { CardContentRenderer } from './CardContentRenderer/index';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface FlashcardCarouselProps {
    deck: Deck;
    currentIndex?: number;
    onCardChange?: (card: Card, index: number) => void;
    onUpdate?: (cardId: string, front: string, back: string) => Promise<void>;
    className?: string;
}

// ─────────────────────────────────────────────────────────────
// Single Card Component
// ─────────────────────────────────────────────────────────────

interface CardItemProps {
    card: Card;
    index: number;
    isActive: boolean;
    isExpanded: boolean;
    isEditing: boolean;
    onToggleExpand: () => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: (front: string, back: string) => Promise<void>;
    onClick: () => void;
}

const CardItem: React.FC<CardItemProps> = ({
    card,
    index,
    isActive,
    isExpanded,
    isEditing,
    onToggleExpand,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onClick,
}) => {
    const [editFront, setEditFront] = useState(card.front);
    const [editBack, setEditBack] = useState(card.back);
    const [saving, setSaving] = useState(false);

    // Reset edit values when card changes or edit mode ends
    useEffect(() => {
        if (!isEditing) {
            setEditFront(card.front);
            setEditBack(card.back);
        }
    }, [card.front, card.back, isEditing]);

    const handleSave = async () => {
        if (saving || !editFront.trim() || !editBack.trim()) return;
        setSaving(true);
        try {
            await onSaveEdit(editFront.trim(), editBack.trim());
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancelEdit();
        } else if (e.key === 'Enter' && e.metaKey) {
            handleSave();
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`
                rounded-xl border transition-all duration-200
                ${isActive 
                    ? 'bg-violet-500/10 border-violet-500/40 ring-2 ring-violet-500/20' 
                    : 'bg-zinc-800/40 border-white/10 hover:border-white/20'
                }
            `}
        >
            {isEditing ? (
                /* ─── Edit Mode ─── */
                <div className="p-4 space-y-3" onKeyDown={handleKeyDown}>
                    {/* Edit Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-violet-400">
                            Modifica Card #{index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onCancelEdit}
                                disabled={saving}
                                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                title="Annulla (Esc)"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editFront.trim() || !editBack.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium hover:bg-violet-600 transition-all disabled:opacity-50"
                                title="Salva (⌘+Enter)"
                            >
                                <Check className="w-3.5 h-3.5" />
                                {saving ? 'Salvo...' : 'Salva'}
                            </button>
                        </div>
                    </div>

                    {/* Front Edit */}
                    <div>
                        <label className="block mb-1.5 text-xs text-white/50">Domanda</label>
                        <textarea
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                            rows={2}
                            autoFocus
                            className="w-full p-3 rounded-lg bg-zinc-900/80 border border-zinc-700 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                            placeholder="Scrivi la domanda..."
                        />
                    </div>

                    {/* Back Edit */}
                    <div>
                        <label className="block mb-1.5 text-xs text-white/50">Risposta</label>
                        <textarea
                            value={editBack}
                            onChange={(e) => setEditBack(e.target.value)}
                            rows={4}
                            className="w-full p-3 rounded-lg bg-zinc-900/80 border border-zinc-700 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                            placeholder="Scrivi la risposta..."
                        />
                    </div>
                </div>
            ) : (
                /* ─── Display Mode ─── */
                <div>
                    {/* Card Header - Always visible */}
                    <div 
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={onClick}
                    >
                        {/* Index Badge */}
                        <div className={`
                            flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                            ${isActive 
                                ? 'bg-violet-500 text-white' 
                                : 'bg-white/10 text-white/60'
                            }
                        `}>
                            {index + 1}
                        </div>

                        {/* Question */}
                        <div className="flex-1 min-w-0">
                            <CardContentRenderer
                                content={card.front}
                                variant={isActive ? 'study' : 'question'}
                                size="sm"
                                className={isActive ? 'text-white' : 'text-white/90'}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartEdit();
                                }}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                title="Modifica"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand();
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                    isExpanded 
                                        ? 'text-emerald-400 bg-emerald-500/20' 
                                        : 'text-white/40 hover:text-white hover:bg-white/10'
                                }`}
                                title={isExpanded ? 'Nascondi risposta' : 'Mostra risposta'}
                            >
                                {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Answer - Expandable */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-0">
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                                Risposta
                                            </span>
                                        </div>
                                        <CardContentRenderer
                                            content={card.back}
                                            variant="answer"
                                            size="sm"
                                            className="text-white/85"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const FlashcardCarousel: React.FC<FlashcardCarouselProps> = ({
    deck,
    currentIndex: controlledIndex,
    onCardChange,
    onUpdate,
    className = '',
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const [activeIndex, setActiveIndex] = useState(controlledIndex ?? 0);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllAnswers, setShowAllAnswers] = useState(false);

    const cards = deck.cards || [];
    const totalCards = cards.length;

    // Filter cards based on search
    const filteredCards = searchQuery.trim()
        ? cards.filter(card => 
            card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.back.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : cards;

    // ─── Sync with controlled index ──────────────────────────

    useEffect(() => {
        if (controlledIndex !== undefined && controlledIndex !== activeIndex) {
            setActiveIndex(controlledIndex);
        }
    }, [controlledIndex]);

    // ─── Scroll to active card ───────────────────────────────

    useEffect(() => {
        if (activeIndex >= 0 && activeIndex < cards.length) {
            const card = cards[activeIndex];
            if (card) {
                const cardEl = cardRefs.current.get(card.id);
                if (cardEl && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const cardTop = cardEl.offsetTop;
                    const cardHeight = cardEl.offsetHeight;
                    const containerHeight = container.clientHeight;
                    const scrollTop = container.scrollTop;

                    // Check if card is not fully visible
                    if (cardTop < scrollTop || cardTop + cardHeight > scrollTop + containerHeight) {
                        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }
    }, [activeIndex, cards]);

    // ─── Handlers ────────────────────────────────────────────

    const handleCardClick = useCallback((card: Card, index: number) => {
        setActiveIndex(index);
        if (onCardChange) {
            onCardChange(card, index);
        }
    }, [onCardChange]);

    const handleToggleExpand = useCallback((cardId: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
    }, []);

    const handleToggleAllAnswers = useCallback(() => {
        if (showAllAnswers) {
            setExpandedCards(new Set());
        } else {
            setExpandedCards(new Set(cards.map(c => c.id)));
        }
        setShowAllAnswers(!showAllAnswers);
    }, [showAllAnswers, cards]);

    const handleStartEdit = useCallback((cardId: string) => {
        setEditingCardId(cardId);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingCardId(null);
    }, []);

    const handleSaveEdit = useCallback(async (cardId: string, front: string, back: string) => {
        if (!onUpdate) return;
        await onUpdate(cardId, front, back);
        setEditingCardId(null);
    }, [onUpdate]);

    // ─── Register card refs ──────────────────────────────────

    const setCardRef = useCallback((cardId: string, el: HTMLDivElement | null) => {
        if (el) {
            cardRefs.current.set(cardId, el);
        } else {
            cardRefs.current.delete(cardId);
        }
    }, []);

    // ─── Empty state ─────────────────────────────────────────

    if (totalCards === 0) {
        return (
            <div className={`flex flex-col items-center justify-center h-full p-8 ${className}`}>
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Layers className="w-7 h-7 text-white/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Nessuna flashcard</h3>
                    <p className="text-sm text-white/60">
                        Genera flashcard dal PDF o aggiungine manualmente.
                    </p>
                </div>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header with Search */}
            <div className="flex-shrink-0 p-4 border-b border-white/10 space-y-3">
                {/* Stats Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                            {totalCards} Flashcard
                        </span>
                        {searchQuery && (
                            <span className="text-xs text-white/50">
                                ({filteredCards.length} risultati)
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleToggleAllAnswers}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${showAllAnswers 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                            }
                        `}
                    >
                        {showAllAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showAllAnswers ? 'Nascondi tutte' : 'Mostra tutte'}
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca nelle flashcard..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Cards List */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                <AnimatePresence mode="popLayout">
                    {filteredCards.map((card, index) => {
                        const originalIndex = cards.findIndex(c => c.id === card.id);
                        return (
                            <div
                                key={card.id}
                                ref={(el) => setCardRef(card.id, el)}
                            >
                                <CardItem
                                    card={card}
                                    index={originalIndex}
                                    isActive={originalIndex === activeIndex}
                                    isExpanded={expandedCards.has(card.id)}
                                    isEditing={editingCardId === card.id}
                                    onToggleExpand={() => handleToggleExpand(card.id)}
                                    onStartEdit={() => handleStartEdit(card.id)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaveEdit={(front, back) => handleSaveEdit(card.id, front, back)}
                                    onClick={() => handleCardClick(card, originalIndex)}
                                />
                            </div>
                        );
                    })}
                </AnimatePresence>

                {/* No results */}
                {filteredCards.length === 0 && searchQuery && (
                    <div className="py-12 text-center">
                        <p className="text-white/50 text-sm">
                            Nessuna flashcard corrisponde a "{searchQuery}"
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-3 px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-all"
                        >
                            Cancella ricerca
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs text-white/40">
                    <span>
                        Card attiva: {activeIndex + 1} di {totalCards}
                    </span>
                    <span>
                        {expandedCards.size} risposte visibili
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FlashcardCarousel;
