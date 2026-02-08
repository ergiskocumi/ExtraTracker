import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragOverlayContent } from '../FlashcardList.DragOverlay';
import type { Card } from '../../../services/studyService';

vi.mock('../FlashcardItem', () => ({
    FlashcardItem: ({
        card,
        onClick,
        onDelete,
        onShowSource,
    }: {
        card: Card;
        onClick?: (card: Card) => void;
        onDelete?: (cardId: string) => void;
        onShowSource?: (card: Card) => void;
    }) => (
        <div data-testid={`flashcard-item-${card.id}`}>
            <button type="button" onClick={() => onClick?.(card)}>
                item-click
            </button>
            <button type="button" onClick={() => onDelete?.(card.id)}>
                item-delete
            </button>
            <button type="button" onClick={() => onShowSource?.(card)}>
                item-source
            </button>
        </div>
    ),
}));

const cardA: Card = {
    id: 'card-a',
    front: 'Front A',
    back: 'Back A',
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new',
};

const cardB: Card = {
    id: 'card-b',
    front: 'Front B',
    back: 'Back B',
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new',
};

const baseProps = {
    card: cardA,
    items: [cardA, cardB],
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onCardClick: vi.fn(),
    onDelete: vi.fn(),
    onShowSource: vi.fn(),
    isSourceActive: false,
};

describe('DragOverlayContent', () => {
    it('renders grid mode without index badge and forwards callbacks', () => {
        const props = {
            ...baseProps,
            onCardClick: vi.fn(),
            onDelete: vi.fn(),
            onShowSource: vi.fn(),
        };

        render(<DragOverlayContent {...props} viewMode="grid" />);

        expect(screen.getByTestId('flashcard-item-card-a')).toBeInTheDocument();
        expect(screen.queryByText('#1')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'item-click' }));
        fireEvent.click(screen.getByRole('button', { name: 'item-delete' }));
        fireEvent.click(screen.getByRole('button', { name: 'item-source' }));

        expect(props.onCardClick).toHaveBeenCalledWith(cardA);
        expect(props.onDelete).toHaveBeenCalledWith('card-a');
        expect(props.onShowSource).toHaveBeenCalledWith(cardA);
    });

    it('renders list mode with position index', () => {
        render(
            <DragOverlayContent
                {...baseProps}
                card={cardB}
                viewMode="list"
            />
        );

        expect(screen.getByTestId('flashcard-item-card-b')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('shows #0 when dragged card is not present in items', () => {
        const externalCard: Card = {
            ...cardA,
            id: 'external-card',
        };

        render(
            <DragOverlayContent
                {...baseProps}
                card={externalCard}
                viewMode="list"
            />
        );

        expect(screen.getByText('#0')).toBeInTheDocument();
    });
});

