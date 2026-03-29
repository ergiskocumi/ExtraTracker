/**
 * EXAM DETAIL VIEW - Vista dettaglio esame completamente ridisegnata
 * 
 * Layout:
 * - Header informativo con statistiche principali
 * - Sidebar con azioni rapide e distribuzione carte
 * - Griglia mazzi principale
 * - Timeline e progresso
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    LayoutGrid,
    List,
    FolderOpen,
    GraduationCap,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck, ExamSavedQuiz } from '../../services/studyService';
import { DeckGrid } from '../Deck/DeckGrid';
import { DeckCard } from '../DeckCard';
import type { Tag } from '../../services/tagsService';
import { ExamStatsHeader } from './ExamStatsHeader';
import { CardDistributionChart } from './CardDistributionChart';
import { ExamQuickActions } from './ExamQuickActions';

// ============================================
// TYPES
// ============================================

interface ExamDetailViewProps {
    exam: Exam;
    decks: Deck[];
    folders: any[];
    tags: Tag[];
    onBack: () => void;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    onViewFolder?: (folderId: string) => void;
    onTogglePin?: (deck: Deck) => void;
    onReactivateExam?: (examId: string) => void;
    onCompleteExam?: () => void;
    onDeleteExam?: (examId: string) => void;
    viewMode?: 'grid' | 'horizontal' | 'compact';
    savedQuizzes?: ExamSavedQuiz[];
    isLoadingSavedQuizzes?: boolean;
    onReplaySavedQuiz?: (quiz: ExamSavedQuiz) => void;
}

// ============================================
// COMPONENT
// ============================================

export const ExamDetailView: React.FC<ExamDetailViewProps> = ({
    exam,
    decks,
    folders,
    tags,
    onBack,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onExamSolver,
    onViewFolder,
    onTogglePin,
    onReactivateExam,
    onCompleteExam,
    onDeleteExam,
    viewMode = 'grid',
    savedQuizzes: _savedQuizzes = [],
    isLoadingSavedQuizzes: _isLoadingSavedQuizzes = false,
    onReplaySavedQuiz: _onReplaySavedQuiz,
}) => {
    const [localViewMode, setLocalViewMode] = React.useState<'grid' | 'list'>(viewMode === 'horizontal' ? 'list' : 'grid');

    // Filtra solo i mazzi associati a questo esame
    const examDecks = useMemo(() => {
        return decks.filter(d => d.examId === exam.id);
    }, [decks, exam.id]);

    // Calcola statistiche dettagliate
    const stats = useMemo(() => {
        const allCards = examDecks.flatMap(d => d.cards || []);
        
        return {
            totalCards: allCards.length,
            newCards: allCards.filter(c => c.status === 'new').length,
            learningCards: allCards.filter(c => c.status === 'learning').length,
            reviewCards: allCards.filter(c => c.status === 'review').length,
            masteredCards: allCards.filter(c => c.status === 'mastered').length,
            dueCards: examDecks.reduce((sum, d) => sum + (d.dueCount || 0), 0),
            deckCount: examDecks.length,
            foldersCount: new Set(examDecks.filter(d => d.folderId).map(d => d.folderId)).size,
        };
    }, [examDecks]);

    // Trova il mazzo con più carte da ripassare per l'azione rapida
    const priorityDeck = useMemo(() => {
        return examDecks
            .filter(d => (d.dueCount || 0) > 0)
            .sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0))[0];
    }, [examDecks]);

    const handleStudyAll = () => {
        // Se c'è un mazzo prioritario, inizia da quello
        if (priorityDeck) {
            onStudy(priorityDeck.id);
        } else if (examDecks.length > 0) {
            // Altrimenti prendi il primo mazzo con carte
            const firstDeckWithCards = examDecks.find(d => (d.totalCards || d.cards?.length || 0) > 0);
            if (firstDeckWithCards) {
                onStudy(firstDeckWithCards.id);
            }
        }
    };

    const handleMagicGenerateForExam = () => {
        // Apre il magic generate per il primo mazzo o crea un nuovo mazzo
        const targetDeck = priorityDeck || examDecks[0];
        if (targetDeck) {
            onMagicGenerate(targetDeck);
        }
    };

    const handleExamSolver = () => {
        // Apre il simulatore esame per il mazzo con più carte
        const targetDeck = examDecks
            .sort((a, b) => (b.totalCards || b.cards?.length || 0) - (a.totalCards || a.cards?.length || 0))[0];
        if (targetDeck && onExamSolver) {
            onExamSolver(targetDeck.id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <ExamStatsHeader exam={exam} decks={decks} onBack={onBack} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Mazzi (2/3) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-500/15 border border-primary-500/30">
                                <BookOpen className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Mazzi dell'Esame</h2>
                                <p className="text-sm text-white/50">
                                    {stats.deckCount} {stats.deckCount === 1 ? 'mazzo' : 'mazzi'} 
                                    {stats.foldersCount > 0 && ` · ${stats.foldersCount} cartelle`}
                                </p>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-surface border border-theme-default">
                            <button
                                onClick={() => setLocalViewMode('grid')}
                                className={`
                                    p-2 rounded-lg transition-all
                                    ${localViewMode === 'grid' 
                                        ? 'bg-primary-500 text-white keep-light-text' 
                                        : 'text-theme-muted hover:text-theme-primary hover:bg-theme-elevated'
                                    }
                                `}
                                aria-label="Vista griglia"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setLocalViewMode('list')}
                                className={`
                                    p-2 rounded-lg transition-all
                                    ${localViewMode === 'list' 
                                        ? 'bg-primary-500 text-white keep-light-text' 
                                        : 'text-theme-muted hover:text-theme-primary hover:bg-theme-elevated'
                                    }
                                `}
                                aria-label="Vista lista"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Decks Grid or Empty State */}
                    {examDecks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-16 text-center p-8 rounded-2xl bg-white/5 border border-white/10 border-dashed"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-5">
                                <GraduationCap className="w-10 h-10 text-primary-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Nessun mazzo per questo esame
                            </h3>
                            <p className="text-white/50 text-sm max-w-sm">
                                Crea il tuo primo mazzo per iniziare a studiare. Puoi aggiungere carte manualmente o generarle con l'AI.
                            </p>
                        </motion.div>
                    ) : (
                        <DeckGrid
                            decks={examDecks}
                            tags={tags}
                            DeckCardComponent={DeckCard}
                            onStudy={onStudy}
                            onRead={onRead}
                            onMagicGenerate={onMagicGenerate}
                            onAddCard={onAddCard}
                            onViewDetail={onViewDetail}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            onExamSolver={onExamSolver}
                            isFolderSelected={false}
                            onTogglePin={onTogglePin}
                            viewMode={localViewMode}
                        />
                    )}
                </div>

                {/* Right Column - Sidebar (1/3) */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <ExamQuickActions
                        exam={exam}
                        decks={decks}
                        onStudy={onStudy}
                        onStudyAll={handleStudyAll}
                        onMagicGenerate={handleMagicGenerateForExam}
                        onExamSolver={handleExamSolver}
                        onReactivate={() => onReactivateExam?.(exam.id)}
                        onComplete={onCompleteExam}
                        onDeleteExam={() => onDeleteExam?.(exam.id)}
                    />

                    {/* Card Distribution */}
                    <CardDistributionChart
                        distribution={{
                            new: stats.newCards,
                            learning: stats.learningCards,
                            review: stats.reviewCards,
                            mastered: stats.masteredCards,
                        }}
                        totalCards={stats.totalCards}
                    />

                    {/* Folders List (if any) */}
                    {stats.foldersCount > 0 && (
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-4">
                                <FolderOpen className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm font-semibold text-white">Cartelle</h3>
                            </div>
                            <div className="space-y-2">
                                {Array.from(new Set(examDecks.filter(d => d.folderId).map(d => d.folderId)))
                                    .map(folderId => {
                                        const folder = folders.find(f => f.id === folderId);
                                        const count = examDecks.filter(d => d.folderId === folderId).length;
                                        if (!folder) return null;
                                        return (
                                            <button
                                                key={folderId}
                                                onClick={() => onViewFolder?.(folderId!)}
                                                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
                                            >
                                                <span className="text-sm text-white truncate">{folder.name}</span>
                                                <span className="text-xs text-white/50">{count} mazzi</span>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamDetailView;
