import React, { lazy, Suspense } from 'react';
import type { ExamSolverStats } from '../Modals/ExamSolver';
import type { StudyStartConfig } from '../Modals/StudyModeSelector';
import type { Deck, CreateDeckPayload, AddCardPayload } from '../../services/studyService';

const CreateDeckModal = lazy(() => import('../Modals/CreateDeckModal').then(m => ({ default: m.CreateDeckModal })));
const CreateExamOnlyModal = lazy(() => import('../Modals/CreateExamOnlyModal').then(m => ({ default: m.CreateExamOnlyModal })));
const AddCardModal = lazy(() => import('../AddCardModal').then(m => ({ default: m.AddCardModal })));
const MagicGenerateModal = lazy(() => import('../Modals/MagicGenerateModal').then(m => ({ default: m.MagicGenerateModal })));
const ExamSolverModal = lazy(() => import('../Modals/ExamSolver').then(m => ({ default: m.ExamSolverModal })));
const StudyModeSelector = lazy(() => import('../Modals/StudyModeSelector').then(m => ({ default: m.StudyModeSelector })));
const ConfirmationModal = lazy(() => import('../../../../shared/components/ConfirmationModal').then(m => ({ default: m.ConfirmationModal })));

interface DashboardModalsProps {
    // Create Exam Only Modal (da /study senza esame selezionato)
    isCreateExamModalOpen: boolean;
    onCreateExamModalClose: () => void;
    onExamOnlyCreated?: () => void;

    // Create Deck/Chapter Modal (con esame pre-selezionato o flusso completo)
    isCreateModalOpen: boolean;
    onCreateModalClose: () => void;
    onCreateDeck: (data: CreateDeckPayload) => Promise<void>;
    onExamCreated?: () => void;
    /** Esame già selezionato: mostra solo il form capitolo, salta Step 1 */
    presetExamId?: string;

    // Add Card Modal
    isAddCardModalOpen: boolean;
    selectedDeck: Deck | null;
    onAddCardModalClose: () => void;
    onSubmitCard: (deckId: string, data: AddCardPayload) => Promise<void>;

    // Magic Generate Modal
    isMagicGenerateOpen: boolean;
    onMagicGenerateClose: () => void;
    onMagicGenerateSuccess: (count: number) => Promise<void>;

    // Exam Solver Modal
    isExamSolverOpen: boolean;
    examSolverDeckId: string | null;
    onExamSolverClose: () => void;
    onExamSolverSuccess: (deckId: string, stats: ExamSolverStats) => Promise<void>;
    existingDecks?: Array<{ id: string; title: string }>;
    examId?: string;

    // Study Mode Selector
    isStudyModeOpen: boolean;
    studyDeck: Deck | null;
    onStudyModeClose: () => void;
    onStartSession: (config: StudyStartConfig) => void;

    // Delete Confirmation Modal
    deletingDeck: Deck | null;
    onDeleteConfirm: () => Promise<void>;
    onDeleteCancel: () => void;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
    isCreateExamModalOpen,
    onCreateExamModalClose,
    onExamOnlyCreated,
    isCreateModalOpen,
    onCreateModalClose,
    onCreateDeck,
    onExamCreated,
    presetExamId,
    isAddCardModalOpen,
    selectedDeck,
    onAddCardModalClose,
    onSubmitCard,
    isMagicGenerateOpen,
    onMagicGenerateClose,
    onMagicGenerateSuccess,
    isExamSolverOpen,
    examSolverDeckId,
    onExamSolverClose,
    onExamSolverSuccess,
    existingDecks = [],
    examId,
    isStudyModeOpen,
    studyDeck,
    onStudyModeClose,
    onStartSession,
    deletingDeck,
    onDeleteConfirm,
    onDeleteCancel,
}) => {
    return (
        <>
            {/* Modale esame-only: da /study senza esame selezionato */}
            <Suspense fallback={null}>
                <CreateExamOnlyModal
                    isOpen={isCreateExamModalOpen}
                    onClose={onCreateExamModalClose}
                    onSuccess={onExamOnlyCreated}
                />
            </Suspense>

            {/* Modale capitolo: con presetExamId salta Step 1; senza, flusso completo */}
            <Suspense fallback={null}>
                <CreateDeckModal
                    isOpen={isCreateModalOpen}
                    onClose={onCreateModalClose}
                    onSubmit={onCreateDeck}
                    onExamCreated={onExamCreated}
                    presetExamId={presetExamId}
                />
            </Suspense>

            <Suspense fallback={null}>
                <AddCardModal
                    isOpen={isAddCardModalOpen}
                    deckId={selectedDeck?.id ?? null}
                    deckTitle={selectedDeck?.title ?? ''}
                    onClose={onAddCardModalClose}
                    onSubmit={onSubmitCard}
                />
            </Suspense>

            <Suspense fallback={null}>
                <MagicGenerateModal
                    isOpen={isMagicGenerateOpen}
                    deckId={selectedDeck?.id ?? ''}
                    deckTitle={selectedDeck?.title ?? ''}
                    onClose={onMagicGenerateClose}
                    onSuccess={onMagicGenerateSuccess}
                />
            </Suspense>

            <Suspense fallback={null}>
                <ExamSolverModal
                    isOpen={isExamSolverOpen}
                    onClose={onExamSolverClose}
                    onSuccess={onExamSolverSuccess}
                    existingDecks={existingDecks}
                    examId={examId}
                    preselectedDeckId={examSolverDeckId || undefined}
                />
            </Suspense>

            <Suspense fallback={null}>
                <StudyModeSelector
                    isOpen={isStudyModeOpen}
                    deckTitle={studyDeck?.title}
                    onClose={onStudyModeClose}
                    onStart={onStartSession}
                />
            </Suspense>

            <Suspense fallback={null}>
                <ConfirmationModal
                    isOpen={!!deletingDeck}
                    title="Elimina Mazzo"
                    description={`Sei sicuro di voler eliminare "${deletingDeck?.title}"? Tutte le carte verranno eliminate.`}
                    confirmLabel="Elimina"
                    destructive
                    onConfirm={onDeleteConfirm}
                    onCancel={onDeleteCancel}
                />
            </Suspense>
        </>
    );
};
