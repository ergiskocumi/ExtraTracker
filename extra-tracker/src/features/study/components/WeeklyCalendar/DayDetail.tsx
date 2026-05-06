import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { getExamIcon, getExamColors } from '../Exams/utils/examIcons';

interface ExamBreakdown {
    exam: Exam;
    dueCards: number;
    decks: Deck[];
    color: string;
}

interface DayDetailProps {
    day: {
        dayName: string;
        date: Date;
        dueCards: number;
        newCards: number;
        completedCards: number;
        isToday: boolean;
    };
    examBreakdown: ExamBreakdown[];
    onStudy: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onExamClick: (examId: string) => void;
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export const DayDetail: React.FC<DayDetailProps> = ({
    day,
    examBreakdown,
    onStudy,
    onViewDetail,
    onExamClick,
}) => {
    const dateLabel = `${day.dayName} ${day.date.getDate()} ${MONTHS[day.date.getMonth()]}`;

    const handleStudy = useCallback(
        (deckId: string) => {
            onStudy(deckId);
        },
        [onStudy],
    );

    const handleExamClick = useCallback(
        (examId: string) => {
            onExamClick(examId);
        },
        [onExamClick],
    );

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
        >
            <div className="rounded-2xl border border-theme-default bg-theme-card shadow-theme-sm p-4 sm:p-5">
                {/* Summary bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`
                            p-2 rounded-lg
                            ${day.isToday
                                ? 'bg-primary-500/16 border border-primary-500/30'
                                : 'bg-theme-surface border border-theme-default'
                            }
                        `}>
                            <Calendar className={`w-4 h-4 ${day.isToday ? 'text-primary-400' : 'text-theme-muted'}`} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-theme-primary flex items-center gap-2">
                                {dateLabel}
                                {day.isToday && (
                                    <span className="text-xs font-medium text-primary-400 bg-primary-500/15 px-2 py-0.5 rounded-full">
                                        Oggi
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs sm:text-sm text-theme-muted">
                                {day.dueCards > 0
                                    ? `${day.dueCards} carte da ripassare`
                                    : 'Nessuna carta da ripassare'}
                                {day.newCards > 0 && ` + ${day.newCards} nuove`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Exam breakdown */}
                {examBreakdown.length > 0 ? (
                    <div className="space-y-3">
                        {examBreakdown.map(({ exam, dueCards, decks: examDecks, color: _color }, idx) => {
                            const ExamIcon = getExamIcon(exam.title, exam.description);
                            const examColors = getExamColors(exam.title, exam.description);

                            return (
                                <motion.div
                                    key={exam.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                                    className="rounded-xl border border-theme-default bg-theme-surface/50 p-3 sm:p-4"
                                >
                                    {/* Exam header */}
                                    <button
                                        onClick={() => handleExamClick(exam.id)}
                                        className="flex items-center gap-3 w-full text-left mb-3 group"
                                    >
                                        <div className={`p-2 rounded-lg ${examColors.bgColor} ${examColors.borderColor} border`}>
                                            <ExamIcon className={`w-4 h-4 ${examColors.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-theme-primary truncate group-hover:text-primary-400 transition-colors">
                                                {exam.title}
                                            </h4>
                                            <p className="text-xs text-theme-muted">
                                                {dueCards} carte da ripassare
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-theme-muted/50 group-hover:text-primary-400 transition-colors" />
                                    </button>

                                    {/* Decks for this exam */}
                                    <div className="space-y-2">
                                        {examDecks.map(deck => (
                                            <div
                                                key={deck.id}
                                                className="flex items-center justify-between gap-2 pl-10"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <BookOpen className="w-3.5 h-3.5 text-theme-muted/50 flex-shrink-0" />
                                                    <button
                                                        onClick={() => onViewDetail(deck.id)}
                                                        className="text-xs text-theme-muted hover:text-theme-primary transition-colors truncate"
                                                    >
                                                        {deck.title}
                                                    </button>
                                                </div>
                                                {(deck.dueCount ?? 0) > 0 && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleStudy(deck.id)}
                                                        className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold
                                                                   bg-primary-500/15 text-primary-400 border border-primary-500/30
                                                                   hover:bg-primary-500/25 transition-all shadow-[0_0_10px_-4px_rgba(124,58,237,0.3)]"
                                                    >
                                                        Studia
                                                    </motion.button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-center py-6"
                    >
                        <BookOpen className="w-8 h-8 text-theme-muted/30 mx-auto mb-2" />
                        <p className="text-sm text-theme-muted">Nessun esame con carte da ripassare</p>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
