/**
 * 🎴 FLASHCARD CAROUSEL (Flashka.ai Style)
 * =========================================
 * 
 * Mostra una flashcard alla volta con navigazione prev/next.
 * Stile minimalista e focalizzato per ridurre il carico cognitivo.
 * 
 * FEATURES:
 * - Card singola con animazione flip
 * - Navigazione prev/next con contatore
 * - Editing inline
 * - Keyboard navigation (frecce, spazio)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, Check, X } from 'lucide-react';
import type { Card, Deck } from '../services/studyService';

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
// Animation Variants
// ─────────────────────────────────────────────────────────────

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 200 : -200,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 200 : -200,
        opacity: 0,
    }),
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
    const [internalIndex, setInternalIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0);
    
    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editFront, setEditFront] = useState('');
    const [editBack, setEditBack] = useState('');
    const [saving, setSaving] = useState(false);

    const cards = deck.cards || [];
    const totalCards = cards.length;
    const isControlled = controlledIndex !== undefined;
    const currentIndex = isControlled ? controlledIndex : internalIndex;
    const currentCard = cards[currentIndex] || null;

    // ─── Sync state ──────────────────────────────────────────

    useEffect(() => {
        if (isControlled && controlledIndex !== undefined) {
            setInternalIndex(controlledIndex);
        }
    }, [isControlled, controlledIndex]);

    // Reset flip quando cambia card
    useEffect(() => {
        setIsFlipped(false);
        setIsEditing(false);
    }, [currentIndex]);

    // Notifica parent
    useEffect(() => {
        if (currentCard && onCardChange) {
            onCardChange(currentCard, currentIndex);
        }
    }, [currentCard, currentIndex, onCardChange]);

    // ─── Navigation ──────────────────────────────────────────

    const goToPrev = useCallback(() => {
        if (totalCards === 0 || currentIndex <= 0) return;
        setDirection(-1);
        if (!isControlled) {
            setInternalIndex((i) => i - 1);
        }
    }, [currentIndex, totalCards, isControlled]);

    const goToNext = useCallback(() => {
        if (totalCards === 0 || currentIndex >= totalCards - 1) return;
        setDirection(1);
        if (!isControlled) {
            setInternalIndex((i) => i + 1);
        }
    }, [currentIndex, totalCards, isControlled]);

    // ─── Edit handlers ───────────────────────────────────────

    const handleStartEdit = useCallback(() => {
        if (!currentCard) return;
        setEditFront(currentCard.front);
        setEditBack(currentCard.back);
        setIsEditing(true);
        setIsFlipped(false);
    }, [currentCard]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditFront('');
        setEditBack('');
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!currentCard || !onUpdate || saving) return;
        if (!editFront.trim() || !editBack.trim()) return;

        setSaving(true);
        try {
            await onUpdate(currentCard.id, editFront.trim(), editBack.trim());
            setIsEditing(false);
        } catch {
            // Error handled by parent
        } finally {
            setSaving(false);
        }
    }, [currentCard, onUpdate, editFront, editBack, saving]);

    // ─── Keyboard navigation ─────────────────────────────────

    useEffect(() => {
        if (isEditing) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignora se focus su input/textarea
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goToPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goToNext();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    setIsFlipped((f) => !f);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrev, goToNext, isEditing]);

    // ─── Empty state ─────────────────────────────────────────

    if (totalCards === 0) {
        return (
            <div className={`flex flex-col items-center justify-center h-full p-8 ${className}`}>
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-3xl">🎴</span>
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
            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white tabular-nums">
                        {currentIndex + 1} / {totalCards}
                    </span>
                </div>
                {!isEditing && onUpdate && (
                    <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                    >
                        <Edit3 className="w-4 h-4" />
                        Modifica
                    </button>
                )}
            </div>

            {/* Card Area */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    {currentCard && (
                        <motion.div
                            key={currentCard.id}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="w-full max-w-xl"
                        >
                            {isEditing ? (
                                /* Edit Mode */
                                <div className="space-y-4 p-6 rounded-2xl bg-zinc-800/50 border border-white/10">
                                    <div>
                                        <label className="block mb-2 text-xs font-medium text-white/70">
                                            Domanda (Fronte)
                                        </label>
                                        <textarea
                                            value={editFront}
                                            onChange={(e) => setEditFront(e.target.value)}
                                            rows={3}
                                            autoFocus
                                            className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                                            placeholder="Scrivi la domanda..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-xs font-medium text-white/70">
                                            Risposta (Retro)
                                        </label>
                                        <textarea
                                            value={editBack}
                                            onChange={(e) => setEditBack(e.target.value)}
                                            rows={5}
                                            className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                                            placeholder="Scrivi la risposta..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" />
                                            Annulla
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={saving || !editFront.trim() || !editBack.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Check className="w-4 h-4" />
                                            {saving ? 'Salvo...' : 'Salva'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Card Display */
                                <div
                                    onClick={() => setIsFlipped((f) => !f)}
                                    className="cursor-pointer select-none"
                                    style={{ perspective: '1000px' }}
                                >
                                    <motion.div
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                                        className="relative w-full"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            minHeight: '280px',
                                        }}
                                    >
                                        {/* Front (Question) */}
                                        <div
                                            className="absolute inset-0 w-full rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 p-6 flex flex-col"
                                            style={{ backfaceVisibility: 'hidden' }}
                                        >
                                            <div className="flex-shrink-0 mb-4">
                                                <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-xs font-medium text-violet-300">
                                                    DOMANDA
                                                </span>
                                            </div>
                                            <div className="flex-1 flex items-center justify-center overflow-y-auto">
                                                <p className="text-lg md:text-xl font-medium text-white text-center leading-relaxed">
                                                    {currentCard.front}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 mt-4 pt-4 border-t border-white/10 text-center">
                                                <span className="text-xs text-white/40">
                                                    Clicca per vedere la risposta
                                                </span>
                                            </div>
                                        </div>

                                        {/* Back (Answer) */}
                                        <div
                                            className="absolute inset-0 w-full rounded-2xl bg-gradient-to-br from-emerald-900/50 to-zinc-900 border border-emerald-500/20 p-6 flex flex-col"
                                            style={{
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)',
                                            }}
                                        >
                                            <div className="flex-shrink-0 mb-4">
                                                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300">
                                                    RISPOSTA
                                                </span>
                                            </div>
                                            <div className="flex-1 flex items-center overflow-y-auto">
                                                <p className="text-base md:text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
                                                    {currentCard.back}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 mt-4 pt-4 border-t border-white/10 text-center">
                                                <span className="text-xs text-white/40">
                                                    Clicca per vedere la domanda
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            {!isEditing && (
                <div className="flex-shrink-0 px-5 py-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        {/* Prev */}
                        <button
                            onClick={goToPrev}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm">Precedente</span>
                        </button>

                        {/* Progress dots */}
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: Math.min(totalCards, 10) }, (_, i) => {
                                // Calcola quale dot è attivo
                                const dotIndex = totalCards <= 10
                                    ? i
                                    : Math.floor((currentIndex / (totalCards - 1)) * 9);
                                const isActive = totalCards <= 10
                                    ? i === currentIndex
                                    : i === dotIndex;

                                return (
                                    <div
                                        key={i}
                                        className={`rounded-full transition-all ${
                                            isActive
                                                ? 'w-6 h-1.5 bg-violet-500'
                                                : 'w-1.5 h-1.5 bg-white/20'
                                        }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Next */}
                        <button
                            onClick={goToNext}
                            disabled={currentIndex === totalCards - 1}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        >
                            <span className="hidden sm:inline text-sm">Successiva</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Keyboard hints */}
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/30">
                        <span>← → Naviga</span>
                        <span>Spazio = Gira</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashcardCarousel;
