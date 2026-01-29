import React from 'react';
import { CreateDeckModal } from '../Modals/CreateDeckModal';
import { AddCardModal } from '../AddCardModal';
import { MagicGenerateModal } from '../Modals/MagicGenerateModal';
import { ExamSolverModal, type ExamSolverStats } from '../Modals/ExamSolver';
import { StudyModeSelector, type StudyStartConfig } from '../Modals/StudyModeSelector';
import { ConfirmationModal } from '../../../../shared/components/ConfirmationModal';
import type { Deck, CreateDeckPayload, AddCardPayload } from '../../services/studyService';

interface DashboardModalsProps {
    // Create Deck Modal
    isCreateModalOpen: boolean;
    onCreateModalClose: () => void;
    onCreateDeck: (data: CreateDeckPayload) => Promise<void>;
    onExamCreated?: () => void; // Callback quando viene creato un nuovo esame

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
    isCreateModalOpen,
    onCreateModalClose,
    onCreateDeck,
    onExamCreated,
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
            <CreateDeckModal
                isOpen={isCreateModalOpen}
                onClose={onCreateModalClose}
                onSubmit={onCreateDeck}
                onExamCreated={onExamCreated}
            />

            <AddCardModal
                isOpen={isAddCardModalOpen}
                deckId={selectedDeck?.id ?? null}
                deckTitle={selectedDeck?.title ?? ''}
                onClose={onAddCardModalClose}
                onSubmit={onSubmitCard}
            />

            <MagicGenerateModal
                isOpen={isMagicGenerateOpen}
                deckId={selectedDeck?.id ?? ''}
                deckTitle={selectedDeck?.title ?? ''}
                onClose={onMagicGenerateClose}
                onSuccess={onMagicGenerateSuccess}
            />

            <ExamSolverModal
                isOpen={isExamSolverOpen}
                onClose={onExamSolverClose}
                onSuccess={onExamSolverSuccess}
                existingDecks={existingDecks}
                examId={examId}
                preselectedDeckId={examSolverDeckId || undefined}
            />

            <StudyModeSelector
                isOpen={isStudyModeOpen}
                deckTitle={studyDeck?.title}
                onClose={onStudyModeClose}
                onStart={onStartSession}
            />

            <ConfirmationModal
                isOpen={!!deletingDeck}
                title="Elimina Mazzo"
                description={`Sei sicuro di voler eliminare "${deletingDeck?.title}"? Tutte le carte verranno eliminate.`}
                confirmLabel="Elimina"
                destructive
                onConfirm={onDeleteConfirm}
                onCancel={onDeleteCancel}
            />
        </>
    );
};
