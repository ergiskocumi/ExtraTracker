/**
 * 🎴 FLASHCARD COMPONENT - Premium 3D Flip Card
 * 
 * Ispirazione: Flashka.ai - Minimalista, Zen, Typography-first
 * 
 * Features:
 * - Animazione 3D flip realistica con perspective
 * - Design pulito con ombreggiature sottili
 * - Tipografia adattiva in base alla lunghezza del testo
 * - Scroll interno per testi molto lunghi
 * - Mobile-first responsive
 * - Supporto tastiera e touch
 */

import { useMemo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { Card } from '../services/studyService';

interface FlashcardProps {
    card: Card;
    isFlipped: boolean;
    onFlip: () => void;
    exitDirection?: 'left' | 'right' | 'up' | null;

    // Swipe-to-study
    draggable?: boolean;
    swipeThreshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;

    // Deck stack (0 = top)
    stackIndex?: 0 | 1 | 2;
    className?: string;
}

// Varianti per l'animazione della carta
const cardVariants = {
    enter: {
        scale: 0.92,
        opacity: 0,
        y: 60,
    },
    center: {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 260,
            damping: 25,
        }
    },
    exitLeft: {
        x: -350,
        opacity: 0,
        rotate: -12,
        transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] as const }
    },
    exitRight: {
        x: 350,
        opacity: 0,
        rotate: 12,
        transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] as const }
    },
    exitUp: {
        y: -200,
        opacity: 0,
        scale: 0.85,
        transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] as const }
    }
};

export const Flashcard: React.FC<FlashcardProps> = ({ 
    card, 
    isFlipped, 
    onFlip,
    exitDirection = null,
    draggable = false,
    swipeThreshold = 120,
    onSwipeLeft,
    onSwipeRight,
    stackIndex = 0,
    className = '',
}) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-240, 0, 240], [-10, 0, 10]);
    const overlayOpacity = useTransform(x, [-240, -80, 0, 80, 240], [0.45, 0.2, 0, 0.2, 0.45]);
    const overlayColor = useTransform(
        x,
        [-240, 0, 240],
        ['rgba(239, 68, 68, 0.22)', 'rgba(0, 0, 0, 0)', 'rgba(16, 185, 129, 0.22)']
    );
    const badgeOpacity = useTransform(x, [-240, -80, 0, 80, 240], [1, 0.9, 0, 0.9, 1]);

    const getExitVariant = () => {
        if (exitDirection === 'left') return 'exitLeft';
        if (exitDirection === 'right') return 'exitRight';
        if (exitDirection === 'up') return 'exitUp';
        return 'center';
    };

    // Status badge config
    const statusConfig = {
        new: { label: 'Nuova', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        learning: { label: 'Studio', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
        review: { label: 'Ripasso', bg: 'bg-primary-500/20', text: 'text-primary-400', border: 'border-primary-500/30' },
        mastered: { label: 'Padroneggiata', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    };

    const status = statusConfig[card.status] || statusConfig.new;

    // 📏 Calcola la dimensione del font in base alla lunghezza del testo
    const getFontSize = (text: string, isBack: boolean = false) => {
        const len = text.length;
        if (len < 50) return isBack ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';
        if (len < 100) return isBack ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl';
        if (len < 200) return isBack ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
        if (len < 400) return 'text-base sm:text-lg';
        return 'text-sm sm:text-base';
    };

    const frontFontSize = useMemo(() => getFontSize(card.front), [card.front]);
    const backFontSize = useMemo(() => getFontSize(card.back, true), [card.back]);

    // Determina se il testo è lungo abbastanza da necessitare scroll
    const needsScroll = (text: string) => text.length > 300;

    const stackTransform = {
        0: { scale: 1, y: 0, opacity: 1 },
        1: { scale: 0.97, y: 10, opacity: 0.65 },
        2: { scale: 0.94, y: 20, opacity: 0.4 },
    }[stackIndex];

    return (
        <motion.div
            key={card.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit={getExitVariant()}
            className={`w-full ${className}`}
            style={{ perspective: '1200px' }}
        >
            <motion.div
                drag={draggable ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                dragMomentum
                onDragEnd={(_, info) => {
                    if (!draggable) return;

                    if (info.offset.x > swipeThreshold) {
                        onSwipeRight?.();
                        return;
                    }
                    if (info.offset.x < -swipeThreshold) {
                        onSwipeLeft?.();
                        return;
                    }
                }}
                onTap={onFlip}
                style={{ 
                    transformStyle: 'preserve-3d',
                    cursor: 'pointer',
                    x,
                    rotate,
                }}
                animate={{ 
                    rotateY: isFlipped ? 180 : 0,
                    scale: stackTransform.scale,
                    y: stackTransform.y,
                    opacity: stackTransform.opacity,
                }}
                transition={{ 
                    duration: 0.55, 
                    type: 'spring', 
                    stiffness: 80,
                    damping: 15
                }}
                className="relative w-full min-h-[300px] sm:min-h-[340px] md:min-h-[380px]"
            >
                {/* Drag feedback overlay */}
                <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-3xl pointer-events-none z-20"
                    style={{ opacity: overlayOpacity, backgroundColor: overlayColor }}
                />

                {/* Drag badges (LEFT/RIGHT) */}
                {draggable && (
                    <>
                        <motion.div
                            className="absolute top-5 left-5 z-30 px-3 py-1.5 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-semibold tracking-wide"
                            style={{ opacity: badgeOpacity }}
                        >
                            NON SO
                        </motion.div>
                        <motion.div
                            className="absolute top-5 right-5 z-30 px-3 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wide"
                            style={{ opacity: badgeOpacity }}
                        >
                            LO SO
                        </motion.div>
                    </>
                )}

                {/* ═══════════════════════════════════════════
                    FRONTE DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30 flex flex-col p-5 sm:p-6 bg-zinc-900/70"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                    }}
                >
                    {/* Status Badge */}
                    <div className="flex justify-end mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Contenuto Fronte - con scroll se necessario */}
                    <div className={`flex-1 flex items-center justify-center w-full ${needsScroll(card.front) ? 'overflow-y-auto' : ''}`}>
                        <p className={`${frontFontSize} font-semibold text-white text-center leading-relaxed whitespace-pre-wrap break-words max-w-full`}>
                            {card.front}
                        </p>
                    </div>

                    {/* Hint per flip */}
                    <motion.div 
                        className="flex items-center justify-center gap-2 text-white/30 mt-3 pt-3 border-t border-white/[0.05]"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    >
                        <span className="text-xs font-medium">Tocca per girare</span>
                        <span className="text-xs">•</span>
                        <span className="text-xs font-medium">Swipe per votare</span>
                    </motion.div>
                </div>

                {/* ═══════════════════════════════════════════
                    RETRO DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30 flex flex-col p-5 sm:p-6 bg-zinc-900/70"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    {/* Label Risposta */}
                    <div className="flex justify-start mb-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Risposta
                        </span>
                    </div>

                    {/* Contenuto Retro - con scroll se necessario */}
                    <div className={`flex-1 flex items-center justify-center w-full ${needsScroll(card.back) ? 'overflow-y-auto' : ''}`}>
                        <p className={`${backFontSize} text-white/90 text-center leading-relaxed whitespace-pre-wrap break-words max-w-full`}>
                            {card.back}
                        </p>
                    </div>

                    {/* Spacer per bilanciare con il footer del fronte */}
                    <div className="h-8 mt-3" />
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// FLASHCARD SKELETON - Loading state
// ============================================

export const FlashcardSkeleton: React.FC = () => {
    return (
        <div className="w-full max-w-md mx-auto px-4">
            <div 
                className="w-full aspect-[4/3] sm:aspect-[3/2] rounded-3xl backdrop-blur-xl border border-white/[0.08] animate-pulse"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}
            >
                <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
                    <div className="w-3/4 h-7 bg-white/10 rounded-lg" />
                    <div className="w-1/2 h-7 bg-white/5 rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
