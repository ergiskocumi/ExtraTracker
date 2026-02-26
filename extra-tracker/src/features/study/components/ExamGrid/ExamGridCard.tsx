/**
 * EXAM GRID CARD - Card esame con info complete
 *
 * Sezioni: titolo + icona, statistiche (mazzi/carte/scadenza/padronanza),
 * barra padronanza, carte da ripassare (se > 0), CTA Apri.
 */

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Layers, Target } from 'lucide-react';
import type { Exam } from '../../types/exam';
import { getExamIcon, getExamColors } from '../Exams/utils/examIcons';

interface ExamGridCardProps {
    exam: Exam;
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    onClick: () => void;
}

function formatDeadline(deadline: string): { label: string; isUrgent: boolean; isPast: boolean } {
    const deadlineDate = new Date(deadline);
    const now = Date.now();
    const days = Math.ceil((deadlineDate.getTime() - now) / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return { label: 'Scaduto', isUrgent: false, isPast: true };
    }
    if (days === 0) {
        return { label: 'Oggi', isUrgent: true, isPast: false };
    }
    if (days <= 7) {
        return {
            label: days === 1 ? 'Domani' : `Tra ${days} giorni`,
            isUrgent: true,
            isPast: false,
        };
    }
    const d = deadlineDate.getDate();
    const m = deadlineDate.toLocaleDateString('it-IT', { month: 'short' });
    return {
        label: `Scade il ${d} ${m}`,
        isUrgent: false,
        isPast: false,
    };
}

export const ExamGridCard: React.FC<ExamGridCardProps> = ({
    exam,
    deckCount,
    totalCards,
    dueCards,
    masteryPercent,
    onClick,
}) => {
    const ExamIcon = getExamIcon(exam.title, exam.description);
    const examColors = getExamColors(exam.title, exam.description);
    const deadline = useMemo(() => formatDeadline(exam.deadline), [exam.deadline]);

    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    const masteryColor =
        masteryPercent >= 80 ? 'bg-emerald-500' : masteryPercent >= 50 ? 'bg-blue-500' : 'bg-primary-500';

    return (
        <motion.button
            type="button"
            onClick={handleClick}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`
                w-full rounded-2xl border p-4 text-left transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                ${deadline.isUrgent && !deadline.isPast
                    ? 'border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 dark:border-orange-500/30 dark:bg-orange-500/10'
                    : 'border-theme-default bg-theme-card hover:bg-theme-surface hover:border-theme-strong'
                }
            `}
        >
            {/* Header: icona + titolo (+ descrizione se breve) */}
            <div className="flex items-start gap-3 sm:gap-4">
                <div
                    className={`
                        flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border
                        ${deadline.isUrgent && !deadline.isPast
                            ? 'border-orange-500/40 bg-orange-500/20'
                            : `${examColors.bgColor} ${examColors.borderColor}`
                        }
                    `}
                >
                    <ExamIcon
                        className={`h-6 w-6 ${deadline.isUrgent && !deadline.isPast ? 'text-orange-400' : examColors.color}`}
                        aria-hidden
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-theme-primary truncate">
                        {exam.title}
                    </h3>
                    {exam.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-theme-muted">
                            {exam.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Statistiche: mazzi, carte, scadenza, padronanza */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-theme-default bg-theme-surface/50 px-3 py-2 dark:bg-theme-elevated/30">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-theme-muted" aria-hidden />
                    <span className="text-xs font-medium text-theme-secondary">
                        {deckCount} {deckCount === 1 ? 'mazzo' : 'mazzi'}
                    </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-theme-default bg-theme-surface/50 px-3 py-2 dark:bg-theme-elevated/30">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-theme-muted" aria-hidden />
                    <span className="text-xs font-medium text-theme-secondary tabular-nums">
                        {totalCards} carte
                    </span>
                </div>
                <div
                    className={`
                        flex items-center gap-2 rounded-lg border px-3 py-2
                        ${deadline.isPast
                            ? 'border-red-500/30 bg-red-500/10 dark:bg-red-500/10'
                            : deadline.isUrgent
                                ? 'border-orange-500/40 bg-orange-500/10 dark:border-orange-500/30 dark:bg-orange-500/10'
                                : 'border-theme-default bg-theme-surface/50 dark:bg-theme-elevated/30'
                        }
                    `}
                >
                    <Calendar
                        className={`h-3.5 w-3.5 shrink-0 ${
                            deadline.isPast
                                ? 'text-red-500'
                                : deadline.isUrgent
                                    ? 'text-orange-400'
                                    : 'text-theme-muted'
                        }`}
                        aria-hidden
                    />
                    <span
                        className={`
                            text-xs font-medium tabular-nums
                            ${deadline.isPast
                                ? 'text-red-500 dark:text-red-400'
                                : deadline.isUrgent
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-theme-secondary'
                            }
                        `}
                    >
                        {deadline.label}
                    </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-theme-default bg-theme-surface/50 px-3 py-2 dark:bg-theme-elevated/30">
                    <Target className="h-3.5 w-3.5 shrink-0 text-theme-muted" aria-hidden />
                    <span className="text-xs font-semibold tabular-nums text-theme-secondary">
                        {masteryPercent}%
                    </span>
                </div>
            </div>

            {/* Barra padronanza */}
            <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-theme-muted">Padronanza</span>
                    <span className="tabular-nums text-theme-secondary">{masteryPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-theme-surface dark:bg-theme-elevated/50">
                    <motion.div
                        className={`h-full rounded-full ${masteryColor}`}
                        initial={false}
                        animate={{ width: `${Math.min(100, Math.max(0, masteryPercent))}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Carte da ripassare (evidenziato se > 0) */}
            {dueCards > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 dark:bg-orange-500/15">
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                        {dueCards} {dueCards === 1 ? 'carta da ripassare' : 'carte da ripassare'}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-orange-600 dark:text-orange-400">
                        {dueCards}
                    </span>
                </div>
            )}

            {/* Footer: CTA Apri */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-theme-default pt-3">
                <span className="text-xs font-medium text-theme-muted">Apri esame</span>
                <ArrowRight className="h-4 w-4 text-theme-muted" aria-hidden />
            </div>
        </motion.button>
    );
};
