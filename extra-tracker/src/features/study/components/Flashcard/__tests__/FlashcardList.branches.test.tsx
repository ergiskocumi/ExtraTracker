import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import type { Deck, Card } from '../../../services/studyService';
import { FlashcardList } from '../FlashcardList';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';
import { TEXT_CONTENT } from '../FlashcardList.constants';

let dndHandlers: {
    onDragStart?: (event: any) => void;
    onDragEnd?: (event: any) => Promise<void> | void;
} = {};

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({
        children,
        onDragStart,
        onDragEnd,
    }: {
        children: React.ReactNode;
        onDragStart?: (event: any) => void;
        onDragEnd?: (event: any) => Promise<void> | void;
    }) => {
        dndHandlers = { onDragStart, onDragEnd };
        return <div data-testid="dnd-context">{children}</div>;
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="drag-overlay">{children}</div>
    ),
    closestCenter: vi.fn(),
    KeyboardSensor: class KeyboardSensor {},
    PointerSensor: class PointerSensor {},
    TouchSensor: class TouchSensor {},
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="sortable-context">{children}</div>
    ),
    rectSortingStrategy: vi.fn(),
    verticalListSortingStrategy: vi.fn(),
    arrayMove: <T,>(array: T[], from: number, to: number): T[] => {
        const copy = [...array];
        const [item] = copy.splice(from, 1);
        copy.splice(to, 0, item);
        return copy;
    },
}));

vi.mock('../../../services/studyService', () => ({
    studyService: {
        reorderCards: vi.fn(),
        addCardAtPosition: vi.fn(),
        deleteCard: vi.fn(),
    },
}));

vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../SortableItem', () => ({
    SortableItem: ({
        card,
        onDelete,
    }: {
        card: Card;
        onDelete?: (cardId: string) => void;
    }) => (
        <div data-testid={`sortable-${card.id}`}>
            <span>{card.front}</span>
            <button type="button" onClick={() => onDelete?.(card.id)}>
                {`delete-${card.id}`}
            </button>
        </div>
    ),
}));

vi.mock('../FlashcardInlineForm', () => ({
    FlashcardInlineForm: ({
        onSave,
        onCancel,
        position,
    }: {
        onSave: (front: string, back: string) => Promise<void>;
        onCancel: () => void;
        position?: number;
    }) => (
        <div data-testid={`inline-form-${position ?? -1}`}>
            <button
                type="button"
                onClick={() => {
                    void onSave(`front-${position}`, `back-${position}`);
                }}
            >
                inline-save
            </button>
            <button type="button" onClick={onCancel}>
                inline-cancel
            </button>
        </div>
    ),
}));

vi.mock('../DeleteCardModal', () => ({
    DeleteCardModal: ({
        isOpen,
        onClose,
        onConfirm,
        card,
        isDeleting,
    }: {
        isOpen: boolean;
        onClose: () => void;
        onConfirm: () => Promise<void>;
        card: Card | null;
        isDeleting: boolean;
    }) =>
        isOpen ? (
            <div data-testid="delete-modal">
                <span>{card?.id}</span>
                <span>{isDeleting ? 'deleting' : 'idle'}</span>
                <button
                    type="button"
                    onClick={() => {
                        void onConfirm();
                    }}
                >
                    confirm-delete
                </button>
                <button type="button" onClick={onClose}>
                    close-delete
                </button>
            </div>
        ) : null,
}));

vi.mock('../FlashcardList.InsertButton', () => ({
    InsertButton: ({
        position,
        onInsert,
        isVisible,
    }: {
        position: number;
        onInsert: (position: number) => void;
        isVisible: boolean;
    }) => (
        <button type="button" onClick={() => onInsert(position)}>
            {`insert-${position}-${isVisible ? 'visible' : 'hidden'}`}
        </button>
    ),
}));

vi.mock('../FlashcardList.Header', () => ({
    Header: ({
        cardCount,
        showBackButton,
        showAddButton,
        onNavigateBack,
        onAddCard,
    }: {
        cardCount: number;
        showBackButton: boolean;
        showAddButton: boolean;
        onNavigateBack?: () => void;
        onAddCard: () => void;
    }) => (
        <div data-testid="header">
            <span>{`count-${cardCount}`}</span>
            {showBackButton && (
                <button type="button" onClick={onNavigateBack}>
                    header-back
                </button>
            )}
            {showAddButton && (
                <button type="button" onClick={onAddCard}>
                    header-add
                </button>
            )}
        </div>
    ),
}));

vi.mock('../FlashcardList.EmptyState', () => ({
    EmptyState: ({ message }: { message: string }) => (
        <div data-testid="empty-state">{message}</div>
    ),
}));

vi.mock('../FlashcardList.DragOverlay', () => ({
    DragOverlayContent: ({ card }: { card: Card }) => (
        <div data-testid="overlay-content">{card.id}</div>
    ),
}));

const deck: Deck = {
    id: 'deck-1',
    title: 'Deck',
    cards: [
        {
            id: 'card-1',
            front: 'Q1',
            back: 'A1',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
        {
            id: 'card-2',
            front: 'Q2',
            back: 'A2',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
    ],
    totalCards: 2,
    dueCount: 0,
    tags: [],
};

const renderList = (overrides: Partial<React.ComponentProps<typeof FlashcardList>> = {}) => {
    const props: React.ComponentProps<typeof FlashcardList> = {
        deck,
        onAddCard: vi.fn(),
        onUpdate: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
    render(<FlashcardList {...props} />);
    return props;
};

describe('FlashcardList branch coverage', () => {
    beforeEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.clearAllMocks();
        dndHandlers = {};
        (studyService.reorderCards as any).mockResolvedValue(deck);
        (studyService.addCardAtPosition as any).mockResolvedValue(deck);
        (studyService.deleteCard as any).mockResolvedValue(deck);
    });

    it('renders empty state for decks without cards', () => {
        renderList({
            deck: { ...deck, cards: [], totalCards: 0 },
        });

        expect(screen.getByTestId('empty-state')).toHaveTextContent('Nessuna carta ancora');
    });

    it('handles header actions in list mode', () => {
        const onNavigateBack = vi.fn();
        const onAddCard = vi.fn();
        renderList({
            showHeader: true,
            onNavigateBack,
            onAddCard,
        });

        fireEvent.click(screen.getByRole('button', { name: 'header-back' }));
        fireEvent.click(screen.getByRole('button', { name: 'header-add' }));
        expect(onNavigateBack).toHaveBeenCalledTimes(1);
        expect(onAddCard).toHaveBeenCalledTimes(1);
    });

    it('hides header add button in grid mode', () => {
        renderList({
            showHeader: true,
            viewMode: 'grid',
            onAddCard: vi.fn(),
        });
        expect(screen.queryByRole('button', { name: 'header-add' })).not.toBeInTheDocument();
    });

    it('falls back to inline insertion when header callback is missing', async () => {
        const onDeckUpdate = vi.fn();
        renderList({
            showHeader: true,
            onAddCard: undefined as any,
            onDeckUpdate,
        });

        fireEvent.click(screen.getByRole('button', { name: 'header-add' }));
        expect(screen.getAllByTestId('inline-form-2').length).toBeGreaterThan(0);

        fireEvent.click(screen.getAllByRole('button', { name: 'inline-save' })[0]);

        await waitFor(() => {
            expect(studyService.addCardAtPosition).toHaveBeenCalledWith(
                'deck-1',
                expect.objectContaining({
                    front: 'front-2',
                    back: 'back-2',
                    position: 2,
                })
            );
            expect(onDeckUpdate).toHaveBeenCalled();
            expect(emitToast.success).toHaveBeenCalled();
        });
    });

    it('handles inline insert errors and supports inline cancel', async () => {
        (studyService.addCardAtPosition as any).mockRejectedValue(new Error('insert-failed'));
        renderList({
            showHeader: true,
            onAddCard: undefined as any,
        });

        fireEvent.click(screen.getByRole('button', { name: 'header-add' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'inline-save' })[0]);

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('insert-failed');
        });

        fireEvent.click(screen.getAllByRole('button', { name: 'inline-cancel' })[0]);
        expect(screen.queryAllByRole('button', { name: 'inline-cancel' }).length).toBe(0);
    });

    it('ignores drag-end when event is invalid and shows overlay on drag-start', async () => {
        renderList();

        await act(async () => {
            dndHandlers.onDragStart?.({ active: { id: 'card-1' } });
        });
        expect(screen.getByTestId('overlay-content')).toHaveTextContent('card-1');

        await act(async () => {
            await dndHandlers.onDragEnd?.({ active: { id: 'card-1' }, over: null });
            await dndHandlers.onDragEnd?.({ active: { id: 'card-1' }, over: { id: 'card-1' } });
            await dndHandlers.onDragEnd?.({ active: { id: 'missing' }, over: { id: 'card-1' } });
        });

        expect(studyService.reorderCards).not.toHaveBeenCalled();
    });

    it('reorders cards on successful drag-end and calls callbacks', async () => {
        const onDeckUpdate = vi.fn();
        const updatedDeck: Deck = {
            ...deck,
            cards: [deck.cards[1], deck.cards[0]],
        };
        (studyService.reorderCards as any).mockResolvedValue(updatedDeck);

        renderList({ onDeckUpdate });

        await act(async () => {
            await dndHandlers.onDragEnd?.({
                active: { id: 'card-1' },
                over: { id: 'card-2' },
            });
        });

        await waitFor(() => {
            expect(studyService.reorderCards).toHaveBeenCalledWith('deck-1', ['card-2', 'card-1']);
            expect(onDeckUpdate).toHaveBeenCalledWith(updatedDeck);
            expect(emitToast.success).toHaveBeenCalledWith(TEXT_CONTENT.toast.reorderSuccess);
        });
    });

    it('handles drag reorder errors with fallback message', async () => {
        (studyService.reorderCards as any).mockRejectedValue('generic-error');
        renderList();

        await act(async () => {
            await dndHandlers.onDragEnd?.({
                active: { id: 'card-1' },
                over: { id: 'card-2' },
            });
        });

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith(TEXT_CONTENT.toast.reorderError);
        });
    });

    it('calls custom onDelete directly when provided', async () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        renderList({ onDelete });

        fireEvent.click(screen.getByRole('button', { name: 'delete-card-1' }));

        expect(onDelete).toHaveBeenCalledWith('card-1');
        expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('deletes cards through modal/service fallback when custom callback is missing', async () => {
        const onDeckUpdate = vi.fn();
        renderList({
            onDelete: undefined,
            onDeckUpdate,
        });

        fireEvent.click(screen.getAllByRole('button', { name: 'delete-card-1' }).at(-1)!);
        fireEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

        await waitFor(() => {
            expect(studyService.deleteCard).toHaveBeenCalledWith('deck-1', 'card-1');
            expect(onDeckUpdate).toHaveBeenCalled();
            expect(emitToast.success).toHaveBeenCalledWith(TEXT_CONTENT.toast.deleteSuccess);
        });
    });

    it('keeps delete modal open while deleting and handles delete errors', async () => {
        let resolveDelete: (() => void) | null = null;
        (studyService.deleteCard as any).mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                })
        );
        renderList({ onDelete: undefined });

        fireEvent.click(screen.getByRole('button', { name: 'delete-card-1' }));
        fireEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

        await waitFor(() => {
            expect(screen.getByText('deleting')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'close-delete' }));
        expect(screen.getByTestId('delete-modal')).toBeInTheDocument();

        resolveDelete?.();
        await waitFor(() => {
            expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
        });

        (studyService.deleteCard as any).mockRejectedValueOnce(new Error('delete-failed'));
        fireEvent.click(screen.getAllByRole('button', { name: 'delete-card-1' }).at(-1)!);
        fireEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('delete-failed');
        });
    });
});
