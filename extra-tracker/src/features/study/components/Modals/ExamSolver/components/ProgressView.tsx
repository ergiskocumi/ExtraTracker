/**
 * ⏳ PROGRESS VIEW - Vista del progresso e risultati della generazione
 */

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ManualAnswerEditor } from '../ManualAnswerEditor';
import type { ProgressViewProps } from '../ExamSolverModal.types';

// ============================================
// COMPONENT
// ============================================

export const ProgressView: React.FC<ProgressViewProps> = ({
    progressStep,
    progressMessage,
    isProcessing,
    stats,
    generatedFlashcards,
    createdDeckId,
    error,
    onRetry,
    onClose,
    onSuccess,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        {progressMessage || 'Elaborazione...'}
                    </h3>
                    {progressMessage && (
                        <p className="text-sm text-white/50">{progressMessage}</p>
                    )}
                </div>
                {isProcessing && (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                )}
            </div>

            {/* Progress bar */}
            {progressStep !== 'completed' && progressStep !== 'error' && (
                <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: progressStep === 'extracting' ? '33%' :
                                       progressStep === 'analyzing' ? '66%' :
                                       progressStep === 'generating' ? '100%' : '0%'
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
