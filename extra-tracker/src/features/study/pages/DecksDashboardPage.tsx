/**
 * DECKS DASHBOARD PAGE - User-Friendly Redesign
 * 
 * Redesign completo con focus su UX:
 * - Card grandi e leggibili
 * - Azioni SEMPRE visibili (no hover-only)
 * - Pulsanti touch-friendly (min 44px)
 * - Mobile-first responsive design
 * - Visual hierarchy chiara
 */

import { useState, useEffect, useCallback } from 'react';
import { useDashboardCalculations, type FilterType } from '../hooks/useDashboardCalculations';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDeckHandlers } from '../hooks/useDeckHandlers';
import { useOrganizedDecks } from '../hooks/useOrganizedDecks';
import { useScrollToTop } from '../../../shared/hooks/useScrollToTop';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardHero } from '../components/DashboardHero';
import { TodayPlan } from '../components/TodayPlan';
import { FilterBar } from '../components/FilterBar';
import { DashboardContent } from '../components/DashboardContent';
import { DeckSections } from '../components/DeckSections/DeckSections';
import { DragDropZone } from '../components/DeckSections/DragDropZone';
import { ExamsView } from '../components/Exams/ExamsView';
import { ExamDetailView } from '../components/Exams/ExamDetailView';
import { ExamDeckToggle, type ViewType } from '../components/ViewToggle/ExamDeckToggle';
import { DashboardModals } from '../components/DashboardModals';
import { HybridGoalWizard } from '../../goals/components/HybridGoalWizard';
import type { ViewMode } from '../components/ViewToggle/ViewToggle';
import type { Goal } from '../../goals/types';
import goalsService from '../../goals/services/goalsService';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    // Organization state
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [viewType, setViewType] = useState<ViewType>('exams'); // Mostra esami per default
    const [showCreateExamModal, setShowCreateExamModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Goal | null>(null);
    const [examsRefreshKey, setExamsRefreshKey] = useState(0); // Key per forzare refresh ExamsView
    const [exams, setExams] = useState<Goal[]>([]); // Esami caricati

    // Data loading
    const {
        decks,
        setDecks,
        dueCardCount,
        isLoading,
        error,
        folders,
        tags,
        loadDecks,
        loadFolders,
        refreshAll,
    } = useDashboardData();

    // Carica esami (goals con category='learning' e status='active')
    const loadExams = useCallback(async () => {
        try {
            const allGoals = await goalsService.getAll();
            const learningGoals = allGoals.filter(
                g => g.category === 'learning' && g.status === 'active'
            );
            setExams(learningGoals);
        } catch (err) {
            console.error('Errore nel caricamento degli esami:', err);
        }
    }, []);

    // Carica esami al mount e quando cambia examsRefreshKey
    useEffect(() => {
        loadExams();
    }, [loadExams, examsRefreshKey]);

    // Scroll to top when an exam is selected (non è un cambio di route, quindi serve hook specifico)
    useScrollToTop([selectedExamId]);

    // Calculations
    const {
        folderStats,
        todayPriorityDecks,
        calculateMentalState,
        filteredDecks,
        totalCards,
        masteredDecks,
    } = useDashboardCalculations({
        decks,
        folders,
        filter,
        searchQuery,
        selectedFolderId,
        selectedTags,
    });

    // Organized Decks (per sezioni)
    const organizedDecks = useOrganizedDecks(decks, folders);

    // Handlers
    const handlers = useDeckHandlers({
        decks,
        setDecks,
        loadDecks,
        loadFolders,
    });

    // Organization handlers
    const handleFolderSelect = (folderId: string | null) => {
        setSelectedFolderId(folderId);
        // Reset selezione esame quando si seleziona una cartella
        if (folderId !== null) {
            setSelectedExamId(null);
            setSelectedExam(null);
        }
    };

    // Handler per selezionare un esame dalla sidebar
    const handleExamSelect = async (examId: string | null) => {
        if (examId === null) {
            setSelectedExamId(null);
            setSelectedExam(null);
            setSelectedFolderId(null); // Reset cartella quando si deseleziona esame
            return;
        }

        try {
            // Carica l'esame completo
            const allGoals = await goalsService.getAll();
            const exam = allGoals.find((g: Goal) => g.id === examId);
            if (exam) {
                setSelectedExam(exam);
                setSelectedExamId(examId);
                setSelectedFolderId(null); // Reset cartella quando si seleziona un esame
            }
        } catch (err) {
            console.error('Errore nel caricamento dell\'esame:', err);
        }
    };

    const handleTagToggle = (tagName: string) => {
        setSelectedTags((prev: string[]) => {
            if (prev.includes(tagName)) {
                return prev.filter((t: string) => t !== tagName);
            } else {
                return [...prev, tagName];
            }
        });
    };

    const handleRefreshOrganization = async () => {
        await refreshAll();
        // Ricarica anche gli esami
        await loadExams();
    };

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
            onCreateExam={() => setShowCreateExamModal(true)}
            selectedExamName={selectedExam?.title || null}
            onBackToExams={() => {
                setSelectedExamId(null);
                setSelectedExam(null);
            }}
        >
            {/* Hero Stats + Stato Mentale - Nascosti quando una cartella o un esame è selezionato */}
            {!isLoading && decks.length > 0 && !selectedFolderId && !selectedExamId && (
                <>
                    <DashboardHero
                        totalDecks={decks.length}
                        totalCards={totalCards}
                        dueCards={dueCardCount}
                        masteredDecks={masteredDecks}
                        mentalState={calculateMentalState}
                    />
                    {/* Separatore */}
                    <div className="my-8 border-t border-white/10"></div>
                </>
            )}

            {/* Oggi: Cosa Devo Studiare - Nascosto quando una cartella è selezionata */}
            {/* TEMPORANEAMENTE NASCOSTO PER TEST */}
            {false && !isLoading && todayPriorityDecks.length > 0 && !selectedFolderId && (
                <TodayPlan
                    priorityDecks={todayPriorityDecks}
                    dueCardCount={dueCardCount}
                    onFilterChange={setFilter}
                    onStudy={handlers.handleStudy}
                    onViewDetail={handlers.handleViewDetail}
                />
            )}

            {/* View Toggle & Filter Bar */}
            {/* TEMPORANEAMENTE NASCOSTO PER TEST */}
            {false && !isLoading && !selectedFolderId && filter === 'all' && searchQuery === '' && selectedTags.length === 0 && (
                <div className="flex items-center justify-between mb-6">
                    <ExamDeckToggle
                        currentView={viewType}
                        onViewChange={setViewType}
                    />
                    {viewType === 'decks' && (
                        <div className="hidden sm:block">
                            <FilterBar
                                activeFilter={filter}
                                onFilterChange={setFilter}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                dueCount={decks.filter(d => (d.dueCount ?? 0) > 0).length}
                                viewMode={viewMode}
                                onViewModeChange={(view) => setViewMode(view as ViewMode)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Filter & Search - Solo per vista Mazzi quando ci sono filtri */}
            {!isLoading && decks.length > 0 && viewType === 'decks' && (selectedFolderId || filter !== 'all' || searchQuery !== '' || selectedTags.length > 0) && (
                <FilterBar
                    activeFilter={filter}
                    onFilterChange={setFilter}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    dueCount={decks.filter(d => (d.dueCount ?? 0) > 0).length}
                    viewMode={viewMode}
                    onViewModeChange={(view) => setViewMode(view as ViewMode)}
                />
            )}

            {/* ═══ CONTENT ═══ */}
            {/* Dettaglio Esame - Mostra sempre quando un esame è selezionato */}
            {!isLoading && selectedExamId && selectedExam ? (
                <ExamDetailView
                    exam={selectedExam}
                    decks={decks}
                    folders={folders}
                    tags={tags}
                    onBack={() => {
                        setSelectedExamId(null);
                        setSelectedExam(null);
                    }}
                    onStudy={handlers.handleStudy}
                    onRead={handlers.handleRead}
                    onMagicGenerate={handlers.handleMagicGenerate}
                    onAddCard={handlers.handleAddCard}
                    onViewDetail={handlers.handleViewDetail}
                    onDelete={handlers.setDeletingDeck}
                    onUpdate={(updated) => {
                        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                    onViewFolder={handleFolderSelect}
                    onTogglePin={handlers.handleTogglePin}
                    viewMode={viewMode === 'list' ? 'grid' : viewMode === 'compact' ? 'compact' : 'grid'}
                />
            ) : !isLoading && viewType === 'exams' && !selectedFolderId && filter === 'all' && searchQuery === '' && selectedTags.length === 0 ? (
                <ExamsView
                    key={examsRefreshKey} // Force re-render quando cambia
                    decks={decks}
                    tags={tags}
                    onCreateExam={() => setShowCreateExamModal(true)}
                    onExamClick={async (examId) => {
                        try {
                            const allGoals = await goalsService.getAll();
                            const exam = allGoals.find((g: Goal) => g.id === examId);
                            if (exam) {
                                setSelectedExam(exam);
                                setSelectedExamId(examId);
                            }
                        } catch (err) {
                            console.error('Errore nel caricamento dell\'esame:', err);
                        }
                    }}
                    onRefresh={() => {
                        // Trigger refresh chiamando la funzione esposta
                        if ((window as any).__refreshExams) {
                            (window as any).__refreshExams();
                        }
                    }}
                    onDeckUpdate={(updated) => {
                        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                    onViewDetail={handlers.handleViewDetail}
                    onStudy={handlers.handleStudy}
                    onRead={handlers.handleRead}
                    onMagicGenerate={handlers.handleMagicGenerate}
                    onAddCard={handlers.handleAddCard}
                    onDelete={handlers.setDeletingDeck}
                    onTogglePin={handlers.handleTogglePin}
                />
            ) : !isLoading && viewType === 'decks' && !selectedFolderId && filter === 'all' && searchQuery === '' && selectedTags.length === 0 ? (
                <DeckSections
                    organizedDecks={organizedDecks}
                    tags={tags}
                    viewMode={viewMode === 'list' ? 'grid' : viewMode === 'compact' ? 'compact' : 'grid'}
                    onStudy={handlers.handleStudy}
                    onRead={handlers.handleRead}
                    onMagicGenerate={handlers.handleMagicGenerate}
                    onAddCard={handlers.handleAddCard}
                    onViewDetail={handlers.handleViewDetail}
                    onDelete={handlers.setDeletingDeck}
                    onUpdate={(updated) => {
                        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                    onViewFolder={handleFolderSelect}
                    onTogglePin={handlers.handleTogglePin}
                />
            ) : (
                <DashboardContent
                    isLoading={isLoading}
                    error={error}
                    decks={decks}
                    filteredDecks={filteredDecks}
                    tags={tags}
                    filter={filter}
                    searchQuery={searchQuery}
                    onRetry={loadDecks}
                    onCreateDeck={() => handlers.setIsCreateModalOpen(true)}
                    onFilterReset={() => {
                        setFilter('all');
                        setSearchQuery('');
                    }}
                    onStudy={handlers.handleStudy}
                    onRead={handlers.handleRead}
                    onMagicGenerate={handlers.handleMagicGenerate}
                    onAddCard={handlers.handleAddCard}
                    onViewDetail={handlers.handleViewDetail}
                    onDelete={handlers.setDeletingDeck}
                    onUpdate={(updated) => {
                        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                    isFolderSelected={!!selectedFolderId}
                    onTogglePin={handlers.handleTogglePin}
                />
            )}

            {/* ═══ DRAG & DROP ZONE ═══ */}
            {!isLoading && decks.length > 0 && (
                <DragDropZone
                    folders={folders}
                    onDrop={handlers.handleDeckDrop}
                />
            )}

            {/* ═══ CREATE EXAM MODAL ═══ */}
            {showCreateExamModal && (
                <HybridGoalWizard
                    onClose={() => {
                        setShowCreateExamModal(false);
                        // Ricarica gli esami dopo la creazione
                        if (decks.length > 0) {
                            // Trigger refresh
                        }
                    }}
                />
            )}

            {/* ═══ MODALS ═══ */}
            <DashboardModals
                isCreateModalOpen={handlers.isCreateModalOpen}
                onCreateModalClose={() => handlers.setIsCreateModalOpen(false)}
                onCreateDeck={handlers.handleCreateDeck}
                onExamCreated={() => {
                    // Refresh automatico degli esami dopo la creazione
                    setExamsRefreshKey(prev => prev + 1);
                    loadExams(); // Ricarica esami
                    // Chiama anche la funzione di refresh se disponibile
                    setTimeout(() => {
                        if ((window as any).__refreshExams) {
                            (window as any).__refreshExams();
                        }
                    }, 500); // Piccolo delay per assicurarsi che il backend abbia salvato
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
        </DashboardLayout>
    );
};

export default DecksDashboardPage;
