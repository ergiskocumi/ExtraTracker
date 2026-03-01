/**
 * SESSION COMPLETE - Schermata completamento sessione (UX moderna)
 *
 * - Hero con risultato e messaggio
 * - Statistiche in card chiare
 * - Barra precisione evidente
 * - Sezione "Domande da rivedere" in primo piano con lista espandibile
 * - Azioni chiare: Studia errori | Ripeti | Torna al mazzo
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Target,
    RotateCcw,
    Home,
    BookOpen,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

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
// HELPERS
// ============================================

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

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
    const [showWrongAnswers, setShowWrongAnswers] = useState(wrongAnswers.length > 0 && wrongAnswers.length <= 5);

    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const hasErrors = wrongAnswers.length > 0;

    const performance = (() => {
        if (accuracy >= 90) return { text: 'Eccezionale!', sub: 'Sei pronto per il prossimo livello.', emoji: '🏆', bar: 'from-emerald-500 to-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' };
        if (accuracy >= 70) return { text: 'Ottimo lavoro!', sub: 'Hai fatto un ottimo lavoro.', emoji: '⭐', bar: 'from-blue-500 to-blue-400', textColor: 'text-blue-600 dark:text-blue-400' };
        if (accuracy >= 50) return { text: 'Buon progresso!', sub: 'Continua così per migliorare.', emoji: '👍', bar: 'from-amber-500 to-amber-400', textColor: 'text-amber-600 dark:text-amber-400' };
        return { text: 'Continua a studiare!', sub: 'Rivedi gli errori e riprova.', emoji: '💪', bar: 'from-orange-500 to-orange-400', textColor: 'text-orange-600 dark:text-orange-400' };
    })();

    return (
        <div className="study-complete min-h-screen overflow-y-auto flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6 bg-theme-base">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-2xl flex-shrink-0"
            >
                {/* Hero: risultato */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                        className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 mb-5"
                    >
                        <span className="text-4xl sm:text-5xl" aria-hidden>{performance.emoji}</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`text-2xl sm:text-3xl font-bold ${performance.textColor} mb-1`}
                    >
                        {performance.text}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-theme-secondary text-sm sm:text-base"
                    >
                        {performance.sub}
                    </motion.p>
                    {(isExamMode || isQuizMode) && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="mt-2 text-sm text-theme-muted"
                        >
                            <span className="font-semibold text-theme-primary">{correctCount}</span> risposte corrette su <span className="font-semibold text-theme-primary">{totalCards}</span>
                        </motion.p>
                    )}
                </div>

                {/* Stats: 4 card compatte */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6"
                >
                    {[
                        { icon: Target, label: 'Carte', value: totalCards, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-500/10' },
                        { icon: CheckCircle2, label: 'Corrette', value: correctCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                        { icon: XCircle, label: 'Da rivedere', value: wrongCount, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
                        { icon: Clock, label: 'Tempo', value: formatDuration(durationSeconds), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                    ].map((s, i) => (
                        <div
                            key={s.label}
                            className="p-4 rounded-xl bg-theme-card border border-theme-default flex flex-col items-center text-center"
                        >
                            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                            </div>
                            <div className="text-xl font-bold text-theme-primary">{s.value}</div>
                            <div className="text-xs text-theme-muted">{s.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Riepilogo risultato: dettaglio e messaggio contestuale */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6 p-4 sm:p-5 rounded-2xl bg-theme-card border border-theme-default"
                    aria-labelledby="result-summary-heading"
                >
                    <h2 id="result-summary-heading" className="text-sm font-semibold text-theme-primary mb-1">
                        Riepilogo risultato
                    </h2>
                    <p className="text-theme-muted text-xs sm:text-sm mb-4">
                        Risposte corrette sul totale delle domande
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div className="flex items-baseline gap-2 flex-shrink-0">
                            <span className={`text-3xl sm:text-4xl font-bold tabular-nums ${performance.textColor}`}>
                                {accuracy}%
                            </span>
                            <span className="text-theme-muted text-sm">
                                {correctCount} su {totalCards} {totalCards === 1 ? 'domanda' : 'domande'}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex h-3 rounded-full overflow-hidden bg-theme-surface border border-theme-subtle">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${accuracy}%` }}
                                    transition={{ delay: 0.65, duration: 0.6, ease: 'easeOut' }}
                                    className="h-full min-w-0 flex-shrink-0 rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                />
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${100 - accuracy}%` }}
                                    transition={{ delay: 0.65, duration: 0.6, ease: 'easeOut' }}
                                    className="h-full min-w-0 flex-shrink-0 rounded-r-full bg-rose-500/40 dark:bg-rose-500/30"
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 text-xs text-theme-muted">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                                    Corrette ({correctCount})
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500/70" aria-hidden />
                                    Da rivedere ({wrongCount})
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`mt-4 pt-4 border-t border-theme-subtle text-sm ${performance.textColor}`}
                        role="status"
                    >
                        {accuracy >= 90 && (
                            <>Eccellente: hai quasi tutte le risposte giuste. Continua così.</>
                        )}
                        {accuracy >= 70 && accuracy < 90 && (
                            <>Ottimo lavoro. Rivedi le domande sbagliate per consolidare.</>
                        )}
                        {accuracy >= 50 && accuracy < 70 && (
                            <>Buon progresso. Rivedi gli errori qui sotto e riprova quando vuoi.</>
                        )}
                        {accuracy < 50 && (
                            <>Rivedi bene le domande in errore e riprova il quiz quando ti senti pronto.</>
                        )}
                    </div>
                </motion.div>

                {/* Domande da rivedere: in primo piano */}
                {hasErrors && (isExamMode || isQuizMode) && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="mb-6"
                        aria-labelledby="wrong-answers-heading"
                    >
                        <button
                            type="button"
                            onClick={() => setShowWrongAnswers((v) => !v)}
                            className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/15 transition-colors text-left flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="wrong-answers-heading" className="font-semibold text-theme-primary">
                                        Domande da rivedere ({wrongAnswers.length})
                                    </h2>
                                    <p className="text-theme-muted text-sm truncate">
                                        {showWrongAnswers ? 'Nascondi dettagli' : 'Clicca per vedere domanda, tua risposta e risposta corretta'}
                                    </p>
                                </div>
                            </div>
                            <span className="flex-shrink-0 text-theme-muted">
                                <ChevronDown className={`w-5 h-5 transition-transform ${showWrongAnswers ? 'rotate-180' : ''}`} />
                            </span>
                        </button>

                        <AnimatePresence>
                            {showWrongAnswers && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="mt-3 space-y-3 overflow-hidden max-h-[min(70vh,600px)] overflow-y-auto pr-1 custom-scrollbar"
                                >
                                    {wrongAnswers.map((answer, index) => (
                                        <motion.article
                                            key={answer.cardId ?? index}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            className="p-4 rounded-xl bg-theme-elevated border border-theme-default flex-shrink-0"
                                        >
                                            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1.5">Domanda</p>
                                            <p className="text-theme-primary text-sm sm:text-base leading-relaxed mb-3 break-words whitespace-pre-wrap">{answer.front}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-theme-subtle">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">La tua risposta</p>
                                                    <p className="text-rose-700 dark:text-rose-300 text-sm sm:text-base font-medium leading-relaxed break-words whitespace-pre-wrap">{answer.userAnswer}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Risposta corretta</p>
                                                    <p className="text-emerald-700 dark:text-emerald-300 text-sm sm:text-base font-medium leading-relaxed break-words whitespace-pre-wrap">{answer.back}</p>
                                                </div>
                                            </div>
                                        </motion.article>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.section>
                )}

                {/* Azioni: ordine chiaro per l’utente */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-3"
                >
                    {/* Primaria: Studia solo errori (se disponibile e ci sono errori) */}
                    {isQuizMode && onStudyErrors && hasErrors && (
                        <button
                            type="button"
                            onClick={onStudyErrors}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/35"
                        >
                            <BookOpen className="w-5 h-5" />
                            Studia solo gli errori
                        </button>
                    )}

                    {onContinue && (
                        <button
                            type="button"
                            onClick={onContinue}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all"
                        >
                            <BookOpen className="w-5 h-5" />
                            Continua a studiare
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onRestart}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-theme-surface hover:bg-theme-card border border-theme-default text-theme-primary transition-all"
                    >
                        <RotateCcw className="w-5 h-5" />
                        {isQuizMode ? 'Ripeti quiz' : 'Nuova sessione'}
                    </button>

                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-theme-subtle transition-all"
                    >
                        <Home className="w-4 h-4" />
                        Torna al mazzo
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default SessionComplete;
