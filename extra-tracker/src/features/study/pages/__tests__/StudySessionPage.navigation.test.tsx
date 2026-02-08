/**
 * 🧪 TEST: StudySessionPage Navigation
 * 
 * Verifica che il pulsante "indietro" navighi correttamente al dettaglio del mazzo
 * invece della dashboard principale.
 * 
 * Test Cases:
 * 1. Il pulsante "Torna al mazzo" naviga a /study/deck/:deckId
 * 2. Il pulsante X naviga a /study/deck/:deckId
 * 3. In caso di errore, naviga al dettaglio mazzo se deckId disponibile
 * 4. In caso di sessione completata, naviga al dettaglio mazzo
 * 5. Se deckId non disponibile, fallback alla dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StudySessionPage } from '../StudySessionPage';
import * as studyService from '../../services/studyService';

// Mock dependencies
vi.mock('../../services/studyService');
vi.mock('../../../shared/components/toast', () => ({
    emitToast: {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
    },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
let mockDeckId: string | undefined = 'test-deck-id';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ deckId: mockDeckId }),
        useSearchParams: () => [new URLSearchParams(), vi.fn()],
    };
});

describe('StudySessionPage - Navigation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
        mockDeckId = 'test-deck-id';

        (studyService.studyService.getSession as any) = vi.fn().mockResolvedValue({
            deck: {
                id: 'test-deck-id',
                title: 'Test Deck',
                tags: [],
                cards: [],
                totalCards: 1,
                dueCount: 1,
            },
            cards: [
                {
                    id: 'card-1',
                    front: 'Question 1',
                    back: 'Answer 1',
                    status: 'new',
                    easinessFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date().toISOString(),
                },
            ],
            remaining: 1,
            total: 1,
        });
    });

    it('should navigate to deck detail when "Torna al mazzo" button is clicked', async () => {
        render(
            <BrowserRouter>
                <StudySessionPage />
            </BrowserRouter>
        );

        // Wait for component to load
        await waitFor(() => {
            expect(screen.queryByText(/caricamento/i)).not.toBeInTheDocument();
        });

        // Find and click the back button
        const backButton = screen.getByRole('button', { name: /esci/i });
        expect(backButton).toBeInTheDocument();

        fireEvent.click(backButton);

        // Verify navigation
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should navigate to deck detail when X button is clicked', async () => {
        render(
            <BrowserRouter>
                <StudySessionPage />
            </BrowserRouter>
        );

        // Wait for component to load
        await waitFor(() => {
            expect(screen.queryByText(/caricamento/i)).not.toBeInTheDocument();
        });

        const header = document.querySelector('header');
        expect(header).toBeTruthy();
        const headerButtons = within(header as HTMLElement).getAllByRole('button');
        const closeButton = headerButtons[headerButtons.length - 1];
        fireEvent.click(closeButton);
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should navigate to deck detail on error if deckId is available', async () => {
        // Mock error scenario
        (studyService.studyService.getSession as any) = vi.fn().mockRejectedValue(
            new Error('Session error')
        );

        render(
            <BrowserRouter>
                <StudySessionPage />
            </BrowserRouter>
        );

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText(/torna al mazzo/i)).toBeInTheDocument();
        });

        // Click error back button
        const errorButton = screen.getByText(/torna al mazzo/i);
        fireEvent.click(errorButton);

        // Verify navigation to deck detail
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should navigate to dashboard if deckId is not available', async () => {
        mockDeckId = undefined;

        (studyService.studyService.getSession as any) = vi.fn().mockRejectedValue(
            new Error('Session error')
        );

        render(
            <BrowserRouter>
                <StudySessionPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /torna al mazzo/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /torna al mazzo/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/study');
    });

});
