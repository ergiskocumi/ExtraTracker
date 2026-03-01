/**
 * SESSION COMPLETE - Schermata completamento sessione
 * 
 * Features:
 * - Animazione celebrativa
 * - Statistiche sessione
 * - Suggerimenti prossimi passi
 * - Azioni post-sessione
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Target, RotateCcw, Home, BookOpen, Zap, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface WrongAnswer {
    cardId?: string;
    front: string;
    userAnswer: string;
    back: string;
}

interface SessionCompleteProps {
    totalCards: number;
    correctCount: number;
    wrongCount: number;
    durationSeconds: number;
    onRestart: () => void;
    onBack: () => void;
    onContinue?: () => void;
    wrongAnswers?: WrongAnswer[];
    isExamMode?: boolean;
    isQuizMode?: boolean;
    onStudyErrors?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const SessionComplete: React.FC<SessionCompleteProps> = ({
    totalCards,
    correctCount,
    wrongCount,
    durationSeconds,
    onRestart,
    onBack,
    onContinue,
    wrongAnswers = [],
    isExamMode = false,
    isQuizMode = false,
    onStudyErrors,
}) => {
    const [showWrongAnswers, setShowWrongAnswers] = useState(false);

    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const avgTimePerCard = totalCards > 0 ? Math.round(durationSeconds / totalCards) : 0;

    // Performance message
    const getPerformanceMessage = () => {
        if (accuracy >= 90) return { text: 'Eccezionale!', color: 'text-emerald-600 dark:text-emerald-400', emoji: '🏆' };
        if (accuracy >= 70) return { text: 'Ottimo lavoro!', color: 'text-blue-600 dark:text-blue-400', emoji: '⭐' };
        if (accuracy >= 50) return { text: 'Buon progresso!', color: 'text-amber-600 dark:text-amber-400', emoji: '👍' };
        return { text: 'Continua a studiare!', color: 'text-orange-600 dark:text-orange-400', emoji: '💪' };
    };

    const performance = getPerformanceMessage();

    const stats = [
        {
            icon: Target,
            label: 'Carte studiate',
            value: totalCards,
            color: 'text-primary-600 dark:text-primary-400',
        },
        {
            icon: Trophy,
            label: 'Risposte corrette',
            value: correctCount,
            color: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            icon: Zap,
            label: 'Da rivedere',
            value: wrongCount,
            color: 'text-orange-600 dark:text-orange-400',
        },
        {
            icon: Clock,
            label: 'Tempo impiegato',
            value: `${durationMinutes}m`,
            color: 'text-blue-600 dark:text-blue-400',
        },
    ];

    return (
        <div className="study-complete min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {/* Celebration animation */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                            type: 'spring',
                            stiffness: 200,
                            damping: 15,
                            delay: 0.2 
                        }}
                        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 mb-6 shadow-2xl shadow-primary-500/40"
                    >
                        <span className="text-5xl">{performance.emoji}</span>
                    </motion.div>
                    
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`text-3xl sm:text-4xl font-bold ${performance.color} mb-2`}
                    >
                        {performance.text}
                    </motion.h1>
                    
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-theme-secondary"
                    >
                        Hai completato la sessione di studio
                    </motion.p>
                    {(isExamMode || isQuizMode) && (
                        <p className="mt-2 text-sm text-theme-secondary">
                            Hai risposto correttamente a <span className="font-semibold text-theme-primary">{correctCount}</span> domande su <span className="font-semibold text-theme-primary">{totalCards}</span>
                        </p>
                    )}
                </div>

                {/* Stats grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="study-complete-stat-card p-4 rounded-2xl bg-theme-card border border-theme-default text-center"
                        >
                            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                            <div className="text-2xl font-bold text-theme-primary mb-1">{stat.value}</div>
                            <div className="text-xs text-theme-muted">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Accuracy bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mb-8 p-6 rounded-2xl bg-theme-card border border-theme-default"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-theme-secondary">Precisione</span>
                        <span className={`text-xl font-bold ${performance.color}`}>{accuracy}%</span>
                    </div>
                    <div className="h-3 bg-theme-surface rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${accuracy}%` }}
                            transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                                accuracy >= 70 
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                                    : accuracy >= 50 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                        : 'bg-gradient-to-r from-orange-500 to-orange-400'
                            }`}
                        />
                    </div>
                </motion.div>

                {/* Avg time per card (per exam mode) */}
                {isExamMode && avgTimePerCard > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3"
                    >
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                            <div className="text-theme-secondary text-sm">Tempo medio per domanda</div>
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">{avgTimePerCard}s</div>
                        </div>
                    </motion.div>
                )}

                {/* Wrong answers section (solo per exam mode) */}
                {(isExamMode || isQuizMode) && wrongAnswers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.05 }}
                        className="mb-8"
                    >
                        <button
                            onClick={() => setShowWrongAnswers(!showWrongAnswers)}
                            className="w-full p-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/15 transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                <div className="text-left">
                                    <div className="text-theme-primary font-semibold">
                                        Domande da rivedere ({wrongAnswers.length})
                                    </div>
                                    <div className="text-theme-muted text-sm">
                                        Clicca per vedere le risposte corrette
                                    </div>
                                </div>
                            </div>
                            {showWrongAnswers ? (
                                <ChevronUp className="w-5 h-5 text-theme-muted" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-theme-muted" />
                            )}
                        </button>

                        <AnimatePresence>
                            {showWrongAnswers && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-3 space-y-3 overflow-hidden"
                                >
                                    {wrongAnswers.map((answer, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-4 rounded-xl bg-theme-card border border-theme-default"
                                        >
                                            <div className="mb-2">
                                                <div className="text-theme-muted text-xs mb-1">Domanda</div>
                                                <div className="text-theme-primary">{answer.front}</div>
                                            </div>
                                            <div className="pt-2 border-t border-theme-default space-y-2">
                                                <div>
                                                    <div className="text-rose-600/80 dark:text-rose-400/80 text-xs mb-1">La tua risposta</div>
                                                    <div className="text-rose-600 dark:text-rose-400 font-medium">{answer.userAnswer}</div>
                                                </div>
                                                <div>
                                                    <div className="text-emerald-600/80 dark:text-emerald-400/80 text-xs mb-1">Risposta corretta</div>
                                                    <div className="text-emerald-600 dark:text-emerald-400 font-medium">{answer.back}</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                    {onContinue && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onContinue}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
                        >
                            <BookOpen className="w-5 h-5" />
                            <span>Continua a studiare</span>
                        </motion.button>
                    )}
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onRestart}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-default text-theme-primary font-semibold flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        <span>{isQuizMode ? 'Ripeti Quiz' : 'Nuova sessione'}</span>
                    </motion.button>

                    {isQuizMode && onStudyErrors && wrongAnswers.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onStudyErrors}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold flex items-center justify-center gap-2"
                        >
                            <AlertCircle className="w-5 h-5" />
                            <span>Studia solo gli errori</span>
                        </motion.button>
                    )}
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onBack}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl border border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-surface flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        <span>Torna al mazzo</span>
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default SessionComplete;
