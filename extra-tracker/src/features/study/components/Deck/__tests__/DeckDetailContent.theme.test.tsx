import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckDetailContent } from '../DeckDetailContent';
import type { Deck } from '../../../services/studyService';

vi.mock('../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../../services/studyService', () => ({
    studyService: {
        addCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
    },
}));

vi.mock('../DeckDetailHeader', () => ({
    DeckDetailHeader: () => <div data-testid="deck-header" />,
}));

vi.mock('../DeckStatsPanel', () => ({
    DeckStatsPanel: () => <div data-testid="deck-stats" />,
}));

vi.mock('../CardEditorModal', () => ({
    CardEditorModal: () => null,
}));

vi.mock('../../Flashcard/FlashcardItem', () => ({
    FlashcardItem: ({ card }: { card: { id: string } }) => <div data-testid={`card-${card.id}`} />,
}));

describe('DeckDetailContent layout contract', () => {
    it('renders themed shell and grid with non-stretch layout classes', () => {
        const deck: Deck = {
            id: 'deck-theme',
            title: 'Deck Theme',
            description: 'Descrizione',
            totalCards: 2,
            dueCount: 1,
            tags: [],
            cards: [
                {
                    id: 'c1',
                    front: 'Domanda 1',
                    back: 'Risposta 1',
                    status: 'new',
                    easinessFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date().toISOString(),
                },
                {
                    id: 'c2',
                    front: 'Domanda 2',
                    back: 'Risposta 2',
                    status: 'learning',
                    easinessFactor: 2.3,
                    interval: 2,
                    repetitions: 1,
                    nextReviewDate: new Date().toISOString(),
                },
            ],
        };

        const { container } = render(
            <DeckDetailContent
                deck={deck}
                onBack={vi.fn()}
                onStudy={vi.fn()}
                onDeckUpdate={vi.fn()}
            />
        );

        expect(container.querySelector('.bg-theme-card')).toBeInTheDocument();
        expect(container.querySelector('.border-theme-default')).toBeInTheDocument();
        expect(container.querySelector('.items-start.auto-rows-min')).toBeInTheDocument();
    });
});
