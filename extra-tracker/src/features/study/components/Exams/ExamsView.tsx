import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import type { Goal } from '../../../goals/types';
import type { Deck } from '../../services/studyService';
import { ExamCard } from './ExamCard';
import { ExamsFilters, type ExamSortOption, type ExamFilterOption } from './ExamsFilters';
import goalsService from '../../../goals/services/goalsService';

// ============================================
// TYPES
// ============================================

interface ExamsViewProps {
    decks: Deck[];
    onCreateExam: () => void;
    onExamClick: (examId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export const ExamsView: React.FC<ExamsViewProps> = ({
    decks,
    onCreateExam,
    onExamClick,
}) => {
    const [exams, setExams] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<ExamSortOption>('deadline');
    const [filter, setFilter] = useState<ExamFilterOption>('all');

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const allGoals = await goalsService.getAll();
            // Filtra solo gli esami (goals con category='learning')
            const learningGoals = allGoals.filter(g => g.category === 'learning' && g.status === 'active');
            setExams(learningGoals);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento degli esami');
        } finally {
            setIsLoading(false);
        }
    };

    // Calcola statistiche per ogni esame
    const getExamStats = (examId: string) => {
        const examDecks = decks.filter(d => d.goalId === examId);
        const totalCards = examDecks.reduce((sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0), 0);
        const dueCards = examDecks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);
        
        let masteredCards = 0;
        examDecks.forEach(deck => {
            masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
        });
        const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

        return {
            deckCount: examDecks.length,
            totalCards,
            dueCards,
            masteryPercent,
        };
    };

    // Filtra e ordina gli esami
    const filteredAndSortedExams = useMemo(() => {
        let filtered = [...exams];

        // Filtro per ricerca
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(exam =>
                exam.title.toLowerCase().includes(query) ||
                exam.description?.toLowerCase().includes(query)
            );
        }

        // Filtro per stato
        const now = Date.now();
        if (filter === 'urgent') {
            filtered = filtered.filter(exam => {
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil <= 7 && daysUntil >= 0;
            });
        } else if (filter === 'upcoming') {
            filtered = filtered.filter(exam => {
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil > 7;
            });
        } else if (filter === 'completed') {
            filtered = filtered.filter(exam => exam.status === 'completed');
        }

        // Ordina
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'deadline':
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'mastery': {
                    const aStats = getExamStats(a.id);
                    const bStats = getExamStats(b.id);
                    return bStats.masteryPercent - aStats.masteryPercent;
                }
                case 'cards': {
                    const aStats = getExamStats(a.id);
                    const bStats = getExamStats(b.id);
                    return bStats.totalCards - aStats.totalCards;
                }
                default:
                    return 0;
            }
        });

        return filtered;
    }, [exams, searchQuery, filter, sortBy, decks]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <p className="text-white/60 mb-4">{error}</p>
                <button
                    onClick={loadExams}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all"
                >
                    Riprova
                </button>
            </div>
        );
    }

    if (exams.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
            >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 flex items-center justify-center mb-6">
                    <BookOpen className="w-12 h-12 sm:w-14 sm:h-14 text-primary-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                    Nessun esame trovato
                </h2>
                <p className="text-white/60 text-sm sm:text-base mb-8 sm:mb-10 max-w-md">
                    Crea il tuo primo esame per iniziare a organizzare i tuoi mazzi di studio.
                </p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCreateExam}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl 
                               bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold 
                               shadow-xl shadow-primary-500/30 text-sm sm:text-base 
                               touch-manipulation min-h-[44px] sm:min-h-[48px]
                               flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Crea il primo esame</span>
                </motion.button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">I tuoi Esami</h2>
                    <p className="text-white/50 text-sm">
                        {filteredAndSortedExams.length} di {exams.length} {exams.length === 1 ? 'esame' : 'esami'}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateExam}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 
                               text-white font-medium shadow-lg shadow-primary-500/30
                               hover:shadow-xl hover:shadow-primary-500/40 transition-all
                               flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nuovo Esame</span>
                </motion.button>
            </div>

            {/* Filters */}
            <ExamsFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filter={filter}
                onFilterChange={setFilter}
                exams={exams}
            />

            {/* Exams Grid */}
            {filteredAndSortedExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <BookOpen className="w-10 h-10 text-white/40" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Nessun esame trovato
                    </h3>
                    <p className="text-white/50 text-sm">
                        {searchQuery || filter !== 'all'
                            ? 'Prova a modificare i filtri o la ricerca'
                            : 'Crea il tuo primo esame per iniziare'
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {filteredAndSortedExams.map((exam, index) => {
                        const stats = getExamStats(exam.id);
                        return (
                            <motion.div
                                key={exam.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ExamCard
                                    exam={exam}
                                    deckCount={stats.deckCount}
                                    totalCards={stats.totalCards}
                                    dueCards={stats.dueCards}
                                    masteryPercent={stats.masteryPercent}
                                    onClick={() => onExamClick(exam.id)}
                                />
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
