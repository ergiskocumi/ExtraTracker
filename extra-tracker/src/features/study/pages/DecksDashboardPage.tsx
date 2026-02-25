/**
 * DECKS DASHBOARD PAGE - Exam-Centric con Calendario Settimanale
 *
 * Vista principale: WeeklyCalendar (fulcro) + ExamGrid
 * Dettaglio esame: ExamDetailView (invariato)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, GraduationCap, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardCalculations } from '../hooks/useDashboardCalculations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDeckHandlers } from '../hooks/useDeckHandlers';
import { useExams } from '../hooks/useExams';
import { useScrollToTop } from '../../../shared/hooks/useScrollToTop';
import { DashboardLayout } from '../components/DashboardLayout';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { ExamGrid } from '../components/ExamGrid';
import { ExamDetailView } from '../components/Exams/ExamDetailView';
import { DashboardModals } from '../components/DashboardModals';
import { ExamCompletionModal } from '../components/Exams/ExamCompletionModal';
import { DragDropZone } from '../components/DeckSections/DragDropZone';
import type { Exam } from '../types/exam';
import examService from '../services/examService';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const location = useLocation();

    // Core state
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);

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
    }, []);

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
                    viewMode="grid"
                />
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

            {/* Exam Completion Modal */}
            {selectedExam && (
                <ExamCompletionModal
                    isOpen={showCompletionModal}
                    exam={selectedExam}
                    onClose={() => setShowCompletionModal(false)}
                    onComplete={handleCompleteExam}
                    onResetCards={handleResetCards}
                    onGenerateAIQuestions={handleGenerateAIQuestions}
                />
            )}
        </DashboardLayout>
    );
};

export default DecksDashboardPage;
