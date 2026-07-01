/**
 * 🧠 QuizGenerationProgress — Progress Bar Component
 * ===================================================
 * Shows real-time quiz generation progress with per-chunk indicators.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { QuizGenerationProgress as QuizProgressState } from '../hooks/useQuizGenerationProgress';

// =========================================
// TYPES
// =========================================

interface QuizGenerationProgressProps {
    progress: QuizProgressState;
    onCancel?: () => void;
}

// =========================================
// HELPERS
// =========================================

const PHASE_LABELS: Record<string, string> = {
    idle: '',
    connecting: 'Connessione in corso...',
    started: 'Avvio generazione...',
    processing: 'Generazione quiz in corso',
    persisting: 'Salvataggio quiz...',
    completed: 'Quiz generato!',
    failed: 'Generazione fallita',
    cancelled: 'Generazione annullata',
};

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

// =========================================
// COMPONENT
// =========================================

export const QuizGenerationProgress: React.FC<QuizGenerationProgressProps> = ({
    progress,
    onCancel,
}) => {
    const percentage = useMemo(() => {
        if (progress.totalChunks === 0) return 0;
        if (progress.phase === 'persisting' || progress.phase === 'completed') return 100;
        const processedChunks = progress.completedChunks + progress.failedChunks;
        return Math.round((processedChunks / progress.totalChunks) * 100);
    }, [progress.completedChunks, progress.failedChunks, progress.phase, progress.totalChunks]);

    const processingChunks = useMemo(
        () => progress.chunks.filter((chunk) => chunk.status === 'processing').length,
        [progress.chunks],
    );

    const eta = useMemo(() => {
        const processedChunks = progress.completedChunks + progress.failedChunks;
        if (processedChunks === 0 || progress.totalChunks === 0) return null;
        const remaining = progress.totalChunks - processedChunks;
        const avgPerChunk = progress.elapsedSeconds > 0
            ? progress.elapsedSeconds / processedChunks
            : 15;
        return Math.round(remaining * avgPerChunk);
    }, [progress.completedChunks, progress.failedChunks, progress.totalChunks, progress.elapsedSeconds]);

    if (progress.phase === 'idle') return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={progress.phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="w-full"
            >
                {/* ─── Phase label ─── */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {(progress.phase === 'processing' || progress.phase === 'persisting') && (
                            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                        )}
                        {progress.phase === 'completed' && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {progress.phase === 'failed' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        {(progress.phase === 'connecting' || progress.phase === 'started') && (
                            <Loader2 className="w-4 h-4 text-theme-muted animate-spin" />
                        )}
                        <span className="text-sm font-semibold text-theme-primary">
                            {PHASE_LABELS[progress.phase] || progress.phase}
                        </span>
                    </div>

                    {(progress.phase === 'processing' || progress.phase === 'persisting') && (
                        <span className="text-xs text-theme-muted tabular-nums">
                            {progress.completedChunks + progress.failedChunks}/{progress.totalChunks} parti
                        </span>
                    )}
                </div>

                {/* ─── Progress bar ─── */}
                {progress.totalChunks > 0 && (progress.phase === 'processing' || progress.phase === 'persisting') && (
                    <div className="space-y-2">
                        {/* Bar */}
                        <div className="w-full h-2 bg-theme-surface rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            />
                        </div>

                        {/* Chunk indicators */}
                        <div className="flex gap-1 flex-wrap">
                            {progress.chunks.map((chunk) => {
                                const Icon =
                                    chunk.status === 'done'
                                        ? CheckCircle2
                                        : chunk.status === 'failed'
                                          ? XCircle
                                          : chunk.status === 'processing'
                                            ? Loader2
                                            : chunk.status === 'skipped'
                                              ? null
                                              : null;

                                return (
                                    <div
                                        key={chunk.index}
                                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${
                                            chunk.status === 'done'
                                                ? 'bg-green-500/15 text-green-500'
                                                : chunk.status === 'failed'
                                                  ? 'bg-red-500/15 text-red-500'
                                                  : chunk.status === 'processing'
                                                    ? 'bg-primary-500/15 text-primary-500'
                                                    : chunk.status === 'skipped'
                                                      ? 'bg-theme-surface/50 text-theme-muted'
                                                      : 'bg-theme-surface/30 text-theme-muted'
                                        }`}
                                        title={`Parte ${chunk.index + 1}: ${chunk.status}${
                                            chunk.retries > 0 ? ` (${chunk.retries} retry)` : ''
                                        }`}
                                    >
                                        {Icon ? (
                                            <Icon
                                                className={`w-3 h-3 ${
                                                    chunk.status === 'processing' ? 'animate-spin' : ''
                                                }`}
                                            />
                                        ) : (
                                            chunk.index + 1
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-1 text-xs text-theme-muted">
                            {progress.phase === 'processing' && (
                                <p>
                                    {processingChunks > 0
                                        ? `Sto elaborando ${processingChunks} parti in parallelo.`
                                        : 'Preparazione della prossima parte...'}
                                </p>
                            )}
                            {progress.phase === 'persisting' && (
                                <p>Domande generate. Sto salvando il quiz e preparando la sessione.</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {progress.questionCount > 0 && (
                                    <span>{progress.questionCount} domande richieste</span>
                                )}
                                {progress.failedChunks > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        {progress.failedChunks} parti fallite
                                    </span>
                                )}
                                {progress.elapsedSeconds > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(progress.elapsedSeconds)} trascorsi
                                    </span>
                                )}
                                {eta !== null && eta > 0 && progress.phase === 'processing' && (
                                    <span>~{formatTime(eta)} rimanenti</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Failed state ─── */}
                {progress.phase === 'failed' && progress.error && (
                    <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-400">{progress.error}</p>
                    </div>
                )}

                {/* ─── Partial result warning ─── */}
                {progress.phase === 'completed' && progress.partialResult && (
                    <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Quiz generato parzialmente ({progress.completedChunks}/{progress.totalChunks} chunk).
                            Alcune domande potrebbero mancare.
                        </p>
                    </div>
                )}

                {/* ─── Cancel button (only during processing) ─── */}
                {(progress.phase === 'processing' || progress.phase === 'persisting') && onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-4 min-h-[32px] px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-500 font-medium hover:bg-red-500/10 transition-colors active:scale-[0.97]"
                    >
                        Annulla generazione
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default QuizGenerationProgress;
