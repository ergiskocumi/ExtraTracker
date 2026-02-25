import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFChat } from '../PDFChat';

vi.mock('../../../services/studyService', () => ({
    studyService: {
        askTutor: vi.fn(),
    },
}));

describe('PDFChat theme contract', () => {
    it('renders assistant shell and textarea with semantic theme classes', () => {
        render(<PDFChat deckId="deck-theme-chat" disabled={true} />);

        expect(screen.getByText(/Ciao! Sono il tuo AI Tutor/i)).toBeInTheDocument();

        const textarea = screen.getByPlaceholderText(/Chat non disponibile/i);
        expect(textarea).toHaveClass('bg-theme-elevated');
        expect(textarea).toHaveClass('border-theme-default');
    });
});
