/**
 * STUDY CONTROLS - 5 livelli di valutazione
 *
 * Features:
 * - 5 pulsanti (Non so, Difficile, Ok, Bene, Perfetto)
 * - Keyboard shortcuts 1-5
 * - Animazioni feedback
 * - Layout compatto su mobile
 */

import React, { useEffect, useCallback } from 'react';
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
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/20 hover:bg-rose-500/30',
        borderColor: 'border-rose-500/40 hover:border-rose-500/60',
        icon: X,
    },
    {
        value: 2,
        label: 'Difficile',
        description: 'Con molta difficoltà',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20 hover:bg-orange-500/30',
        borderColor: 'border-orange-500/40 hover:border-orange-500/60',
        icon: AlertTriangle,
    },
    {
        value: 3,
        label: 'Ok',
        description: 'Con qualche esitazione',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20 hover:bg-amber-500/30',
        borderColor: 'border-amber-500/40 hover:border-amber-500/60',
        icon: Minus,
    },
    {
        value: 4,
        label: 'Bene',
        description: 'Ricordato correttamente',
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/20 hover:bg-sky-500/30',
        borderColor: 'border-sky-500/40 hover:border-sky-500/60',
        icon: ThumbsUp,
    },
    {
        value: 5,
        label: 'Perfetto',
        description: 'Risposta immediata',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20 hover:bg-emerald-500/30',
        borderColor: 'border-emerald-500/40 hover:border-emerald-500/60',
        icon: Check,
    },
];

// ============================================
// COMPONENT
// ============================================

export const StudyControls: React.FC<StudyControlsProps> = ({
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
            <div className="h-24 flex items-center justify-center">
                <p className="text-white/40 text-sm animate-pulse">
                    Gira la carta per valutare
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto space-y-3">
            {/* Rating buttons - 5 columns */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {RATING_OPTIONS.map((option, index) => (
                    <motion.button
                        key={option.value}
                        onClick={() => onRate(option.value)}
                        disabled={disabled}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
                        whileTap={{ scale: disabled ? 1 : 0.97 }}
                        className={`
                            relative group p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2
                            transition-all duration-200
                            ${option.bgColor} ${option.borderColor}
                            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        {/* Icon */}
                        <div className={`${option.color} mb-1 sm:mb-2 flex justify-center`}>
                            <option.icon className="w-5 h-5 sm:w-7 sm:h-7" />
                        </div>

                        {/* Label */}
                        <span className={`text-xs sm:text-sm font-bold ${option.color} block mb-0.5`}>
                            {option.label}
                        </span>

                        {/* Description - hidden on small screens */}
                        <span className="text-[10px] sm:text-xs text-white/50 block hidden sm:block">
                            {option.description}
                        </span>

                        {/* Keyboard shortcut */}
                        <kbd className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1 sm:px-2 py-0.5 rounded bg-white/10 text-white/40 text-[10px] sm:text-xs font-mono hidden sm:block">
                            {option.value}
                        </kbd>

                        {/* Hover glow effect */}
                        <div className={`absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t ${option.bgColor} to-transparent -z-10`} />
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
                            text-white/40 hover:text-white/60
                            transition-all text-sm
                            disabled:opacity-40
                        "
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Salta carta</span>
                        <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/10 text-white/30 text-xs font-mono">S</kbd>
                    </motion.button>
                </div>
            )}

            {/* Keyboard hints */}
            <div className="hidden sm:flex items-center justify-center gap-3 text-xs text-white/30">
                {RATING_OPTIONS.map((option) => (
                    <span key={option.value} className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">{option.value}</kbd>
                        {option.label}
                    </span>
                ))}
                <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">Spazio</kbd>
                    Gira
                </span>
            </div>
        </div>
    );
};

export default StudyControls;
