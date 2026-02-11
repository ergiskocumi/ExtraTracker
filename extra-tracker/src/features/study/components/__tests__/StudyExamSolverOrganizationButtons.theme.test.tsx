import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckConfigForm } from '../Modals/ExamSolver/components/DeckConfigForm';
import { QuestionsPreview } from '../Modals/ExamSolver/QuestionsPreview';
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
