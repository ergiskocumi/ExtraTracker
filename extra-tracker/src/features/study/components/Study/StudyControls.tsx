/**
 * STUDY CONTROLS - 5 livelli di valutazione
 *
 * Features:
 * - 5 pulsanti (Non so, Difficile, Ok, Bene, Perfetto)
 * - Keyboard shortcuts 1-5
 * - Animazioni feedback
 * - Layout compatto su mobile
 */

import React, { memo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Minus, ThumbsUp, Check, RotateCcw } from 'lucide-react';
import type { ReviewRating } from '../../services/studyService';

// ============================================
// TYPES
// ============================================

interface StudyControlsProps {
    onRate: (rating: ReviewRating) => void;
    onSkip?: () => void;
    disabled?: boolean;
    visible: boolean;
}

interface RatingOption {
    value: ReviewRating;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
}

// ============================================
// RATING CONFIG
// ============================================

const RATING_OPTIONS: RatingOption[] = [
    {
        value: 1,
        label: 'Non so',
        description: 'Non ricordavo affatto',
        color: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-500/15 hover:bg-rose-500/25',
        borderColor: 'border-rose-500/35 hover:border-rose-500/55',
        icon: X,
    },
    {
        value: 2,
        label: 'Difficile',
        description: 'Con molta difficoltà',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/15 hover:bg-orange-500/25',
        borderColor: 'border-orange-500/35 hover:border-orange-500/55',
        icon: AlertTriangle,
    },
    {
        value: 3,
        label: 'Ok',
        description: 'Con qualche esitazione',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/15 hover:bg-amber-500/25',
        borderColor: 'border-amber-500/35 hover:border-amber-500/55',
        icon: Minus,
    },
    {
        value: 4,
        label: 'Bene',
        description: 'Ricordato correttamente',
        color: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-500/15 hover:bg-sky-500/25',
        borderColor: 'border-sky-500/35 hover:border-sky-500/55',
        icon: ThumbsUp,
    },
    {
        value: 5,
        label: 'Perfetto',
        description: 'Risposta immediata',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/15 hover:bg-emerald-500/25',
        borderColor: 'border-emerald-500/35 hover:border-emerald-500/55',
        icon: Check,
    },
];

// ============================================
// COMPONENT
// ============================================

export const StudyControls = memo<StudyControlsProps>(({
    onRate,
    onSkip,
    disabled,
    visible,
}) => {
    // Keyboard shortcuts: 1-5 map directly
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (disabled || !visible) return;

        const key = e.key;
        if (key >= '1' && key <= '5') {
            e.preventDefault();
            onRate(Number(key) as ReviewRating);
        } else if (key === 's' || key === 'S') {
            if (onSkip) {
                e.preventDefault();
                onSkip();
            }
        }
    }, [onRate, onSkip, disabled, visible]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!visible) {
        return (
            <div className="h-16 sm:h-24 flex items-center justify-center">
                <p className="text-theme-muted text-xs sm:text-sm animate-pulse">
                    Gira la carta per valutare
                </p>
            </div>
        );
    }

    return (
        <div className="study-controls w-full max-w-3xl mx-auto space-y-2 sm:space-y-3 px-2 sm:px-0">
            {/* Rating buttons - 5 columns */}
            <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3">
                {RATING_OPTIONS.map((option, index) => (
                    <motion.button
                        key={option.value}
                        onClick={() => onRate(option.value)}
                        disabled={disabled}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        className={`
                            study-controls-option relative group p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-2
                            transition-all duration-200 touch-manipulation min-h-[60px] sm:min-h-[80px] md:min-h-[auto]
                            ${option.bgColor} ${option.borderColor}
                            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            flex flex-col items-center justify-center
                        `}
                    >
                        {/* Icon */}
                        <div className={`${option.color} mb-0.5 sm:mb-1 md:mb-2 flex justify-center`}>
                            <option.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7" />
                        </div>

                        {/* Label */}
                        <span className={`text-[10px] sm:text-xs md:text-sm font-bold ${option.color} block mb-0 sm:mb-0.5 leading-tight`}>
                            {option.label}
                        </span>

                        {/* Description - hidden on small screens */}
                        <span className="text-[9px] sm:text-[10px] md:text-xs text-theme-muted block hidden sm:block leading-tight">
                            {option.description}
                        </span>

                        {/* Keyboard shortcut */}
                        <kbd className="study-controls-kbd absolute top-0.5 right-0.5 sm:top-1 sm:right-1 md:top-2 md:right-2 px-1 sm:px-1.5 md:px-2 py-0 rounded bg-theme-surface border border-theme-default text-theme-muted text-[9px] sm:text-[10px] md:text-xs font-mono hidden md:block">
                            {option.value}
                        </kbd>
                    </motion.button>
                ))}
            </div>

            {/* Skip button */}
            {onSkip && (
                <div className="flex justify-center">
                    <motion.button
                        onClick={onSkip}
                        disabled={disabled}
                        whileHover={{ scale: disabled ? 1 : 1.05 }}
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        className="
                            flex items-center gap-2 px-4 py-2 rounded-xl
                            text-theme-muted hover:text-theme-primary hover:bg-theme-surface
                            transition-all text-sm
                            disabled:opacity-40
                        "
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Salta carta</span>
                        <kbd className="study-controls-kbd hidden sm:inline px-1.5 py-0.5 rounded bg-theme-surface border border-theme-default text-theme-muted text-xs font-mono">S</kbd>
                    </motion.button>
                </div>
            )}

            {/* Keyboard hints */}
            <div className="hidden sm:flex items-center justify-center gap-3 text-xs text-theme-muted">
                {RATING_OPTIONS.map((option) => (
                    <span key={option.value} className="flex items-center gap-1">
                        <kbd className="study-controls-kbd px-1.5 py-0.5 rounded bg-theme-surface border border-theme-default text-theme-secondary font-mono">{option.value}</kbd>
                        {option.label}
                    </span>
                ))}
                <span className="flex items-center gap-1">
                    <kbd className="study-controls-kbd px-1.5 py-0.5 rounded bg-theme-surface border border-theme-default text-theme-secondary font-mono">Spazio</kbd>
                    Gira
                </span>
            </div>
        </div>
    );
});

export default StudyControls;
