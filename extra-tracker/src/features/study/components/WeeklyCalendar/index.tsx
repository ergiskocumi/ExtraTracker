import { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, BarChart3 } from 'lucide-react';
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

function getWeekLoadingText(weekTotalDue: number): string {
    if (weekTotalDue === 0) return 'Nessuna carta da ripassare';
    if (weekTotalDue <= 5) return 'Settimana leggera, solo ' + weekTotalDue + ' carte';
    if (weekTotalDue <= 20) return weekTotalDue + ' carte da ripassare questa settimana';
    if (weekTotalDue <= 50) return 'Settimana intensa — ' + weekTotalDue + ' carte in programma';
    return 'Carico pesante — ' + weekTotalDue + ' carte da smaltire questa settimana 💪';
}

export const WeeklyCalendar = memo<WeeklyCalendarProps>(({
    weeklyStudyPlan,
    exams,
    decks,
    selectedDayIndex,
    onDaySelect,
    onStudy,
    onViewDetail,
    onExamClick,
}) => {
    const examsByDay = useMemo(() => {
        return weeklyStudyPlan.map(day => {
            const dayStart = new Date(day.date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day.date);
            dayEnd.setHours(23, 59, 59, 999);

            const examMap = new Map<string, { exam: Exam; dueCards: number; decks: Deck[] }>();

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

        breakdown.sort((a, b) => b.dueCards - a.dueCards);
        return breakdown;
    }, [selectedDayIndex, examsByDay]);

    const weekTotalDue = useMemo(
        () => weeklyStudyPlan.reduce((sum, d) => sum + d.dueCards, 0),
        [weeklyStudyPlan],
    );

    const daysWithCards = useMemo(
        () => weeklyStudyPlan.filter(d => d.dueCards > 0).length,
        [weeklyStudyPlan],
    );

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                        <Calendar className="w-4 h-4 text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-theme-primary">
                            Settimana: {weekHeader}
                        </h2>
                        <p className="text-xs text-theme-muted">
                            {getWeekLoadingText(weekTotalDue)}
                        </p>
                    </div>
                </div>

                {weekTotalDue > 0 && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-theme-surface border border-theme-default">
                        <BarChart3 className="w-3.5 h-3.5 text-theme-muted" />
                        <span className="text-xs font-medium text-theme-muted tabular-nums">
                            {daysWithCards}/{weeklyStudyPlan.length} giorni
                        </span>
                    </div>
                )}
            </div>

            {/* Calendar grid */}
            <motion.div
                className="grid grid-cols-7 gap-1.5 sm:gap-2"
                role="grid"
                aria-label="Calendario settimanale"
            >
                {weeklyStudyPlan.map((day, index) => (
                    <DayCell
                        key={day.dayName}
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
                        index={index}
                    />
                ))}
            </motion.div>

            {/* Day detail (expands below) */}
            <AnimatePresence mode="wait">
                {selectedDayIndex !== null && weeklyStudyPlan[selectedDayIndex] && (
                    <DayDetail
                        key={selectedDayIndex}
                        day={weeklyStudyPlan[selectedDayIndex]}
                        examBreakdown={selectedDayBreakdown}
                        onStudy={onStudy}
                        onViewDetail={onViewDetail}
                        onExamClick={onExamClick}
                    />
                )}
            </AnimatePresence>

            {/* Empty state */}
            {weekTotalDue === 0 && selectedDayIndex === null && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="text-center py-6 sm:py-8"
                >
                    <Sparkles className="w-8 h-8 text-theme-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-theme-muted">
                        Tutte le carte sono in regola! Goditi la pausa 🎉
                    </p>
                </motion.div>
            )}
        </div>
    );
});
