import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { DeckDetailContent } from '../DeckDetailContent';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';
import type { Deck } from '../../../services/studyService';

vi.mock('../../../services/studyService', () => ({
    studyService: {
        addCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
    },
}));

vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../DeckDetailHeader', () => ({
    DeckDetailHeader: ({ onAddCard }: any) => (
        <div data-testid="mock-header">
            <button onClick={onAddCard}>header-add-card</button>
        </div>
    ),
}));

vi.mock('../DeckCardFilters', () => ({
    DeckCardFilters: ({
        counts,
        onFilterChange,
        onSearchChange,
        onSortChange,
    }: any) => (
        <div data-testid="mock-filters">
            <span data-testid="count-all">{counts.all}</span>
            <button onClick={() => onFilterChange('all')}>filter-all</button>
            <button onClick={() => onFilterChange('review')}>filter-review</button>
            <button onClick={() => onFilterChange('learning')}>filter-learning</button>
            <button onClick={() => onSearchChange('Alpha')}>search-alpha</button>
            <button onClick={() => onSearchChange('missing')}>search-missing</button>
            <button onClick={() => onSearchChange('')}>search-clear</button>
            <button onClick={() => onSortChange('order')}>sort-order</button>
            <button onClick={() => onSortChange('alphabetical')}>sort-alphabetical</button>
            <button onClick={() => onSortChange('created')}>sort-created</button>
            <button onClick={() => onSortChange('interval')}>sort-interval</button>
        </div>
    ),
}));

vi.mock('../DeckStatsPanel', () => ({
    DeckStatsPanel: () => <div data-testid="mock-stats-panel">stats-panel</div>,
}));

vi.mock('../CardEditorModal', () => ({
    CardEditorModal: ({
        isOpen,
        onSave,
        onDelete,
        onClose,
        onNavigate,
        title,
        frontContent,
    }: any) =>
        isOpen ? (
            <div data-testid="mock-editor-modal">
                <span>{title}</span>
                <span data-testid="editor-front-content">{frontContent}</span>
                <button
                    onClick={() => {
                        void onSave('front-updated', 'back-updated').catch(() => {});
                    }}
                >
                    editor-save
                </button>
                {onDelete && <button onClick={onDelete}>editor-delete</button>}
                {onNavigate && (
                    <>
                        <button onClick={() => onNavigate('prev')}>editor-prev</button>
                        <button onClick={() => onNavigate('next')}>editor-next</button>
                    </>
                )}
                <button onClick={onClose}>editor-close</button>
            </div>
        ) : null,
}));

vi.mock('../../Flashcard/FlashcardItem', () => ({
    FlashcardItem: ({ card, onClick, onDelete, onUpdate }: any) => (
        <div
            data-testid="flashcard-item"
            data-card-id={card.id}
            data-card-front={card.front}
        >
            <span>{card.front}</span>
            <button onClick={onClick}>{`edit-${card.id}`}</button>
            <button onClick={() => onDelete(card.id)}>{`delete-${card.id}`}</button>
            <button onClick={() => void onUpdate(card.id, `U-${card.front}`, `U-${card.back}`)}>
                {`update-${card.id}`}
            </button>
        </div>
    ),
}));

const buildDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: 'deck-1',
    title: 'Deck Coverage',
    description: 'Deck per test',
    tags: ['test'],
    totalCards: 3,
    dueCount: 1,
    cards: [
        {
            id: 'c1',
            front: 'Zeta',
            back: 'Back Zeta',
            easinessFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
            createdAt: 1000,
        } as any,
        {
            id: 'c2',
            front: 'Alpha',
            back: 'Back Alpha',
            easinessFactor: 2.6,
            interval: 2,
            repetitions: 1,
            nextReviewDate: new Date().toISOString(),
            status: 'review',
            createdAt: 3000,
        } as any,
        {
            id: 'c3',
            front: 'Beta',
            back: 'Back Beta',
            easinessFactor: 2.7,
            interval: 5,
            repetitions: 2,
            nextReviewDate: new Date().toISOString(),
            status: 'learning',
            createdAt: 2000,
        } as any,
    ],
    ...overrides,
});

const renderComponent = (overrides: Partial<ComponentProps<typeof DeckDetailContent>> = {}) => {
    const props = {
        deck: buildDeck(),
        onBack: vi.fn(),
        onStudy: vi.fn(),
        onExamSolver: vi.fn(),
        onReadPdf: vi.fn(),
        onMagicGenerate: vi.fn(),
        onDeckUpdate: vi.fn(),
        onDeleteDeck: vi.fn(),
        onSettings: vi.fn(),
        onExport: vi.fn(),
        onShare: vi.fn(),
        onResetProgress: vi.fn(),
        ...overrides,
    };

    const view = render(<DeckDetailContent {...props} />);
    return { props, ...view };
};

const getRenderedCardOrder = () =>
    screen
        .queryAllByTestId('flashcard-item')
        .map((item) => item.getAttribute('data-card-front'));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('DeckDetailContent', () => {
    it('filters, searches and sorts cards through controls', async () => {
        renderComponent();

        expect(screen.getByTestId('count-all')).toHaveTextContent('3');
        expect(getRenderedCardOrder()).toEqual(['Zeta', 'Alpha', 'Beta']);

        fireEvent.click(screen.getByText('sort-alphabetical'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Alpha', 'Beta', 'Zeta']));

        fireEvent.click(screen.getByText('sort-interval'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Beta', 'Alpha', 'Zeta']));

        fireEvent.click(screen.getByText('sort-created'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Alpha', 'Beta', 'Zeta']));

        fireEvent.click(screen.getByText('filter-review'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Alpha']));

        fireEvent.click(screen.getByText('filter-learning'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Beta']));

        fireEvent.click(screen.getByText('filter-all'));
        fireEvent.click(screen.getByText('search-alpha'));
        await waitFor(() => expect(getRenderedCardOrder()).toEqual(['Alpha']));

        fireEvent.click(screen.getByText('search-missing'));
        expect(screen.getByText(/Nessuna carta trovata/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('search-clear'));
        await waitFor(() => expect(getRenderedCardOrder()).toHaveLength(3));
    });

    it('creates a new card and calls addCard + toast success', async () => {
        const updatedDeck = buildDeck({ id: 'deck-updated' });
        (studyService.addCard as any).mockResolvedValue(updatedDeck);
        const { props } = renderComponent();

        fireEvent.click(screen.getByText('header-add-card'));
        expect(screen.getByText('Nuova Carta')).toBeInTheDocument();
        expect(screen.queryByText('editor-delete')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('editor-save'));

        await waitFor(() => {
            expect(studyService.addCard).toHaveBeenCalledWith('deck-1', {
                front: 'front-updated',
                back: 'back-updated',
            });
            expect(props.onDeckUpdate).toHaveBeenCalledWith(updatedDeck);
            expect(emitToast.success).toHaveBeenCalledWith('Carta aggiunta!');
        });
    });

    it('edits existing cards, navigates between them and saves with updateCard', async () => {
        const updatedDeck = buildDeck({ id: 'deck-edit-updated' });
        (studyService.updateCard as any).mockResolvedValue(updatedDeck);
        const { props } = renderComponent();

        fireEvent.click(screen.getByText('edit-c2'));
        expect(screen.getByText('Modifica Carta')).toBeInTheDocument();
        expect(screen.getByTestId('editor-front-content')).toHaveTextContent('Alpha');

        fireEvent.click(screen.getByText('editor-next'));
        expect(screen.getByTestId('editor-front-content')).toHaveTextContent('Beta');

        fireEvent.click(screen.getByText('editor-prev'));
        expect(screen.getByTestId('editor-front-content')).toHaveTextContent('Alpha');

        fireEvent.click(screen.getByText('editor-save'));

        await waitFor(() => {
            expect(studyService.updateCard).toHaveBeenCalledWith('deck-1', 'c2', {
                front: 'front-updated',
                back: 'back-updated',
            });
            expect(props.onDeckUpdate).toHaveBeenCalledWith(updatedDeck);
            expect(emitToast.success).toHaveBeenCalledWith('Carta aggiornata!');
        });
    });

    it('updates card directly from FlashcardItem callback', async () => {
        const updatedDeck = buildDeck({ id: 'deck-inline-updated' });
        (studyService.updateCard as any).mockResolvedValue(updatedDeck);
        const { props } = renderComponent();

        fireEvent.click(screen.getByText('update-c1'));

        await waitFor(() => {
            expect(studyService.updateCard).toHaveBeenCalledWith('deck-1', 'c1', {
                front: 'U-Zeta',
                back: 'U-Back Zeta',
            });
            expect(props.onDeckUpdate).toHaveBeenCalledWith(updatedDeck);
        });
    });

    it('handles delete flow from modal and from list confirmation', async () => {
        const updatedDeck = buildDeck({ id: 'deck-deleted-update' });
        (studyService.deleteCard as any).mockResolvedValue(updatedDeck);
        const { props } = renderComponent();

        fireEvent.click(screen.getByText('edit-c2'));
        fireEvent.click(screen.getByText('editor-delete'));
        expect(screen.getByText(/Elimina Carta/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Annulla$/i }));
        expect(screen.queryByText(/Elimina Carta/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('delete-c1'));
        fireEvent.click(screen.getByText(/^Elimina$/i));

        await waitFor(() => {
            expect(studyService.deleteCard).toHaveBeenCalledWith('deck-1', 'c1');
            expect(props.onDeckUpdate).toHaveBeenCalledWith(updatedDeck);
            expect(emitToast.success).toHaveBeenCalledWith('Carta eliminata!');
        });
    });

    it('shows toast errors for save/delete failures and runs mobile action callbacks', async () => {
        (studyService.updateCard as any).mockRejectedValue(new Error('save-failed'));
        (studyService.deleteCard as any).mockRejectedValue(new Error('delete-failed'));
        const { props } = renderComponent();

        fireEvent.click(screen.getByText('edit-c1'));
        fireEvent.click(screen.getByText('editor-save'));

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('save-failed');
        });

        fireEvent.click(screen.getByText('delete-c1'));
        fireEvent.click(screen.getByText(/^Elimina$/i));
        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('delete-failed');
        });

        fireEvent.click(screen.getByText(/Impostazioni/i));
        fireEvent.click(screen.getByText(/Esporta/i));
        fireEvent.click(screen.getByText(/Condividi/i));
        fireEvent.click(screen.getByText(/Reset/i));

        expect(props.onSettings).toHaveBeenCalledTimes(1);
        expect(props.onExport).toHaveBeenCalledTimes(1);
        expect(props.onShare).toHaveBeenCalledTimes(1);
        expect(props.onResetProgress).toHaveBeenCalledTimes(1);
    });

    it('renders empty-state variants and opens add-card from call-to-action', () => {
        renderComponent({
            deck: buildDeck({ cards: [], totalCards: 0, dueCount: 0 }),
        });

        expect(screen.getByText(/Nessuna carta/i)).toBeInTheDocument();
        expect(screen.getByText(/Crea Prima Carta/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Crea Prima Carta/i));
        expect(screen.getByText('Nuova Carta')).toBeInTheDocument();
    });
});
