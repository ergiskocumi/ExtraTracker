import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeckDetailPage } from '../DeckDetailPage';
import { studyService } from '../../services/studyService';
import type { Deck } from '../../services/studyService';

vi.mock('../../services/studyService', () => ({
    studyService: {
        getDeckById: vi.fn(),
        reorderCards: vi.fn(),
        addCardAtPosition: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        addCard: vi.fn(),
        deleteDeck: vi.fn(),
    },
}));

vi.mock('../../components/Modals/MagicGenerateModal', () => ({
    MagicGenerateModal: () => null,
}));

vi.mock('../../components/Modals/ExamSolver', () => ({
    ExamSolverModal: () => null,
}));

vi.mock('../../../../shared/components/ConfirmationModal', () => ({
    ConfirmationModal: () => null,
}));

vi.mock('../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockUseParams = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => mockUseParams(),
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockDeck: Deck = {
    id: 'deck-1',
    title: 'Test Deck',
    cards: [
        {
            id: 'card-1',
            front: 'Question 1',
            back: 'Answer 1',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
        {
            id: 'card-2',
            front: 'Question 2',
            back: 'Answer 2',
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

describe('DeckDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ id: 'deck-1' });
        (studyService.getDeckById as any).mockResolvedValue(mockDeck);
    });

    it('loads and renders deck content', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(studyService.getDeckById).toHaveBeenCalledWith('deck-1');
        });

        await waitFor(() => {
            expect(screen.getByText('Test Deck')).toBeInTheDocument();
            expect(screen.getByText('Question 1')).toBeInTheDocument();
            expect(screen.getByText('Question 2')).toBeInTheDocument();
        });
    });

    it('renders filters and search controls', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /tutte/i })).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Cerca carte/i)).toBeInTheDocument();
        });
    });

    it('shows backend error message when loading fails', async () => {
        (studyService.getDeckById as any).mockRejectedValue(new Error('Deck not found'));
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText(/Deck not found/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Torna ai Mazzi/i })).toBeInTheDocument();
        });
    });

    it('shows loading state initially', () => {
        (studyService.getDeckById as any).mockImplementation(() => new Promise(() => {}));
        renderWithRouter(<DeckDetailPage />);

        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
});
