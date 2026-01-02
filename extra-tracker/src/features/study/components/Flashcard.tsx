/**
 * 🎴 FLASHCARD COMPONENT - Carta con animazione 3D Flip
 * 
 * Ispirazione: Flashka.ai - Minimalista, pulita, animazioni fluide
 * 
 * Features:
 * - Animazione 3D flip sull'asse Y con framer-motion
 * - Supporto click e tastiera (Spazio)
 * - Design glassmorphism coerente con il progetto
 * - Supporto testo multilinea
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
        scale: 0.9,
        opacity: 0,
        y: 50,
    },
    center: {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 30,
        }
    },
    exitLeft: {
        x: -400,
        opacity: 0,
        rotate: -15,
        transition: { duration: 0.3, ease: 'easeIn' as const }
    },
    exitRight: {
        x: 400,
        opacity: 0,
        rotate: 15,
        transition: { duration: 0.3, ease: 'easeIn' as const }
    },
    exitUp: {
        y: -300,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.3, ease: 'easeIn' as const }
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

    return (
        <motion.div
            key={card.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit={getExitVariant()}
            className="relative w-full max-w-lg mx-auto perspective-1000"
            style={{ perspective: '1000px' }}
        >
            <motion.div
                onClick={!isFlipped ? onFlip : undefined}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ 
                    duration: 0.6, 
                    type: 'spring', 
                    stiffness: 100,
                    damping: 20
                }}
                style={{ 
                    transformStyle: 'preserve-3d',
                    cursor: !isFlipped ? 'pointer' : 'default'
                }}
                className="relative w-full min-h-[320px] md:min-h-[400px]"
            >
                {/* FRONTE della carta */}
                <div
                    className={`
                        absolute inset-0 w-full h-full
                        rounded-3xl
                        backdrop-blur-xl
                        border border-white/[0.1]
                        shadow-2xl shadow-black/20
                        flex flex-col items-center justify-center
                        p-8
                        backface-hidden
                        transition-shadow duration-300
                        ${!isFlipped ? 'hover:shadow-primary-500/10 hover:border-white/20' : ''}
                    `}
                    style={{ 
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                    }}
                >
                    {/* Decorazione angolo */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-transparent rounded-tl-3xl" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary-500/5 to-transparent rounded-br-3xl" />
                    
                    {/* Badge stato carta */}
                    <div className="absolute top-4 right-4">
                        <span className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            ${card.status === 'new' ? 'bg-blue-500/20 text-blue-400' : ''}
                            ${card.status === 'learning' ? 'bg-amber-500/20 text-amber-400' : ''}
                            ${card.status === 'review' ? 'bg-primary-500/20 text-primary-400' : ''}
                            ${card.status === 'mastered' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        `}>
                            {card.status === 'new' && 'Nuova'}
                            {card.status === 'learning' && 'In Apprendimento'}
                            {card.status === 'review' && 'Da Ripassare'}
                            {card.status === 'mastered' && 'Padroneggiata'}
                        </span>
                    </div>

                    {/* Contenuto Fronte */}
                    <div className="relative z-10 text-center max-w-full">
                        <p className="text-2xl md:text-3xl font-semibold text-white leading-relaxed whitespace-pre-wrap break-words">
                            {card.front}
                        </p>
                    </div>

                    {/* Hint per flip */}
                    <motion.div 
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/30"
                        animate={{ y: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Spazio</kbd>
                        <span className="text-xs">o clicca per girare</span>
                    </motion.div>
                </div>

                {/* RETRO della carta */}
                <div
                    className={`
                        absolute inset-0 w-full h-full
                        rounded-3xl
                        backdrop-blur-xl
                        border border-white/[0.1]
                        shadow-2xl shadow-black/20
                        flex flex-col items-center justify-center
                        p-8
                        backface-hidden
                    `}
                    style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)'
                    }}
                >
                    {/* Decorazione angolo */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-tr-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-bl-3xl" />

                    {/* Label Risposta */}
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            Risposta
                        </span>
                    </div>

                    {/* Contenuto Retro */}
                    <div className="relative z-10 text-center max-w-full">
                        <p className="text-xl md:text-2xl text-white/90 leading-relaxed whitespace-pre-wrap break-words">
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
        <div className="relative w-full max-w-lg mx-auto">
            <div 
                className="w-full min-h-[320px] md:min-h-[400px] rounded-3xl backdrop-blur-xl border border-white/[0.08] animate-pulse"
                style={{ 
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                }}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-4">
                    <div className="w-3/4 h-8 bg-white/10 rounded-lg" />
                    <div className="w-1/2 h-8 bg-white/5 rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
