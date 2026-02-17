import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { ExamGridCard } from './ExamGridCard';

interface ExamGridProps {
    exams: Exam[];
    decks: Deck[];
    onExamClick: (examId: string) => void;
    getExamStats: (examId: string) => {
        deckCount: number;
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
    };
}

export const ExamGrid: React.FC<ExamGridProps> = ({
    exams,
    decks,
    onExamClick,
    getExamStats,
}) => {
    const [showCompleted, setShowCompleted] = useState(false);

    const activeExams = useMemo(
        () => exams.filter(e => e.status === 'active'),
        [exams],
    );

    const completedExams = useMemo(
        () =>
            exams.filter(
                e =>
                    e.status === 'passed' ||
                    e.status === 'failed' ||
                    e.status === 'archived' ||
                    e.status === 'completed',
            ),
        [exams],
    );

    const handleExamClick = useCallback(
        (examId: string) => {
            onExamClick(examId);
        },
        [onExamClick],
    );

    const toggleCompleted = useCallback(() => {
        setShowCompleted(prev => !prev);
    }, []);

    if (exams.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-theme-muted" aria-hidden />
                    <h3 className="text-sm font-semibold text-theme-primary">
                        I tuoi Esami
                    </h3>
                    <span className="text-xs text-theme-muted">
                        ({activeExams.length} attivi)
                    </span>
                </div>
                {completedExams.length > 0 && (
                    <button
                        type="button"
                        onClick={toggleCompleted}
                        className="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        aria-expanded={showCompleted}
                    >
                        {showCompleted ? 'Nascondi' : 'Mostra'} completati ({completedExams.length})
                        {showCompleted ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                        )}
                    </button>
                )}
            </div>

            {/* Active exams */}
            <div className="space-y-2">
                {activeExams.map((exam, index) => {
                    const stats = getExamStats(exam.id);
                    return (
                        <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                        >
                            <ExamGridCard
                                exam={exam}
                                deckCount={stats.deckCount}
                                totalCards={stats.totalCards}
                                dueCards={stats.dueCards}
                                masteryPercent={stats.masteryPercent}
                                onClick={() => handleExamClick(exam.id)}
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Completed exams */}
            <AnimatePresence>
                {showCompleted && completedExams.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 pt-2">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                            <span className="text-xs text-theme-muted font-medium">Completati</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
                        </div>
                        {completedExams.map((exam, index) => {
                            const stats = getExamStats(exam.id);
                            return (
                                <motion.div
                                    key={exam.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className="opacity-60"
                                >
                                    <ExamGridCard
                                        exam={exam}
                                        deckCount={stats.deckCount}
                                        totalCards={stats.totalCards}
                                        dueCards={stats.dueCards}
                                        masteryPercent={stats.masteryPercent}
                                        onClick={() => handleExamClick(exam.id)}
                                    />
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
