/**
 * DECKS DASHBOARD PAGE - Exam-Centric con Calendario Settimanale
 *
 * Vista principale: WeeklyCalendar (fulcro) + ExamGrid
 * Dettaglio esame: ExamDetailView (invariato)
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, GraduationCap, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardCalculations } from '../hooks/useDashboardCalculations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDeckHandlers } from '../hooks/useDeckHandlers';
import { useExams } from '../hooks/useExams';
import { useExamDeletion } from '../hooks/useExamDeletion';
import { useScrollToTop } from '../../../shared/hooks/useScrollToTop';
import { DashboardLayout } from '../components/DashboardLayout';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { ExamGrid } from '../components/ExamGrid';
import { DashboardModals } from '../components/DashboardModals';

const ExamDetailView = lazy(() => import('../components/Exams/ExamDetailView').then(m => ({ default: m.ExamDetailView })));
const ExamCompletionModal = lazy(() => import('../components/Exams/ExamCompletionModal').then(m => ({ default: m.ExamCompletionModal })));
import { DragDropZone } from '../components/DeckSections/DragDropZone';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import type { Exam } from '../types/exam';
import examService from '../services/examService';
import { studyService, type ExamSavedQuiz } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Core state
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
    const [examIdRequestedDeleteFromGrid, setExamIdRequestedDeleteFromGrid] = useState<string | null>(null);
    const [isDeletingFromGrid, setIsDeletingFromGrid] = useState(false);
    const [savedExamQuizzes, setSavedExamQuizzes] = useState<ExamSavedQuiz[]>([]);
    const [isLoadingSavedExamQuizzes, setIsLoadingSavedExamQuizzes] = useState(false);

    // Sidebar organization state (kept for DashboardLayout compatibility)
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Data loading
    const {
        decks,
        setDecks,
        isLoading,
        folders,
        tags,
        loadDecks,
        loadFolders,
        refreshAll,
    } = useDashboardData();

    // Exams hook (replaces inline exam logic)
    const {
        exams,
        completedExamIds,
        loadExams,
        refreshExams,
        handleCompleteExam,
        handleResetCards,
        handleReactivateExam,
        handleDeleteExam,
        handleGenerateAIQuestions,
        getExamStats,
    } = useExams({ decks, loadDecks });

    // Calculations
    const {
        folderStats,
        weeklyStudyPlan,
    } = useDashboardCalculations({
        decks,
        folders,
        filter: 'all',
        searchQuery: '',
        selectedFolderId: null,
        selectedTags: [],
        completedExamIds,
    });

    // Handlers
    const handlers = useDeckHandlers({
        decks,
        setDecks,
        loadDecks,
        loadFolders,
    });

    // Scroll to top when exam selected
    useScrollToTop([selectedExamId]);

    // ========== EXAM SELECTION ==========
    // IMPORTANTE: Definito PRIMA del useEffect che lo usa per evitare hoisting error

    const handleExamSelect = useCallback(async (examId: string | null) => {
        if (examId === null) {
            setSelectedExamId(null);
            setSelectedExam(null);
            setSelectedFolderId(null);
            setSavedExamQuizzes([]);
            return;
        }

        try {
            const allExams = await examService.getAll();
            const exam = allExams.find((g: Exam) => g.id === examId);
            if (exam) {
                setSelectedExam(exam);
                setSelectedExamId(examId);
                setSelectedFolderId(null);
            }
        } catch (err) {
            console.error('Errore nel caricamento dell\'esame:', err);
        }
    }, []);

    // Leggi parametro exam dall'URL (per tornare indietro dal deck detail)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const examIdFromUrl = params.get('exam');
        if (examIdFromUrl && !selectedExamId) {
            handleExamSelect(examIdFromUrl);
        }
    }, [location.search, handleExamSelect, selectedExamId]);

    // Exam from ExamGrid or WeeklyCalendar -> DayDetail
    const handleExamClick = useCallback(async (examId: string) => {
        await handleExamSelect(examId);
    }, [handleExamSelect]);

    // Apply exam from route state (navigating from another page)
    const hasAppliedExamState = useRef(false);
    const examIdFromState = (location.state as { examId?: string } | null)?.examId ?? null;

    useEffect(() => {
        if (hasAppliedExamState.current) return;
        if (examIdFromState) {
            handleExamSelect(examIdFromState);
        }
        hasAppliedExamState.current = true;
    }, [examIdFromState, handleExamSelect]);

    // ========== ORGANIZATION HANDLERS ==========

    const handleFolderSelect = useCallback((folderId: string | null) => {
        setSelectedFolderId(folderId);
        if (folderId !== null) {
            setSelectedExamId(null);
            setSelectedExam(null);
        }
    }, []);

    const handleTagToggle = useCallback((tagName: string) => {
        setSelectedTags(prev =>
            prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName],
        );
    }, []);

    const handleRefreshOrganization = useCallback(async () => {
        await refreshAll();
        await loadExams();
    }, [refreshAll, loadExams]);

    const handleBackToExams = useCallback(() => {
        setSelectedExamId(null);
        setSelectedExam(null);
        setSelectedDayIndex(null);
        setSavedExamQuizzes([]);
        navigate('/study', { replace: true });
    }, [navigate]);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;

        if (!selectedExamId) {
            setSavedExamQuizzes([]);
            setIsLoadingSavedExamQuizzes(false);
            return;
        }

        const loadSavedExamQuizzes = async () => {
            setIsLoadingSavedExamQuizzes(true);
            try {
                const quizzes = await studyService.getExamSavedQuizzes(selectedExamId);
                if (mountedRef.current) {
                    setSavedExamQuizzes(quizzes);
                }
            } catch (err) {
                console.error('Errore nel caricamento dei quiz salvati:', err);
                if (mountedRef.current) {
                    setSavedExamQuizzes([]);
                }
            } finally {
                if (mountedRef.current) {
                    setIsLoadingSavedExamQuizzes(false);
                }
            }
        };

        loadSavedExamQuizzes();

        return () => {
            mountedRef.current = false;
        };
    }, [selectedExamId]);

    const handleReplaySavedQuiz = useCallback(async (quiz: ExamSavedQuiz) => {
        if (!quiz.deckId || !Array.isArray(quiz.sourceCardIds) || quiz.sourceCardIds.length === 0) {
            emitToast.info('Questo quiz non è più disponibile');
            return;
        }

        if (quiz.hasQuestions) {
            try {
                const retakeData = await studyService.retakeSavedQuiz(quiz.deckId, quiz.id, {
                    mode: 'full',
                    targetCount: Math.max(quiz.questionCount || 0, 1),
                });

                if (retakeData.cards.length === 0) {
                    emitToast.info('Nessuna domanda disponibile per questo quiz');
                    return;
                }

                const preparedSession = retakeData.session ?? {
                    deck: {
                        id: quiz.deckId,
                        examId: quiz.examId ?? undefined,
                        title: quiz.deckTitle,
                        tags: [],
                        cards: retakeData.cards,
                        totalCards: retakeData.cards.length,
                        dueCount: retakeData.cards.length,
                        savedQuizzes: [],
                    },
                    cards: retakeData.cards,
                    remaining: retakeData.cards.length,
                    total: retakeData.cards.length,
                    mode: 'quiz' as const,
                    meta: {
                        quizType: retakeData.quizType,
                        questionCount: retakeData.questionCount,
                        retakeStrategy: retakeData.strategy,
                    },
                };

                const params = new URLSearchParams();
                params.set('mode', 'quiz');
                params.set('focus', 'all');
                params.set('questions', String(retakeData.questionCount));
                params.set('quizType', retakeData.quizType);
                params.set('sourceCardIds', retakeData.cards.map(card => card.id).join(','));
                params.set('quizSource', 'saved');
                params.set('savedQuizId', quiz.id);
                params.set('quizId', quiz.id);
                params.set('run', String(Date.now()));

                navigate(`/study/${quiz.deckId}/session?${params.toString()}`, {
                    state: {
                        preparedSession,
                        preparedAt: Date.now(),
                    },
                });
                return;
            } catch (_err) {
                emitToast.error('Errore nel caricamento del quiz');
                return;
            }
        }

        const params = new URLSearchParams();
        params.set('mode', 'quiz');
        params.set('focus', 'all');
        params.set('questions', String(Math.max(quiz.questionCount || 0, 1)));
        params.set('quizType', quiz.quizType);
        params.set('sourceCardIds', quiz.sourceCardIds.join(','));
        params.set('quizSource', 'saved');
        params.set('run', String(Date.now()));

        navigate(`/study/${quiz.deckId}/session?${params.toString()}`);
    }, [navigate]);

    const examDeletion = useExamDeletion({
        selectedExam,
        decks,
        onDeleteExam: handleDeleteExam,
        onDeleted: handleBackToExams,
    });

    const handleRequestDeleteFromGrid = useCallback((examId: string) => {
        setExamIdRequestedDeleteFromGrid(examId);
    }, []);

    const handleConfirmDeleteFromGrid = useCallback(async () => {
        if (!examIdRequestedDeleteFromGrid) return;
        setIsDeletingFromGrid(true);
        try {
            await handleDeleteExam(examIdRequestedDeleteFromGrid);
            setExamIdRequestedDeleteFromGrid(null);
        } finally {
            setIsDeletingFromGrid(false);
        }
    }, [examIdRequestedDeleteFromGrid, handleDeleteExam]);

    const handleCancelDeleteFromGrid = useCallback(() => {
        if (!isDeletingFromGrid) setExamIdRequestedDeleteFromGrid(null);
    }, [isDeletingFromGrid]);

    // ========== RENDER ==========

    return (
        <DashboardLayout
            isSidebarOpen={isSidebarOpen}
            onSidebarClose={() => setIsSidebarOpen(false)}
            onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
            folders={folders}
            tags={tags}
            exams={exams}
            decks={decks}
            selectedFolderId={selectedFolderId}
            selectedExamId={selectedExamId}
            selectedTags={selectedTags}
            folderStats={folderStats}
            onFolderSelect={handleFolderSelect}
            onExamSelect={handleExamSelect}
            onDeckClick={handlers.handleViewDetail}
            onTagToggle={handleTagToggle}
            onDeckDrop={handlers.handleDeckDrop}
            onRefresh={handleRefreshOrganization}
            onCreateDeck={() => setIsCreateExamModalOpen(true)}
            onExamSolver={() => handlers.handleExamSolver()}
            onCreateExam={() => setIsCreateExamModalOpen(true)}
            onCreateChapter={() => handlers.setIsCreateModalOpen(true)}
            selectedExamName={selectedExam?.title || null}
            onBackToExams={handleBackToExams}
            onCompleteExam={() => setShowCompletionModal(true)}
        >
            {/* Loading state */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
            ) : selectedExamId && selectedExam ? (
                /* ═══ EXAM DETAIL VIEW ═══ */
                <Suspense fallback={null}>
                    <ExamDetailView
                        exam={selectedExam}
                        decks={decks}
                        folders={folders}
                        tags={tags}
                        onBack={handleBackToExams}
                        onStudy={handlers.handleStudy}
                        onRead={handlers.handleRead}
                        onMagicGenerate={handlers.handleMagicGenerate}
                        onAddCard={handlers.handleAddCard}
                        onViewDetail={handlers.handleViewDetail}
                        onDelete={handlers.setDeletingDeck}
                        onUpdate={updated => {
                            setDecks(prev => prev.map(d => (d.id === updated.id ? updated : d)));
                        }}
                        onExamSolver={handlers.handleExamSolver}
                        onViewFolder={handleFolderSelect}
                        onTogglePin={handlers.handleTogglePin}
                        onReactivateExam={handleReactivateExam}
                        onCompleteExam={() => setShowCompletionModal(true)}
                        onDeleteExam={() => examDeletion.requestDelete()}
                        viewMode="grid"
                        savedQuizzes={savedExamQuizzes}
                        isLoadingSavedQuizzes={isLoadingSavedExamQuizzes}
                        onReplaySavedQuiz={handleReplaySavedQuiz}
                    />
                </Suspense>
            ) : !isLoading && exams.length === 0 ? (
                /* ═══ EMPTY STATE: nessun esame – messaggio chiaro e CTA ═══ */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
                >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-6">
                        <GraduationCap className="w-12 h-12 sm:w-14 sm:h-14 text-primary-500" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-3 sm:mb-4">
                        Nessun esame
                    </h2>
                    <p className="text-theme-secondary text-sm sm:text-base mb-8 sm:mb-10 max-w-md">
                        Crea il tuo primo esame per organizzare mazzi e ripassi. Da qui vedrai il calendario settimanale e la lista dei tuoi esami.
                    </p>
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsCreateExamModalOpen(true)}
                        className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white keep-light-text font-bold shadow-lg shadow-primary-500/25 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Crea il primo esame</span>
                    </motion.button>
                </motion.div>
            ) : (
                /* ═══ DEFAULT DASHBOARD: Calendar + ExamGrid ═══ */
                <div className="space-y-8">
                    {/* Weekly Calendar */}
                    <WeeklyCalendar
                        weeklyStudyPlan={weeklyStudyPlan}
                        exams={exams}
                        decks={decks}
                        selectedDayIndex={selectedDayIndex}
                        onDaySelect={setSelectedDayIndex}
                        onStudy={handlers.handleStudy}
                        onViewDetail={handlers.handleViewDetail}
                        onExamClick={handleExamClick}
                    />

                    {/* Exam Grid */}
                    <ExamGrid
                        exams={exams}
                        decks={decks}
                        onExamClick={handleExamClick}
                        getExamStats={getExamStats}
                        onRequestDeleteExam={handleRequestDeleteFromGrid}
                    />
                </div>
            )}

            {/* ═══ DRAG & DROP ZONE ═══ */}
            {!isLoading && decks.length > 0 && (
                <DragDropZone
                    folders={folders}
                    onDrop={handlers.handleDeckDrop}
                />
            )}

            {/* ═══ MODALS ═══ */}
            <DashboardModals
                isCreateExamModalOpen={isCreateExamModalOpen}
                onCreateExamModalClose={() => setIsCreateExamModalOpen(false)}
                onExamOnlyCreated={() => refreshExams()}
                isCreateModalOpen={handlers.isCreateModalOpen}
                onCreateModalClose={() => handlers.setIsCreateModalOpen(false)}
                onCreateDeck={handlers.handleCreateDeck}
                onExamCreated={() => {
                    refreshExams();
                }}
                presetExamId={selectedExamId ?? undefined}
                isAddCardModalOpen={handlers.isAddCardModalOpen}
                selectedDeck={handlers.selectedDeck}
                onAddCardModalClose={() => {
                    handlers.setIsAddCardModalOpen(false);
                    handlers.setSelectedDeck(null);
                }}
                onSubmitCard={handlers.handleSubmitCard}
                isMagicGenerateOpen={handlers.isMagicGenerateOpen}
                onMagicGenerateClose={() => {
                    handlers.setIsMagicGenerateOpen(false);
                    handlers.setSelectedDeck(null);
                }}
                onMagicGenerateSuccess={handlers.handleMagicGenerateSuccess}
                isExamSolverOpen={handlers.isExamSolverOpen}
                examSolverDeckId={handlers.examSolverDeckId}
                onExamSolverClose={() => {
                    handlers.setIsExamSolverOpen(false);
                    handlers.setExamSolverDeckId(null);
                }}
                onExamSolverSuccess={handlers.handleExamSolverSuccess}
                existingDecks={decks.map(d => ({ id: d.id, title: d.title }))}
                isStudyModeOpen={handlers.isStudyModeOpen}
                studyDeck={handlers.studyDeck}
                onStudyModeClose={() => {
                    handlers.setIsStudyModeOpen(false);
                    handlers.setStudyDeck(null);
                }}
                onStartSession={handlers.handleStartSession}
                deletingDeck={handlers.deletingDeck}
                onDeleteConfirm={handlers.handleDeleteDeck}
                onDeleteCancel={() => handlers.setDeletingDeck(null)}
            />

            <ConfirmationModal
                isOpen={examDeletion.isDeleteModalOpen}
                title="Elimina esame"
                description={
                    examDeletion.summary.deckCount > 0
                        ? `Sei sicuro di voler eliminare "${examDeletion.summary.examTitle}"? I ${examDeletion.summary.deckCount} ${examDeletion.summary.deckCount === 1 ? 'mazzo restera' : 'mazzi resteranno'} disponibili e verranno scollegati dall'esame (${examDeletion.summary.cardCount} flashcard coinvolte).`
                        : `Sei sicuro di voler eliminare "${examDeletion.summary.examTitle}"? L'azione e irreversibile.`
                }
                confirmLabel="Elimina"
                cancelLabel="Annulla"
                onConfirm={examDeletion.confirmDelete}
                onCancel={examDeletion.cancelDelete}
                isLoading={examDeletion.isDeleting}
                destructive
            />

            {/* Elimina esame dalla griglia (card hover) */}
            {(() => {
                const examToDelete = examIdRequestedDeleteFromGrid
                    ? exams.find(e => e.id === examIdRequestedDeleteFromGrid)
                    : null;
                const deckCount = examToDelete
                    ? decks.filter(d => d.examId === examToDelete.id).length
                    : 0;
                const cardCount = examToDelete
                    ? decks
                          .filter(d => d.examId === examToDelete.id)
                          .reduce((s, d) => s + (d.totalCards ?? d.cards?.length ?? 0), 0)
                    : 0;
                return (
                    <ConfirmationModal
                        isOpen={Boolean(examIdRequestedDeleteFromGrid)}
                        title="Elimina esame"
                        description={
                            examToDelete
                                ? deckCount > 0
                                    ? `Sei sicuro di voler eliminare "${examToDelete.title}"? I ${deckCount} ${deckCount === 1 ? 'mazzo restera' : 'mazzi resteranno'} disponibili e verranno scollegati dall'esame (${cardCount} flashcard coinvolte).`
                                    : `Sei sicuro di voler eliminare "${examToDelete.title}"? L'azione e irreversibile.`
                                : ''
                        }
                        confirmLabel="Elimina"
                        cancelLabel="Annulla"
                        onConfirm={handleConfirmDeleteFromGrid}
                        onCancel={handleCancelDeleteFromGrid}
                        isLoading={isDeletingFromGrid}
                        destructive
                    />
                );
            })()}

            {/* Exam Completion Modal */}
            {selectedExam && (
                <Suspense fallback={null}>
                    <ExamCompletionModal
                        isOpen={showCompletionModal}
                        exam={selectedExam}
                        onClose={() => setShowCompletionModal(false)}
                        onComplete={handleCompleteExam}
                        onResetCards={handleResetCards}
                        onGenerateAIQuestions={handleGenerateAIQuestions}
                    />
                </Suspense>
            )}
        </DashboardLayout>
    );
};

export default DecksDashboardPage;
