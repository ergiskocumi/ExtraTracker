import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
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

    const deadlineDate = new Date(exam.deadline);
    const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;

    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    return (
        <motion.button
            onClick={handleClick}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.99 }}
            className={`
                w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl
                border transition-all duration-200 cursor-pointer text-left
                ${isUrgent
                    ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }
            `}
        >
            {/* Icon */}
            <div className={`
                p-2.5 rounded-xl flex-shrink-0 border
                ${isUrgent
                    ? 'bg-orange-500/20 border-orange-500/40'
                    : `${examColors.bgColor} ${examColors.borderColor}`
                }
            `}>
                <ExamIcon className={`w-5 h-5 ${isUrgent ? 'text-orange-400' : examColors.color}`} />
            </div>

            {/* Title + deck count */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                    {exam.title}
                </h4>
                <p className="text-xs text-white/40 mt-0.5">
                    {deckCount} {deckCount === 1 ? 'mazzo' : 'mazzi'} &middot; {totalCards} carte
                </p>
            </div>

            {/* Deadline countdown - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                <Calendar className={`w-3.5 h-3.5 ${isUrgent ? 'text-orange-400' : 'text-white/40'}`} />
                <span className={`
                    text-xs font-medium
                    ${isUrgent ? 'text-orange-400' : 'text-white/50'}
                `}>
                    {daysUntilDeadline >= 0
                        ? `${daysUntilDeadline}g`
                        : 'Scaduto'
                    }
                </span>
            </div>

            {/* Mastery bar */}
            <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 w-16">
                <span className="text-[10px] font-bold text-white/50 tabular-nums">
                    {masteryPercent}%
                </span>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            masteryPercent >= 80
                                ? 'bg-emerald-400'
                                : masteryPercent >= 50
                                    ? 'bg-blue-400'
                                    : 'bg-primary-400'
                        }`}
                        style={{ width: `${masteryPercent}%` }}
                    />
                </div>
            </div>

            {/* Due badge */}
            {dueCards > 0 && (
                <div className="flex-shrink-0 px-2 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30">
                    <span className="text-xs font-bold text-orange-400 tabular-nums">
                        {dueCards}
                    </span>
                </div>
            )}

            {/* Arrow */}
            <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        </motion.button>
    );
};
