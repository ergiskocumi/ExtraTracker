/**
 * 🎓 TUTORIAL OVERLAY - Overlay con highlight animati e tooltip
 * 
 * Features:
 * - Overlay scuro con buco per l'elemento target
 * - Tooltip animato con descrizione
 * - Pulsanti navigazione (Avanti, Indietro, Salta)
 * - Animazioni fluide con framer-motion
 * - Responsive e accessibile
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, SkipForward } from 'lucide-react';
import type { TutorialStep } from '../../context/TutorialContext';
import { useTutorial } from '../../context/TutorialContext';

interface TutorialOverlayProps {
    step: TutorialStep;
    stepIndex: number;
    totalSteps: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    step,
    stepIndex,
    totalSteps,
}) => {
    const { nextStep, previousStep, skipTutorial, completeTutorial } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Funzione per aggiornare completamente la posizione (target + tooltip)
   

    // Funzione per aggiornare completamente la posizione (target + tooltip)
    const updateCompletePosition = useCallback(() => {
        try {
            // Se position è center, non serve un elemento target
            if (step.position === 'center') {
                setTargetRect(null);
                setTooltipPosition({
                    top: window.innerHeight / 2,
                    left: window.innerWidth / 2,
                });
                return;
            }

            const element = document.querySelector(step.target);
            if (!element) {
                return;
            }

            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            // Scroll automatico se l'elemento è fuori dalla viewport
            const viewportPadding = 100;
            const isOutOfViewport = 
                rect.top < viewportPadding ||
                rect.bottom > window.innerHeight - viewportPadding ||
                rect.left < viewportPadding ||
                rect.right > window.innerWidth - viewportPadding;

            if (isOutOfViewport) {
                // Scrolla l'elemento al centro della viewport
                const elementTop = rect.top + window.scrollY;
                const elementLeft = rect.left + window.scrollX;
                const scrollY = elementTop - window.innerHeight / 2;
                const scrollX = elementLeft - window.innerWidth / 2;
                
                window.scrollTo({
                    top: Math.max(0, scrollY),
                    left: Math.max(0, scrollX),
                    behavior: 'smooth'
                });
            }

            // Calcola posizione tooltip
            const position = step.position || 'bottom';
            const offset = step.offset || { x: 0, y: 0 };

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top - 20;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 20;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 20;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 20;
                    break;
            }

            // Applica offset
            top += offset.y;
            left += offset.x;

            // Centra il tooltip orizzontalmente se necessario
            if (tooltipRef.current && (position === 'top' || position === 'bottom')) {
                const tooltipWidth = tooltipRef.current.offsetWidth || 320;
                left -= tooltipWidth / 2;
            }

            // Assicura che il tooltip sia visibile
            const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
            const tooltipWidth = tooltipRef.current?.offsetWidth || 320;
            top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));
            left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));

            setTooltipPosition({ top, left });
        } catch (err) {
            console.error('Errore aggiornamento posizione tutorial:', err);
        }
    }, [step]);

    // Aggiorna posizione su resize, scroll e resize del tooltip
    useEffect(() => {
        let rafId: number | null = null;
        let ticking = false;

        const handleUpdate = () => {
            if (!ticking) {
                rafId = requestAnimationFrame(() => {
                    updateCompletePosition();
                    ticking = false;
                });
                ticking = true;
            }
        };

        // Listener per scroll su tutti i container scrollabili
        const handleScroll = (_e: Event) => {
            handleUpdate();
        };

        // Listener per resize
        const handleResize = () => {
            handleUpdate();
        };

        // Aggiungi listener a window e a tutti i container scrollabili
        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        
        // Trova i container scrollabili principali (ottimizzato)
        const scrollableContainers: Element[] = [];
        const commonScrollableSelectors = [
            'main', 'section', 'article', 'aside', 
            '[role="main"]', '[role="article"]',
            '.overflow-auto', '.overflow-scroll', '.overflow-y-auto', '.overflow-x-auto'
        ];
        
        commonScrollableSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                    style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                    style.overflowX === 'auto' || style.overflowX === 'scroll') {
                    if (!scrollableContainers.includes(el)) {
                        scrollableContainers.push(el);
                    }
                }
            });
        });
        
        scrollableContainers.forEach((container) => {
            container.addEventListener('scroll', handleScroll, { passive: true });
        });

        // Aggiorna anche quando il tooltip cambia dimensione
        const resizeObserver = new ResizeObserver(() => {
            handleUpdate();
        });
        
        if (tooltipRef.current) {
            resizeObserver.observe(tooltipRef.current);
        }

        // Aggiorna inizialmente
        handleUpdate();

        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, { capture: true });
            scrollableContainers.forEach((container) => {
                container.removeEventListener('scroll', handleScroll);
            });
            resizeObserver.disconnect();
        };
    }, [step.target, updateCompletePosition]);

    if (!tooltipPosition) {
        return null;
    }

    // Se position è center, non mostrare highlight
    const showHighlight = step.position !== 'center' && targetRect;
    const padding = step.highlightPadding || 8;
    const highlightRect = showHighlight ? {
        top: targetRect!.top - padding,
        left: targetRect!.left - padding,
        width: targetRect!.width + padding * 2,
        height: targetRect!.height + padding * 2,
    } : null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`tutorial-${step.id}-${stepIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1] // Custom easing per transizione più fluida
                }}
                className="fixed inset-0 z-[10000] pointer-events-none"
            >
                {/* Overlay scuro con buco (solo se c'è un highlight) */}
                {showHighlight && highlightRect && (
                    <>
                        <motion.svg 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute inset-0 w-full h-full" 
                            style={{ pointerEvents: 'auto' }}
                        >
                            <defs>
                                <mask id={`tutorial-mask-${step.id}`}>
                                    <rect width="100%" height="100%" fill="black" />
                                    <rect
                                        x={highlightRect.left}
                                        y={highlightRect.top}
                                        width={highlightRect.width}
                                        height={highlightRect.height}
                                        fill="white"
                                        rx="8"
                                    />
                                </mask>
                            </defs>
                            <motion.rect
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                width="100%"
                                height="100%"
                                fill="rgba(0, 0, 0, 0.45)"
                                mask={`url(#tutorial-mask-${step.id})`}
                                onClick={skipTutorial}
                            />
                        </motion.svg>

                        {/* Highlight animato - si aggiorna dinamicamente */}
                        <motion.div
                            key={`highlight-${step.id}-${stepIndex}`}
                            initial={{ 
                                scale: 0.98, 
                                opacity: 0,
                            }}
                            animate={{ 
                                scale: 1, 
                                opacity: 1,
                                top: highlightRect.top,
                                left: highlightRect.left,
                                width: highlightRect.width,
                                height: highlightRect.height,
                            }}
                            exit={{ 
                                scale: 0.98, 
                                opacity: 0,
                            }}
                            transition={{ 
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                                duration: 0.3,
                                opacity: { duration: 0.2 }
                            }}
                            className="absolute pointer-events-none"
                        >
                            {/* Background glow più pronunciato per visibilità */}
                            <div className="absolute inset-0 rounded-lg bg-primary-500/5" />
                            {/* Bordo principale */}
                            <div className="w-full h-full rounded-lg border-2 border-primary-500 shadow-[0_0_0_4px_rgba(139,92,246,0.25),0_0_30px_rgba(139,92,246,0.5)]" />
                            {/* Pulse animation più fluida */}
                            <motion.div
                                initial={{ scale: 1, opacity: 0.4 }}
                                animate={{
                                    scale: [1, 1.04, 1],
                                    opacity: [0.4, 0.7, 0.4],
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    ease: [0.4, 0, 0.6, 1],
                                }}
                                className="absolute inset-0 rounded-lg border-2 border-primary-400"
                            />
                            {/* Glow esterno aggiuntivo */}
                            <motion.div
                                animate={{
                                    opacity: [0.2, 0.4, 0.2],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                                className="absolute -inset-2 rounded-lg bg-primary-500/20 blur-md"
                            />
                        </motion.div>
                    </>
                )}

                {/* Overlay scuro senza buco (per center position) */}
                {!showHighlight && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={skipTutorial}
                        style={{ pointerEvents: 'auto' }}
                    />
                )}

                {/* Tooltip */}
                <motion.div
                    key={`tooltip-${step.id}-${stepIndex}`}
                    ref={tooltipRef}
                    initial={{ opacity: 0, y: 30, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.92 }}
                    transition={{ 
                        type: 'spring',
                        stiffness: 200,
                        damping: 25,
                        delay: 0.15,
                        opacity: { duration: 0.3 }
                    }}
                    className="absolute pointer-events-auto"
                    style={{
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                        maxWidth: '400px',
                        minWidth: '320px',
                    }}
                >
                    <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl border border-white/20 shadow-2xl p-6 backdrop-blur-xl">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        {/* Header */}
                        <div className="relative flex items-start gap-4 mb-4">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-lg">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                                <p className="text-sm text-white/70 leading-relaxed">{step.description}</p>
                            </div>
                            <button
                                onClick={skipTutorial}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
                                />
                            </div>
                            <span className="text-xs text-white/50 font-medium">
                                {stepIndex + 1} / {totalSteps}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={previousStep}
                                disabled={stepIndex === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Indietro</span>
                            </button>

                            <button
                                onClick={skipTutorial}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
                            >
                                <SkipForward className="w-4 h-4" />
                                <span className="text-sm font-medium">Salta</span>
                            </button>

                            <button
                                onClick={stepIndex === totalSteps - 1 ? completeTutorial : nextStep}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-violet-600 hover:from-primary-600 hover:to-violet-700 text-white font-medium transition-all shadow-lg shadow-primary-500/30"
                            >
                                <span className="text-sm font-medium">
                                    {stepIndex === totalSteps - 1 ? 'Completa' : 'Avanti'}
                                </span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Arrow pointing to target */}
                    {step.position && step.position !== 'center' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute w-0 h-0"
                            style={{
                                ...(step.position === 'bottom' && {
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    borderLeft: '8px solid transparent',
                                    borderRight: '8px solid transparent',
                                    borderBottom: '12px solid rgba(39, 39, 42, 0.95)',
                                }),
                                ...(step.position === 'top' && {
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    borderLeft: '8px solid transparent',
                                    borderRight: '8px solid transparent',
                                    borderTop: '12px solid rgba(39, 39, 42, 0.95)',
                                }),
                                ...(step.position === 'right' && {
                                    right: '100%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    borderTop: '8px solid transparent',
                                    borderBottom: '8px solid transparent',
                                    borderRight: '12px solid rgba(39, 39, 42, 0.95)',
                                }),
                                ...(step.position === 'left' && {
                                    left: '100%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    borderTop: '8px solid transparent',
                                    borderBottom: '8px solid transparent',
                                    borderLeft: '12px solid rgba(39, 39, 42, 0.95)',
                                }),
                            }}
                        />
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
