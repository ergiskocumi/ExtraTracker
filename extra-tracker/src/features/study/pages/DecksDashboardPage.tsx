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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
import { ExamCompletionModal } from '../components/Exams/ExamCompletionModal';
import type { ViewMode } from '../components/ViewToggle/ViewToggle';
import type { Exam, ExamOutcome } from '../types/exam';
import examService from '../services/examService';
import { studyService } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const location = useLocation();
    // Organization state
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [viewType, setViewType] = useState<ViewType>('exams'); // Mostra esami per default
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [examsRefreshKey, setExamsRefreshKey] = useState(0); // Key per forzare refresh ExamsView
    const [exams, setExams] = useState<Exam[]>([]); // Esami caricati
    const [showCompletionModal, setShowCompletionModal] = useState(false);

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

    // Carica esami
    const loadExams = useCallback(async () => {
        try {
            const allExams = await examService.getAll();
            setExams(allExams);
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

    // Exam Completion Handlers
    const handleCompleteExam = useCallback(async (examId: string, outcome: ExamOutcome, status: 'passed' | 'failed') => {
        try {
            const newStatus = status === 'passed' ? 'passed' : 'failed';
            
            console.log('[DecksDashboardPage] handleCompleteExam chiamato:', { examId, status: newStatus, outcome });
            
            // Prepara outcome per il backend (converte date string in Date se necessario)
            const outcomeForBackend = {
                ...outcome,
                date: outcome.date ? new Date(outcome.date).toISOString() : new Date().toISOString(),
            };
            
            console.log('[DecksDashboardPage] Aggiornando esame con status:', newStatus);
            await examService.update(examId, {
                status: newStatus,
                outcome: outcomeForBackend, // Invia outcome al backend
            });
            
            console.log('[DecksDashboardPage] Esame aggiornato con successo');
            
            // Aggiorna lo stato locale
            if (selectedExam) {
                setSelectedExam({ ...selectedExam, status: newStatus, outcome });
            }
            
            // Refresh esami e deck per aggiornare le statistiche
            setExamsRefreshKey(prev => prev + 1);
            await Promise.all([
                loadExams(),
                loadDecks(), // Ricarica i deck per aggiornare le statistiche
            ]);
            
            console.log('[DecksDashboardPage] Refresh completato');
        } catch (err: any) {
            console.error('[DecksDashboardPage] Errore nel completamento esame:', err);
            throw new Error(err.message || 'Errore nel completamento dell\'esame');
        }
    }, [selectedExam, loadExams, loadDecks]);

    const handleResetCards = useCallback(async (examId: string, type: 'all' | 'hard-only') => {
        try {
            console.log('[DecksDashboardPage] handleResetCards chiamato:', { examId, type });
            
            const examDecks = decks.filter(d => d.examId === examId);
            
            if (examDecks.length === 0) {
                console.warn('[DecksDashboardPage] Nessun mazzo trovato per esame:', examId);
                emitToast.warning('Nessun mazzo trovato per questo esame');
                return;
            }

            console.log('[DecksDashboardPage] Trovati', examDecks.length, 'mazzi per l\'esame');
            console.log('[DecksDashboardPage] Chiamando studyService.resetExamCards...');
            
            // Chiama l'API per resettare le carte
            const result = await studyService.resetExamCards(examId, type);
            
            console.log('[DecksDashboardPage] Reset completato:', result);
            
            emitToast.success(
                type === 'all' 
                    ? `Reset completato: ${result.cardsReset} carte resettate in ${result.decksAffected} mazzo/i`
                    : `Reset mirato completato: ${result.cardsReset} carte difficili resettate in ${result.decksAffected} mazzo/i`,
                {
                    title: 'Reset completato',
                    duration: 3000
                }
            );
            
            // Refresh decks per mostrare le modifiche
            await loadDecks();
        } catch (err: any) {
            console.error('[DecksDashboardPage] Errore nel reset:', err);
            emitToast.error(err.message || 'Errore nel reset delle carte', {
                title: 'Errore',
                duration: 4000
            });
            throw new Error(err.message || 'Errore nel reset delle carte');
        }
    }, [decks, loadDecks]);

    const handleReactivateExam = useCallback(async (examId: string) => {
        try {
            console.log('[DecksDashboardPage] handleReactivateExam chiamato:', { examId });
            
            // Riattiva l'esame cambiando lo status a 'active' e resettando l'outcome
            await examService.update(examId, {
                status: 'active',
                outcome: null, // Reset outcome quando si riattiva
            });
            
            console.log('[DecksDashboardPage] Esame riattivato con successo');
            
            emitToast.success('Esame riattivato! Ora puoi continuare a studiare.', {
                title: 'Esame riattivato',
                duration: 3000
            });
            
            // Refresh esami e deck
            setExamsRefreshKey(prev => prev + 1);
            await Promise.all([
                loadExams(),
                loadDecks(),
            ]);
            
            // Se l'esame era selezionato, aggiorna lo stato locale
            if (selectedExam && selectedExam.id === examId) {
                const allExams = await examService.getAll();
                const updatedExam = allExams.find((g: Exam) => g.id === examId);
                if (updatedExam) {
                    setSelectedExam(updatedExam);
                }
            }
        } catch (err: any) {
            console.error('[DecksDashboardPage] Errore nella riattivazione esame:', err);
            emitToast.error(err.message || 'Errore nella riattivazione dell\'esame', {
                title: 'Errore',
                duration: 4000
            });
        }
    }, [loadExams, loadDecks, selectedExam]);

    const handleGenerateAIQuestions = useCallback(async (examId: string, topics: string[]) => {
        try {
            console.log('[DecksDashboardPage] handleGenerateAIQuestions chiamato:', { examId, topics });
            
            const examDecks = decks.filter(d => d.examId === examId);
            
            if (examDecks.length === 0) {
                console.warn('[DecksDashboardPage] Nessun mazzo trovato per esame:', examId);
                emitToast.warning('Nessun mazzo trovato per questo esame');
                return;
            }

            console.log('[DecksDashboardPage] Trovati', examDecks.length, 'mazzi per l\'esame');
            console.log('[DecksDashboardPage] Chiamando studyService.generateRecoveryQuestions...');
            
            // Chiama l'API per generare domande AI
            const result = await studyService.generateRecoveryQuestions(examId, topics);
            
            console.log('[DecksDashboardPage] Generazione completata:', result);
            
            if (result.totalGenerated === 0) {
                emitToast.warning('Nessuna domanda generata. Potrebbe essere necessario caricare un PDF nei mazzi per fornire contesto all\'AI.');
                return;
            }

            emitToast.success(
                `Generazione completata: ${result.totalGenerated} nuove domande aggiunte in ${result.decksAffected} mazzo/i`,
                {
                    title: 'Domande AI generate',
                    duration: 4000
                }
            );
            
            // Refresh decks per mostrare le nuove carte
            await loadDecks();
        } catch (err: any) {
            console.error('[DecksDashboardPage] Errore nella generazione AI:', err);
            emitToast.error(err.message || 'Errore nella generazione delle domande AI', {
                title: 'Errore',
                duration: 4000
            });
            throw new Error(err.message || 'Errore nella generazione delle domande AI');
        }
    }, [decks, loadDecks]);

    // Calcola IDs degli esami completati (passed/failed/archived)
    const completedExamIds = useMemo(() => {
        return exams
            .filter(exam => 
                exam.status === 'passed' || 
                exam.status === 'failed' || 
                exam.status === 'archived' || 
                exam.status === 'completed'
            )
            .map(exam => exam.id);
    }, [exams]);

    // Calcola numero esami completati
    const completedExamsCount = useMemo(() => {
        return exams.filter(exam => 
            exam.status === 'passed' || 
            exam.status === 'failed' || 
            exam.status === 'archived' || 
            exam.status === 'completed'
        ).length;
    }, [exams]);

    // Calcola dueCardCount escludendo le carte degli esami completati
    const activeDueCardCount = useMemo(() => {
        // Filtra i deck degli esami completati
        const activeDecks = decks.filter(deck => 
            !deck.examId || !completedExamIds.includes(deck.examId)
        );
        // Calcola il totale delle carte da ripassare solo per i deck attivi
        return activeDecks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);
    }, [decks, completedExamIds]);

    // Calculations
    const {
        folderStats,
        todayPriorityDecks,
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
        completedExamIds, // Passa gli IDs degli esami completati
    });

    // Organized Decks (per sezioni) - escludi deck degli esami completati
    const activeDecksForOrganization = useMemo(() => {
        return decks.filter(deck => 
            !deck.examId || !completedExamIds.includes(deck.examId)
        );
    }, [decks, completedExamIds]);
    const organizedDecks = useOrganizedDecks(activeDecksForOrganization, folders);

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
            const allExams = await examService.getAll();
            const exam = allExams.find((g: Exam) => g.id === examId);
            if (exam) {
                setSelectedExam(exam);
                setSelectedExamId(examId);
                setSelectedFolderId(null); // Reset cartella quando si seleziona un esame
            }
        } catch (err) {
            console.error('Errore nel caricamento dell\'esame:', err);
        }
    };

    const hasAppliedExamState = useRef(false);
    const examIdFromState = (location.state as { examId?: string } | null)?.examId ?? null;

    useEffect(() => {
        if (hasAppliedExamState.current) return;
        if (examIdFromState) {
            handleExamSelect(examIdFromState);
        }
        hasAppliedExamState.current = true;
    }, [examIdFromState, handleExamSelect]);

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
            onExamSolver={() => handlers.handleExamSolver()}
            onCreateExam={() => handlers.setIsCreateModalOpen(true)}
            selectedExamName={selectedExam?.title || null}
            onBackToExams={() => {
                setSelectedExamId(null);
                setSelectedExam(null);
            }}
            onCompleteExam={() => setShowCompletionModal(true)}
        >
            {/* Hero Stats + Stato Mentale - Nascosti quando una cartella o un esame è selezionato */}
            {!isLoading && decks.length > 0 && !selectedFolderId && !selectedExamId && (
                <>
                    <DashboardHero
                        totalDecks={decks.filter(d => !d.examId || !completedExamIds.includes(d.examId)).length}
                        totalCards={totalCards}
                        dueCards={activeDueCardCount}
                        masteredDecks={completedExamsCount}
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
                    dueCardCount={activeDueCardCount}
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
                                dueCount={decks.filter(d => !d.examId || !completedExamIds.includes(d.examId)).filter(d => (d.dueCount ?? 0) > 0).length}
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
                    onExamSolver={handlers.handleExamSolver}
                    onViewFolder={handleFolderSelect}
                    onTogglePin={handlers.handleTogglePin}
                    viewMode={viewMode === 'list' ? 'grid' : viewMode === 'compact' ? 'compact' : 'grid'}
                />
            ) : !isLoading && viewType === 'exams' && !selectedFolderId && filter === 'all' && searchQuery === '' && selectedTags.length === 0 ? (
                <ExamsView
                    key={examsRefreshKey} // Force re-render quando cambia
                    decks={decks}
                    tags={tags}
                    onCreateExam={() => handlers.setIsCreateModalOpen(true)}
                    onExamClick={async (examId) => {
                        try {
                            const allExams = await examService.getAll();
                            const exam = allExams.find((g: Exam) => g.id === examId);
                            if (exam) {
                                setSelectedExam(exam);
                                setSelectedExamId(examId);
                            }
                        } catch (err) {
                            console.error('Errore nel caricamento dell\'esame:', err);
                        }
                    }}
                    onReactivateExam={handleReactivateExam}
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
                    onExamSolver={handlers.handleExamSolver}
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
                    onExamSolver={handlers.handleExamSolver}
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
                    onExamSolver={handlers.handleExamSolver}
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
