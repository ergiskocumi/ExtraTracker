/**
 * SESSION COMPLETE — Quiz/Study results screen
 *
 * Single-scroll layout:
 *  - Radial score ring hero
 *  - Compact stats row
 *  - Full-flow error review cards (no nested scroll)
 *  - Sticky action footer
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    RotateCcw,
    Home,
    BookOpen,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    Zap,
    Target,
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
    isTypingMode?: boolean;
    onStudyErrors?: () => void;
}

// ============================================
// HELPERS
// ============================================

const formatDuration = (seconds: number): string => {
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

const usePrefersReducedMotion = (): boolean => {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        setReduced(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return reduced;
};

// ============================================
// SCORE RING
// ============================================

const RING_SIZE = 148;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const tierAccentClass: Record<ResultTier, string> = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    fail: 'text-rose-500',
};

const ScoreRing: React.FC<{ percentage: number; tier: ResultTier }> = ({
    percentage,
    tier,
}) => {
    const offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;

    return (
        <div
            className={`relative ${tierAccentClass[tier]}`}
            style={{ width: RING_SIZE, height: RING_SIZE }}
        >
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
                <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={RING_STROKE}
                    opacity={0.12}
                />
                <motion.circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{
                        duration: 1,
                        delay: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        delay: 0.7,
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                    }}
                    className="text-4xl font-extrabold tabular-nums text-theme-primary"
                >
                    {percentage}%
                </motion.span>
            </div>
        </div>
    );
};

// ============================================
// CELEBRATION LAYER
// ============================================

const CelebrationLayer: React.FC<{
    tier: ResultTier;
    disabled?: boolean;
}> = ({ tier, disabled }) => {
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
// ERROR REVIEW CARD
// ============================================

const ErrorReviewCard: React.FC<{
    answer: WrongAnswer;
    index: number;
    forceCollapsed?: boolean;
}> = ({ answer, index, forceCollapsed = false }) => {
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        setExpanded(!forceCollapsed);
    }, [forceCollapsed]);

    const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + index * 0.04 }}
            className="rounded-2xl border border-theme-default bg-theme-card overflow-hidden"
        >
            {/* Clickable header — always visible */}
            <button
                type="button"
                onClick={toggleExpanded}
                className="w-full flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left hover:bg-theme-surface/40 transition-colors"
            >
                <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {index + 1}
                </span>

                <p className="flex-1 min-w-0 text-sm sm:text-base font-medium text-theme-primary leading-relaxed whitespace-pre-wrap break-words">
                    {answer.front}
                </p>

                <ChevronDown
                    className={`flex-shrink-0 w-4 h-4 mt-1 text-theme-muted transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Answer comparison — expandable */}
            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3"
                >
                    <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Wrong answer */}
                        <div className="rounded-xl bg-rose-500/[0.07] border border-rose-500/20 px-3.5 py-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                    La tua risposta
                                </span>
                            </div>
                            <p className="text-sm text-rose-700 dark:text-rose-300 font-medium whitespace-pre-wrap break-words leading-relaxed">
                                {answer.userAnswer}
                            </p>
                        </div>

                        {/* Correct answer */}
                        <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-3.5 py-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    Risposta corretta
                                </span>
                            </div>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium whitespace-pre-wrap break-words leading-relaxed">
                                {answer.back}
                            </p>
                        </div>
                    </div>

                    {answer.explanation && (
                        <div className="ml-10 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words leading-relaxed">
                                {answer.explanation}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
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
    isTypingMode = false,
    onStudyErrors,
}) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [allCollapsed, setAllCollapsed] = useState(false);

    const accuracy =
        totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const hasErrors = wrongAnswers.length > 0;
    const tier = getResultTier(accuracy);
    const showAnswerReview = isExamMode || isQuizMode || isTypingMode;
    const avgTime =
        totalCards > 0 ? Math.round(durationSeconds / totalCards) : 0;

    const performance = useMemo(() => {
        if (accuracy >= 90)
            return {
                text: 'Eccezionale!',
                sub: 'Padronanza completa. Sei pronto per il prossimo livello.',
            };
        if (accuracy >= 70)
            return {
                text: 'Ottimo lavoro!',
                sub: 'Rivedi le domande sbagliate per consolidare.',
            };
        if (accuracy >= 50)
            return {
                text: 'Buon progresso!',
                sub: 'Continua così, stai migliorando.',
            };
        return {
            text: 'Continua a studiare!',
            sub: 'Rivedi gli errori e riprova quando sei pronto.',
        };
    }, [accuracy]);

    useEffect(() => {
        if (prefersReducedMotion || typeof window === 'undefined') return;
        if (tier === 'warning') return;
        const src = tier === 'success' ? '/sounds/quiz-success.mp3' : '/sounds/quiz-fail.mp3';
        const audio = new Audio(src);
        audio.volume = 0.2;
        // Suppress 404 / decode errors silently (file may not exist in all deployments)
        const noop = () => undefined;
        audio.addEventListener('error', noop);
        audio.play().catch(noop);
        return () => {
            audio.pause();
            audio.removeEventListener('error', noop);
        };
    }, [tier, prefersReducedMotion]);

    const toggleCollapseAll = useCallback(
        () => setAllCollapsed((v) => !v),
        [],
    );

    const statItems = useMemo(
        () => [
            {
                icon: Target,
                label: 'Totale',
                value: totalCards,
                accent: 'text-primary-500',
                bg: 'bg-primary-500/10',
            },
            {
                icon: CheckCircle2,
                label: 'Corrette',
                value: correctCount,
                accent: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
            },
            {
                icon: XCircle,
                label: 'Errate',
                value: wrongCount,
                accent: 'text-rose-500',
                bg: 'bg-rose-500/10',
            },
            {
                icon: Clock,
                label: 'Tempo',
                value: formatDuration(durationSeconds),
                accent: 'text-blue-500',
                bg: 'bg-blue-500/10',
            },
        ],
        [totalCards, correctCount, wrongCount, durationSeconds],
    );

    return (
        <div className="study-complete h-full flex flex-col bg-theme-base">
            <CelebrationLayer tier={tier} disabled={prefersReducedMotion} />

            {/* ─── Scrollable content ─── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-8 space-y-7">
                    {/* === HERO: Score Ring === */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="flex flex-col items-center text-center"
                    >
                        <ScoreRing percentage={accuracy} tier={tier} />

                        <motion.h1
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="mt-5 text-2xl sm:text-3xl font-bold text-theme-primary tracking-tight"
                        >
                            {performance.text}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.75 }}
                            className="mt-1.5 text-sm sm:text-base text-theme-secondary max-w-md"
                        >
                            {performance.sub}
                        </motion.p>

                        {(isExamMode || isQuizMode || isTypingMode) && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.85 }}
                                className="mt-2 text-sm text-theme-muted"
                            >
                                {correctCount} corrett
                                {correctCount === 1 ? 'a' : 'e'} su{' '}
                                {totalCards} domand
                                {totalCards === 1 ? 'a' : 'e'}
                            </motion.p>
                        )}
                    </motion.section>

                    {/* === STATS ROW === */}
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    >
                        {statItems.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55 + i * 0.06 }}
                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-theme-card border border-theme-default"
                            >
                                <div
                                    className={`flex-shrink-0 w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                                >
                                    <stat.icon
                                        className={`w-[18px] h-[18px] ${stat.accent}`}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-lg font-bold text-theme-primary tabular-nums leading-tight">
                                        {stat.value}
                                    </div>
                                    <div className="text-[11px] text-theme-muted font-medium">
                                        {stat.label}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.section>

                    {/* === ACCURACY BAR === */}
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="px-4 py-4 rounded-2xl bg-theme-card border border-theme-default"
                    >
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-sm font-semibold text-theme-primary">
                                Precisione
                            </span>
                            <span className="text-sm text-theme-muted tabular-nums">
                                {correctCount}/{totalCards}
                            </span>
                        </div>

                        <div className="flex h-3 rounded-full overflow-hidden bg-theme-surface border border-theme-subtle">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${accuracy}%` }}
                                transition={{
                                    delay: 0.85,
                                    duration: 0.6,
                                    ease: 'easeOut',
                                }}
                                className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            />
                            {wrongCount > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${100 - accuracy}%`,
                                    }}
                                    transition={{
                                        delay: 0.85,
                                        duration: 0.6,
                                        ease: 'easeOut',
                                    }}
                                    className="h-full rounded-r-full bg-rose-500/50"
                                />
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[11px] text-theme-muted">
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="w-2 h-2 rounded-full bg-emerald-500"
                                    aria-hidden
                                />
                                Corrette ({correctCount})
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="w-2 h-2 rounded-full bg-rose-500/70"
                                    aria-hidden
                                />
                                Errate ({wrongCount})
                            </span>
                        </div>

                        {totalCards > 0 && (
                            <div className="mt-3 pt-3 border-t border-theme-subtle flex items-center gap-2 text-xs text-theme-muted">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                    Media{' '}
                                    <span className="font-semibold text-theme-secondary tabular-nums">
                                        {avgTime}s
                                    </span>{' '}
                                    per domanda
                                </span>
                            </div>
                        )}
                    </motion.section>

                    {/* === ERROR REVIEW === */}
                    {showAnswerReview && (
                        <motion.section
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            aria-labelledby="errors-heading"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2
                                        id="errors-heading"
                                        className="text-base sm:text-lg font-bold text-theme-primary"
                                    >
                                        {hasErrors
                                            ? 'Domande da rivedere'
                                            : 'Nessun errore'}
                                    </h2>
                                    {hasErrors && (
                                        <p className="text-xs text-theme-muted mt-0.5">
                                            {wrongAnswers.length} domand
                                            {wrongAnswers.length === 1
                                                ? 'a'
                                                : 'e'}{' '}
                                            con risposta errata
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasErrors && wrongAnswers.length > 3 && (
                                        <button
                                            type="button"
                                            onClick={toggleCollapseAll}
                                            className="text-xs font-medium text-theme-muted hover:text-theme-secondary transition-colors px-2 py-1 rounded-lg hover:bg-theme-surface"
                                        >
                                            {allCollapsed
                                                ? 'Espandi tutto'
                                                : 'Comprimi tutto'}
                                        </button>
                                    )}
                                    {hasErrors && (
                                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold tabular-nums">
                                            {wrongAnswers.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {hasErrors ? (
                                <div className="space-y-3">
                                    {wrongAnswers.map((answer, index) => (
                                        <ErrorReviewCard
                                            key={answer.cardId ?? index}
                                            answer={answer}
                                            index={index}
                                            forceCollapsed={allCollapsed}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                        Hai risposto correttamente a tutte le
                                        domande. Ottimo lavoro!
                                    </p>
                                </div>
                            )}
                        </motion.section>
                    )}
                </div>
            </div>

            {/* ─── Sticky action footer ─── */}
            <div className="flex-none border-t border-theme-default bg-theme-base/80 backdrop-blur-xl z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                        {isQuizMode && onStudyErrors && hasErrors && (
                            <button
                                type="button"
                                onClick={onStudyErrors}
                                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
                            >
                                <BookOpen className="w-4 h-4" />
                                Studia errori ({wrongAnswers.length})
                            </button>
                        )}

                        {onContinue && (
                            <button
                                type="button"
                                onClick={onContinue}
                                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-xl font-semibold text-sm bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98]"
                            >
                                <BookOpen className="w-4 h-4" />
                                Continua a studiare
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onRestart}
                            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-xl font-semibold text-sm bg-theme-card hover:bg-theme-surface border border-theme-default text-theme-primary transition-all active:scale-[0.98]"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {isQuizMode ? 'Ripeti quiz' : 'Nuova sessione'}
                        </button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-xl font-medium text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-theme-subtle transition-all active:scale-[0.98]"
                        >
                            <Home className="w-4 h-4" />
                            Torna al mazzo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionComplete;
