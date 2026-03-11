/**
 * Typing Mode view (free text answer) - Ottimizzato per UX e performance
 * 
 * Miglioramenti:
 * - Layout flessibile che si adatta allo schermo
 * - Scroll interno per domande lunghe
 * - Animazioni ottimizzate
 * - Focus management e accessibility
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, ReviewRating } from '../../services/studyService';

interface TypingViewProps {
    card: Card;
    question: string;
    answer: string;
    isSubmitting: boolean;
    onVerify: (userAnswer: string) => Promise<{ correct: boolean; similarity?: number }>;
    onSubmitReview: (rating: ReviewRating) => Promise<boolean | void>;
    onNext: () => void;
}

export const TypingView: React.FC<TypingViewProps> = ({
    card,
    question,
    answer,
    isSubmitting,
    onVerify,
    onSubmitReview,
    onNext,
}) => {
    const [value, setValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [feedback, setFeedback] = useState('');
    const [similarity, setSimilarity] = useState<number | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const debounceRef = useRef<number | null>(null);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);

    // Mobile keyboard: aggiusta l'altezza usando visualViewport (con rAF per Android)
    // o window.innerHeight come fallback debounced.
    useEffect(() => {
        const vv = window.visualViewport;

        const applyHeight = (h: number) => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => setViewportHeight(h));
        };

        if (vv) {
            // Leggi subito al mount (gestisce tastiera già aperta)
            applyHeight(vv.height);
            const onResize = () => applyHeight(vv.height);
            vv.addEventListener('resize', onResize);
            return () => {
                vv.removeEventListener('resize', onResize);
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            };
        } else {
            // Fallback: window.innerHeight con debounce 100ms
            const onResize = () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = window.setTimeout(() => {
                    setViewportHeight(window.innerHeight);
                }, 100);
            };
            window.addEventListener('resize', onResize);
            return () => {
                window.removeEventListener('resize', onResize);
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };
        }
    }, []);

    const rootStyle = useMemo(
        () => viewportHeight != null ? { height: `${viewportHeight}px` } : undefined,
        [viewportHeight]
    );

    useEffect(() => {
        setValue('');
        setStatus('idle');
        setFeedback('');
        setSimilarity(null);
        setIsChecking(false);
        setIsExiting(false);
        inputRef.current?.focus();
        
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [card.id]);

    const handleSubmit = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();

        if (status !== 'idle') {
            if (isExiting) return;
            setIsExiting(true);
            timeoutRef.current = window.setTimeout(() => {
                onNext();
            }, 100);
            return;
        }

        const trimmed = value.trim();
        if (!trimmed || isChecking || isSubmitting) return;

        setIsChecking(true);

        try {
            const result = await onVerify(trimmed);
            const isCorrect = result.correct;
            const sim = typeof result.similarity === 'number' ? result.similarity : null;
            setStatus(isCorrect ? 'correct' : 'wrong');
            setSimilarity(sim);
            setFeedback(isCorrect ? 'Esatto!' : 'Non proprio.');

            const rating: ReviewRating = isCorrect ? 5 : 1;
            const saved = await onSubmitReview(rating);
            if (!saved) {
                setStatus('idle');
                setFeedback('');
            }
        } finally {
            setIsChecking(false);
        }
    }, [status, isExiting, value, isChecking, isSubmitting, onVerify, onSubmitReview, onNext]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && status !== 'idle' && !isExiting) {
                e.preventDefault();
                handleSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, isExiting, handleSubmit]);

    const inputStyle =
        status === 'correct'
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 focus:ring-emerald-500/30'
            : status === 'wrong'
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-200 focus:ring-rose-500/30'
                : 'border-white/10 bg-white/[0.04] text-white/90 focus:ring-indigo-500/40';

    return (
        <div className="w-full max-w-4xl mx-auto px-4 h-full flex flex-col" style={rootStyle}>
            {/* Card Container - Flex grow per occupare spazio disponibile */}
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
                
                {/* Header - Fixed height */}
                <div className="flex-none px-6 sm:px-8 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center ring-1 ring-indigo-500/30">
                                <span className="text-lg">⌨️</span>
                            </div>
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                                Typing Mode
                            </span>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {status === 'correct' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-sm font-semibold text-emerald-300 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Corretto
                                </motion.span>
                            )}
                            {status === 'wrong' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-sm font-semibold text-rose-300 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Sbagliato
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="px-6 sm:px-8 py-6 space-y-6">
                        
                        {/* Question */}
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white leading-relaxed whitespace-pre-wrap break-words">
                            {question}
                        </h2>

                        {/* Input Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                    placeholder="Scrivi qui la tua risposta..."
                                    className={`w-full rounded-2xl border px-6 py-5 text-base sm:text-xl focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-white/30 ${inputStyle}`}
                                    disabled={isChecking || isSubmitting || status !== 'idle'}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                />
                                {status === 'idle' && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 text-sm hidden sm:flex items-center gap-1.5">
                                        <span>Premi</span>
                                        <kbd className="px-2 py-1 rounded bg-white/10 text-white/60 text-xs font-mono border border-white/5">Enter</kbd>
                                    </div>
                                )}
                            </div>

                            {/* Feedback Sections */}
                            <AnimatePresence mode="wait">
                                {status === 'wrong' && (
                                    <motion.div
                                        key="wrong-feedback"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 overflow-hidden"
                                    >
                                        <div className="px-6 py-3 border-b border-rose-500/20 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-rose-200/70 text-sm uppercase tracking-[0.15em]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                La risposta corretta era
                                            </div>
                                            {similarity !== null && (
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                                    similarity >= 0.8
                                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                }`}>
                                                    Somiglianza: {Math.round(similarity * 100)}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="px-6 py-4 bg-rose-500/5">
                                            <p className="text-white text-lg font-medium break-words">{answer}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {status === 'correct' && (
                                    <motion.div
                                        key="correct-feedback"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-base text-emerald-200 font-medium">{feedback}</span>
                                            {similarity !== null && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                    {Math.round(similarity * 100)}% preciso
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </div>

                {/* Action Button - Fixed at bottom */}
                <div className="flex-none px-6 sm:px-8 py-5 border-t border-white/[0.06] bg-white/[0.02]">
                    <button
                        onClick={() => handleSubmit()}
                        disabled={isChecking || isSubmitting || (status === 'idle' && !value.trim()) || isExiting}
                        className={`w-full rounded-2xl py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                            status === 'idle'
                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:translate-y-[-1px] active:translate-y-[1px]'
                                : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12] hover:translate-y-[-1px] active:translate-y-[1px]'
                        }`}
                    >
                        {isChecking ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Verifica...
                            </>
                        ) : status === 'idle' ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Controlla Risposta
                            </>
                        ) : (
                            <>
                                <span>Continua</span>
                                <div className="flex items-center gap-1.5 text-sm opacity-80">
                                    <span>o premi</span>
                                    <kbd className="px-2 py-1 rounded bg-white/20 text-xs font-mono">Enter</kbd>
                                </div>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TypingView;
