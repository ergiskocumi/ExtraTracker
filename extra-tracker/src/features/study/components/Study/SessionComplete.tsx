/**
 * SESSION COMPLETE - Schermata completamento sessione (UX moderna)
 *
 * - Hero con risultato e messaggio
 * - Statistiche in card chiare
 * - Barra precisione evidente
 * - Sezione "Domande da rivedere" in primo piano con lista espandibile
 * - Azioni chiare: Studia errori | Ripeti | Torna al mazzo
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Target,
    RotateCcw,
    Home,
    BookOpen,
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
    explanation?: string;
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

type ResultTier = 'success' | 'warning' | 'fail';

const getResultTier = (accuracy: number): ResultTier => {
    if (accuracy >= 70) return 'success';
    if (accuracy < 50) return 'fail';
    return 'warning';
};

const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
        setReduced(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return reduced;
};

const CelebrationLayer: React.FC<{ tier: ResultTier; disabled?: boolean }> = ({ tier, disabled }) => {
    if (disabled || tier === 'warning') return null;

    const isSuccess = tier === 'success';

    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 top-16 z-[60] overflow-hidden"
        >
            <div className="absolute inset-0">
                {Array.from({ length: isSuccess ? 80 : 50 }).map((_, i) => {
                    const delay = (i % 20) * 0.08;
                    const left = Math.random() * 100;
                    const size = 6 + Math.random() * 6;
                    const duration = 2.2 + Math.random() * 0.8;
                    const colorClass = isSuccess
                        ? i % 3 === 0
                            ? 'bg-emerald-400'
                            : i % 3 === 1
                                ? 'bg-primary-400'
                                : 'bg-amber-400'
                        : i % 2 === 0
                            ? 'bg-rose-400'
                            : 'bg-amber-500';

                    return (
                        <span
                            key={i}
                            className={`absolute top-[-10%] rounded-sm opacity-0 animate-confetti-fall ${colorClass}`}
                            style={{
                                left: `${left}%`,
                                width: size,
                                height: size * 2,
                                animationDelay: `${delay}s`,
                                animationDuration: `${duration}s`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
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
    const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'performance'>('overview');
    const prefersReducedMotion = usePrefersReducedMotion();

    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const hasErrors = wrongAnswers.length > 0;
    const tier = getResultTier(accuracy);

    const performance = useMemo(() => {
        if (accuracy >= 90) return { text: 'Eccezionale!', sub: 'Sei pronto per il prossimo livello.', emoji: '🏆', bar: 'from-emerald-500 to-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' };
        if (accuracy >= 70) return { text: 'Ottimo lavoro!', sub: 'Hai fatto un ottimo lavoro.', emoji: '⭐', bar: 'from-blue-500 to-blue-400', textColor: 'text-blue-600 dark:text-blue-400' };
        if (accuracy >= 50) return { text: 'Buon progresso!', sub: 'Continua così per migliorare.', emoji: '👍', bar: 'from-amber-500 to-amber-400', textColor: 'text-amber-600 dark:text-amber-400' };
        return { text: 'Continua a studiare!', sub: 'Rivedi gli errori e riprova.', emoji: '💪', bar: 'from-orange-500 to-orange-400', textColor: 'text-orange-600 dark:text-orange-400' };
    }, [accuracy]);

    useEffect(() => {
        if (prefersReducedMotion) return;
        if (typeof window === 'undefined') return;

        if (tier === 'warning') return;
        const soundPath = tier === 'success' ? '/sounds/quiz-success.mp3' : '/sounds/quiz-fail.mp3';
        const audio = new Audio(soundPath);
        audio.volume = 0.2;
        audio.play().catch(() => undefined);
    }, [tier, prefersReducedMotion]);

    return (
        <div className="study-complete min-h-screen overflow-y-auto flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6 bg-theme-base">
            <CelebrationLayer tier={tier} disabled={prefersReducedMotion} />
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-4xl flex-shrink-0"
            >
                {/* Hero: risultato */}
                <div className="mb-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="mx-auto max-w-3xl rounded-3xl border border-theme-default bg-gradient-to-b from-primary-500/15 via-theme-card to-theme-card shadow-xl shadow-primary-500/15 px-6 py-6 sm:px-8 sm:py-8 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                            className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40 mb-4"
                        >
                            <span className="text-4xl sm:text-5xl" aria-hidden>{performance.emoji}</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${performance.textColor} mb-1`}
                        >
                            {performance.text}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.26 }}
                            className="text-theme-secondary text-sm sm:text-base"
                        >
                            {performance.sub}
                        </motion.p>
                        {(isExamMode || isQuizMode) && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.32 }}
                                className="mt-3 text-sm sm:text-base text-theme-muted"
                            >
                                Hai risposto correttamente a{' '}
                                <span className="font-semibold text-theme-primary">{correctCount}</span>{' '}
                                domanda{correctCount === 1 ? '' : 'e'} su{' '}
                                <span className="font-semibold text-theme-primary">{totalCards}</span>.
                            </motion.p>
                        )}
                    </motion.div>
                </div>
                {/* Tabs stepper */}
                <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3 justify-center">
                    {[
                        { id: 'overview' as const, label: 'Panoramica' },
                        { id: 'errors' as const, label: `Domande da rivedere${hasErrors ? ` (${wrongAnswers.length})` : ''}` },
                        { id: 'performance' as const, label: 'Performance' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm shadow-primary-500/30'
                                    : 'bg-theme-card text-theme-secondary border-theme-default hover:border-primary-500/40 hover:text-primary-500'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB: Panoramica */}
                {activeTab === 'overview' && (
                    <>
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
                            ].map((s) => (
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

                        {/* Riepilogo risultato */}
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
                    </>
                )}

                {/* TAB: Domande da rivedere */}
                {activeTab === 'errors' && (isExamMode || isQuizMode) && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                        aria-labelledby="wrong-answers-heading"
                    >
                        <header className="mb-3">
                            <p className="text-xs font-semibold text-rose-500 uppercase tracking-[0.18em]">
                                Domande da rivedere
                            </p>
                            <h2
                                id="wrong-answers-heading"
                                className="text-sm sm:text-base font-semibold text-theme-primary"
                            >
                                {hasErrors
                                    ? `${wrongAnswers.length} domanda${wrongAnswers.length === 1 ? '' : 'e'} con risposta errata`
                                    : 'Nessuna domanda da rivedere'}
                            </h2>
                            {hasErrors && (
                                <p className="text-xs sm:text-sm text-theme-muted mt-1">
                                    Rivedi la domanda, confronta la tua risposta con quella corretta e – se presente – leggi la spiegazione.
                                </p>
                            )}
                        </header>

                        {hasErrors ? (
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {wrongAnswers.map((answer, index) => (
                                    <motion.article
                                        key={answer.cardId ?? index}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="p-4 rounded-xl bg-theme-card border border-theme-default"
                                    >
                                        <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1.5">
                                            Domanda
                                        </p>
                                        <p className="text-theme-primary text-sm sm:text-base leading-relaxed mb-3 whitespace-pre-wrap break-words">
                                            {answer.front}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-theme-subtle">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-0.5">
                                                    La tua risposta
                                                </p>
                                                <p className="text-rose-700 dark:text-rose-300 text-sm sm:text-base font-medium whitespace-pre-wrap break-words">
                                                    {answer.userAnswer}
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">
                                                    Risposta corretta
                                                </p>
                                                <p className="text-emerald-700 dark:text-emerald-300 text-sm sm:text-base font-medium whitespace-pre-wrap break-words">
                                                    {answer.back}
                                                </p>
                                            </div>
                                        </div>
                                        {answer.explanation && (
                                            <div className="mt-3 px-3 py-2 rounded-lg bg-theme-surface border border-theme-subtle text-xs sm:text-sm text-theme-secondary flex gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="whitespace-pre-wrap break-words">
                                                    {answer.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </motion.article>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-theme-card border border-theme-default text-sm text-theme-secondary">
                                Hai risposto correttamente a tutte le domande di questo quiz. Puoi passare allo
                                step successivo o continuare a studiare.
                            </div>
                        )}
                    </motion.section>
                )}

                {/* TAB: Performance */}
                {activeTab === 'performance' && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6 p-4 sm:p-5 rounded-2xl bg-theme-card border border-theme-default"
                        aria-label="Performance quiz"
                    >
                        <h2 className="text-sm font-semibold text-theme-primary mb-3">
                            Performance del quiz
                        </h2>
                        <p className="text-xs sm:text-sm text-theme-muted mb-4">
                            Panoramica visiva della distribuzione delle tue risposte in questo quiz.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-theme-secondary mb-1">
                                    Distribuzione risposte
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-3 rounded-full overflow-hidden bg-theme-surface border border-theme-subtle">
                                        <div
                                            className="h-full bg-emerald-500/80"
                                            style={{ width: `${accuracy}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-theme-muted tabular-nums">
                                        {accuracy}% corrette
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-theme-muted">
                                    <span>
                                        Corrette:{' '}
                                        <span className="font-semibold text-theme-primary">
                                            {correctCount}
                                        </span>
                                    </span>
                                    <span>
                                        Errate:{' '}
                                        <span className="font-semibold text-theme-primary">
                                            {wrongCount}
                                        </span>
                                    </span>
                                    {totalCards > correctCount + wrongCount && (
                                        <span>
                                            Non risposte:{' '}
                                            <span className="font-semibold text-theme-primary">
                                                {totalCards - (correctCount + wrongCount)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-theme-subtle">
                                <p className="text-xs font-medium text-theme-secondary mb-2">
                                    Efficienza temporale
                                </p>
                                <p className="text-sm text-theme-secondary">
                                    Hai impiegato{' '}
                                    <span className="font-semibold text-theme-primary">
                                        {formatDuration(durationSeconds)}
                                    </span>{' '}
                                    per completare{' '}
                                    <span className="font-semibold text-theme-primary">
                                        {totalCards} domanda{totalCards === 1 ? '' : 'e'}
                                    </span>
                                    . Questo riepilogo potrà in futuro confrontare il tempo con i tuoi quiz precedenti.
                                </p>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* Azioni: CTA principali e secondarie */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4"
                >
                    {/* Colonna sinistra: CTA primarie */}
                    <div className="flex flex-col gap-3 sm:flex-1">
                        {isQuizMode && onStudyErrors && hasErrors && (
                            <button
                                type="button"
                                onClick={onStudyErrors}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/35"
                            >
                                <BookOpen className="w-5 h-5" />
                                Studia solo gli errori
                            </button>
                        )}

                        {onContinue && (
                            <button
                                type="button"
                                onClick={onContinue}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all"
                            >
                                <BookOpen className="w-5 h-5" />
                                Continua a studiare
                            </button>
                        )}
                    </div>

                    {/* Colonna destra: CTA secondarie */}
                    <div className="flex flex-col gap-3 sm:w-64">
                        <button
                            type="button"
                            onClick={onRestart}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold bg-theme-surface hover:bg-theme-card border border-theme-default text-theme-primary transition-all"
                        >
                            <RotateCcw className="w-5 h-5" />
                            {isQuizMode ? 'Ripeti quiz' : 'Nuova sessione'}
                        </button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-theme-subtle transition-all"
                        >
                            <Home className="w-4 h-4" />
                            Torna al mazzo
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default SessionComplete;
