import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, Clock, Trophy } from 'lucide-react';
import type { SavedQuizReviewResponse, QuizAttempt } from '../../services/studyService';
import { cn } from '../../../../lib/utils';

interface QuizReviewModeProps {
    data: SavedQuizReviewResponse;
    onClose: () => void;
}

const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const QuizReviewMode: React.FC<QuizReviewModeProps> = ({ data, onClose }) => {
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-theme-base/95 backdrop-blur-sm overflow-y-auto"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-theme-primary">
                            {data.name}
                        </h1>
                        <p className="text-sm text-theme-secondary mt-1">
                            {data.questions.length} domande · {data.quizType === 'true_false' ? 'Vero/Falso' : 'Scelta multipla'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-theme-subtle text-theme-muted hover:text-theme-primary transition-colors"
                        aria-label="Chiudi"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Attempts history */}
                {data.attempts.length > 0 && (
                    <div className="mb-8 p-4 rounded-xl border border-theme-default bg-theme-surface">
                        <h2 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Storico tentativi ({data.attempts.length})
                        </h2>
                        <div className="space-y-2">
                            {data.attempts.slice(-5).reverse().map((attempt: QuizAttempt, i: number) => (
                                <div key={attempt.id || i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-theme-base">
                                    <div className="flex items-center gap-3">
                                        <span className="text-theme-muted">#{data.attempts.length - i}</span>
                                        <span className="font-medium text-theme-primary">
                                            {attempt.score}/{data.questions.length}
                                        </span>
                                        <span className="text-theme-secondary">({attempt.accuracy}%)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-theme-muted">
                                        {attempt.timeSeconds > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {Math.floor(attempt.timeSeconds / 60)}:{String(attempt.timeSeconds % 60).padStart(2, '0')}
                                            </span>
                                        )}
                                        {attempt.completedAt && (
                                            <span>{formatDate(attempt.completedAt)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                    {data.questions.map((q, index) => {
                        const allOptions = q.options.length > 0
                            ? q.options
                            : [q.correctAnswer, ...q.distractors];

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                                className="rounded-xl border border-theme-default bg-theme-surface overflow-hidden"
                            >
                                {/* Question header */}
                                <div className="px-4 py-3 border-b border-theme-default bg-theme-subtle/30">
                                    <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <p className="text-sm font-medium text-theme-primary leading-relaxed">
                                            {q.questionText}
                                        </p>
                                    </div>
                                    {q.difficulty === 'hard' && (
                                        <span className="ml-9 mt-1 inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                            HARD
                                        </span>
                                    )}
                                </div>

                                {/* Options */}
                                <div className="px-4 py-3 space-y-2">
                                    {allOptions.map((opt, optIdx) => {
                                        const isCorrect = opt === q.correctAnswer;
                                        const distIdx = q.distractors.indexOf(opt);
                                        const explanation = distIdx >= 0 && q.distractorExplanations[distIdx]
                                            ? q.distractorExplanations[distIdx]
                                            : null;

                                        return (
                                            <div
                                                key={optIdx}
                                                className={cn(
                                                    'flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm',
                                                    isCorrect
                                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                                        : 'bg-theme-base border border-transparent',
                                                )}
                                            >
                                                {isCorrect ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400/60 mt-0.5 flex-shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className={cn(
                                                        'leading-relaxed',
                                                        isCorrect ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-theme-secondary',
                                                    )}>
                                                        {opt}
                                                    </p>
                                                    {explanation && (
                                                        <p className="text-xs text-theme-muted mt-1 italic">{explanation}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Correct answer explanation */}
                                {q.correctAnswerExplanation && (
                                    <div className="px-4 py-3 border-t border-theme-default bg-emerald-500/[0.03]">
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Spiegazione: </span>
                                            {q.correctAnswerExplanation}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom close */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-theme-surface border border-theme-default text-sm font-medium text-theme-primary hover:bg-theme-subtle transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default QuizReviewMode;
