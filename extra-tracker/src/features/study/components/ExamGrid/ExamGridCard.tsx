/**
 * EXAM GRID CARD - Card esame pulita, gerarchia chiara, CTA evidente
 */

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Layers, BookOpen, RotateCcw, Trash2 } from 'lucide-react';
import type { Exam } from '../../types/exam';
import { getExamIcon, getExamColors } from '../Exams/utils/examIcons';

interface ExamGridCardProps {
    exam: Exam;
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    onClick: () => void;
    onDelete?: (examId: string) => void;
}

function formatDeadline(deadline: string): { label: string; isUrgent: boolean; isPast: boolean } {
    const deadlineDate = new Date(deadline);
    const days = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: 'Scaduto', isUrgent: false, isPast: true };
    if (days === 0) return { label: 'Oggi', isUrgent: true, isPast: false };
    if (days <= 7) return { label: days === 1 ? 'Domani' : `${days} giorni`, isUrgent: true, isPast: false };
    const d = deadlineDate.getDate();
    const m = deadlineDate.toLocaleDateString('it-IT', { month: 'short' });
    return { label: `${d} ${m}`, isUrgent: false, isPast: false };
}

const CARD_HEIGHT = 240;

export const ExamGridCard: React.FC<ExamGridCardProps> = ({
    exam,
    deckCount,
    totalCards,
    dueCards,
    masteryPercent,
    onClick,
    onDelete,
}) => {
    const ExamIcon = getExamIcon(exam.title, exam.description);
    const examColors = getExamColors(exam.title, exam.description);
    const deadline = useMemo(() => formatDeadline(exam.deadline), [exam.deadline]);

    const handleClick = useCallback(() => onClick(), [onClick]);

    const handleDeleteClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(exam.id);
        },
        [exam.id, onDelete],
    );

    const barColor =
        masteryPercent >= 80 ? 'bg-emerald-500' : masteryPercent >= 50 ? 'bg-blue-500' : 'bg-primary-500';

    const deadlineColor = deadline.isPast
        ? 'text-red-600 dark:text-red-400'
        : deadline.isUrgent
          ? 'text-amber-500 dark:text-amber-400'
          : 'text-theme-secondary';

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        },
        [onClick],
    );

    return (
        <motion.div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ height: CARD_HEIGHT }}
            className={`
                group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                ${deadline.isUrgent && !deadline.isPast
                    ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 dark:border-amber-500/25 dark:bg-amber-500/10'
                    : 'border-theme-default bg-theme-card hover:border-theme-strong hover:bg-theme-surface'
                }
            `}
        >
            {/* Delete: angolo, solo hover */}
            {onDelete && (
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 shadow-lg transition-opacity hover:bg-red-500 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 group-hover:opacity-100"
                    aria-label="Elimina esame"
                >
                    <Trash2 className="h-4 w-4" aria-hidden />
                </button>
            )}

            {/* Header: icona + titolo + scadenza su due righe chiare */}
            <div className="flex gap-4 px-5 pt-5 pr-12">
                <div
                    className={`
                        flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
                        ${deadline.isUrgent && !deadline.isPast
                            ? 'bg-amber-500/20 text-amber-500'
                            : `${examColors.bgColor} ${examColors.borderColor} ${examColors.color}`
                        }
                    `}
                >
                    <ExamIcon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight text-theme-primary">
                        {exam.title}
                    </h3>
                    {deadline.label && (
                        <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${deadlineColor}`}>
                            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                            <span>{deadline.label}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Body: un solo blocco con stats + padronanza – griglia e allineamenti fissi */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
                <div className="rounded-xl bg-theme-surface/80 px-4 py-3 dark:bg-theme-elevated/50">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-1.5 text-theme-secondary">
                            <Layers className="h-4 w-4 shrink-0 text-theme-muted" aria-hidden />
                            <span className="min-w-0 truncate">
                                <strong className="tabular-nums text-theme-primary">{deckCount}</strong>
                                <span className="ml-0.5">{deckCount === 1 ? 'mazzo' : 'mazzi'}</span>
                            </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 text-theme-secondary">
                            <BookOpen className="h-4 w-4 shrink-0 text-theme-muted" aria-hidden />
                            <span className="min-w-0 truncate">
                                <strong className="tabular-nums text-theme-primary">{totalCards}</strong>
                                <span className="ml-0.5">carte</span>
                            </span>
                        </div>
                        <div
                            className={`flex min-w-0 items-center gap-1.5 ${
                                dueCards > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-theme-muted'
                            }`}
                        >
                            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate">
                                <strong className="tabular-nums">{dueCards}</strong>
                                <span className="ml-0.5">ripasso</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="mb-1.5 text-xs font-medium text-theme-muted">Padronanza</p>
                        <div className="h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-theme-default dark:bg-theme-elevated/70">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                style={{ width: `${Math.min(100, Math.max(0, masteryPercent))}%` }}
                            />
                        </div>
                    </div>
                    <span className="w-12 shrink-0 text-right text-lg font-bold tabular-nums text-theme-primary">
                        {masteryPercent}%
                    </span>
                </div>
            </div>

            {/* Footer: CTA a bottone */}
            <div className="shrink-0 px-5 pb-5">
                <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500/15 py-2.5 text-sm font-semibold text-primary-600 transition-colors group-hover:bg-primary-500/25 dark:text-primary-400">
                    Apri esame
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
            </div>
        </motion.div>
    );
};
