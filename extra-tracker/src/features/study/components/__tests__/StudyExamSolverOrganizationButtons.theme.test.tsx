import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckConfigForm } from '../Modals/ExamSolver/components/DeckConfigForm';
import { QuestionsPreview } from '../Modals/ExamSolver/QuestionsPreview';
import { ReviewAnswers } from '../Modals/ExamSolver/components/ReviewAnswers';
import { TagCloud } from '../Organization/TagCloud';
import { FolderTree } from '../Organization/FolderTree';
import { ExamTree } from '../Organization/ExamTree';
import type { Folder } from '../../services/foldersService';
import type { Deck } from '../../services/studyService';
import type { Exam } from '../../types/exam';

describe('Study exam solver and organization buttons theme contract', () => {
    it('uses semantic button variants in deck config form actions', () => {
        render(
            <DeckConfigForm
                deckMode="new"
                setDeckMode={vi.fn()}
                deckTitle="Mazzo test"
                setDeckTitle={vi.fn()}
                selectedDeckId=""
                setSelectedDeckId={vi.fn()}
                selectedExamId=""
                setSelectedExamId={vi.fn()}
                exams={[{ id: 'exam-1', title: 'Analisi 1' }]}
                isLoadingExams={false}
                existingDecks={[]}
                error={null}
                onBack={vi.fn()}
                onGenerate={vi.fn()}
                canGenerate={true}
            />
        );

        expect(screen.getByRole('button', { name: /Indietro/i })).toHaveClass('exam-solver-btn--neutral');
        expect(screen.getByRole('button', { name: /Genera Flashcard/i })).toHaveClass('exam-solver-btn--primary');
    });

    it('uses semantic variants in questions preview action buttons', () => {
        render(
            <QuestionsPreview
                questions={['Domanda 1', 'Domanda 2']}
                selectedIndices={new Set([0])}
                onSelectionChange={vi.fn()}
                onBack={vi.fn()}
                onNext={vi.fn()}
                error={null}
                isLoading={false}
            />
        );

        expect(screen.getByRole('button', { name: /Seleziona tutte/i })).toHaveClass('exam-solver-btn--ghost');
        expect(screen.getByRole('button', { name: /Inverti/i })).toHaveClass('exam-solver-btn--ghost');
        expect(screen.getByRole('button', { name: /Indietro/i })).toHaveClass('exam-solver-btn--neutral');
        expect(screen.getByRole('button', { name: /Continua/i })).toHaveClass('exam-solver-btn--primary');
    });

    it('uses semantic field and badge classes in exam solver forms', () => {
        const { container } = render(
            <DeckConfigForm
                deckMode="new"
                setDeckMode={vi.fn()}
                deckTitle="Mazzo test"
                setDeckTitle={vi.fn()}
                selectedDeckId=""
                setSelectedDeckId={vi.fn()}
                selectedExamId=""
                setSelectedExamId={vi.fn()}
                exams={[{ id: 'exam-1', title: 'Analisi 1' }]}
                isLoadingExams={false}
                existingDecks={[]}
                error={null}
                onBack={vi.fn()}
                onGenerate={vi.fn()}
                canGenerate={true}
            />
        );

        expect(screen.getByPlaceholderText(/Es: Esame Matematica/i)).toHaveClass('exam-solver-field');
        expect(screen.getByRole('combobox')).toHaveClass('exam-solver-field');

        render(
            <QuestionsPreview
                questions={['Domanda 1', 'Domanda 2']}
                selectedIndices={new Set([0])}
                onSelectionChange={vi.fn()}
                onBack={vi.fn()}
                onNext={vi.fn()}
                error={null}
                isLoading={false}
            />
        );

        expect(screen.getByPlaceholderText(/Cerca domande/i)).toHaveClass('exam-solver-field');
        const selectedBadge = screen.getByText(/1 di 2 selezionate/i).closest('div');
        expect(selectedBadge).toHaveClass('exam-solver-badge--warning');

        expect(container.querySelector('.exam-solver-field')).toBeInTheDocument();
    });

    it('uses semantic select and badge classes in review answers', () => {
        render(
            <ReviewAnswers
                flashcards={[
                    {
                        id: 'card-1',
                        front: 'Cos è una derivata?',
                        back: 'La derivata misura il tasso di variazione.',
                        found: true,
                        confidence: 95,
                    },
                    {
                        id: 'card-2',
                        front: 'Definisci il limite',
                        back: 'Il limite descrive il comportamento vicino a un punto.',
                        found: false,
                        confidence: 45,
                    },
                ]}
                deckId="deck-1"
                onEdit={vi.fn()}
                onRegenerate={vi.fn(async () => {})}
                onSave={vi.fn()}
                onBack={vi.fn()}
            />
        );

        expect(screen.getByRole('combobox')).toHaveClass('exam-solver-field--compact');
        expect(screen.getByText(/^Trovata$/i)).toHaveClass('exam-solver-badge--success');
        expect(screen.getByText(/^Non trovata$/i)).toHaveClass('exam-solver-badge--warning');
    });

    it('uses semantic organization button variants in tag creation flow', () => {
        render(
            <TagCloud
                tags={[]}
                selectedTags={[]}
                onTagToggle={vi.fn()}
                onRefresh={vi.fn()}
            />
        );

        const emptyStateButton = screen.getByRole('button', { name: /Crea il tuo primo tag/i });
        expect(emptyStateButton).toHaveClass('study-org-btn--text');

        fireEvent.click(emptyStateButton);
        expect(screen.getByRole('button', { name: /^Crea$/i })).toHaveClass('study-org-btn--create');
        expect(screen.getByRole('button', { name: /^Annulla$/i })).toHaveClass('study-org-btn--cancel');
        expect(screen.getByPlaceholderText(/Nome tag/i)).toHaveClass('study-org-field');
    });

    it('uses semantic organization badge classes in folder tree stats', () => {
        const folder: Folder = {
            id: 'folder-2',
            name: 'Ripasso',
            parentId: null,
            icon: 'folder',
            color: '#8b5cf6',
            order: 0,
            count: 2,
            children: [],
        };

        const stats = new Map([
            [
                'folder-2',
                {
                    totalCards: 20,
                    dueCards: 6,
                    masteryPercent: 35,
                    totalDecks: 2,
                },
            ],
        ]);

        const { container } = render(
            <FolderTree
                folders={[folder]}
                selectedFolderId={null}
                onFolderSelect={vi.fn()}
                onRefresh={vi.fn()}
                folderStats={stats}
            />
        );

        expect(container.querySelector('span.study-org-badge--count')).toBeInTheDocument();
        expect(container.querySelector('span.study-org-badge--due')).toBeInTheDocument();
    });

    it('uses semantic menu variants in folder tree contextual actions', () => {
        const folder: Folder = {
            id: 'folder-1',
            name: 'Cartella A',
            parentId: null,
            icon: 'folder',
            color: '#8b5cf6',
            order: 0,
            count: 3,
            children: [],
        };

        const { container } = render(
            <FolderTree
                folders={[folder]}
                selectedFolderId={null}
                onFolderSelect={vi.fn()}
                onRefresh={vi.fn()}
            />
        );

        const menuToggle = container.querySelector('button.study-org-btn--icon.opacity-0');
        expect(menuToggle).toBeInTheDocument();

        fireEvent.click(menuToggle as HTMLButtonElement);
        expect(screen.getByRole('button', { name: /Rinomina/i })).toHaveClass('study-org-btn--menu');
        expect(screen.getByRole('button', { name: /Elimina/i })).toHaveClass('study-org-btn--menu-danger');
    });

    it('uses semantic icon button variant for exam tree expand toggle', () => {
        const exam: Exam = {
            id: 'exam-1',
            title: 'Analisi 1',
            deadline: '2026-06-10T10:00:00.000Z',
            status: 'active',
        };

        const deck: Deck = {
            id: 'deck-1',
            examId: exam.id,
            title: 'Mazzo Analisi',
            tags: [],
            cards: [],
            totalCards: 10,
            dueCount: 4,
        };

        const { container } = render(
            <ExamTree
                exams={[exam]}
                decks={[deck]}
                selectedExamId={null}
                onExamSelect={vi.fn()}
                onDeckClick={vi.fn()}
            />
        );

        const toggleButton = container.querySelector('button.study-org-btn--icon');
        expect(toggleButton).toBeInTheDocument();
    });
});
