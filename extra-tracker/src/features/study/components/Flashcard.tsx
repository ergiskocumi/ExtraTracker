/**
 * 🎴 FLASHCARD COMPONENT - Premium 3D Flip Card
 * 
 * Ispirazione: Flashka.ai - Minimalista, Zen, Typography-first
 * 
 * Features:
 * - Animazione 3D flip realistica con perspective
 * - Design pulito, bianco su bianco con ombreggiature sottili
 * - Tipografia grande e leggibile
 * - Mobile-first responsive
 * - Supporto tastiera e touch
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../services/studyService';

interface FlashcardProps {
    card: Card;
    isFlipped: boolean;
    onFlip: () => void;
    exitDirection?: 'left' | 'right' | 'up' | null;
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

    return (
        <motion.div
            key={card.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit={getExitVariant()}
            className="w-full max-w-md mx-auto px-4"
            style={{ perspective: '1200px' }}
        >
            <motion.div
                onClick={!isFlipped ? onFlip : undefined}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ 
                    duration: 0.55, 
                    type: 'spring', 
                    stiffness: 80,
                    damping: 15
                }}
                style={{ 
                    transformStyle: 'preserve-3d',
                    cursor: !isFlipped ? 'pointer' : 'default'
                }}
                className="relative w-full aspect-[4/3] sm:aspect-[3/2]"
            >
                {/* ═══════════════════════════════════════════
                    FRONTE DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/20 flex flex-col items-center justify-center p-6 sm:p-8"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                    }}
                >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Contenuto Fronte */}
                    <div className="flex-1 flex items-center justify-center w-full">
                        <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-white text-center leading-relaxed whitespace-pre-wrap break-words">
                            {card.front}
                        </p>
                    </div>

                    {/* Hint per flip */}
                    <motion.div 
                        className="flex items-center gap-2 text-white/30"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    >
                        <span className="text-xs font-medium">Tocca per girare</span>
                        <span className="hidden sm:inline text-xs">•</span>
                        <kbd className="hidden sm:inline px-1.5 py-0.5 bg-white/10 text-white/40 rounded text-[10px] font-mono">
                            Spazio
                        </kbd>
                    </motion.div>
                </div>

                {/* ═══════════════════════════════════════════
                    RETRO DELLA CARTA
                    ═══════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/20 flex flex-col items-center justify-center p-6 sm:p-8"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)'
                    }}
                >
                    {/* Label Risposta */}
                    <div className="absolute top-4 left-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Risposta
                        </span>
                    </div>

                    {/* Contenuto Retro */}
                    <div className="flex-1 flex items-center justify-center w-full">
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 text-center leading-relaxed whitespace-pre-wrap break-words">
                            {card.back}
                        </p>
                    </div>
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
