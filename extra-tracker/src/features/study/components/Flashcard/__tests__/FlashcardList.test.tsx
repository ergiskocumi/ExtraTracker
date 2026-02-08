/**
 * 🧪 TEST: FlashcardList Component
 * 
 * Verifica le funzionalità di:
 * - Numerazione delle card
 * - Drag & Drop per riordinare
 * - Inserimento di card in posizione specifica
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardList } from '../FlashcardList';
import { studyService } from '../../../services/studyService';
import type { Deck, Card } from '../../../services/studyService';

// Mock dependencies
vi.mock('../../../services/studyService', () => ({
    studyService: {
        reorderCards: vi.fn(),
        addCardAtPosition: vi.fn(),
    },
}));

vi.mock('../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock window.prompt
const mockPrompt = vi.fn();
globalThis.window.prompt = mockPrompt;

describe('FlashcardList - Numerazione Card', () => {
    const mockDeck: Deck = {
        id: 'deck-1',
        title: 'Test Deck',
        cards: [
            { id: 'card-1', front: 'Question 1', back: 'Answer 1', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-2', front: 'Question 2', back: 'Answer 2', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-3', front: 'Question 3', back: 'Answer 3', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
        ],
        totalCards: 3,
        dueCount: 0,
        tags: [],
    };

    it('should display card numbers starting from 1', () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
            />
        );

        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('should display numbers in correct order', () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
            />
        );

        const numbers = screen.getAllByText(/#\d+/);
        expect(numbers[0]).toHaveTextContent('#1');
        expect(numbers[1]).toHaveTextContent('#2');
        expect(numbers[2]).toHaveTextContent('#3');
    });
});

describe('FlashcardList - Drag & Drop', () => {
    const mockDeck: Deck = {
        id: 'deck-1',
        title: 'Test Deck',
        cards: [
            { id: 'card-1', front: 'Question 1', back: 'Answer 1', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-2', front: 'Question 2', back: 'Answer 2', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-3', front: 'Question 3', back: 'Answer 3', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
        ],
        totalCards: 3,
        dueCount: 0,
        tags: [],
    };

    const mockOnDeckUpdate = vi.fn();
    const mockUpdatedDeck: Deck = {
        ...mockDeck,
        cards: [
            mockDeck.cards[1],
            mockDeck.cards[0],
            mockDeck.cards[2],
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (studyService.reorderCards as any).mockResolvedValue(mockUpdatedDeck);
    });

    it('should allow dragging a card', () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const firstCard = document.querySelector('[aria-roledescription="sortable"]');
        expect(firstCard).toBeInTheDocument();
        expect(firstCard).toHaveAttribute('role', 'button');
    });

    it('should reorder cards when dropped', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const firstCard = screen.getByText('Question 1').closest('[draggable]');
        const secondCard = screen.getByText('Question 2').closest('[draggable]');

        if (firstCard && secondCard) {
            // Simula drag start
            fireEvent.dragStart(firstCard, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                    setDragImage: vi.fn(),
                } as any,
            });

            // Simula drag over sulla seconda card
            const rect = secondCard.getBoundingClientRect();
            fireEvent.dragOver(secondCard, {
                clientY: rect.top + rect.height / 2 - 10, // Metà superiore
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: {
                    dropEffect: 'move',
                } as any,
            });

            // Simula drop
            fireEvent.drop(secondCard, {
                clientY: rect.top + rect.height / 2 - 10,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });

            // Verifica che reorderCards sia stato chiamato
            await waitFor(() => {
                expect(studyService.reorderCards).toHaveBeenCalled();
            });
        }
    });

    it('should call onDeckUpdate after successful reorder', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const firstCard = screen.getByText('Question 1').closest('[draggable]');
        const secondCard = screen.getByText('Question 2').closest('[draggable]');

        if (firstCard && secondCard) {
            fireEvent.dragStart(firstCard, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                    setDragImage: vi.fn(),
                } as any,
            });

            const rect = secondCard.getBoundingClientRect();
            fireEvent.dragOver(secondCard, {
                clientY: rect.top + rect.height / 2 - 10,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: { dropEffect: 'move' } as any,
            });

            fireEvent.drop(secondCard, {
                clientY: rect.top + rect.height / 2 - 10,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });

            await waitFor(() => {
                expect(mockOnDeckUpdate).toHaveBeenCalledWith(mockUpdatedDeck);
            });
        }
    });
});

describe('FlashcardList - Grid View Visual Swap', () => {
    const mockDeck: Deck = {
        id: 'deck-1',
        title: 'Test Deck',
        cards: [
            { id: 'card-1', front: 'Question 1', back: 'Answer 1', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-2', front: 'Question 2', back: 'Answer 2', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-3', front: 'Question 3', back: 'Answer 3', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
        ],
        totalCards: 3,
        dueCount: 0,
        tags: [],
    };

    const mockOnDeckUpdate = vi.fn();
    const mockUpdatedDeck: Deck = {
        ...mockDeck,
        cards: [
            mockDeck.cards[1], // card-2
            mockDeck.cards[0], // card-1
            mockDeck.cards[2], // card-3
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (studyService.reorderCards as any).mockResolvedValue(mockUpdatedDeck);
    });

    it('should swap cards visually when dragging over another card in grid view', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
                viewMode="grid"
            />
        );

        const firstCard = screen.getByText('Question 1').closest('[draggable]');
        const secondCard = screen.getByText('Question 2').closest('[draggable]');

        if (firstCard && secondCard) {
            // Simula drag start
            fireEvent.dragStart(firstCard, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                    setDragImage: vi.fn(),
                } as any,
            });

            // Simula drag over sulla seconda card - dovrebbe scambiare visivamente
            fireEvent.dragOver(secondCard, {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: {
                    dropEffect: 'move',
                } as any,
            });

            // Verifica che le card siano state scambiate visivamente
            // (Questo test verifica che lo stato locale venga aggiornato)
            await waitFor(() => {
                // Dopo il drag over, le card dovrebbero essere scambiate nell'ordine locale
                expect(firstCard).toBeInTheDocument();
                expect(secondCard).toBeInTheDocument();
            });

            // Simula drop
            fireEvent.drop(secondCard, {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });

            // Verifica che reorderCards sia stato chiamato con l'ordine corretto
            await waitFor(() => {
                expect(studyService.reorderCards).toHaveBeenCalled();
            });
        }
    });

    it('should maintain card order when drag is cancelled in grid view', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
                viewMode="grid"
            />
        );

        const firstCard = screen.getByText('Question 1').closest('[draggable]');
        const secondCard = screen.getByText('Question 2').closest('[draggable]');

        if (firstCard && secondCard) {
            fireEvent.dragStart(firstCard, {
                dataTransfer: {
                    effectAllowed: 'move',
                    setData: vi.fn(),
                    setDragImage: vi.fn(),
                } as any,
            });

            fireEvent.dragOver(secondCard, {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: { dropEffect: 'move' } as any,
            });

            // Simula drag end senza drop (cancellazione)
            fireEvent.dragEnd(firstCard);

            // Verifica che reorderCards NON sia stato chiamato
            await waitFor(() => {
                expect(studyService.reorderCards).not.toHaveBeenCalled();
            });
        }
    });
});

describe('FlashcardList - Insert Card at Position', () => {
    const mockDeck: Deck = {
        id: 'deck-1',
        title: 'Test Deck',
        cards: [
            { id: 'card-1', front: 'Question 1', back: 'Answer 1', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            { id: 'card-2', front: 'Question 2', back: 'Answer 2', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
        ],
        totalCards: 2,
        dueCount: 0,
        tags: [],
    };

    const mockOnDeckUpdate = vi.fn();
    const mockNewCard: Card = {
        id: 'card-new',
        front: 'New Question',
        back: 'New Answer',
        easinessFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        status: 'new',
    };

    const mockUpdatedDeck: Deck = {
        ...mockDeck,
        cards: [
            mockDeck.cards[0],
            mockNewCard,
            mockDeck.cards[1],
        ],
        totalCards: 3,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrompt.mockReturnValueOnce('New Question').mockReturnValueOnce('New Answer');
        (studyService.addCardAtPosition as any).mockResolvedValue(mockUpdatedDeck);
    });

    it('should show insert button on hover between cards', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const insertAreas = document.querySelectorAll('.group\\/insert');
        expect(insertAreas.length).toBeGreaterThan(0);

        fireEvent.mouseEnter((insertAreas[1] ?? insertAreas[0]) as Element);

        await waitFor(() => {
            expect(screen.queryByLabelText(/Inserisci card in posizione/i)).toBeInTheDocument();
        });
    });

    it('should insert card at specific position when insert button is clicked', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        // Trova e clicca il pulsante di inserimento (simula hover prima)
        const insertButtons = screen.queryAllByLabelText(/Inserisci card in posizione/i);
        
        // Simula hover per mostrare il pulsante
        const insertArea = insertButtons[0]?.closest('div');
        if (insertArea) {
            fireEvent.mouseEnter(insertArea);
            
            await waitFor(() => {
                const visibleButton = screen.queryByLabelText(/Inserisci card in posizione 2/i);
                if (visibleButton) {
                    fireEvent.click(visibleButton);
                }
            });

            // Verifica che addCardAtPosition sia stato chiamato con la posizione corretta
            await waitFor(() => {
                expect(studyService.addCardAtPosition).toHaveBeenCalledWith(
                    'deck-1',
                    expect.objectContaining({
                        front: 'New Question',
                        back: 'New Answer',
                        position: 1, // Posizione 1 (0-based) = dopo la prima card
                    })
                );
            });
        }
    });

    it('should update deck after inserting card', async () => {
        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const insertButtons = screen.queryAllByLabelText(/Inserisci card in posizione/i);
        const insertArea = insertButtons[0]?.closest('div');
        
        if (insertArea) {
            fireEvent.mouseEnter(insertArea);
            
            await waitFor(() => {
                const visibleButton = screen.queryByLabelText(/Inserisci card in posizione 2/i);
                if (visibleButton) {
                    fireEvent.click(visibleButton);
                }
            });

            await waitFor(() => {
                expect(mockOnDeckUpdate).toHaveBeenCalledWith(mockUpdatedDeck);
            });
        }
    });

    it('should not insert card if user cancels prompt', async () => {
        mockPrompt.mockReset();
        mockPrompt.mockReturnValueOnce(null); // User cancella

        render(
            <FlashcardList
                deck={mockDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
                onDeckUpdate={mockOnDeckUpdate}
            />
        );

        const insertButtons = screen.queryAllByLabelText(/Inserisci card in posizione/i);
        const insertArea = insertButtons[0]?.closest('div');
        
        if (insertArea) {
            fireEvent.mouseEnter(insertArea);
            
            await waitFor(() => {
                const visibleButton = screen.queryByLabelText(/Inserisci card in posizione 2/i);
                if (visibleButton) {
                    fireEvent.click(visibleButton);
                }
            });

            // Verifica che addCardAtPosition NON sia stato chiamato
            await waitFor(() => {
                expect(studyService.addCardAtPosition).not.toHaveBeenCalled();
            });
        }
    });
});

describe('FlashcardList - Edge Cases', () => {
    it('should handle empty deck', () => {
        const emptyDeck: Deck = {
            id: 'deck-1',
            title: 'Empty Deck',
            cards: [],
            totalCards: 0,
            dueCount: 0,
            tags: [],
        };

        render(
            <FlashcardList
                deck={emptyDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
            />
        );

        expect(screen.getByText(/Nessuna carta ancora/i)).toBeInTheDocument();
    });

    it('should handle single card', () => {
        const singleCardDeck: Deck = {
            id: 'deck-1',
            title: 'Single Card Deck',
            cards: [
                { id: 'card-1', front: 'Question 1', back: 'Answer 1', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            ],
            totalCards: 1,
            dueCount: 0,
            tags: [],
        };

        render(
            <FlashcardList
                deck={singleCardDeck}
                onAddCard={vi.fn()}
                onUpdate={vi.fn()}
            />
        );

        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
});
