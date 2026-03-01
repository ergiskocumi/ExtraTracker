import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ListChecks, Loader2, ToggleLeft, X, Sparkles } from 'lucide-react';
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

    // Gestione scroll body quando modale aperto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

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
                        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-theme-default bg-theme-surface/30">
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary-500/10 items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <h2 id="generate-quiz-title" className="text-xl font-bold text-theme-primary">
                                        Genera Quiz
                                    </h2>
                                    <p className="mt-1 text-sm text-theme-secondary">
                                        Scegli numero domande e tipologia per questo capitolo.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isGenerating) onClose();
                                }}
                                disabled={isGenerating}
                                className="p-2 -mr-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-all"
                                aria-label="Chiudi modale"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isGenerating ? (
                            <div className="px-6 py-12 flex flex-col items-center justify-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-2">
                                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-theme-primary mb-1">
                                        Preparazione quiz in corso
                                    </h3>
                                    <p className="text-sm text-theme-secondary max-w-sm mx-auto">
                                        Stiamo generando i distrattori con AI e preparando le domande. Potrebbe volerci qualche secondo.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-6 space-y-8">
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-bold text-theme-primary uppercase tracking-wider">
                                            Quantità domande
                                        </p>
                                        <div className="hidden sm:block h-px flex-1 bg-theme-default ml-4"></div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {questionOptions.map((option) => {
                                            const selected = effectiveSelectedCount === option.value;
                                            return (
                                                <button
                                                    key={`${option.label}-${option.value}`}
                                                    type="button"
                                                    disabled={option.disabled}
                                                    onClick={() => setSelectedCount(option.value)}
                                                    className={`
                                                        px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center
                                                        ${option.disabled
                                                            ? 'bg-theme-surface text-theme-disabled border-theme-default cursor-not-allowed opacity-50'
                                                            : selected
                                                                ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/25 scale-[1.02]'
                                                                : 'bg-theme-card text-theme-primary border-transparent border-theme-default hover:border-primary-500/50 hover:bg-theme-surface'
                                                        }
                                                    `}
                                                >
                                                    {option.dynamic && !option.disabled && (
                                                        <span className="inline-flex items-center gap-1.5 mr-1.5">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-bold text-theme-primary uppercase tracking-wider">
                                            Tipologia quiz
                                        </p>
                                        <div className="hidden sm:block h-px flex-1 bg-theme-default ml-4"></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setQuizType('multiple_choice')}
                                            className={`
                                                p-5 rounded-2xl border-2 text-left transition-all group relative overflow-hidden
                                                ${quizType === 'multiple_choice'
                                                    ? 'border-primary-500 bg-primary-500/5 shadow-md shadow-primary-500/10 scale-[1.01]'
                                                    : 'border-theme-default bg-theme-elevated hover:border-primary-500/30 hover:bg-theme-surface'
                                                }
                                            `}
                                        >
                                            {quizType === 'multiple_choice' && (
                                                <div className="absolute top-4 right-4 text-primary-500">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${quizType === 'multiple_choice' ? 'bg-primary-500 text-white' : 'bg-theme-surface text-theme-secondary group-hover:text-primary-500'}`}>
                                                <ListChecks className="w-5 h-5" />
                                            </div>
                                            <div className="font-semibold text-theme-primary text-base mb-1">
                                                Scelta multipla
                                            </div>
                                            <p className="text-sm text-theme-secondary leading-relaxed">
                                                1 risposta corretta + 3 distrattori plausibili. Simula un vero test a crocette.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setQuizType('true_false')}
                                            className={`
                                                p-5 rounded-2xl border-2 text-left transition-all group relative overflow-hidden
                                                ${quizType === 'true_false'
                                                    ? 'border-primary-500 bg-primary-500/5 shadow-md shadow-primary-500/10 scale-[1.01]'
                                                    : 'border-theme-default bg-theme-elevated hover:border-primary-500/30 hover:bg-theme-surface'
                                                }
                                            `}
                                        >
                                            {quizType === 'true_false' && (
                                                <div className="absolute top-4 right-4 text-primary-500">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${quizType === 'true_false' ? 'bg-primary-500 text-white' : 'bg-theme-surface text-theme-secondary group-hover:text-primary-500'}`}>
                                                <ToggleLeft className="w-5 h-5" />
                                            </div>
                                            <div className="font-semibold text-theme-primary text-base mb-1">
                                                Vero o Falso
                                            </div>
                                            <p className="text-sm text-theme-secondary leading-relaxed">
                                                Affermazioni trasformate in formato V/F. Ottimo per ripassi veloci mnemonici.
                                            </p>
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-theme-default bg-theme-surface/50 sm:rounded-b-2xl">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isGenerating}
                                className="px-5 py-2.5 rounded-xl border border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-card font-medium transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                disabled={!canGenerate || isGenerating}
                                onClick={handleGenerate}
                                className={`
                                    px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm
                                    ${canGenerate && !isGenerating
                                        ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/25 hover:shadow-md hover:-translate-y-0.5'
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
