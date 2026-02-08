/**
 * STUDY CARD - Card di studio con flip 3D fluido e design immersivo
 * 
 * Features:
 * - Flip 3D smooth con perspective
 * - Supporto markdown per contenuti
 * - Indicatori stato carta (nuova/difficile/etc)
 * - Animazioni entrata/uscita
 * - Keyboard navigation support
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Sparkles, RotateCcw, Brain, GraduationCap, Trophy, Eye, EyeOff } from 'lucide-react';
import type { Card, CardStatus } from '../../services/studyService';
import { CardContentRenderer } from '../Flashcard/CardContentRenderer';

// ============================================
// TYPES
// ============================================

interface StudyCardProps {
    card: Card;
    isFlipped: boolean;
    onFlip: () => void;
    cardNumber: number;
    totalCards: number;
    exitDirection?: 'left' | 'right' | 'up' | null;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<CardStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
    new: {
        label: 'Nuova',
        icon: Sparkles,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
    },
    learning: {
        label: 'In apprendimento',
        icon: Brain,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
    },
    review: {
        label: 'Da ripassare',
        icon: RotateCcw,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
    },
    mastered: {
        label: 'Padroneggiata',
        icon: Trophy,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
    },
};

const CARD_TRANSITION_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const FLIP_TRANSITION_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// ============================================
// COMPONENT
// ============================================

export const StudyCard: React.FC<StudyCardProps> = ({
    card,
    isFlipped,
    onFlip,
    cardNumber,
    totalCards,
    exitDirection,
}) => {
    const [showHint, setShowHint] = useState(false);
    const statusConfig = STATUS_CONFIG[card.status];
    const StatusIcon = statusConfig.icon;

    // Keyboard shortcut per flip
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                onFlip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onFlip]);

    const handleCardClick = useCallback(() => {
        onFlip();
    }, [onFlip]);

    // Animation variants
    const cardVariants: Variants = {
        enter: (direction: string) => ({
            x: direction === 'right' ? 300 : direction === 'left' ? -300 : 0,
            y: direction === 'up' ? -100 : 0,
            opacity: 0,
            scale: 0.9,
            rotateY: 0,
        }),
        center: {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0,
            transition: {
                duration: 0.4,
                ease: CARD_TRANSITION_EASE,
            },
        },
        exit: (direction: string) => ({
            x: direction === 'right' ? 300 : direction === 'left' ? -300 : 0,
            y: direction === 'up' ? -100 : 100,
            opacity: 0,
            scale: 0.9,
            rotateY: 0,
            transition: {
                duration: 0.3,
                ease: 'easeIn',
            },
        }),
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto perspective-1000">
            {/* Progress indicator top */}
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-sm text-white/50">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{cardNumber}</span>
                    <span>/</span>
                    <span>{totalCards}</span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    <span className={`${statusConfig.color} text-xs uppercase tracking-wide font-medium`}>
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {/* Card Container with 3D flip */}
            <motion.div
                className="relative w-full aspect-[4/3] sm:aspect-[16/10] cursor-pointer"
                style={{ perspective: 1000 }}
                onClick={handleCardClick}
                initial="enter"
                animate="center"
                exit="exit"
                custom={exitDirection || 'right'}
                variants={cardVariants}
            >
                <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: FLIP_TRANSITION_EASE }}
                >
                    {/* FRONT SIDE */}
                    <div
                        className="absolute inset-0"
                        style={{ 
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                        }}
                    >
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-white/10 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between">
                                <div className={`px-3 py-1.5 rounded-full ${statusConfig.bgColor} border border-white/10`}>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${statusConfig.color}`}>
                                        Domanda
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowHint(!showHint);
                                    }}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all"
                                >
                                    {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-12 pt-20">
                                <div className="text-center max-w-lg">
                                    <CardContentRenderer 
                                        content={card.front} 
                                        className="text-xl sm:text-2xl md:text-3xl font-medium text-white leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Footer hint */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                                <p className="text-xs sm:text-sm text-white/40">
                                    Clicca o premi <kbd className="px-2 py-1 rounded bg-white/10 text-white/60 font-mono text-xs mx-1">Spazio</kbd> per girare
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* BACK SIDE */}
                    <div
                        className="absolute inset-0"
                        style={{ 
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-primary-900/30 via-slate-900 to-slate-950 border border-primary-500/30 shadow-2xl shadow-primary-500/10 overflow-hidden">
                            {/* Header */}
                            <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between">
                                <div className="px-3 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
                                        Risposta
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-12 pt-20">
                                <div className="text-center max-w-lg overflow-y-auto max-h-full">
                                    <CardContentRenderer 
                                        content={card.back} 
                                        className="text-lg sm:text-xl md:text-2xl font-medium text-white/90 leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                                <p className="text-xs sm:text-sm text-primary-400/70">
                                    Come è andata? Valuta la tua risposta
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default StudyCard;
