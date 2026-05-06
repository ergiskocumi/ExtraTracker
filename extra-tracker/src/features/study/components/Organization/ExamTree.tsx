/**
 * 📚 EXAM TREE - Sidebar con albero esami e mazzi
 * 
 * Design simile a FolderTree ma per esami:
 * - Lista esami espandibili
 * - Per ogni esame, mostra i mazzi associati
 * - Statistiche per ogni esame (mazzi, carte, padronanza)
 * - Navigazione e selezione esami
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, 
    ChevronRight, 
    ChevronDown,
    Layers,
    CheckCircle,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { getExamIcon } from '../Exams/utils/examIcons';
import { studyOrgBadgeClass, studyOrgButtonClass } from '../utils/studyButtonClasses';

interface ExamStats {
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
}

interface ExamTreeProps {
    exams: Exam[];
    decks: Deck[];
    selectedExamId: string | null;
    onExamSelect: (examId: string | null) => void;
    onDeckClick?: (deckId: string) => void;
    onRefresh?: () => void;
}

interface ExamItemProps {
    exam: Exam;
    decks: Deck[];
    stats: ExamStats;
    isExpanded: boolean;
    isSelected: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onDeckClick?: (deckId: string) => void;
}

const ExamItem: React.FC<ExamItemProps> = ({
    exam,
    decks,
    stats,
    isExpanded,
    isSelected,
    onToggle,
    onSelect,
    onDeckClick,
}) => {
    const examDecks = decks.filter(d => d.examId === exam.id);
    const ExamIcon = getExamIcon(exam.title, exam.description);
    // Calcola giorni alla scadenza
    const deadlineDate = new Date(exam.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
    const isOverdue = daysUntilDeadline < 0;

    // Priorità visiva
    const isCritical = stats.totalCards > 0 && stats.dueCards / stats.totalCards > 0.5;

    return (
        <div>
            <motion.div
                whileHover={{ x: 4 }}
                className={`
                    group relative px-3 py-1.5 rounded-lg transition-all duration-200 touch-manipulation
                    ${isSelected 
                        ? 'bg-violet-500/20' 
                        : 'hover:bg-white/5'
                    }
                `}
                onClick={onSelect}
            >
                {/* Bordo sinistro per selezione */}
                {isSelected && (
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-violet-400" />
                )}

                {/* Header con nome e statistiche */}
                <div className="flex items-center justify-between w-full">
                    <div 
                        className="flex items-center cursor-pointer flex-1 min-w-0"
                        onClick={onSelect}
                    >
                        {/* Toggle expand */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            className={studyOrgButtonClass(
                                'icon',
                                'w-4 h-4 rounded-sm flex items-center justify-center mr-2 flex-shrink-0'
                            )}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                        </button>
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Icona esame */}
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                                stats.totalCards > 0
                                    ? stats.dueCards === 0
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : isCritical
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-violet-500/20 text-violet-400'
                                    : 'bg-white/10 text-white/60'
                            }`}>
                                <ExamIcon className="w-3 h-3" />
                            </div>
                            
                            {/* Nome esame */}
                            <span className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-[280px]">
                                {exam.title}
                            </span>
                        </div>
                    </div>
                    
                    {/* Statistiche condensate */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Badge mazzi */}
                        {stats.deckCount > 0 && (
                            <span className={studyOrgBadgeClass('count', 'text-xs px-1.5 py-0.5 rounded')}>
                                {stats.deckCount}
                            </span>
                        )}
                        
                        {/* Badge carte da ripassare */}
                        {stats.dueCards > 0 && (
                            <span className={studyOrgBadgeClass(
                                isCritical ? 'dueCritical' : 'due',
                                'text-xs px-1.5 py-0.5 rounded'
                            )}>
                                {stats.dueCards}
                            </span>
                        )}
                        
                        {/* Padronanza completa */}
                        {stats.dueCards === 0 && stats.masteryPercent === 100 && stats.totalCards > 0 && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}

                        {/* Indicatore scadenza urgente */}
                        {isUrgent && (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-1.5 h-1.5 rounded-full bg-orange-400"
                            />
                        )}

                        {/* Indicatore scaduto */}
                        {isOverdue && (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        )}
                    </div>
                </div>
                
                {/* Progress bar - Solo quando ci sono carte */}
                {stats.totalCards > 0 && (
                    <div className="mt-1.5">
                        <div className="flex justify-between text-[10px] text-theme-muted mb-0.5">
                            <span>{stats.masteryPercent}% padronanza</span>
                            {stats.dueCards > 0 && (
                                <span>{stats.dueCards}/{stats.totalCards} da ripassare</span>
                            )}
                        </div>
                        <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
                            <motion.div
                                style={{ transformOrigin: 'left' }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: stats.masteryPercent / 100 }}
                                transition={{ duration: 0.5 }}
                                className={`h-full w-full rounded-full ${
                                    stats.masteryPercent === 100
                                        ? 'bg-emerald-400'
                                        : stats.masteryPercent > 70
                                            ? 'bg-violet-400'
                                            : 'bg-amber-400'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Scadenza info */}
                {isUrgent && (
                    <div className="mt-1.5 p-1.5 rounded bg-orange-500/10 border border-orange-500/20">
                        <p className="text-[10px] text-orange-400">
                            Scade tra {daysUntilDeadline} {daysUntilDeadline === 1 ? 'giorno' : 'giorni'}
                        </p>
                    </div>
                )}

                {isOverdue && (
                    <div className="mt-1.5 p-1.5 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-[10px] text-red-400">
                            Scaduto {Math.abs(daysUntilDeadline)} {Math.abs(daysUntilDeadline) === 1 ? 'giorno' : 'giorni'} fa
                        </p>
                    </div>
                )}
            </motion.div>

            {/* Mazzi associati (espandibili) */}
            <AnimatePresence>
                {isExpanded && examDecks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, maxHeight: 0 }}
                        animate={{ opacity: 1, maxHeight: 2000 }}
                        exit={{ opacity: 0, maxHeight: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-6 mt-1 space-y-1 overflow-hidden"
                    >
                        {examDecks.map((deck) => {
                            const deckDueCount = deck.dueCount ?? 0;
                            const deckTotalCards = deck.totalCards ?? deck.cards?.length ?? 0;
                            const deckMastered = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
                            const deckMasteryPercent = deckTotalCards > 0 
                                ? Math.round((deckMastered / deckTotalCards) * 100) 
                                : 0;

                            return (
                                <motion.div
                                    key={deck.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all cursor-pointer group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDeckClick) {
                                            onDeckClick(deck.id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Layers className="w-3 h-3 text-white/60 group-hover:text-white/80 transition-colors flex-shrink-0" />
                                            <span className="text-xs sm:text-sm text-white/80 group-hover:text-white transition-colors truncate">
                                                {deck.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {deckDueCount > 0 && (
                                                <span className={studyOrgBadgeClass(
                                                    'dueCritical',
                                                    'text-[10px] px-1.5 py-0.5 rounded group-hover:bg-amber-500/30 transition-colors'
                                                )}>
                                                    {deckDueCount}
                                                </span>
                                            )}
                                            {deckTotalCards > 0 && (
                                                <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors">
                                                    {deckMasteryPercent}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const ExamTree: React.FC<ExamTreeProps> = ({
    exams,
    decks,
    selectedExamId,
    onExamSelect,
    onDeckClick,
    onRefresh: _onRefresh,
}) => {
    const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

    const toggleExam = useCallback((examId: string) => {
        setExpandedExams(prev => {
            const next = new Set(prev);
            if (next.has(examId)) {
                next.delete(examId);
            } else {
                next.add(examId);
            }
            return next;
        });
    }, []);

    // Calcola statistiche per ogni esame
    const examStatsMap = useMemo(() => {
        const statsMap = new Map<string, ExamStats>();
        
        exams.forEach(exam => {
            const examDecks = decks.filter(d => d.examId === exam.id);
            const totalCards = examDecks.reduce((sum, deck) => 
                sum + (deck.totalCards ?? deck.cards?.length ?? 0), 0
            );
            const dueCards = examDecks.reduce((sum, deck) => 
                sum + (deck.dueCount ?? 0), 0
            );
            
            let masteredCards = 0;
            examDecks.forEach(deck => {
                masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
            });
            
            const masteryPercent = totalCards > 0 
                ? Math.round((masteredCards / totalCards) * 100) 
                : 0;

            statsMap.set(exam.id, {
                deckCount: examDecks.length,
                totalCards,
                dueCards,
                masteryPercent,
            });
        });

        return statsMap;
    }, [exams, decks]);

    // Ordina esami per scadenza (più urgenti prima)
    const sortedExams = useMemo(() => {
        return [...exams].sort((a, b) => {
            const aDeadline = new Date(a.deadline).getTime();
            const bDeadline = new Date(b.deadline).getTime();
            return aDeadline - bDeadline;
        });
    }, [exams]);

    if (exams.length === 0) {
        return (
            <div className="px-3 py-6 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-xs text-white/40 mb-2">Nessun esame ancora</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {sortedExams.map((exam) => {
                const stats = examStatsMap.get(exam.id) || {
                    deckCount: 0,
                    totalCards: 0,
                    dueCards: 0,
                    masteryPercent: 0,
                };
                const isExpanded = expandedExams.has(exam.id);
                const isSelected = selectedExamId === exam.id;

                return (
                    <ExamItem
                        key={exam.id}
                        exam={exam}
                        decks={decks}
                        stats={stats}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        onToggle={() => toggleExam(exam.id)}
                        onSelect={() => onExamSelect(exam.id)}
                        onDeckClick={onDeckClick}
                    />
                );
            })}
        </div>
    );
};
