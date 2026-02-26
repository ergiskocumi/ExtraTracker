import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExamQuickActions } from '../ExamQuickActions';
import type { Deck } from '../../../services/studyService';
import type { Exam } from '../../../types/exam';

const exam: Exam = {
    id: 'exam-1',
    title: 'Analisi 1',
    deadline: '2026-06-30T08:00:00.000Z',
    status: 'active',
};

const decks: Deck[] = [
    {
        id: 'deck-1',
        examId: 'exam-1',
        title: 'Limiti',
        tags: [],
        cards: [],
        totalCards: 20,
        dueCount: 6,
    },
];

describe('ExamQuickActions delete exam action', () => {
    it('renders delete action only when callback is provided', () => {
        const { rerender } = render(
            <ExamQuickActions
                exam={exam}
                decks={decks}
                onStudy={vi.fn()}
                onDeleteExam={vi.fn()}
            />,
        );

        const deleteButton = screen.getByRole('button', { name: /Elimina Esame/i });
        expect(deleteButton).toHaveClass('exam-quick-action--danger');

        rerender(
            <ExamQuickActions
                exam={exam}
                decks={decks}
                onStudy={vi.fn()}
            />,
        );

        expect(screen.queryByRole('button', { name: /Elimina Esame/i })).not.toBeInTheDocument();
    });

    it('calls delete callback when action is clicked', () => {
        const onDeleteExam = vi.fn();

        render(
            <ExamQuickActions
                exam={exam}
                decks={decks}
                onStudy={vi.fn()}
                onDeleteExam={onDeleteExam}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Elimina Esame/i }));

        expect(onDeleteExam).toHaveBeenCalledTimes(1);
    });
});

