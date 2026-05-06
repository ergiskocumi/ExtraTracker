/**
 * 🎴 Spaced Repetition Study Mode - Minimalist Premium Edition
 * 
 * Clean, focused design with:
 * - Session timer and accuracy
 * - Flashcard without scroll
 * - Simple 1-5 rating system
 * - Smooth animations
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { Flashcard } from './Flashcard';

// ═══════════════════════════════════════════
// Type definitions
// ═══════════════════════════════════════════
type RatingValue = 1 | 2 | 3;

interface SpacedRepetitionViewProps {
    card: Card;
    onRate: (rating: RatingValue) => Promise<boolean>;
    onNext: () => void;
    totalCards: number;
    currentIndex: number;
}

export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = ({
    card,
    onRate,
    onNext,
    totalCards,
    currentIndex,
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedRating, setSelectedRating] = useState<RatingValue | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const [accuracy, setAccuracy] = useState({
        correctCount: 0,
        totalCount: 0,
        accuracyPercentage: 0,
    });

 

    // Session timer
    useEffect(() => {
        const interval = setInterval(() => {
            setSessionTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Keyboard support for 1, 2, 3
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFlipped || isSubmitting) return;

            if (e.key === '1') handleRate(1);
            else if (e.key === '2') handleRate(2);
            else if (e.key === '3') handleRate(3);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, isSubmitting]);

    // Rating metadata - Emoji tematici & colori vividi
    const ratingData: Record<RatingValue, { 
        emoji: string; 
        label: string; 
        color: string;
        bgGradient: string;
        borderColor: string;
        glowColor: string;
    }> = {
        1: { 
            emoji: '🔥', 
            label: 'Difficile', 
            color: 'text-white',
            bgGradient: 'from-red-600 via-red-500 to-rose-500',
            borderColor: 'border-red-400',
            glowColor: 'shadow-red-500/50'
        },
        2: { 
            emoji: '🤔', 
            label: 'Così così', 
            color: 'text-white',
            bgGradient: 'from-amber-600 via-amber-500 to-orange-500',
            borderColor: 'border-amber-400',
            glowColor: 'shadow-amber-500/50'
        },
        3: { 
            emoji: '🚀', 
            label: 'Facile', 
            color: 'text-white',
            bgGradient: 'from-emerald-600 via-emerald-500 to-teal-500',
            borderColor: 'border-emerald-400',
            glowColor: 'shadow-emerald-500/50'
        },
    };

    const handleFlip = useCallback(() => {
        setIsFlipped(!isFlipped);
    }, [isFlipped]);

    const recordAnswer = useCallback((isCorrect: boolean) => {
        setAccuracy((prev) => {
            const totalCount = prev.totalCount + 1;
            const correctCount = prev.correctCount + (isCorrect ? 1 : 0);
            return {
                totalCount,
                correctCount,
                accuracyPercentage: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
            };
        });
    }, []);

    const handleRate = useCallback(async (rating: RatingValue) => {
        if (isSubmitting) return;

        setSelectedRating(rating);
        setIsSubmitting(true);

        if (rating === 3) {
            recordAnswer(true);
        } else if (rating === 2) {
            recordAnswer(false);
        } else {
            recordAnswer(false);
        }

        // Submit and advance
        const success = await onRate(rating);

        if (success) {
            setTimeout(() => {
                setIsFlipped(false);
                setSelectedRating(null);
                setIsSubmitting(false);
                onNext();
            }, 400);
        } else {
            setIsSubmitting(false);
        }
    }, [isSubmitting, onRate, onNext, recordAnswer]);

    const progressPercent = useMemo(
        () => Math.round(((currentIndex + 1) / totalCards) * 100),
        [currentIndex, totalCards]
    );

    const formattedTime = useMemo(() => {
        const hours = Math.floor(sessionTime / 3600);
        const minutes = Math.floor((sessionTime % 3600) / 60);
        const seconds = sessionTime % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m ${seconds}s`;
    }, [sessionTime]);

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col px-3 py-4">
            {/* ═══════════════════════════════════════════
                HEADER - Più grande e leggibile
                ═══════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 w-full"
            >
                {/* Top row: Time + Accuracy + Progress */}
                <div className="flex items-center justify-between gap-4 mb-3 px-2">
                    {/* Session Time */}
                    <div className="flex items-center gap-2">
                        <span className="text-lg">⏱️</span>
                        <span className="text-sm font-mono text-white/60">{formattedTime}</span>
                    </div>

                    {/* Accuracy - Animated */}
                    <motion.div
                        key={`acc-${accuracy.accuracyPercentage}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2.5"
                    >
                        <span className="text-xl font-bold text-cyan-400">{accuracy.accuracyPercentage}%</span>
                        <span className="text-sm text-white/40">({accuracy.correctCount}/{accuracy.totalCount})</span>
                    </motion.div>

                    {/* Card Counter */}
                    <div className="text-sm font-semibold text-theme-secondary">
                        {currentIndex + 1}/{totalCards}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"
                    />
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════
                FLASHCARD - Massimizzato
                ═══════════════════════════════════════════ */}
            <div className="flex-1 flex items-center justify-center min-h-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full max-w-2xl h-full flex items-center justify-center"
                >
                    <Flashcard
                        card={card}
                        isFlipped={isFlipped}
                        onFlip={handleFlip}
                        exitDirection={null}
                    />
                </motion.div>
            </div>

            {/* ═══════════════════════════════════════════
                RATING BUTTONS - Colorati e Vividi
                ═══════════════════════════════════════════ */}
            <AnimatePresence>
                {isFlipped && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.35 }}
                        className="mt-6 mb-4 w-full px-2"
                    >
                        {/* 3 Rating Buttons - XL Size */}
                        <div className="flex items-center justify-center gap-3">
                            {([1, 2, 3] as const).map((rating) => {
                                const config = ratingData[rating];
                                const isSelected = selectedRating === rating;

                                return (
                                    <motion.button
                                        key={rating}
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: (rating - 1) * 0.12 }}
                                        whileHover={!isSubmitting ? { scale: 1.08, y: -5 } : undefined}
                                        whileTap={!isSubmitting ? { scale: 0.92 } : undefined}
                                        onClick={() => handleRate(rating)}
                                        disabled={isSubmitting}
                                        className={`relative flex flex-col items-center justify-center gap-3 px-6 py-5 rounded-3xl transition-colors duration-200 border font-bold text-white/90 active:scale-[0.97] ${
                                            isSelected
                                                ? `border-white bg-gradient-to-br ${config.bgGradient} shadow-2xl ${config.glowColor}`
                                                : `border-white/15 bg-white/5 hover:bg-white/[0.07] hover:border-white/30`
                                        } disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md`}
                                    >
                                        {/* Keyboard hint */}
                                        <span className="absolute top-1.5 right-3 text-xs font-bold text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                                            {rating}
                                        </span>

                                        {/* Emoji - Grande */}
                                        <motion.span
                                            animate={isSelected ? { scale: [1, 1.3, 1.2] } : {}}
                                            transition={{ duration: 0.35, type: 'spring' }}
                                            className="text-5xl"
                                        >
                                            {config.emoji}
                                        </motion.span>

                                        {/* Label */}
                                        <span className="text-sm font-bold tracking-tight">
                                            {config.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Keyboard hint */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-center text-white/40 text-xs mt-4 font-mono"
                        >
                            Premi <span className="text-white/60 font-bold">1</span> <span className="text-white/30">|</span> <span className="text-white/60 font-bold">2</span> <span className="text-white/30">|</span> <span className="text-white/60 font-bold">3</span>
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hint - Flip Card */}
            {!isFlipped && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-white/25 text-xs mt-4"
                >
                    Clicca per girare 👆
                </motion.p>
            )}
        </div>
    );
};

export default SpacedRepetitionView;
