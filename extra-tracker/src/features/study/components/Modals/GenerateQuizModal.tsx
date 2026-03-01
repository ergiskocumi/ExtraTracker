import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ListChecks, Loader2, ToggleLeft, X } from 'lucide-react';
import type { QuizType } from '../../services/studyService';

const MIN_QUIZ_CARDS = 10;
const PRESET_COUNTS = [10, 20, 30, 40] as const;

interface GenerateQuizModalProps {
    isOpen: boolean;
    totalCards: number;
    onClose: () => void;
    onGenerate: (config: { questionCount: number; quizType: QuizType }) => Promise<void> | void;
}

interface QuestionOption {
    value: number;
    label: string;
    disabled: boolean;
    dynamic?: boolean;
}

export const GenerateQuizModal: React.FC<GenerateQuizModalProps> = ({
    isOpen,
    totalCards,
    onClose,
    onGenerate,
}) => {
    const [selectedCount, setSelectedCount] = useState<number | null>(null);
    const [quizType, setQuizType] = useState<QuizType>('multiple_choice');
    const [isGenerating, setIsGenerating] = useState(false);

    const questionOptions = useMemo<QuestionOption[]>(() => {
        const options: QuestionOption[] = PRESET_COUNTS.map((count) => ({
            value: count,
            label: String(count),
            disabled: count > totalCards,
        }));

        const needsDynamicAllOption =
            totalCards >= MIN_QUIZ_CARDS &&
            totalCards < 40 &&
            !PRESET_COUNTS.includes(totalCards as (typeof PRESET_COUNTS)[number]);

        if (needsDynamicAllOption) {
            options.push({
                value: totalCards,
                label: `Tutte (${totalCards})`,
                disabled: false,
                dynamic: true,
            });
        }

        return options;
    }, [totalCards]);

    const firstEnabledOption = useMemo(
        () => questionOptions.find((option) => !option.disabled)?.value ?? null,
        [questionOptions]
    );

    const effectiveSelectedCount = useMemo(() => {
        if (selectedCount !== null) {
            const stillValid = questionOptions.some((option) => option.value === selectedCount && !option.disabled);
            if (stillValid) return selectedCount;
        }
        return firstEnabledOption;
    }, [selectedCount, questionOptions, firstEnabledOption]);

    const canGenerate = totalCards >= MIN_QUIZ_CARDS && effectiveSelectedCount !== null;

    const handleGenerate = async () => {
        if (!canGenerate || effectiveSelectedCount === null) return;
        try {
            setIsGenerating(true);
            await onGenerate({
                questionCount: effectiveSelectedCount,
                quizType,
            });
            onClose();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
                    onClick={(event) => {
                        if (!isGenerating && event.target === event.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-xl rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="generate-quiz-title"
                    >
                        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-theme-default">
                            <div>
                                <h2 id="generate-quiz-title" className="text-xl font-bold text-theme-primary">
                                    Genera Quiz
                                </h2>
                                <p className="mt-1 text-sm text-theme-secondary">
                                    Scegli numero domande e tipologia per questo capitolo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isGenerating) onClose();
                                }}
                                disabled={isGenerating}
                                className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-all"
                                aria-label="Chiudi modale"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isGenerating ? (
                            <div className="px-6 py-10 flex flex-col items-center justify-center text-center gap-3">
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                <p className="text-base font-semibold text-theme-primary">
                                    Preparazione quiz in corso
                                </p>
                                <p className="text-sm text-theme-secondary max-w-md">
                                    Stiamo generando i distrattori con AI e preparando le domande. Potrebbe volerci qualche secondo.
                                </p>
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-6">
                                <section>
                                    <p className="text-sm font-semibold text-theme-primary mb-3">
                                        Quantità domande
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {questionOptions.map((option) => {
                                            const selected = effectiveSelectedCount === option.value;
                                            return (
                                                <button
                                                    key={`${option.label}-${option.value}`}
                                                    type="button"
                                                    disabled={option.disabled}
                                                    onClick={() => setSelectedCount(option.value)}
                                                    className={`
                                                        px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                                                        ${option.disabled
                                                            ? 'bg-theme-surface text-theme-muted border-theme-default cursor-not-allowed opacity-55'
                                                            : selected
                                                                ? 'bg-primary-500 text-white keep-light-text border-primary-500 shadow-md shadow-primary-500/25'
                                                                : 'bg-theme-card text-theme-primary border-theme-default hover:border-theme-strong hover:bg-theme-surface'
                                                        }
                                                    `}
                                                >
                                                    {option.dynamic && !option.disabled && (
                                                        <span className="inline-flex items-center gap-1 mr-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section>
                                    <p className="text-sm font-semibold text-theme-primary mb-3">
                                        Tipologia quiz
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setQuizType('multiple_choice')}
                                            className={`
                                                p-4 rounded-xl border text-left transition-all
                                                ${quizType === 'multiple_choice'
                                                    ? 'border-primary-500 bg-primary-500/10'
                                                    : 'border-theme-default bg-theme-card hover:border-theme-strong'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 text-theme-primary font-semibold">
                                                <ListChecks className="w-4 h-4" />
                                                Scelta multipla (A, B, C, D)
                                            </div>
                                            <p className="mt-2 text-xs text-theme-secondary">
                                                1 corretta + 3 distrattori plausibili.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setQuizType('true_false')}
                                            className={`
                                                p-4 rounded-xl border text-left transition-all
                                                ${quizType === 'true_false'
                                                    ? 'border-primary-500 bg-primary-500/10'
                                                    : 'border-theme-default bg-theme-card hover:border-theme-strong'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 text-theme-primary font-semibold">
                                                <ToggleLeft className="w-4 h-4" />
                                                Vero o Falso
                                            </div>
                                            <p className="mt-2 text-xs text-theme-secondary">
                                                Affermazioni trasformate in formato V/F.
                                            </p>
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-default bg-theme-surface/30">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-lg border border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                disabled={!canGenerate || isGenerating}
                                onClick={handleGenerate}
                                className={`
                                    px-5 py-2 rounded-lg font-semibold transition-all
                                    ${canGenerate && !isGenerating
                                        ? 'bg-primary-500 text-white keep-light-text hover:bg-primary-600 shadow-md shadow-primary-500/25'
                                        : 'bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed'
                                    }
                                `}
                            >
                                {isGenerating ? 'Preparazione...' : 'Genera Quiz'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GenerateQuizModal;
