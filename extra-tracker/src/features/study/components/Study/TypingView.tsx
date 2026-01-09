/**
 * Typing Mode view (free text answer).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Card, ReviewRating } from '../services/studyService';

interface TypingViewProps {
    card: Card;
    question: string;
    answer: string;
    isSubmitting: boolean;
    onVerify: (userAnswer: string) => Promise<{ correct: boolean; similarity?: number }>;
    onSubmitReview: (rating: ReviewRating) => Promise<boolean>;
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
    const [isChecking, setIsChecking] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue('');
        setStatus('idle');
        setFeedback('');
        setIsChecking(false);
        inputRef.current?.focus();
    }, [card.id]);

    const handleSubmit = async (event?: React.FormEvent) => {
        event?.preventDefault();

        if (status !== 'idle') {
            onNext();
            return;
        }

        const trimmed = value.trim();
        if (!trimmed || isChecking || isSubmitting) return;

        setIsChecking(true);

        try {
            const result = await onVerify(trimmed);
            const isCorrect = result.correct;
            setStatus(isCorrect ? 'correct' : 'wrong');
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
    };

    const inputStyle =
        status === 'correct'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            : status === 'wrong'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : 'border-white/10 bg-white/[0.04] text-white/90';

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-lg">⌨️</span>
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
                            Typing Mode
                        </span>
                    </div>
                    {status !== 'idle' && (
                        <span className={`flex items-center gap-2 text-sm font-semibold ${status === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {status === 'correct' ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Corretto
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Sbagliato
                                </>
                            )}
                        </span>
                    )}
                </div>

                <h2 className="text-xl sm:text-3xl font-semibold text-white leading-relaxed mb-10 whitespace-pre-wrap">
                    {question}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            placeholder="Scrivi qui la tua risposta..."
                            className={`w-full rounded-2xl border px-6 py-5 text-base sm:text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-white/30 ${inputStyle}`}
                            disabled={isChecking || isSubmitting || status !== 'idle'}
                        />
                        {status === 'idle' && (
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 text-sm">
                                Premi <kbd className="px-2 py-1 rounded bg-white/10 text-white/40 text-xs font-mono">Enter</kbd>
                            </div>
                        )}
                    </div>

                    {status === 'wrong' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-rose-500/20 bg-rose-500/10 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-rose-500/20">
                                <div className="flex items-center gap-2 text-rose-200/70 text-sm uppercase tracking-[0.2em]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    La risposta corretta era
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-rose-500/5">
                                <p className="text-white text-lg font-medium">{answer}</p>
                            </div>
                        </motion.div>
                    )}

                    {status === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-base text-emerald-200 font-medium">{feedback}</span>
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: status === 'idle' ? 1.02 : 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isChecking || isSubmitting || (status === 'idle' && !value.trim())}
                        className={`w-full rounded-2xl py-4 text-base font-semibold transition-all flex items-center justify-center gap-2 ${
                            status === 'idle'
                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/[0.08] text-white/80'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {status === 'idle' ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Controlla Risposta
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Continua
                            </>
                        )}
                    </motion.button>
                </form>
            </div>
        </div>
    );
};

export default TypingView;
