import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { CinemaLayout } from '../CinemaLayout';
import type { Deck } from '../../services/studyService';

vi.mock('react-resizable-panels', () => ({
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="panels-group">{children}</div>,
    Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
    Separator: ({ children }: { children?: React.ReactNode }) => <div data-testid="panel-separator">{children}</div>,
}));

vi.mock('../../components/PDF/PDFReaderLazy', () => ({
    default: () => <div data-testid="pdf-viewer" />,
}));

vi.mock('../../components/Study/StudySidebar', () => ({
    StudySidebar: () => <div data-testid="study-sidebar" />,
}));

describe('CinemaLayout theme contract', () => {
    const mockDeck: Deck = {
        id: 'deck-theme-1',
        title: 'Deck Theme',
        cards: [],
        pdfUrl: '/uploads/pdfs/test.pdf',
        tags: [],
        totalCards: 0,
        dueCount: 0,
    };

    it('renders semantic theme shell and panel surfaces', () => {
        const { container } = render(
            <BrowserRouter>
                <CinemaLayout
                    deck={mockDeck}
                    pdfSrc={mockDeck.pdfUrl}
                    onUpdateCard={vi.fn()}
                />
            </BrowserRouter>
        );

        expect(container.querySelector('.bg-theme-base')).toBeInTheDocument();
        expect(container.querySelectorAll('.border-theme-default').length).toBeGreaterThanOrEqual(2);
        expect(container.querySelector('.bg-theme-elevated')).toBeInTheDocument();
    });
});
