/**
 * STUDY MODE SELECTOR - Minimal Apple-Style Design
 *
 * 4 modalità di studio con Smart Mix Strategy per il Quiz.
 * Design pulito con backdrop blur e supporto light/dark theme.
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

// ============================================
// TYPES
// ============================================

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'mix' | 'sprint' | 'focus' | 'exam';
export type SessionFocus = 'smart' | 'due' | 'weak' | 'all';
export type SessionLength = 'short' | 'standard' | 'deep';
export type SessionDirection = 'front' | 'back' | 'mixed';

export interface StudyStartConfig {
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    direction?: SessionDirection;
    timeLimitMinutes?: number;
    questionCount?: number;
    /** Smart Mix Strategy buckets for quiz mode */
    smartMixEnabled?: boolean;
}

interface StudyModeSelectorProps {
    isOpen: boolean;
    deckTitle?: string;
    onClose: () => void;
    onStart: (config: StudyStartConfig) => void;
}

// ============================================
// MODE DEFINITIONS
// ============================================

interface ModeDefinition {
    id: 'quiz' | 'spaced' | 'timeattack' | 'exam';
    title: string;
    description: string;
    config: StudyStartConfig;
}

const MODES: ModeDefinition[] = [
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Metti alla prova la tua memoria con un quiz',
        config: {
            mode: 'quiz',
            focus: 'smart',
            length: 'standard',
            smartMixEnabled: true, // Abilita Smart Mix Strategy
        },
    },
    {
        id: 'spaced',
        title: 'Ripetizione Spaziata',
        description: '"Studia meno e ricorda meglio: il sistema ti dice cosa ripassare."',
        config: {
            mode: 'flashcard',
            focus: 'due',
            length: 'standard',
            direction: 'front',
        },
    },
    {
        id: 'timeattack',
        title: 'Time Attack',
        description: 'Allena il tuo ragionamento con una sfida a tempo',
        config: {
            mode: 'sprint',
            focus: 'smart',
            length: 'short',
            timeLimitMinutes: 10,
        },
    },
    {
        id: 'exam',
        title: 'Simulazione esame',
        description: '"Un mix di tutti gli argomenti per simulare il giorno dell\'esame."',
        config: {
            mode: 'exam',
            focus: 'all',
            length: 'standard',
            timeLimitMinutes: 30,
            questionCount: 30,
        },
    },
];

// ============================================
// MODE CARD COMPONENT
// ============================================

interface ModeCardProps {
    mode: ModeDefinition;
    index: number;
    onSelect: (config: StudyStartConfig) => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, index, onSelect }) => {
    const handleClick = useCallback(() => {
        onSelect(mode.config);
    }, [mode.config, onSelect]);

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            className="
                group relative flex flex-col items-center justify-center
                aspect-square p-6 sm:p-8
                rounded-3xl border-2 transition-all duration-300

                /* Light theme */
                bg-white/80 border-gray-200/60
                hover:bg-white hover:border-gray-300 hover:shadow-xl hover:shadow-black/5

                /* Dark theme */
                dark:bg-white/5 dark:border-white/10
                dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-xl dark:hover:shadow-black/20

                cursor-pointer text-center
            "
        >
            {/* Title */}
            <h3 className="
                text-xl sm:text-2xl font-semibold mb-3
                text-gray-900 dark:text-white
                group-hover:text-gray-950 dark:group-hover:text-white
                transition-colors
            ">
                {mode.title}
            </h3>

            {/* Description */}
            <p className="
                text-sm sm:text-base leading-relaxed
                text-gray-500 dark:text-white/60
                group-hover:text-gray-600 dark:group-hover:text-white/70
                transition-colors max-w-[200px]
            ">
                {mode.description}
            </p>

            {/* Subtle hover indicator */}
            <div className="
                absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100
                transition-opacity duration-300 pointer-events-none
                bg-gradient-to-br from-transparent via-transparent to-black/[0.02]
                dark:to-white/[0.03]
            " />
        </motion.button>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({
    isOpen,
    deckTitle,
    onClose,
    onStart,
}) => {
    const handleModeSelect = useCallback((config: StudyStartConfig) => {
        onStart(config);
    }, [onStart]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - Apple-style blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="
                            fixed inset-0 z-[100]
                            bg-black/20 dark:bg-black/40
                            backdrop-blur-xl
                        "
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="
                                w-full max-w-2xl pointer-events-auto
                                rounded-[32px] overflow-hidden

                                /* Light theme */
                                bg-gray-50/95 border border-gray-200/50
                                shadow-2xl shadow-black/10

                                /* Dark theme */
                                dark:bg-gray-900/95 dark:border-white/10
                                dark:shadow-2xl dark:shadow-black/30

                                backdrop-blur-2xl
                            "
                        >
                            {/* Header */}
                            <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="
                                        absolute top-4 right-4 sm:top-6 sm:right-6
                                        p-2.5 rounded-full transition-all

                                        text-gray-400 hover:text-gray-600
                                        hover:bg-gray-200/50

                                        dark:text-white/40 dark:hover:text-white/70
                                        dark:hover:bg-white/10
                                    "
                                    aria-label="Chiudi"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>

                                {/* Title */}
                                <div className="text-center pr-10">
                                    <h2 className="
                                        text-2xl sm:text-3xl font-bold
                                        text-gray-900 dark:text-white
                                    ">
                                        Scegli la modalità
                                    </h2>
                                    {deckTitle && (
                                        <p className="
                                            mt-2 text-sm
                                            text-gray-500 dark:text-white/50
                                        ">
                                            {deckTitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Grid of 4 modes */}
                            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    {MODES.map((mode, index) => (
                                        <ModeCard
                                            key={mode.id}
                                            mode={mode}
                                            index={index}
                                            onSelect={handleModeSelect}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default StudyModeSelector;
