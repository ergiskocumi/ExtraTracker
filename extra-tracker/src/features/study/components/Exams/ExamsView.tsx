import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Loader2, CheckCircle } from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { ExamCard } from './ExamCard';
import { ExamsFilters, type ExamSortOption, type ExamFilterOption } from './ExamsFilters';
import { UnassignedDecksSection } from './UnassignedDecksSection';
import { SearchResults } from './SearchResults';
import examService from '../../services/examService';
import type { Tag } from '../../services/tagsService';
import { ConfirmationModal } from '../../../../shared/components/ConfirmationModal';
import { emitToast } from '../../../../shared/components/toast';

// ============================================
// TYPES
// ============================================

interface ExamsViewProps {
    decks: Deck[];
    tags: Tag[];
    onCreateExam: () => void;
    onExamClick: (examId: string) => void;
    onRefresh?: () => void; // Callback per refresh esami
    onDeckUpdate: (deck: Deck) => void;
    onViewDetail: (deckId: string) => void;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    onTogglePin?: (deck: Deck) => void;
    onReactivateExam?: (examId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export const ExamsView: React.FC<ExamsViewProps> = ({
    decks,
    tags,
    onCreateExam,
    onExamClick,
    onRefresh,
    onDeckUpdate,
    onViewDetail,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onDelete,
    onExamSolver,
    onTogglePin,
    onReactivateExam,
}) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<ExamSortOption>('recent'); // Default: Recente
    const [filter, setFilter] = useState<ExamFilterOption>('all');
    
    // Delete state
    const [pendingDeleteExamId, setPendingDeleteExamId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadExams = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const allExams = await examService.getAll();
            setExams(allExams);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento degli esami');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadExams();
    }, [loadExams]);

    // Espone la funzione loadExams tramite window per refresh esterno
    useEffect(() => {
        (window as any).__refreshExams = loadExams;
        return () => {
            delete (window as any).__refreshExams;
        };
    }, [loadExams]);

    // Delete handlers
    const handleRequestDeleteExam = useCallback((examId: string) => {
        setPendingDeleteExamId(examId);
    }, []);

    const handleCancelDeleteExam = useCallback(() => {
        if (!isDeleting) {
            setPendingDeleteExamId(null);
        }
    }, [isDeleting]);

    const handleConfirmDeleteExam = useCallback(async () => {
        if (!pendingDeleteExamId) return;

        setIsDeleting(true);
        try {
            // Optimistic UI: rimuovi immediatamente dalla lista
            setExams(prev => prev.filter(exam => exam.id !== pendingDeleteExamId));
            
            // Chiama l'API
            await examService.delete(pendingDeleteExamId);
            
            // Toast di successo
            emitToast.success('Esame eliminato correttamente');
            
            // Refresh se c'è un callback
            if (onRefresh) {
                onRefresh();
            }
        } catch (err: any) {
            // Rollback in caso di errore
            await loadExams();
            emitToast.error(err.message || 'Errore nell\'eliminazione dell\'esame');
        } finally {
            setIsDeleting(false);
            setPendingDeleteExamId(null);
        }
    }, [pendingDeleteExamId, onRefresh, loadExams]);

    const pendingDeleteExam = exams.find(exam => exam.id === pendingDeleteExamId);
    const pendingDeleteExamTitle = pendingDeleteExam?.title || 'questo esame';
    const pendingDeleteExamDecks = pendingDeleteExam ? decks.filter(d => d.examId === pendingDeleteExamId) : [];
    const pendingDeleteExamCards = pendingDeleteExamDecks.reduce((sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0), 0);

    // Calcola statistiche per ogni esame
    const getExamStats = (examId: string) => {
        const examDecks = decks.filter(d => d.examId === examId);
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

    // Ottieni i decks per un esame specifico (per la distribuzione carte)
    const getExamDecks = (examId: string) => {
        return decks.filter(d => d.examId === examId);
    };

    // Filtra i mazzi in base alla ricerca
    const filteredDecks = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }
        
        const query = searchQuery.toLowerCase();
        return decks.filter(deck =>
            deck.title.toLowerCase().includes(query) ||
            deck.description?.toLowerCase().includes(query) ||
            deck.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    }, [decks, searchQuery]);

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
                if (exam.status !== 'active') return false;
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil <= 7 && daysUntil >= 0;
            });
        } else if (filter === 'upcoming') {
            filtered = filtered.filter(exam => {
                if (exam.status !== 'active') return false;
                const deadline = new Date(exam.deadline).getTime();
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                return daysUntil > 7;
            });
        } else if (filter === 'completed') {
            // Include tutti gli esami completati (passed, failed, archived, completed)
            filtered = filtered.filter(exam => 
                exam.status === 'completed' || 
                exam.status === 'passed' || 
                exam.status === 'failed' || 
                exam.status === 'archived'
            );
        } else if (filter === 'all') {
            // Mostra solo esami attivi per default
            filtered = filtered.filter(exam => exam.status === 'active');
        }

        // Ordina
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    // Ordina per data di creazione (più recente prima)
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
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
            {/* Sezione Mazzi senza esame associato - Mostra sempre in cima */}
            {onDeckUpdate && onViewDetail && onStudy && (
                <UnassignedDecksSection
                    decks={decks}
                    exams={exams}
                    tags={tags}
                    onDeckUpdate={onDeckUpdate}
                    onViewDetail={onViewDetail}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                    onDelete={onDelete}
                    onExamSolver={onExamSolver}
                    onTogglePin={onTogglePin}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">I tuoi Esami</h2>
                    <p className="text-white/50 text-sm">
                        {filteredAndSortedExams.length} di {exams.length} {exams.length === 1 ? 'esame' : 'esami'}
                    </p>
                </div>
               {/*  <motion.button
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
 */}            </div>

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

            {/* Search Results - Mostra quando c'è una ricerca attiva */}
            {searchQuery.trim() ? (
                <SearchResults
                    exams={filteredAndSortedExams}
                    decks={filteredDecks}
                    tags={tags}
                    searchQuery={searchQuery}
                    onExamClick={onExamClick}
                    onDeckUpdate={onDeckUpdate}
                    onViewDetail={onViewDetail}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                    onDelete={onDelete}
                    onExamSolver={onExamSolver}
                    onTogglePin={onTogglePin}
                    getExamStats={getExamStats}
                />
            ) : filteredAndSortedExams.length === 0 ? (
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
                <>
                    {/* Esami Attivi */}
                    {filteredAndSortedExams.filter(e => e.status === 'active').length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                <h3 className="text-lg font-semibold text-white/80 px-4">Esami Attivi</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                                {filteredAndSortedExams
                                    .filter(e => e.status === 'active')
                                    .map((exam, index) => {
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
                                                    decks={getExamDecks(exam.id)}
                                                    onClick={() => onExamClick(exam.id)}
                                                    onDelete={handleRequestDeleteExam}
                                                    onReactivate={onReactivateExam}
                                                />
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Esami Completati */}
                    {(() => {
                        const completedExams = filteredAndSortedExams.filter(e => 
                            e.status === 'passed' || 
                            e.status === 'failed' || 
                            e.status === 'archived' || 
                            e.status === 'completed'
                        );
                        
                        if (completedExams.length === 0) return null;
                        
                        return (
                            <div className="space-y-4 mt-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
                                    <h3 className="text-lg font-semibold text-amber-400/90 px-4 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Esami Completati
                                    </h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                                    {completedExams.map((exam, index) => {
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
                                                    decks={getExamDecks(exam.id)}
                                                    onClick={() => onExamClick(exam.id)}
                                                    onDelete={handleRequestDeleteExam}
                                                    onReactivate={onReactivateExam}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(pendingDeleteExamId)}
                title="Elimina Esame"
                description={
                    pendingDeleteExamDecks.length > 0
                        ? `Sei sicuro di voler eliminare "${pendingDeleteExamTitle}"? I ${pendingDeleteExamDecks.length} ${pendingDeleteExamDecks.length === 1 ? 'mazzo restera disponibile' : 'mazzi resteranno disponibili'} e verranno scollegati dall'esame (${pendingDeleteExamCards} flashcard coinvolte).`
                        : `Sei sicuro di voler eliminare "${pendingDeleteExamTitle}"? L'azione e irreversibile.`
                }
                confirmLabel="Elimina"
                cancelLabel="Annulla"
                onConfirm={handleConfirmDeleteExam}
                onCancel={handleCancelDeleteExam}
                isLoading={isDeleting}
                destructive
            />
        </div>
    );
};
