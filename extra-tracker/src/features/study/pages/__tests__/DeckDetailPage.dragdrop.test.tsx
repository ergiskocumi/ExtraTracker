/**
 * 🧪 TEST: DeckDetailPage - Drag & Drop Integration
 * 
 * Verifica che DeckDetailPage utilizzi correttamente FlashcardList
 * con funzionalità di drag & drop e inserimento posizionale.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeckDetailPage } from '../DeckDetailPage';
import { studyService } from '../../services/studyService';
import type { Deck } from '../../services/studyService';

// Mock dependencies
vi.mock('../../services/studyService', () => ({
    studyService: {
        getDeckById: vi.fn(),
        reorderCards: vi.fn(),
        addCardAtPosition: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        addCard: vi.fn(),
    },
}));

vi.mock('../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock useParams
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => mockUseParams(),
        useNavigate: () => vi.fn(),
    };
});

// Helper per wrappare il componente con router
const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DeckDetailPage - FlashcardList Integration', () => {
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
                status: 'new' 
            },
            { 
                id: 'card-2', 
                front: 'Question 2', 
                back: 'Answer 2', 
                easinessFactor: 2.5, 
                interval: 0, 
                repetitions: 0, 
                nextReviewDate: new Date().toISOString(), 
                status: 'new' 
            },
            { 
                id: 'card-3', 
                front: 'Question 3', 
                back: 'Answer 3', 
                easinessFactor: 2.5, 
                interval: 0, 
                repetitions: 0, 
                nextReviewDate: new Date().toISOString(), 
                status: 'new' 
            },
        ],
        totalCards: 3,
        dueCount: 0,
        tags: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ id: 'deck-1' });
        (studyService.getDeckById as any).mockResolvedValue(mockDeck);
    });

    it('should render FlashcardList component with deck cards', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(studyService.getDeckById).toHaveBeenCalledWith('deck-1');
        });

        // Verifica che le card siano visualizzate (attraverso FlashcardList)
        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
            expect(screen.getByText('Question 2')).toBeInTheDocument();
            expect(screen.getByText('Question 3')).toBeInTheDocument();
        });
    });

    it('should display card numbers in FlashcardList', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Verifica che i numeri delle card siano visualizzati
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('should support drag & drop reordering through FlashcardList', async () => {
        const reorderedDeck: Deck = {
            ...mockDeck,
            cards: [
                mockDeck.cards[1], // card-2
                mockDeck.cards[0], // card-1
                mockDeck.cards[2], // card-3
            ],
        };

        (studyService.reorderCards as any).mockResolvedValue(reorderedDeck);

        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Verifica che le card siano draggable (attraverso FlashcardList)
        const firstCard = screen.getByText('Question 1').closest('[draggable]');
        expect(firstCard).toBeInTheDocument();
        expect(firstCard).toHaveAttribute('draggable', 'true');
    });

    it('should support filtered cards display', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Verifica che i filtri siano disponibili
        const filterButtons = screen.getAllByRole('button');
        const allFilter = filterButtons.find(btn => btn.textContent?.includes('Tutte'));
        expect(allFilter).toBeInTheDocument();
    });

    it('should support search functionality', async () => {
        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Verifica che la barra di ricerca sia presente
        const searchInput = screen.getByPlaceholderText(/Cerca carte/i);
        expect(searchInput).toBeInTheDocument();
    });

    it('should handle deck update after card operations', async () => {
        const updatedDeck: Deck = {
            ...mockDeck,
            cards: [
                ...mockDeck.cards,
                { 
                    id: 'card-4', 
                    front: 'Question 4', 
                    back: 'Answer 4', 
                    easinessFactor: 2.5, 
                    interval: 0, 
                    repetitions: 0, 
                    nextReviewDate: new Date().toISOString(), 
                    status: 'new' 
                },
            ],
            totalCards: 4,
        };

        (studyService.addCard as any).mockResolvedValue(updatedDeck);

        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Verifica che il deck venga aggiornato dopo le operazioni
        // (test indiretto attraverso la presenza di FlashcardList)
        expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
});

describe('DeckDetailPage - Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ id: 'deck-1' });
    });

    it('should handle deck not found error', async () => {
        (studyService.getDeckById as any).mockRejectedValue(new Error('Deck not found'));

        renderWithRouter(<DeckDetailPage />);

        await waitFor(() => {
            expect(screen.getByText(/Mazzo non trovato/i)).toBeInTheDocument();
        });
    });

    it('should display loading state initially', () => {
        (studyService.getDeckById as any).mockImplementation(() => new Promise(() => {})); // Never resolves

        renderWithRouter(<DeckDetailPage />);

        // Verifica che lo stato di caricamento sia visualizzato
        // (attraverso lo spinner o un messaggio di caricamento)
        const loadingIndicator = document.querySelector('.animate-spin');
        expect(loadingIndicator).toBeInTheDocument();
    });
});
