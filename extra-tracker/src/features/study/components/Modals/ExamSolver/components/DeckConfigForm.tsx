/**
 * ⚙️ DECK CONFIG FORM - Form per configurare il mazzo (nuovo o esistente)
 */

import { motion } from 'framer-motion';
import { Plus, FileText, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import type { DeckConfigFormProps } from '../ExamSolverModal.types';

// ============================================
// COMPONENT
// ============================================

export const DeckConfigForm: React.FC<DeckConfigFormProps> = ({
    deckMode,
    setDeckMode,
    deckTitle,
    setDeckTitle,
    selectedDeckId,
    setSelectedDeckId,
    selectedExamId,
    setSelectedExamId,
    exams,
    isLoadingExams,
    existingDecks,
    error,
    onBack,
    onGenerate,
    canGenerate,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Configurazione Mazzo</h3>

                {/* Radio buttons */}
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                        <input
                            type="radio"
                            name="deckMode"
                            value="new"
                            checked={deckMode === 'new'}
                            onChange={(e) => setDeckMode(e.target.value as 'new')}
                            className="w-4 h-4 text-amber-500"
                        />
                        <Plus className="w-5 h-5 text-white/60" />
                        <span className="text-white font-medium">Crea nuovo mazzo</span>
                    </label>

                    {existingDecks.length > 0 && (
                        <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                            <input
                                type="radio"
                                name="deckMode"
                                value="existing"
                                checked={deckMode === 'existing'}
                                onChange={(e) => setDeckMode(e.target.value as 'existing')}
                                className="w-4 h-4 text-amber-500"
                            />
                            <FileText className="w-5 h-5 text-white/60" />
                            <span className="text-white font-medium">Aggiungi a mazzo esistente</span>
                        </label>
                    )}
                </div>

                {/* Input titolo e esame (nuovo mazzo) */}
                {deckMode === 'new' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/80">
                                Titolo del mazzo
                            </label>
                            <input
                                type="text"
                                value={deckTitle}
                                onChange={(e) => setDeckTitle(e.target.value)}
                                placeholder="Es: Esame Matematica - Domande e Risposte"
                                className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/80">
                                Esame associato
                            </label>
                            {isLoadingExams ? (
                                <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                                    <span className="text-sm text-white/60">Caricamento esami...</span>
                                </div>
                            ) : (
                                <select
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                >
                                    <option value="">Seleziona un esame...</option>
                                    {exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {exams.length === 0 && !isLoadingExams && (
                                <p className="text-xs text-white/50">
                                    Nessun esame attivo trovato. Crea un esame dalla dashboard.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Dropdown mazzi esistenti */}
                {deckMode === 'existing' && existingDecks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                    >
                        <label className="block text-sm font-medium text-white/80">
                            Seleziona mazzo
                        </label>
                        <select
                            value={selectedDeckId}
                            onChange={(e) => setSelectedDeckId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        >
                            <option value="">Seleziona un mazzo...</option>
                            {existingDecks.map((deck) => (
                                <option key={deck.id} value={deck.id}>
                                    {deck.title}
                                </option>
                            ))}
                        </select>
                    </motion.div>
                )}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </motion.div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="exam-solver-btn exam-solver-btn--neutral flex-1 px-4 py-3 rounded-xl font-medium"
                >
                    Indietro
                </button>
                <button
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="exam-solver-btn exam-solver-btn--primary flex-1 px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Genera Flashcard
                    <Sparkles className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};
