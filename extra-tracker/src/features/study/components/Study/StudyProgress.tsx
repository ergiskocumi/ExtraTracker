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

    // Generate segment dots
    const segments = Array.from({ length: Math.min(totalCards, 20) }, (_, i) => {
        const segmentIndex = Math.floor((i / 20) * totalCards);
        const isCompleted = segmentIndex < currentIndex;
        const isCurrent = segmentIndex === currentIndex;
        
        return { isCompleted, isCurrent };
    });

    return (
        <div className="study-progress w-full max-w-3xl mx-auto space-y-4">
            {/* Top row: Title & Timer */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-theme-primary truncate max-w-[200px] sm:max-w-sm">
                        {deckTitle}
                    </h2>
                    <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-theme-surface border border-theme-default text-xs text-theme-muted capitalize">
                        {mode}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-theme-surface border border-theme-default">
                    <Clock className="w-4 h-4 text-theme-muted" />
                    <span className="text-sm font-mono text-theme-secondary">
                        {formatTime(elapsedSeconds)}
                    </span>
                </div>
            </div>

            {/* Progress bar with segments */}
            <div className="relative">
                {/* Background track */}
                <div className="study-progress-track h-2 bg-theme-surface rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>

                {/* Segment dots */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0.5">
                    {segments.map((segment, i) => (
                        <motion.div
                            key={i}
                            className={`study-progress-dot w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                segment.isCompleted 
                                    ? 'study-progress-dot--completed scale-100' 
                                    : segment.isCurrent
                                        ? 'study-progress-dot--current scale-125 ring-2 ring-primary-500/30'
                                        : 'study-progress-dot--pending scale-75'
                            }`}
                            initial={false}
                            animate={{
                                scale: segment.isCurrent ? 1.25 : segment.isCompleted ? 1 : 0.75,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Remaining */}
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-theme-muted" />
                        <span className="text-sm text-theme-secondary">
                            <span className="font-semibold text-theme-primary">{remaining}</span> rimaste
                        </span>
                    </div>

                    {/* Correct */}
                    {correctCount > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                <span className="font-semibold">{correctCount}</span> ok
                            </span>
                        </div>
                    )}

                    {/* Wrong */}
                    {wrongCount > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm text-orange-600 dark:text-orange-400">
                                <span className="font-semibold">{wrongCount}</span> difficili
                            </span>
                        </div>
                    )}
                </div>

                {/* Percentage */}
                <span className="text-sm font-medium text-theme-muted">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
};

export default StudyProgress;
