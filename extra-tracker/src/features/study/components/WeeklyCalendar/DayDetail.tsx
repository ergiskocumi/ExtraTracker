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
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5">
                {/* Summary bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`
                            p-2 rounded-lg
                            ${day.isToday
                                ? 'bg-primary-500/20 border border-primary-500/30'
                                : 'bg-white/5 border border-white/10'
                            }
                        `}>
                            <Calendar className={`w-4 h-4 ${day.isToday ? 'text-primary-400' : 'text-white/60'}`} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-white">
                                {dateLabel}
                                {day.isToday && (
                                    <span className="ml-2 text-xs font-medium text-primary-400 bg-primary-500/15 px-2 py-0.5 rounded-full">
                                        Oggi
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs sm:text-sm text-white/50">
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
                        {examBreakdown.map(({ exam, dueCards, decks: examDecks, color: _color }) => {
                            const ExamIcon = getExamIcon(exam.title, exam.description);
                            const examColors = getExamColors(exam.title, exam.description);

                            return (
                                <motion.div
                                    key={exam.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
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
                                            <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                                                {exam.title}
                                            </h4>
                                            <p className="text-xs text-white/50">
                                                {dueCards} carte da ripassare
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-primary-400 transition-colors" />
                                    </button>

                                    {/* Decks for this exam */}
                                    <div className="space-y-2">
                                        {examDecks.map(deck => (
                                            <div
                                                key={deck.id}
                                                className="flex items-center justify-between gap-2 pl-10"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <BookOpen className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                                                    <button
                                                        onClick={() => onViewDetail(deck.id)}
                                                        className="text-xs text-white/60 hover:text-white transition-colors truncate"
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
                                                                   hover:bg-primary-500/25 transition-all"
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
                    <div className="text-center py-6">
                        <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-white/40">Nessun esame con carte da ripassare</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
