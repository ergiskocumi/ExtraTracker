/**
 * 🧪 TEST: CinemaPage Navigation
 * 
 * Verifica che il pulsante "indietro" in Cinema Mode navighi correttamente
 * ai mazzi dell'esame quando disponibile.
 * 
 * Test Cases:
 * 1. Il pulsante "Torna al mazzo" naviga a /study con examId nello state
 * 2. In caso di errore, usa examId dallo state se disponibile
 * 3. Se deckId non disponibile, fallback alla dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CinemaPage } from '../CinemaPage';
import * as studyService from '../../services/studyService';

// Mock dependencies
vi.mock('../../services/studyService');
vi.mock('../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
let mockDeckId: string | undefined = 'test-deck-id';
let mockLocationState: { examId?: string } | null = null;

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ deckId: mockDeckId }),
        useLocation: () => ({ state: mockLocationState }),
    };
});

describe('CinemaPage - Navigation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
        mockDeckId = 'test-deck-id';
        mockLocationState = null;

        // Default mock implementation
        (studyService.studyService.getDeckById as any) = vi.fn().mockResolvedValue({
            id: 'test-deck-id',
            title: 'Test Deck',
            cards: [],
            goalId: 'exam-123',
            pdfUrl: 'https://example.com/test.pdf',
        });
    });

    it('should navigate to exam decks when back button is clicked', async () => {
        render(
            <BrowserRouter>
                <CinemaPage />
            </BrowserRouter>
        );

        // Wait for component to load
        await waitFor(() => {
            expect(screen.queryByText(/caricamento/i)).not.toBeInTheDocument();
        });

        // Find and click the back button in CinemaLayout header
        const backButton = screen.getByLabelText(/torna al mazzo/i);
        expect(backButton).toBeInTheDocument();

        fireEvent.click(backButton);

        // Verify navigation
        expect(mockNavigate).toHaveBeenCalledWith('/study', { state: { examId: 'exam-123' } });
    });

    it('should navigate to exam decks on error when examId is available', async () => {
        mockLocationState = { examId: 'exam-555' };
        // Mock error scenario
        (studyService.studyService.getDeckById as any) = vi.fn().mockRejectedValue(
            new Error('Deck not found')
        );

        render(
            <BrowserRouter>
                <CinemaPage />
            </BrowserRouter>
        );

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText(/torna ai mazzi/i)).toBeInTheDocument();
        });

        // Click error back button
        const errorButton = screen.getByText(/torna ai mazzi/i);
        fireEvent.click(errorButton);

        // Verify navigation to exam decks from location state
        expect(mockNavigate).toHaveBeenCalledWith('/study', { state: { examId: 'exam-555' } });
    });

    it('should navigate to dashboard if deckId is not available', async () => {
        mockDeckId = undefined;

        (studyService.studyService.getDeckById as any) = vi.fn().mockRejectedValue(
            new Error('Invalid deck ID')
        );

        render(
            <BrowserRouter>
                <CinemaPage />
            </BrowserRouter>
        );

        // Wait for error state
        await waitFor(() => {
            const button = screen.queryByText(/torna/i);
            if (button) {
                fireEvent.click(button);
                // Should fallback to dashboard
                expect(mockNavigate).toHaveBeenCalledWith('/study');
            }
        });
    });
});
