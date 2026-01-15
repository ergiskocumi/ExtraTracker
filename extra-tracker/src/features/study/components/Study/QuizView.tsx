/**
 * Quiz Mode view (multiple choice).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { Card, ReviewRating } from '../../services/studyService';

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

    const handleSelect = useCallback(async (option: string) => {
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
        await onSubmitReview(rating);
    }, [selectedOption, isSubmitting, normalizedCorrect, shakeControls, onSubmitReview]);

    const handleContinue = useCallback(() => {
        if (!selectedOption) return;
        onNext();
    }, [selectedOption, onNext]);

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            // Se abbiamo già risposto, Enter fa continuare
            if (selectedOption && event.key === 'Enter') {
                handleContinue();
                return;
            }

            // Altrimenti, se non abbiamo risposto, i numeri selezionano
            if (selectedOption || isSubmitting) return;
            
            const key = event.key;
            if (['1', '2', '3', '4'].includes(key)) {
                const index = parseInt(key) - 1;
                if (resolvedOptions[index]) {
                    handleSelect(resolvedOptions[index]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [selectedOption, isSubmitting, resolvedOptions, handleSelect, handleContinue]);

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
        <div className="w-full max-w-3xl mx-auto px-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <span className="text-lg">📝</span>
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
                            Quiz Mode
                        </span>
                    </div>
                    {result === 'correct' && (
                        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Corretto
                        </span>
                    )}
                    {result === 'wrong' && (
                        <span className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Sbagliato
                        </span>
                    )}
                </div>

                <h2 className="text-xl sm:text-3xl font-semibold text-white leading-relaxed mb-4 whitespace-pre-wrap">
                    {question}
                </h2>

                {!selectedOption && (
                    <p className="text-sm text-white/40 mb-8 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Usa i tasti <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 text-xs font-mono mx-1">1</kbd>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 text-xs font-mono mx-1">2</kbd>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 text-xs font-mono mx-1">3</kbd>
                        <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/50 text-xs font-mono mx-1">4</kbd>
                        per rispondere velocemente
                    </p>
                )}

                <motion.div animate={shakeControls} className="grid grid-cols-1 gap-4">
                    {resolvedOptions.map((option, index) => {
                        const label = String.fromCharCode(65 + index); // A, B, C, D
                        return (
                            <motion.button
                                key={option}
                                whileHover={!selectedOption ? { scale: 1.02, y: -2 } : undefined}
                                whileTap={!selectedOption ? { scale: 0.98 } : undefined}
                                onClick={() => handleSelect(option)}
                                disabled={!!selectedOption || isSubmitting}
                                className={`min-h-[88px] sm:min-h-[96px] rounded-2xl border transition-all ${getOptionStyles(option)} group relative`}
                            >
                                <div className="flex items-start gap-4 px-6 py-5">
                                    {/* Label A, B, C, D */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold transition-all ${
                                        !selectedOption 
                                            ? 'bg-white/10 text-white/60 group-hover:bg-white/15 group-hover:text-white/80' 
                                            : option.trim().toLowerCase() === normalizedCorrect
                                                ? 'bg-emerald-500/30 text-emerald-200'
                                                : option === selectedOption
                                                    ? 'bg-rose-500/30 text-rose-200'
                                                    : 'bg-white/5 text-white/30'
                                    }`}>
                                        {label}
                                    </div>
                                    
                                    {/* Option Text */}
                                    <div className="flex-1 text-left text-base sm:text-lg font-medium leading-relaxed">
                                        {option}
                                    </div>

                                    {/* Keyboard Shortcut */}
                                    {!selectedOption && (
                                        <kbd className="hidden sm:flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/40">
                                            {index + 1}
                                        </kbd>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* Continue Button - Appears after answering */}
                {selectedOption && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleContinue}
                        className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all text-base"
                    >
                        <span>Continua</span>
                        <div className="flex items-center gap-1.5 text-sm opacity-75">
                            <span>Premi</span>
                            <kbd className="px-2 py-1 rounded bg-white/20 text-xs font-mono">Enter</kbd>
                        </div>
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default QuizView;
