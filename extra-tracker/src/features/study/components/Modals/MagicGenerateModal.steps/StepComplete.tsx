import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ProgressData } from '../../../hooks/useMagicGenerate';

interface StepCompleteProps {
    progress: ProgressData;
    error: string | null;
    elapsedSeconds: number;
    formatTime: (seconds: number) => string;
    onClose: () => void;
    onRetry: () => void;
}

export const StepComplete: React.FC<StepCompleteProps> = ({
    progress,
    error,
    elapsedSeconds,
    formatTime,
    onClose,
    onRetry,
}) => {
    if (progress.step === 'completed') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 md:p-8"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                                Mission Complete
                            </p>
                            <h3 className="text-2xl font-semibold text-theme-primary tracking-tight">
                                Flashcard pronte
                            </h3>
                            <p className="text-sm text-theme-muted mt-1">
                                Generate{' '}
                                <span className="font-semibold text-theme-primary">
                                    {progress.generatedCount || 0}
                                </span>{' '}
                                nuove card.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-lg bg-theme-elevated border border-theme-subtle">
                            <p className="text-[10px] text-theme-muted uppercase tracking-[0.12em]">Durata</p>
                            <p className="text-sm font-semibold text-theme-primary">{formatTime(elapsedSeconds)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Error state
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center"
        >
            <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-theme-primary mb-1">Errore</h3>
                <p className="text-sm text-theme-muted">{error || 'Si è verificato un errore'}</p>
            </div>
            <button
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface/80 border border-theme-default text-theme-primary text-sm font-medium transition-colors backdrop-blur-sm"
            >
                Riprova
            </button>
        </motion.div>
    );
};

export default StepComplete;
