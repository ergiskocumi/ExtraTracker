/**
 * DECKS DASHBOARD PAGE - Exam-Centric con Calendario Settimanale
 *
 * Vista principale: WeeklyCalendar (fulcro) + ExamGrid
 * Dettaglio esame: ExamDetailView (invariato)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
            onCreateDeck={() => handlers.setIsCreateModalOpen(true)}
            onExamSolver={() => handlers.handleExamSolver()}
            onCreateExam={() => handlers.setIsCreateModalOpen(true)}
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
                isCreateModalOpen={handlers.isCreateModalOpen}
                onCreateModalClose={() => handlers.setIsCreateModalOpen(false)}
                onCreateDeck={handlers.handleCreateDeck}
                onExamCreated={() => {
                    refreshExams();
                }}
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
