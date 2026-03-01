import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudyCard } from '../StudyCard';
import { StudyProgress } from '../StudyProgress';
import { StudyControls } from '../StudyControls';
import { SessionComplete } from '../SessionComplete';
import type { Card } from '../../../services/studyService';

const sampleCard: Card = {
    id: 'card-1',
    front: 'Qual e la capitale d\'Italia?',
    back: 'Roma',
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: '2026-02-12T10:00:00.000Z',
    status: 'learning',
};

describe('Study mode theme contract', () => {
    it('renders StudyCard with semantic face and keyboard classes', () => {
        const { container } = render(
            <StudyCard
                card={sampleCard}
                isFlipped={false}
                onFlip={vi.fn()}
                cardNumber={1}
                totalCards={10}
            />
        );

        expect(container.querySelector('.study-card-face--front')).toBeInTheDocument();
        expect(container.querySelector('.study-card-face--back')).toBeInTheDocument();
        expect(container.querySelector('.study-card-kbd')).toBeInTheDocument();
        expect(container.querySelector('.study-card-meta')).toBeInTheDocument();
    });

    it('renders StudyProgress with track and semantic dot classes', () => {
        const { container } = render(
            <StudyProgress
                currentIndex={1}
                totalCards={10}
                correctCount={3}
                wrongCount={2}
                elapsedSeconds={125}
                deckTitle="Geografia"
                mode="Flashcards"
            />
        );

        expect(container.querySelector('.study-progress-track')).toBeInTheDocument();
        expect(container.querySelector('.study-progress-dot--current')).toBeInTheDocument();
    });

    it('renders StudyControls with semantic options and keyboard hints', () => {
        const { container } = render(
            <StudyControls
                onRate={vi.fn()}
                visible={true}
            />
        );

        expect(container.querySelectorAll('.study-controls-option').length).toBe(5);
        expect(container.querySelectorAll('.study-controls-kbd').length).toBeGreaterThan(0);
    });

    it('renders SessionComplete with themed stat cards and actions', () => {
        const onRestart = vi.fn();
        const onBack = vi.fn();

        const { container } = render(
            <SessionComplete
                totalCards={20}
                correctCount={15}
                wrongCount={5}
                durationSeconds={480}
                onRestart={onRestart}
                onBack={onBack}
                isExamMode={true}
                wrongAnswers={[{ front: 'Q1', userAnswer: 'A0', back: 'A1' }]}
            />
        );

        expect(container.querySelectorAll('.study-complete-stat-card').length).toBe(4);

        fireEvent.click(screen.getByRole('button', { name: /Domande da rivedere/i }));
        expect(screen.getByText('Risposta corretta')).toBeInTheDocument();
    });
});
