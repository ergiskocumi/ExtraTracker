import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    ListChecks,
    Loader2,
    ToggleLeft,
    X,
    Sparkles,
} from 'lucide-react';
import type { QuizType } from '../../services/studyService';

const MIN_QUIZ_CARDS = 10;
const PRESET_COUNTS = [10, 20, 30, 40] as const;

interface GenerateQuizModalProps {
    isOpen: boolean;
    totalCards: number;
    hasPdf?: boolean;
    onClose: () => void;
    onGenerate: (config: {
        questionCount: number;
        quizType: QuizType;
    }) => Promise<void> | void;
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
    hasPdf = false,
    onClose,
    onGenerate,
}) => {
    const [selectedCount, setSelectedCount] = useState<number | null>(null);
    const [quizType, setQuizType] = useState<QuizType>('multiple_choice');
    const [isGenerating, setIsGenerating] = useState(false);
    const usesPdfBasedTrueFalse = hasPdf && quizType === 'true_false';

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
            disabled: usesPdfBasedTrueFalse ? false : count > totalCards,
        }));

        const needsDynamic =
            !usesPdfBasedTrueFalse &&
            totalCards >= MIN_QUIZ_CARDS &&
            !PRESET_COUNTS.includes(
                totalCards as (typeof PRESET_COUNTS)[number],
            );

        if (needsDynamic) {
            options.push({
                value: totalCards,
                label: `Tutte (${totalCards})`,
                disabled: false,
                dynamic: true,
            });
        }

        return options;
    }, [totalCards, usesPdfBasedTrueFalse]);

    const firstEnabledOption = useMemo(
        () => questionOptions.find((o) => !o.disabled)?.value ?? null,
        [questionOptions],
    );

    const effectiveSelectedCount = useMemo(() => {
        if (selectedCount !== null) {
            const valid = questionOptions.some(
                (o) => o.value === selectedCount && !o.disabled,
            );
            if (valid) return selectedCount;
        }
        return firstEnabledOption;
    }, [selectedCount, questionOptions, firstEnabledOption]);

    const canGenerate =
        (usesPdfBasedTrueFalse || totalCards >= MIN_QUIZ_CARDS) &&
        effectiveSelectedCount !== null;

    const handleGenerate = useCallback(async () => {
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
    }, [canGenerate, effectiveSelectedCount, quizType, onGenerate, onClose]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (!isGenerating && e.target === e.currentTarget) onClose();
        },
        [isGenerating, onClose],
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 28,
                        }}
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="generate-quiz-title"
                    >
                        {/* ─── Header ─── */}
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-theme-default">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-[18px] h-[18px] text-primary-500" />
                                </div>
                                <div>
                                    <h2
                                        id="generate-quiz-title"
                                        className="text-lg font-bold text-theme-primary leading-tight"
                                    >
                                        Genera Quiz
                                    </h2>
                                    <p className="text-xs text-theme-muted mt-0.5">
                                        Configura domande e tipologia
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isGenerating) onClose();
                                }}
                                disabled={isGenerating}
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-colors"
                                aria-label="Chiudi modale"
                            >
                                <X className="w-[18px] h-[18px]" />
                            </button>
                        </div>

                        {/* ─── Body ─── */}
                        {isGenerating ? (
                            <div className="px-6 py-14 flex flex-col items-center text-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                    <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-theme-primary">
                                        Preparazione quiz...
                                    </p>
                                    <p className="text-sm text-theme-muted mt-1 max-w-xs mx-auto">
                                        Generazione distrattori AI in corso.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="px-5 sm:px-6 py-5 space-y-6">
                                {/* Question count — horizontal pills */}
                                <section>
                                    <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-3">
                                        Numero domande
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {questionOptions.map((option) => {
                                            const selected =
                                                effectiveSelectedCount ===
                                                option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={option.disabled}
                                                    onClick={() =>
                                                        setSelectedCount(
                                                            option.value,
                                                        )
                                                    }
                                                    className={`min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                                                        option.disabled
                                                            ? 'bg-theme-surface/50 text-theme-disabled border-theme-subtle cursor-not-allowed opacity-40'
                                                            : selected
                                                              ? 'bg-primary-500 text-white border-primary-500 shadow-sm shadow-primary-500/20'
                                                              : 'bg-theme-card text-theme-primary border-theme-default hover:border-primary-500/40 hover:bg-theme-surface'
                                                    }`}
                                                >
                                                    {option.dynamic &&
                                                        selected && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                                                        )}
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Quiz type — compact radio cards */}
                                <section>
                                    <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-3">
                                        Tipologia
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <QuizTypeCard
                                            selected={
                                                quizType === 'multiple_choice'
                                            }
                                            onClick={() =>
                                                setQuizType('multiple_choice')
                                            }
                                            icon={ListChecks}
                                            title="Scelta multipla"
                                            description="1 corretta + 3 distrattori plausibili"
                                        />
                                        <QuizTypeCard
                                            selected={
                                                quizType === 'true_false'
                                            }
                                            onClick={() =>
                                                setQuizType('true_false')
                                            }
                                            icon={ToggleLeft}
                                            title="Vero o Falso"
                                            description={
                                                hasPdf
                                                    ? 'Affermazioni AI dal contenuto del capitolo'
                                                    : 'Affermazioni V/F per ripasso rapido'
                                            }
                                        />
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ─── Footer ─── */}
                        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-theme-default bg-theme-surface/30">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isGenerating}
                                className="min-h-[40px] px-4 py-2 rounded-xl border border-theme-default text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-card font-medium transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                disabled={!canGenerate || isGenerating}
                                onClick={handleGenerate}
                                className={`min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    canGenerate && !isGenerating
                                        ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm shadow-primary-500/20'
                                        : 'bg-theme-surface border border-theme-default text-theme-disabled cursor-not-allowed'
                                }`}
                            >
                                Genera Quiz
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── Quiz Type Card (extracted to avoid duplication) ───

interface QuizTypeCardProps {
    selected: boolean;
    onClick: () => void;
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
}

const QuizTypeCard: React.FC<QuizTypeCardProps> = ({
    selected,
    onClick,
    icon: Icon,
    title,
    description,
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative p-4 rounded-xl border text-left transition-colors group ${
            selected
                ? 'border-primary-500 bg-primary-500/[0.06] ring-1 ring-primary-500/30'
                : 'border-theme-default bg-theme-card hover:border-theme-strong hover:bg-theme-surface'
        }`}
    >
        <div className="flex items-start gap-3">
            <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected
                        ? 'bg-primary-500 text-white'
                        : 'bg-theme-surface text-theme-secondary group-hover:text-primary-500'
                }`}
            >
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 pr-5">
                <p className="text-sm font-semibold text-theme-primary leading-tight">
                    {title}
                </p>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
        {selected && (
            <CheckCircle2 className="absolute top-3.5 right-3.5 w-4 h-4 text-primary-500" />
        )}
    </button>
);

export default GenerateQuizModal;
