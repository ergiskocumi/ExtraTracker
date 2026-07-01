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

import { useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import type { Card } from '../../services/studyService';
import { CardContentRenderer } from './CardContentRenderer/index';

interface FlashcardProps {
    card: Card;
    isFlipped: boolean;
    onFlip: () => void;
    exitDirection?: 'left' | 'right' | 'up' | null;
    /** Callback quando si clicca "Show Source" (opzionale) */
    onShowSource?: (card: Card) => void;
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
    exitDirection = null,
    onShowSource,
}) => {
    // Gestione tastiera (Spazio per flip) — refs evita ri-registrazione ad ogni flip
    const isFlippedRef = useRef(isFlipped);
    isFlippedRef.current = isFlipped;
    const onFlipRef = useRef(onFlip);
    onFlipRef.current = onFlip;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isFlippedRef.current) {
                e.preventDefault();
                onFlipRef.current();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    // 📱 Rileva se siamo su mobile
    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 640;
    }, []);

    // 📏 Calcola la dimensione del font - STILI SEPARATI MOBILE/DESKTOP
    const getFontSize = useCallback((text: string, isBack: boolean = false) => {
        const len = text.length;
        
        if (isMobile) {
            // MOBILE: Font size ottimizzati per leggibilità
            if (len < 25) return isBack ? 'text-[15px]' : 'text-[17px]';
            if (len < 50) return isBack ? 'text-[14px]' : 'text-[16px]';
            if (len < 80) return isBack ? 'text-[13px]' : 'text-[15px]';
            if (len < 120) return 'text-[13px]';
            if (len < 200) return 'text-[12px]';
            return 'text-[11px]';
        }
        
        // DESKTOP: Dimensioni normali
        if (len < 50) return isBack ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';
        if (len < 100) return isBack ? 'text-lg md:text-xl' : 'text-xl md:text-2xl';
        if (len < 200) return isBack ? 'text-base md:text-lg' : 'text-lg md:text-xl';
        if (len < 400) return 'text-sm md:text-base';
        return 'text-xs md:text-sm';
    }, [isMobile]);

    const frontFontSize = useMemo(() => getFontSize(card.front), [card.front, getFontSize]);
    const backFontSize = useMemo(() => getFontSize(card.back, true), [card.back, getFontSize]);

    // Determina se il testo necessita scroll
    const needsScroll = useCallback((text: string) => {
        if (typeof window === 'undefined') return text.length > 300;
        // Su mobile: scroll più frequente
        return isMobile ? text.length > 60 : text.length > 250;
    }, [isMobile]);

    const frontNeedsScroll = useMemo(() => needsScroll(card.front), [card.front, needsScroll]);
    const backNeedsScroll = useMemo(() => needsScroll(card.back), [card.back, needsScroll]);

    return (
        <motion.div
            key={card.id}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit={getExitVariant()}
            className={`w-full mx-auto ${isMobile ? 'max-w-[92%] px-2' : 'max-w-lg px-4'}`}
            style={{ perspective: '1200px' }}
        >
            <motion.div
                onClick={!isFlipped ? onFlip : undefined}
                animate={{ 
                    rotateY: isFlipped ? 180 : 0,
                    y: 0, // Forza posizione Y fissa
                    x: 0  // Forza posizione X fissa
                }}
                transition={{
                    duration: 0.5,
                    type: 'spring',
                    stiffness: 120,
                    damping: 20
                }}
                style={{
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                    cursor: !isFlipped ? 'pointer' : 'default',
                    transformOrigin: 'center center' // Assicura che la rotazione avvenga dal centro
                }}
                className={`relative w-full ${isMobile ? 'min-h-[280px] max-h-[calc(100vh-320px)]' : 'min-h-[360px] sm:min-h-[400px] md:min-h-[450px]'} flex flex-col`}
            >
                {/* ═══════════════════════════════════════════
                    FRONTE DELLA CARTA - 3D Flip
                    ═══════════════════════════════════════════ */}
                <div
                    className={`absolute inset-0 w-full h-full ${isMobile ? 'rounded-xl p-4' : 'rounded-3xl p-6 md:p-8'} backdrop-blur-xl border border-theme-strong shadow-2xl flex flex-col text-theme-primary`}
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'linear-gradient(145deg, var(--bg-card-hover) 0%, var(--bg-card) 60%, var(--bg-surface) 100%)',
                        boxShadow: isMobile
                            ? 'var(--shadow-md)'
                            : 'var(--shadow-lg)'
                    }}
                >
                    {/* Status Badge */}
                    <div className={`flex justify-end ${isMobile ? 'mb-2' : 'mb-3'} flex-shrink-0`}>
                        <span className={`${isMobile ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} rounded-full font-bold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border} shadow-sm`}>
                            {status.label}
                        </span>
                    </div>

                    {/* SOURCE BUTTON - Visibile solo se c'è sourceMetadata */}
                    {card.sourceMetadata && onShowSource && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation(); // Fondamentale: non girare la card
                                onShowSource(card);
                            }}
                            className={`absolute ${isMobile ? 'top-3 left-3 p-1.5' : 'top-4 left-4 p-2'} z-50 rounded-full transition-all duration-200
                                bg-amber-500/10 hover:bg-amber-500/20 
                                text-amber-500/70 hover:text-amber-400
                                border border-amber-500/20 hover:border-amber-500/50
                                hover:scale-110 active:scale-95
                                backdrop-blur-sm shadow-sm`}
                            title="Vedi nel testo (PDF)"
                            aria-label="Vai alla fonte nel PDF"
                        >
                            <Target className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                        </button>
                    )}

                    {/* Contenuto Fronte - STILI SEPARATI MOBILE/DESKTOP */}
                    <div 
                        className={`flex-1 flex items-center justify-center w-full min-w-0 ${frontNeedsScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
                        style={{ 
                            scrollbarWidth: 'thin', 
                            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                            ...(isMobile && {
                                paddingTop: '8px',
                                paddingBottom: '8px'
                            })
                        }}
                    >
                        <div className={`w-full max-w-full ${isMobile ? 'px-1' : 'px-2'}`}>
                            <CardContentRenderer
                                content={card.front}
                                variant="study"
                                size="adaptive"
                                centered={true}
                                className={`${frontFontSize} ${isMobile ? 'font-semibold leading-tight' : 'font-bold leading-relaxed'} max-w-full`}
                            />
                        </div>
                    </div>

                    {/* Hint per flip - LEGGERO E CENTRATO */}
                    <motion.div
                        className="flex items-center justify-center gap-2 text-theme-muted mt-3 pt-3 border-t border-theme-subtle flex-shrink-0"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    >
                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium`}>Tocca per girare</span>
                        {!isMobile && (
                            <>
                                <span className="text-xs">•</span>
                                <kbd className="px-1.5 py-0.5 bg-theme-surface text-theme-muted rounded text-[10px] font-mono border border-theme-subtle">
                                    Spazio
                                </kbd>
                            </>
                        )}
                    </motion.div>
                </div>

                {/* ═══════════════════════════════════════════
                    RETRO DELLA CARTA - 3D Flip
                    ═══════════════════════════════════════════ */}
                <div
                    className={`absolute inset-0 w-full h-full ${isMobile ? 'rounded-xl p-4' : 'rounded-3xl p-6 md:p-8'} backdrop-blur-xl border border-primary-500/30 shadow-2xl flex flex-col text-theme-primary`}
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, var(--bg-card) 60%, var(--bg-surface) 100%)',
                        boxShadow: isMobile
                            ? '0 10px 30px -8px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(139, 92, 246, 0.2)'
                            : '0 20px 60px -12px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.25)'
                    }}
                >
                    {/* Label Risposta - BEN SEPARATO SU MOBILE */}
                    <div className={`flex justify-start ${isMobile ? 'mb-3 pb-2 border-b border-emerald-500/20' : 'mb-3'} flex-shrink-0`}>
                        <span className={`${isMobile ? 'px-2.5 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} rounded-full font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm`}>
                            Risposta
                        </span>
                    </div>

                    {/* Contenuto Retro - STILI SEPARATI MOBILE/DESKTOP */}
                    <div 
                        className={`flex-1 flex items-center justify-center w-full min-w-0 ${backNeedsScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
                        style={{ 
                            scrollbarWidth: 'thin', 
                            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                            ...(isMobile && {
                                paddingTop: '12px',
                                paddingBottom: '12px'
                            })
                        }}
                    >
                        <div className={`w-full max-w-full ${isMobile ? 'px-1' : 'px-2'}`}>
                            <CardContentRenderer
                                content={card.back}
                                variant="study"
                                size="adaptive"
                                centered={true}
                                className={`${backFontSize} ${isMobile ? 'font-medium leading-tight' : 'font-semibold leading-relaxed'} text-theme-primary max-w-full`}
                            />
                        </div>
                    </div>

                    {/* Spacer - PIÙ GRANDE SU MOBILE PER SEPARAZIONE */}
                    <div className={`${isMobile ? 'h-4' : 'h-8'} mt-3 flex-shrink-0`} />
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
        prevProps.exitDirection === nextProps.exitDirection &&
        prevProps.onShowSource === nextProps.onShowSource &&
        prevProps.card.sourceMetadata?.pageNumber === nextProps.card.sourceMetadata?.pageNumber &&
        prevProps.card.sourceMetadata?.originalText === nextProps.card.sourceMetadata?.originalText
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
                className="w-full min-h-[300px] sm:min-h-[360px] md:min-h-[400px] rounded-3xl backdrop-blur-xl border border-theme-subtle animate-pulse bg-theme-card"
            >
                <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
                    <div className="w-3/4 h-7 bg-theme-surface rounded-lg" />
                    <div className="w-1/2 h-7 bg-theme-surface rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
