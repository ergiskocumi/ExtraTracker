/**
 * ⏳ PROGRESS VIEW - Vista del progresso e risultati della generazione
 */

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ManualAnswerEditor } from '../ManualAnswerEditor';
import type { ProgressViewProps } from '../ExamSolverModal.types';

// ============================================
// COMPONENT
// ============================================

export const ProgressView: React.FC<ProgressViewProps> = ({
    progressStep,
    progressMessage,
    progressCurrent,
    progressTotal,
    currentQuestion,
    isProcessing,
    stats,
    generatedFlashcards,
    createdDeckId,
    error,
    onRetry,
    onCancel,
    onClose,
    onSuccess,
}) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Calcola tempo stimato rimanente
    useEffect(() => {
        if (progressStep === 'generating' && progressCurrent > 0 && progressTotal > 0) {
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
            }

            // Aggiorna tempo trascorso ogni secondo
            intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    setElapsedTime(elapsed);

                    // Calcola tempo medio per domanda
                    const avgTimePerQuestion = elapsed / progressCurrent;
                    const remainingQuestions = progressTotal - progressCurrent;
                    const estimated = Math.ceil(avgTimePerQuestion * remainingQuestions);
                    setEstimatedTimeRemaining(estimated);
                }
            }, 1000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (progressStep === 'completed' || progressStep === 'error') {
                startTimeRef.current = null;
            }
        }
    }, [progressStep, progressCurrent, progressTotal]);

    const progressPercent = progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        {progressStep === 'generating' ? 'Generazione risposte...' : progressMessage || 'Elaborazione...'}
                    </h3>
                </div>
                {isProcessing && (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                )}
            </div>

            {/* Progress bar con percentuale - solo durante generazione */}
            {progressStep === 'generating' && progressTotal > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">
                            {progressCurrent}/{progressTotal} domande
                        </span>
                        <span className="text-amber-400 font-semibold">
                            {Math.round(progressPercent)}%
                        </span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full relative"
                        >
                            {/* Pattern animato */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                animate={{
                                    x: ['-100%', '200%'],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                                style={{
                                    transform: 'skewX(-20deg)',
                                }}
                            />
                        </motion.div>
                    </div>
                    
                    {/* Domanda corrente */}
                    {currentQuestion && (
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📝</span>
                                <div className="flex-1">
                                    <p className="text-sm text-white/50 mb-1">Domanda corrente</p>
                                    <p className="text-white text-sm leading-relaxed">
                                        "{currentQuestion.length > 100 ? `${currentQuestion.substring(0, 100)}...` : currentQuestion}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tempo stimato rimanente */}
                    {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <Clock className="w-4 h-4" />
                            <span>
                                ~{estimatedTimeRemaining} {estimatedTimeRemaining === 1 ? 'secondo' : 'secondi'} rimanenti
                            </span>
                        </div>
                    )}

                    {/* Cancel Button */}
                    {isProcessing && (
                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium transition-colors"
                            >
                                Annulla Generazione
                            </button>
                        </div>
                    )}

                    {/* Cancel Confirm Dialog */}
                    {showCancelConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                            style={{ margin: 0 }}
                        >
                            <div
                                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                                onClick={() => setShowCancelConfirm(false)}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl"
                            >
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Annullare la generazione?
                                </h3>
                                <p className="text-white/70 text-sm mb-6">
                                    Il progresso attuale verrà perso e dovrai ricominciare da capo.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowCancelConfirm(false);
                                            onCancel();
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                                    >
                                        Sì, Annulla
                                    </button>
                                    <button
                                        onClick={() => setShowCancelConfirm(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors border border-white/10"
                                    >
                                        No, Continua
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Progress bar semplice per altri step */}
            {progressStep !== 'completed' && progressStep !== 'error' && progressStep !== 'generating' && (
                <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: progressStep === 'extracting' ? '33%' :
                                       progressStep === 'analyzing' ? '66%' : '0%'
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                        />
                    </div>
                </div>
            )}

            {/* Completed State */}
            {progressStep === 'completed' && stats && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                >
                    <div className="flex flex-col items-center gap-4 text-center py-4">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl"
                        >
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        </motion.div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                                Generazione completata!
                            </h3>
                            <p className="text-sm text-white/60">
                                {stats.totalFlashcards} flashcard generate
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                            <p className="text-xs text-white/50 mb-1">Domande estratte</p>
                            <p className="text-2xl font-bold text-primary-300">{stats.questionsExtracted}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                            <p className="text-xs text-white/50 mb-1">Risposte trovate</p>
                            <p className="text-2xl font-bold text-emerald-300">{stats.answersFound}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                            <p className="text-xs text-white/50 mb-1">Non trovate</p>
                            <p className="text-2xl font-bold text-amber-300">{stats.answersNotFound}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                            <p className="text-xs text-white/50 mb-1">Tempo</p>
                            <p className="text-2xl font-bold text-primary-300">
                                {(stats.processingTimeMs / 1000).toFixed(1)}s
                            </p>
                        </div>
                    </div>

                    {/* Livello 2: Editing manuale per risposte non trovate */}
                    {stats.answersNotFound > 0 && generatedFlashcards.length > 0 && (
                        <ManualAnswerEditor
                            flashcards={generatedFlashcards}
                            deckId={createdDeckId}
                            onSave={() => {
                                // Refresh opzionale dopo salvataggio
                            }}
                        />
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => {
                                if (createdDeckId) {
                                    onSuccess(createdDeckId, stats);
                                    onClose();
                                }
                            }}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
                        >
                            Vai al Mazzo
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white font-medium transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Error State */}
            {progressStep === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 text-center py-4"
                >
                    <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-xl">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Errore</h3>
                        <p className="text-sm text-white/60">{error || 'Si è verificato un errore'}</p>
                    </div>
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white text-sm font-medium transition-colors"
                    >
                        Riprova
                    </button>
                </motion.div>
            )}
        </motion.div>
    );
};
