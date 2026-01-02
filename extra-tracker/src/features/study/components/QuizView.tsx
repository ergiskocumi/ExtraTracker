/**
 * Quiz Mode view (multiple choice).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { Card, ReviewRating } from '../services/studyService';

interface QuizViewProps {
    card: Card;
    question: string;
    options: string[];
    correctAnswer: string;
    isSubmitting: boolean;
    onSubmitReview: (rating: ReviewRating) => Promise<boolean>;
    onNext: () => void;
}

const fallbackOptions = [
    'Nessuna delle precedenti',
    'Altro',
    'Non specificato',
    'Informazione non presente',
];

const buildOptions = (options: string[], correctAnswer: string) => {
    const cleaned = options.filter((value) => typeof value === 'string' && value.trim());
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const hasCorrect = cleaned.some(value => value.trim().toLowerCase() === normalizedCorrect);
    const pool = hasCorrect ? cleaned : [correctAnswer, ...cleaned];

    const filled: string[] = [];
    const seen = new Set<string>();

    for (const value of pool) {
        const normalized = value.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        filled.push(value.trim());
        if (filled.length >= 4) break;
    }

    for (const fallback of fallbackOptions) {
        if (filled.length >= 4) break;
        if (!filled.includes(fallback)) {
            filled.push(fallback);
        }
    }

    while (filled.length < 4) {
        filled.push('Nessuna delle precedenti');
    }

    return filled.slice(0, 4);
};

export const QuizView: React.FC<QuizViewProps> = ({
    card,
    question,
    options,
    correctAnswer,
    isSubmitting,
    onSubmitReview,
    onNext,
}) => {
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
    const shakeControls = useAnimation();
    const timeoutRef = useRef<number | null>(null);

    const resolvedOptions = useMemo(
        () => buildOptions(options, correctAnswer),
        [options, correctAnswer]
    );

    useEffect(() => {
        setSelectedOption(null);
        setResult(null);
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [card.id]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleSelect = async (option: string) => {
        if (selectedOption || isSubmitting) return;

        const isCorrect = option.trim().toLowerCase() === normalizedCorrect;
        setSelectedOption(option);
        setResult(isCorrect ? 'correct' : 'wrong');

        if (!isCorrect) {
            if ('vibrate' in navigator) {
                navigator.vibrate(80);
            }
            shakeControls.start({
                x: [0, -8, 8, -6, 6, 0],
                transition: { duration: 0.35 },
            });
        }

        const rating: ReviewRating = isCorrect ? 5 : 1;
        const saved = await onSubmitReview(rating);
        if (!saved) {
            setSelectedOption(null);
            setResult(null);
            return;
        }

        timeoutRef.current = window.setTimeout(() => {
            onNext();
        }, 1000);
    };

    const getOptionStyles = (option: string) => {
        if (!selectedOption) {
            return 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]';
        }

        if (option.trim().toLowerCase() === normalizedCorrect) {
            return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
        }

        if (option === selectedOption) {
            return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
        }

        return 'border-white/5 bg-white/[0.03] text-white/40';
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                        Quiz
                    </span>
                    {result === 'correct' && (
                        <span className="text-xs font-semibold text-emerald-300">Corretto</span>
                    )}
                    {result === 'wrong' && (
                        <span className="text-xs font-semibold text-rose-300">Sbagliato</span>
                    )}
                </div>

                <h2 className="text-lg sm:text-2xl font-semibold text-white leading-relaxed mb-6 whitespace-pre-wrap">
                    {question}
                </h2>

                <motion.div animate={shakeControls} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {resolvedOptions.map((option) => (
                        <motion.button
                            key={option}
                            whileHover={!selectedOption ? { scale: 1.03 } : undefined}
                            whileTap={!selectedOption ? { scale: 0.98 } : undefined}
                            onClick={() => handleSelect(option)}
                            disabled={!!selectedOption || isSubmitting}
                            className={`min-h-[72px] rounded-2xl border px-4 py-3 text-sm sm:text-base font-medium text-left transition-all ${getOptionStyles(option)}`}
                        >
                            {option}
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default QuizView;
