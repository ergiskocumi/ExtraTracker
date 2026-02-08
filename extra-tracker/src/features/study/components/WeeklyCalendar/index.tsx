import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { getExamColors } from '../Exams/utils/examIcons';
import { DayCell } from './DayCell';
import { DayDetail } from './DayDetail';

interface WeekDay {
    dayName: string;
    date: Date;
    dueCards: number;
    newCards: number;
    completedCards: number;
    isToday: boolean;
}

interface WeeklyCalendarProps {
    weeklyStudyPlan: WeekDay[];
    exams: Exam[];
    decks: Deck[];
    selectedDayIndex: number | null;
    onDaySelect: (index: number | null) => void;
    onStudy: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onExamClick: (examId: string) => void;
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Map Tailwind bg-color classes to dot-friendly classes
const DOT_COLOR_MAP: Record<string, string> = {
    'bg-blue-500/20': 'bg-blue-400',
    'bg-emerald-500/20': 'bg-emerald-400',
    'bg-purple-500/20': 'bg-purple-400',
    'bg-amber-500/20': 'bg-amber-400',
    'bg-green-500/20': 'bg-green-400',
    'bg-red-500/20': 'bg-red-400',
    'bg-orange-500/20': 'bg-orange-400',
    'bg-indigo-500/20': 'bg-indigo-400',
    'bg-cyan-500/20': 'bg-cyan-400',
    'bg-violet-500/20': 'bg-violet-400',
    'bg-pink-500/20': 'bg-pink-400',
    'bg-rose-500/20': 'bg-rose-400',
    'bg-teal-500/20': 'bg-teal-400',
    'bg-slate-500/20': 'bg-slate-400',
    'bg-primary-500/20': 'bg-primary-400',
};

function getDotColor(bgColor: string): string {
    return DOT_COLOR_MAP[bgColor] || 'bg-primary-400';
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
    weeklyStudyPlan,
    exams,
    decks,
    selectedDayIndex,
    onDaySelect,
    onStudy,
    onViewDetail,
    onExamClick,
}) => {
    // Calcola per ogni giorno quali esami hanno carte due
    const examsByDay = useMemo(() => {
        return weeklyStudyPlan.map(day => {
            const dayStart = new Date(day.date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day.date);
            dayEnd.setHours(23, 59, 59, 999);

            const examMap = new Map<string, { exam: Exam; dueCards: number; decks: Deck[] }>();

            // Solo esami attivi
            const activeExams = exams.filter(e => e.status === 'active');

            activeExams.forEach(exam => {
                const examDecks = decks.filter(d => d.examId === exam.id);
                let examDueCards = 0;
                const relevantDecks: Deck[] = [];

                examDecks.forEach(deck => {
                    if (!deck.cards || deck.cards.length === 0) return;

                    let deckDueForDay = 0;
                    deck.cards.forEach(card => {
                        const reviewDate = card.nextReviewDate ? new Date(card.nextReviewDate) : null;
                        if (
                            reviewDate &&
                            reviewDate >= dayStart &&
                            reviewDate <= dayEnd &&
                            card.status !== 'mastered'
                        ) {
                            deckDueForDay++;
                        }
                    });

                    if (deckDueForDay > 0) {
                        examDueCards += deckDueForDay;
                        relevantDecks.push(deck);
                    }
                });

                if (examDueCards > 0) {
                    examMap.set(exam.id, { exam, dueCards: examDueCards, decks: relevantDecks });
                }
            });

            return examMap;
        });
    }, [weeklyStudyPlan, exams, decks]);

    // Calcola deadline esami per giorno
    const examDeadlinesByDay = useMemo(() => {
        return weeklyStudyPlan.map(day => {
            const dayStr = day.date.toISOString().split('T')[0];
            return exams.filter(e => {
                if (e.status !== 'active') return false;
                const deadlineStr = new Date(e.deadline).toISOString().split('T')[0];
                return deadlineStr === dayStr;
            });
        });
    }, [weeklyStudyPlan, exams]);

    // Exam dots per day
    const examDotsByDay = useMemo(() => {
        return examsByDay.map(examMap => {
            const dots: Array<{ examId: string; title: string; color: string }> = [];
            examMap.forEach(({ exam }) => {
                const colors = getExamColors(exam.title, exam.description);
                dots.push({
                    examId: exam.id,
                    title: exam.title,
                    color: getDotColor(colors.bgColor),
                });
            });
            return dots;
        });
    }, [examsByDay]);

    // Week range header
    const weekHeader = useMemo(() => {
        if (weeklyStudyPlan.length === 0) return '';
        const first = weeklyStudyPlan[0].date;
        const last = weeklyStudyPlan[weeklyStudyPlan.length - 1].date;
        const firstMonth = MONTHS[first.getMonth()];
        const lastMonth = MONTHS[last.getMonth()];
        const year = last.getFullYear();

        if (firstMonth === lastMonth) {
            return `${first.getDate()} - ${last.getDate()} ${firstMonth} ${year}`;
        }
        return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth} ${year}`;
    }, [weeklyStudyPlan]);

    const handleDayClick = useCallback(
        (index: number) => {
            onDaySelect(selectedDayIndex === index ? null : index);
        },
        [selectedDayIndex, onDaySelect],
    );

    // Exam breakdown per il giorno selezionato
    const selectedDayBreakdown = useMemo(() => {
        if (selectedDayIndex === null) return [];
        const examMap = examsByDay[selectedDayIndex];
        if (!examMap) return [];

        const breakdown: Array<{
            exam: Exam;
            dueCards: number;
            decks: Deck[];
            color: string;
        }> = [];

        examMap.forEach(({ exam, dueCards, decks: examDecks }) => {
            const colors = getExamColors(exam.title, exam.description);
            breakdown.push({
                exam,
                dueCards,
                decks: examDecks,
                color: colors.color,
            });
        });

        // Ordina per due cards decrescente
        breakdown.sort((a, b) => b.dueCards - a.dueCards);
        return breakdown;
    }, [selectedDayIndex, examsByDay]);

    // Totale carte settimana
    const weekTotalDue = useMemo(
        () => weeklyStudyPlan.reduce((sum, d) => sum + d.dueCards, 0),
        [weeklyStudyPlan],
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/15 border border-primary-500/30">
                        <Calendar className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-white">
                            Settimana: {weekHeader}
                        </h2>
                        <p className="text-xs text-white/40">
                            {weekTotalDue > 0
                                ? `${weekTotalDue} carte da ripassare questa settimana`
                                : 'Nessuna carta da ripassare'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label="Calendario settimanale">
                {weeklyStudyPlan.map((day, index) => (
                    <motion.div
                        key={day.dayName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                    >
                        <DayCell
                            dayName={day.dayName}
                            date={day.date}
                            dueCards={day.dueCards}
                            newCards={day.newCards}
                            completedCards={day.completedCards}
                            isToday={day.isToday}
                            isSelected={selectedDayIndex === index}
                            examDots={examDotsByDay[index]}
                            hasExamDeadline={examDeadlinesByDay[index].length > 0}
                            onClick={() => handleDayClick(index)}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Day detail (expands below) */}
            <AnimatePresence>
                {selectedDayIndex !== null && weeklyStudyPlan[selectedDayIndex] && (
                    <DayDetail
                        day={weeklyStudyPlan[selectedDayIndex]}
                        examBreakdown={selectedDayBreakdown}
                        onStudy={onStudy}
                        onViewDetail={onViewDetail}
                        onExamClick={onExamClick}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
