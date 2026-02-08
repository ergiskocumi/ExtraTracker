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
    newCards: number;
    completedCards: number;
    isToday: boolean;
    isSelected: boolean;
    examDots: ExamDot[];
    hasExamDeadline: boolean;
    onClick: () => void;
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
}) => {
    const dayNumber = date.getDate();

    // Intensita' workload: altezza barra proporzionale
    const maxDue = 30;
    const intensity = Math.min(dueCards / maxDue, 1);

    const handleClick = useCallback(() => {
        onClick();
    }, [onClick]);

    const visibleDots = examDots.slice(0, 4);
    const extraDots = examDots.length - 4;

    return (
        <motion.button
            onClick={handleClick}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`
                relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl
                transition-all duration-200 cursor-pointer min-w-0 w-full
                ${isSelected
                    ? 'ring-2 ring-primary-500/40 bg-primary-500/10 border border-primary-500/30'
                    : isToday
                        ? 'border border-primary-500/60 bg-gradient-to-b from-primary-500/15 to-primary-500/5'
                        : 'border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                }
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
                ${isToday ? 'text-primary-400' : 'text-white/50'}
            `}>
                {dayName}
            </span>

            {/* Day number */}
            <span className={`
                text-base sm:text-lg font-bold leading-none
                ${isToday ? 'text-white' : isSelected ? 'text-white/90' : 'text-white/70'}
            `}>
                {dayNumber}
            </span>

            {/* Workload bar */}
            <div className="w-full h-1 sm:h-1.5 rounded-full bg-white/10 overflow-hidden mt-0.5">
                {dueCards > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(intensity * 100, 8)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
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
                    ${intensity > 0.6 ? 'text-orange-400' : 'text-white/60'}
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
                        <span className="text-[8px] text-white/40 font-medium ml-0.5">
                            +{extraDots}
                        </span>
                    )}
                </div>
            )}
        </motion.button>
    );
};
