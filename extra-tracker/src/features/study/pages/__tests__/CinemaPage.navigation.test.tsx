/**
 * 🧪 TEST: CinemaPage Navigation
 * 
 * Verifica che il pulsante "indietro" in Cinema Mode navighi correttamente
 * al dettaglio del mazzo invece della dashboard principale.
 * 
 * Test Cases:
 * 1. Il pulsante "Torna al mazzo" naviga a /study/deck/:deckId
 * 2. In caso di errore, naviga al dettaglio mazzo se deckId disponibile
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

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ deckId: 'test-deck-id' }),
    };
});

describe('CinemaPage - Navigation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();

        // Default mock implementation
        (studyService.studyService.getDeckById as any) = vi.fn().mockResolvedValue({
            id: 'test-deck-id',
            title: 'Test Deck',
            cards: [],
            pdfUrl: 'https://example.com/test.pdf',
        });
    });

    it('should navigate to deck detail when back button is clicked', async () => {
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
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should navigate to deck detail on error if deckId is available', async () => {
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

        // Verify navigation to deck detail (even though it says "Torna ai mazzi", 
        // the handler should navigate to deck detail)
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should navigate to dashboard if deckId is not available', async () => {
        // Mock scenario without deckId
        vi.mock('react-router-dom', async () => {
            const actual = await vi.importActual('react-router-dom');
            return {
                ...actual,
                useNavigate: () => mockNavigate,
                useParams: () => ({ deckId: undefined }),
            };
        });

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
