/**
 * 📝 FLOATING FEEDBACK BUTTON - FAB per segnalazione rapida
 *
 * Bottone discreto sempre visibile per aprire il feedback modal.
 * Features:
 * - Posizione fissa in basso a destra
 * - Animazione hover/tap
 * - Tooltip con shortcut
 * - Non interferisce con la navigazione
 */

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, MessageSquare, X } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';

export const FloatingFeedbackButton = memo(() => {
    const { openFeedback, isOpen } = useFeedback();
    const [isHovered, setIsHovered] = useState(false);

    // Non mostrare il FAB se il modal è aperto
    if (isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="fixed bottom-6 left-6 z-40"
        >
            {/* Tooltip */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9 }}
                        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
                    >
                        <div className="px-3 py-2 rounded-xl bg-dark-400/95 border border-white/10 backdrop-blur-xl shadow-xl">
                            <p className="text-sm text-white font-medium">Segnala un problema</p>
                            <p className="text-xs text-white/50 mt-0.5">
                                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+F
                            </p>
                        </div>
                        {/* Arrow */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-dark-400/95 border-l border-b border-white/10" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Button */}
            <motion.button
                onClick={openFeedback}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-shadow"
            >
                <Bug className="w-6 h-6" />

                {/* Pulse animation */}
                <span className="absolute inset-0 rounded-2xl bg-primary-500/50 animate-ping opacity-20" />
            </motion.button>
        </motion.div>
    );
});

FloatingFeedbackButton.displayName = 'FloatingFeedbackButton';
