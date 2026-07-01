/**
 * STUDY PROGRESS - Barra progresso sessione con indicatori visivi
 * 
 * Features:
 * - Progress bar segmentata con dots
 * - Indicatori carte rimanenti
 * - Timer sessione
 * - Statistiche in tempo reale
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Target, Zap, Trophy } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface StudyProgressProps {
    currentIndex: number;
    totalCards: number;
    correctCount: number;
    wrongCount: number;
    elapsedSeconds: number;
    deckTitle: string;
    mode: string;
}

// ============================================
// COMPONENT
// ============================================

export const StudyProgress: React.FC<StudyProgressProps> = ({
    currentIndex,
    totalCards,
    correctCount,
    wrongCount,
    elapsedSeconds,
    deckTitle,
    mode,
}) => {
    const progress = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;
    const remaining = totalCards - currentIndex;
    
    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="study-progress w-full max-w-4xl mx-auto space-y-2 sm:space-y-3">
            {/* Top row: Title & Timer */}
            <div className="flex items-center justify-between px-1 sm:px-2">
                <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-theme-primary truncate max-w-[180px] sm:max-w-md">
                        {deckTitle}
                    </h2>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-theme-surface border border-theme-default text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                        {mode}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-theme-surface border border-theme-default shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-theme-muted" />
                    <span className="text-sm font-bold font-mono text-theme-secondary tabular-nums">
                        {formatTime(elapsedSeconds)}
                    </span>
                </div>
            </div>

            {/* Progress bar with segments */}
            <div className="relative px-1">
                {/* Background track */}
                <div className="study-progress-track h-2.5 sm:h-3 bg-theme-surface border border-theme-default rounded-full overflow-hidden shadow-inner relative">
                    <motion.div
                        className="h-full w-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 relative"
                        style={{ transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: progress / 100 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Subtle shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    </motion.div>
                </div>

                {/* Percentage indicator floating */}
                <motion.div
                    className="absolute -top-6 left-0 text-[10px] font-black text-primary-500 bg-theme-base px-1.5 py-0.5 rounded border border-primary-500/20 shadow-sm"
                    animate={{ x: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {Math.round(progress)}%
                </motion.div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Remaining */}
                    <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-theme-muted" />
                        <span className="text-xs text-theme-secondary">
                            <span className="font-bold text-theme-primary">{remaining}</span> rimaste
                        </span>
                    </div>

                    {/* Correct */}
                    {correctCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {correctCount}
                            </span>
                        </div>
                    )}

                    {/* Wrong */}
                    {wrongCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                {wrongCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">In Corso</span>
                </div>
            </div>
        </div>
    );
};

export default StudyProgress;
