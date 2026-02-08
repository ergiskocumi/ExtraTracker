/**
 * SESSION COMPLETE - Schermata completamento sessione
 * 
 * Features:
 * - Animazione celebrativa
 * - Statistiche sessione
 * - Suggerimenti prossimi passi
 * - Azioni post-sessione
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Target, RotateCcw, Home, BookOpen, TrendingUp, Zap } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface SessionCompleteProps {
    totalCards: number;
    correctCount: number;
    wrongCount: number;
    durationSeconds: number;
    onRestart: () => void;
    onBack: () => void;
    onContinue?: () => void;
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
}) => {
    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Performance message
    const getPerformanceMessage = () => {
        if (accuracy >= 90) return { text: 'Eccezionale!', color: 'text-emerald-400', emoji: '🏆' };
        if (accuracy >= 70) return { text: 'Ottimo lavoro!', color: 'text-blue-400', emoji: '⭐' };
        if (accuracy >= 50) return { text: 'Buon progresso!', color: 'text-amber-400', emoji: '👍' };
        return { text: 'Continua a studiare!', color: 'text-orange-400', emoji: '💪' };
    };

    const performance = getPerformanceMessage();

    const stats = [
        {
            icon: Target,
            label: 'Carte studiate',
            value: totalCards,
            color: 'text-primary-400',
        },
        {
            icon: Trophy,
            label: 'Risposte corrette',
            value: correctCount,
            color: 'text-emerald-400',
        },
        {
            icon: Zap,
            label: 'Da rivedere',
            value: wrongCount,
            color: 'text-orange-400',
        },
        {
            icon: Clock,
            label: 'Tempo impiegato',
            value: `${durationMinutes}m`,
            color: 'text-blue-400',
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
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
                        className="text-white/60"
                    >
                        Hai completato la sessione di studio
                    </motion.p>
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
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center"
                        >
                            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-xs text-white/50">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Accuracy bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-white/70">Precisione</span>
                        <span className={`text-xl font-bold ${performance.color}`}>{accuracy}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
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
                        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        <span>Nuova sessione</span>
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onBack}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2"
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
