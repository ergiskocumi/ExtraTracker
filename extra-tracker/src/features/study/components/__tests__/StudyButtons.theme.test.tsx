import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '../DashboardLayout/DashboardHeader';
import { DeckCardActions } from '../DeckCard/DeckCardActions';
import { ExamQuickActions } from '../Exams/ExamQuickActions';
import type { Deck } from '../../services/studyService';
import type { Exam } from '../../types/exam';

const baseDeck: Deck = {
    id: 'deck-1',
    title: 'Algebra',
    tags: [],
    cards: [],
    totalCards: 80,
    dueCount: 15,
};

const activeExam: Exam = {
    id: 'exam-1',
    title: 'CALCULUS 1',
    deadline: '2026-06-10T08:00:00.000Z',
    status: 'active',
};

describe('Study buttons theme contract', () => {
    it('renders semantic header action variants for exam controls', () => {
        render(
            <DashboardHeader
                onCreateDeck={vi.fn()}
                onExamSolver={vi.fn()}
                selectedExamName="CALCULUS 1"
                onBackToExams={vi.fn()}
                onCompleteExam={vi.fn()}
                selectedExamId="exam-1"
            />
        );

        expect(screen.getByRole('button', { name: /Concludi Esame/i })).toHaveClass('exam-header-btn--complete');
        expect(screen.getByRole('button', { name: /Risolvi Esame/i })).toHaveClass('exam-header-btn--solver');
        expect(screen.getByRole('button', { name: /Nuovo Capitolo/i })).toHaveClass('exam-header-btn--new');
    });

    it('renders focus mode button with semantic primary class', () => {
        render(
            <DeckCardActions
                deck={{ ...baseDeck, pdfUrl: '/docs/math.pdf' }}
                totalCards={80}
                hasDueCards={true}
                hasPdf={true}
                onStudy={vi.fn()}
                onRead={vi.fn()}
                onMagicGenerate={vi.fn()}
                onAddCard={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: /Focus & Flow/i })).toHaveClass('study-deck-primary-btn--focus');
        expect(screen.getByRole('button', { name: /^Ripassa$/i })).toHaveClass('study-deck-secondary-btn--compact');
    });

    it('renders review buttons without hardcoded variant classes in deck action fallback', () => {
        render(
            <DeckCardActions
                deck={baseDeck}
                totalCards={80}
                hasDueCards={true}
                hasPdf={false}
                onStudy={vi.fn()}
                onRead={vi.fn()}
                onMagicGenerate={vi.fn()}
                onAddCard={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: /Ripassa Ora/i })).toHaveClass('study-deck-primary-btn--review-urgent');
        expect(screen.getByRole('button', { name: /Genera con AI/i })).toHaveClass('study-deck-secondary-btn--ai');
    });

    it('renders exam quick actions with semantic variants and title classes', () => {
        const { container } = render(
            <ExamQuickActions
                exam={activeExam}
                decks={[{ ...baseDeck, examId: activeExam.id }]}
                onStudy={vi.fn()}
                onStudyAll={vi.fn()}
                onMagicGenerate={vi.fn()}
                onAddDeck={vi.fn()}
                onExamSolver={vi.fn()}
                onComplete={vi.fn()}
                onArchive={vi.fn()}
            />
        );

        expect(container.querySelector('.exam-quick-actions-title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Studia Algebra/i })).toHaveClass('exam-quick-action--primary');
        expect(screen.getByRole('button', { name: /Completa Esame/i })).toHaveClass('exam-quick-action--ghost');
    });
});
