/**
 * 🎴 FLASHCARD COMPONENT - Premium 3D Flip Card
 * 
 * Design semplice e performante con solo rotazione 3D.
 * 
 * Features:
 * - Animazione 3D flip semplice e fluida
 * - Design premium con glassmorphism
 * - Tipografia adattiva responsive
 * - Scroll ottimizzato per testi lunghi
 * - Mobile-first design
 * - Supporto tastiera e touch
 */

import { useEffect, useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../services/studyService';

interface FlashcardProps {
    card: Card;
    isFlipped: boolean;
    onFlip: () => void;
    exitDirection?: 'left' | 'right' | 'up' | null;
}

// Varianti semplici per transizioni tra card
const cardVariants = {
    enter: {
        opacity: 0,
        scale: 0.95,
    },
    center: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1] as const,
        }
    },
    exitLeft: {
        x: -600,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    exitRight: {
        x: 600,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    exitUp: {
        y: -400,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    }
};

export const Flashcard: React.FC<FlashcardProps> = memo(({ 
    card, 
    isFlipped, 
    onFlip,
    exitDirection = null 
}) => {
    // Gestione tastiera (Spazio per flip)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isFlipped) {
                e.preventDefault();
                onFlip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, onFlip]);

    const getExitVariant = useCallback(() => {
        if (exitDirection === 'left') return 'exitLeft';
        if (exitDirection === 'right') return 'exitRight';
        if (exitDirection === 'up') return 'exitUp';
        return 'center';
    }, [exitDirection]);

    // Status badge config
    const statusConfig = useMemo(() => ({
        new: { label: 'Nuova', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        learning: { label: 'Studio', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
        review: { label: 'Ripasso', bg: 'bg-primary-500/20', text: 'text-primary-400', border: 'border-primary-500/30' },
        mastered: { label: 'Padroneggiata', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    }), []);

    const status = useMemo(() => statusConfig[card.status] || statusConfig.new, [card.status, statusConfig]);

    // 📏 Calcola la dimensione del font
    const getFontSize = useCallback((text: string, isBack: boolean = false) => {
        const len = text.length;
        if (len < 50) return isBack ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl sm:text-2xl md:text-3xl';
        if (len < 100) return isBack ? 'text-base sm:text-lg md:text-xl' : 'text-lg sm:text-xl md:text-2xl';
        if (len < 200) return isBack ? 'text-sm sm:text-base md:text-lg' : 'text-base sm:text-lg md:text-xl';
        if (len < 400) return 'text-sm sm:text-base md:text-lg';
        return 'text-xs sm:text-sm md:text-base';
    }, []);

    const frontFontSize = useMemo(() => getFontSize(card.front), [card.front, getFontSize]);
    const backFontSize = useMemo(() => getFontSize(card.back, true), [card.back, getFontSize]);

    // Determina se il testo necessita scroll
    const needsScroll = useCallback((text: string) => {
        if (typeof window === 'undefined') return text.length > 300;
        const isMobile = window.innerWidth < 640;
        return isMobile ? text.length > 100 : text.length > 300;
    }, []);

    const frontNeedsScroll = useMemo(() => needsScroll(card.front), [card.front, needsScroll]);
    const backNeedsScroll = useMemo(() => needsScroll(card.back), [card.back, needsScroll]);

    return (
        <motion.div
            key={card.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit={getExitVariant()}
            className="w-full max-w-lg mx-auto px-4"
            style={{ perspective: '1200px' }}
        >
            <motion.div
                onClick={!isFlipped ? onFlip : undefined}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ 
                    duration: 0.6, 
                    type: 'spring', 
                    stiffness: 100,
                    damping: 18
                }}
                style={{ 
                    transformStyle: 'preserve-3d',
                    cursor: !isFlipped ? 'pointer' : 'default'
                }}
                className="relative w-full min-h-[300px] sm:min-h-[360px] md:min-h-[400px]"
            >
                {/* ═══════════════════════════════════════════
                    FRONTE DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/[0.15] shadow-2xl flex flex-col p-4 sm:p-6 md:p-8"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
                        boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {/* Status Badge */}
                    <div className="flex justify-end mb-3 flex-shrink-0">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border} shadow-sm`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Contenuto Fronte */}
                    <div 
                        className={`flex-1 flex items-center justify-center w-full min-w-0 ${frontNeedsScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
                    >
                        <div className="w-full max-w-full px-2">
                            <p className={`${frontFontSize} font-bold text-white text-center leading-relaxed sm:leading-relaxed md:leading-relaxed whitespace-pre-wrap break-words max-w-full drop-shadow-sm`}>
                                {card.front}
                            </p>
                        </div>
                    </div>

                    {/* Hint per flip */}
                    <motion.div 
                        className="flex items-center justify-center gap-2 text-white/40 mt-4 pt-4 border-t border-white/[0.08] flex-shrink-0"
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    >
                        <span className="text-xs font-semibold">Tocca per girare</span>
                        <span className="hidden sm:inline text-xs">•</span>
                        <kbd className="hidden sm:inline px-2 py-1 bg-white/[0.12] text-white/50 rounded-lg text-[10px] font-mono border border-white/[0.1] shadow-sm">
                            Spazio
                        </kbd>
                    </motion.div>
                </div>

                {/* ═══════════════════════════════════════════
                    RETRO DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/[0.15] shadow-2xl flex flex-col p-4 sm:p-6 md:p-8"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg) scaleX(-1)',
                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(139, 92, 246, 0.05) 100%)',
                        boxShadow: '0 20px 60px -12px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {/* Label Risposta */}
                    <div className="flex justify-start mb-3 flex-shrink-0">
                        <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm">
                            Risposta
                        </span>
                    </div>

                    {/* Contenuto Retro */}
                    <div 
                        className={`flex-1 flex items-center justify-center w-full min-w-0 ${backNeedsScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
                    >
                        <div className="w-full max-w-full px-2">
                            <p className={`${backFontSize} font-semibold text-white/95 text-center leading-relaxed sm:leading-relaxed md:leading-relaxed whitespace-pre-wrap break-words max-w-full drop-shadow-sm`}>
                                {card.back}
                            </p>
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="h-8 mt-3 flex-shrink-0" />
                </div>
            </motion.div>
        </motion.div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison per memo
    return (
        prevProps.card.id === nextProps.card.id &&
        prevProps.card.front === nextProps.card.front &&
        prevProps.card.back === nextProps.card.back &&
        prevProps.card.status === nextProps.card.status &&
        prevProps.isFlipped === nextProps.isFlipped &&
        prevProps.exitDirection === nextProps.exitDirection
    );
});

Flashcard.displayName = 'Flashcard';

// ============================================
// FLASHCARD SKELETON - Loading state
// ============================================

export const FlashcardSkeleton: React.FC = () => {
    return (
        <div className="w-full max-w-lg mx-auto px-4">
            <div 
                className="w-full min-h-[300px] sm:min-h-[360px] md:min-h-[400px] rounded-3xl backdrop-blur-xl border border-white/[0.08] animate-pulse"
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
