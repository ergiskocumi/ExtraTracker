import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Diamond } from 'lucide-react';

interface ExamDot {
    examId: string;
    title: string;
    color: string;
}

interface DayCellProps {
    dayName: string;
    date: Date;
    dueCards: number;
    newCards?: number;
    completedCards?: number;
    isToday: boolean;
    isSelected: boolean;
    examDots: ExamDot[];
    hasExamDeadline: boolean;
    onClick: () => void;
    index: number;
}

export const DayCell: React.FC<DayCellProps> = ({
    dayName,
    date,
    dueCards,
    isToday,
    isSelected,
    examDots,
    hasExamDeadline,
    onClick,
    index,
}) => {
    const dayNumber = date.getDate();

    const maxDue = 30;
    const intensity = Math.min(dueCards / maxDue, 1);

    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    const visibleDots = examDots.slice(0, 4);
    const extraDots = examDots.length - 4;

    const hasContent = dueCards > 0 || examDots.length > 0 || hasExamDeadline;

    return (
        <motion.button
            onClick={handleClick}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035, duration: 0.35, ease: 'easeOut' }}
            whileHover={hasContent ? { y: -2 } : undefined}
            whileTap={hasContent ? { scale: 0.97 } : undefined}
            className={`
                relative flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl
                transition-all duration-200 cursor-pointer min-w-0 w-full
                select-none
                focus-visible:outline-2 focus-visible:outline-primary-500/60 focus-visible:outline-offset-2
                ${isSelected
                    ? 'ring-2 ring-primary-500/50 bg-primary-500/12 border border-primary-500/30 shadow-[0_0_20px_-8px_rgba(124,58,237,0.4)]'
                    : isToday
                        ? 'border border-primary-500/60 bg-gradient-to-b from-primary-500/15 to-primary-500/5 shadow-[inset_0_1px_0_0_rgba(167,139,250,0.15)]'
                        : dueCards > 0
                            ? 'border border-theme-default bg-theme-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-theme-surface-hover hover:border-theme-strong'
                            : 'border border-theme-subtle bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-default shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                }
                ${!hasContent ? 'opacity-70' : ''}
            `}
            role="gridcell"
            aria-selected={isSelected}
            aria-label={`${dayName} ${dayNumber}, ${dueCards} carte da ripassare`}
        >
            {/* Deadline indicator */}
            {hasExamDeadline && (
                <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5">
                    <Diamond className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 fill-orange-400/30" />
                </div>
            )}

            {/* Day name */}
            <span className={`
                text-[10px] sm:text-xs font-semibold uppercase tracking-wider
                ${isToday ? 'text-primary-400' : isSelected ? 'text-theme-secondary' : 'text-theme-muted'}
            `}>
                {dayName}
            </span>

            {/* Day number */}
            <span className={`
                text-base sm:text-lg font-bold leading-none tabular-nums
                ${isToday ? 'text-theme-primary' : isSelected ? 'text-theme-primary' : 'text-theme-secondary'}
            `}>
                {dayNumber}
            </span>

            {/* Workload bar */}
            <div className="w-full h-1 sm:h-1.5 rounded-full bg-theme-surface overflow-hidden mt-0.5">
                {dueCards > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(intensity * 100, 8)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.035 + 0.15 }}
                        className={`
                            h-full rounded-full
                            ${intensity > 0.6
                                ? 'bg-gradient-to-r from-orange-400 to-red-400'
                                : intensity > 0.3
                                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                    : 'bg-gradient-to-r from-primary-400 to-blue-400'
                            }
                        `}
                    />
                )}
            </div>

            {/* Due count */}
            {dueCards > 0 && (
                <span className={`
                    text-[10px] sm:text-xs font-bold tabular-nums
                    ${intensity > 0.6 ? 'text-orange-400' : 'text-theme-muted'}
                `}>
                    {dueCards}
                </span>
            )}

            {/* Exam dots */}
            {examDots.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                    {visibleDots.map(dot => (
                        <div
                            key={dot.examId}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dot.color}`}
                            title={dot.title}
                        />
                    ))}
                    {extraDots > 0 && (
                        <span className="text-[8px] text-theme-muted font-medium ml-0.5">
                            +{extraDots}
                        </span>
                    )}
                </div>
            )}
        </motion.button>
    );
};
