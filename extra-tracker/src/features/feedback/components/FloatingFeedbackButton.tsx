/**
 * FLOATING FEEDBACK BUTTON - FAB per segnalazione rapida
 *
 * Bottone discreto per aprire il feedback modal.
 * Features:
 * - Posizione fissa in basso a sinistra
 * - Smart visibility: si nasconde su scroll down (mobile), riappare su scroll up
 * - Dimensione ridotta su mobile per non coprire contenuti
 * - Theme-aware (light/dark)
 * - Tooltip con shortcut (solo desktop)
 */

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';

const SCROLL_THRESHOLD = 60;
const MOBILE_BREAKPOINT = 768;

export const FloatingFeedbackButton = memo(() => {
    const { openFeedback, isOpen } = useFeedback();
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const lastScrollY = useRef(0);
    const ticking = useRef(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Smart scroll hiding (mobile only)
    const handleScroll = useCallback(() => {
        if (!isMobile) {
            setIsVisible(true);
            return;
        }

        if (!ticking.current) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                const delta = currentScrollY - lastScrollY.current;

                if (delta > SCROLL_THRESHOLD) {
                    // Scrolling down significantly -> hide
                    setIsVisible(false);
                } else if (delta < -SCROLL_THRESHOLD || currentScrollY < 50) {
                    // Scrolling up or near top -> show
                    setIsVisible(true);
                }

                lastScrollY.current = currentScrollY;
                ticking.current = false;
            });
            ticking.current = true;
        }
    }, [isMobile]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Non mostrare il FAB se il modal è aperto
    if (isOpen) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40"
                >
                    {/* Tooltip - solo desktop */}
                    {!isMobile && (
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -10, scale: 0.9 }}
                                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
                                >
                                    <div
                                        className="px-3 py-2 rounded-xl backdrop-blur-xl shadow-theme-lg"
                                        style={{
                                            background: 'var(--bg-dropdown)',
                                            border: '1px solid var(--border-default)',
                                        }}
                                    >
                                        <p
                                            className="text-sm font-medium"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            Segnala un problema
                                        </p>
                                        <p
                                            className="text-xs mt-0.5"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                                            +Shift+F
                                        </p>
                                    </div>
                                    {/* Arrow */}
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                                        style={{
                                            background: 'var(--bg-dropdown)',
                                            borderLeft: '1px solid var(--border-default)',
                                            borderBottom: '1px solid var(--border-default)',
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}

                    {/* Button */}
                    <motion.button
                        onClick={openFeedback}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-shadow"
                        aria-label="Segnala un problema"
                    >
                        <Bug className="w-5 h-5 md:w-6 md:h-6" />
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

FloatingFeedbackButton.displayName = 'FloatingFeedbackButton';
