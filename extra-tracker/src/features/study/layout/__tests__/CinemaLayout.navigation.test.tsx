/**
 * 🧪 TEST: CinemaLayout Navigation
 * 
 * Verifica che il pulsante "indietro" nel layout Cinema navighi correttamente
 * al dettaglio del mazzo.
 * 
 * Test Cases:
 * 1. Il pulsante "Torna al mazzo" naviga a /study/deck/:deckId quando onNavigateBack non è fornito
 * 2. Usa onNavigateBack callback se fornito come prop
 * 3. Fallback alla dashboard se deckId non disponibile
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CinemaLayout } from '../CinemaLayout';
import type { Deck } from '../../services/studyService';

// Mock dependencies
vi.mock('../../components/PDF/FluidPDFViewer', () => ({
    FluidPDFViewer: ({ pdfUrl }: { pdfUrl: string }) => (
        <div data-testid="pdf-viewer">{pdfUrl}</div>
    ),
}));

vi.mock('../../components/Study/StudySidebar', () => ({
    StudySidebar: ({ deck }: { deck: Deck }) => (
        <div data-testid="study-sidebar">{deck.title}</div>
    ),
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

describe('CinemaLayout - Navigation Tests', () => {
    const mockDeck: Deck = {
        id: 'test-deck-id',
        title: 'Test Deck',
        cards: [],
        pdfUrl: 'https://example.com/test.pdf',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
    });

    it('should navigate to deck detail when back button is clicked without onNavigateBack prop', () => {
        render(
            <BrowserRouter>
                <CinemaLayout
                    deck={mockDeck}
                    pdfSrc={mockDeck.pdfUrl}
                    onAddCard={vi.fn()}
                    onUpdateCard={vi.fn()}
                />
            </BrowserRouter>
        );

        // Find and click the back button
        const backButton = screen.getByLabelText(/torna al mazzo/i);
        expect(backButton).toBeInTheDocument();

        fireEvent.click(backButton);

        // Verify navigation to deck detail
        expect(mockNavigate).toHaveBeenCalledWith('/study/deck/test-deck-id');
    });

    it('should use onNavigateBack callback when provided', () => {
        const mockOnNavigateBack = vi.fn();

        render(
            <BrowserRouter>
                <CinemaLayout
                    deck={mockDeck}
                    pdfSrc={mockDeck.pdfUrl}
                    onAddCard={vi.fn()}
                    onUpdateCard={vi.fn()}
                    onNavigateBack={mockOnNavigateBack}
                />
            </BrowserRouter>
        );

        // Find and click the back button
        const backButton = screen.getByLabelText(/torna al mazzo/i);
        fireEvent.click(backButton);

        // Verify custom callback was called
        expect(mockOnNavigateBack).toHaveBeenCalledTimes(1);
        // Should not use default navigation
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should fallback to dashboard if deckId is not available', () => {
        // Mock scenario without deckId
        vi.mock('react-router-dom', async () => {
            const actual = await vi.importActual('react-router-dom');
            return {
                ...actual,
                useNavigate: () => mockNavigate,
                useParams: () => ({ deckId: undefined }),
            };
        });

        render(
            <BrowserRouter>
                <CinemaLayout
                    deck={mockDeck}
                    pdfSrc={mockDeck.pdfUrl}
                    onAddCard={vi.fn()}
                    onUpdateCard={vi.fn()}
                />
            </BrowserRouter>
        );

        // Find and click the back button
        const backButton = screen.getByLabelText(/torna al mazzo/i);
        fireEvent.click(backButton);

        // Should fallback to dashboard
        expect(mockNavigate).toHaveBeenCalledWith('/study');
    });
});
