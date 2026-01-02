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
        <div className="w-full max-w-2xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                        Typing
                    </span>
                    {status !== 'idle' && (
                        <span className={`text-xs font-semibold ${status === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {status === 'correct' ? 'Corretto' : 'Sbagliato'}
                        </span>
                    )}
                </div>

                <h2 className="text-lg sm:text-2xl font-semibold text-white leading-relaxed mb-6 whitespace-pre-wrap">
                    {question}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        ref={inputRef}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="Scrivi la risposta..."
                        className={`w-full rounded-2xl border px-4 py-4 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${inputStyle}`}
                        disabled={isChecking || isSubmitting || status !== 'idle'}
                    />

                    {status === 'wrong' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                        >
                            <p className="text-rose-200/70 text-xs uppercase tracking-[0.2em] mb-1">La risposta era</p>
                            <p className="text-white/90">{answer}</p>
                        </motion.div>
                    )}

                    {status === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                        >
                            {feedback}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: status === 'idle' ? 1.02 : 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isChecking || isSubmitting || (status === 'idle' && !value.trim())}
                        className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition-all ${
                            status === 'idle'
                                ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/[0.08] text-white/80'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {status === 'idle' ? 'Controlla' : 'Continua'}
                    </motion.button>
                </form>
            </div>
        </div>
    );
};

export default TypingView;
