import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { DeckDetailHeader } from '../DeckDetailHeader';
import type { Deck } from '../../../services/studyService';

const buildDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: 'deck-1',
    title: 'Anatomia Umana',
    description: 'Deck di prova',
    tags: ['medicina', 'biologia'],
    cards: [
        {
            id: 'c1',
            front: 'Q1',
            back: 'A1',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
        {
            id: 'c2',
            front: 'Q2',
            back: 'A2',
            easinessFactor: 2.7,
            interval: 4,
            repetitions: 2,
            nextReviewDate: new Date().toISOString(),
            status: 'learning',
        },
        {
            id: 'c3',
            front: 'Q3',
            back: 'A3',
            easinessFactor: 3.0,
            interval: 8,
            repetitions: 5,
            nextReviewDate: new Date().toISOString(),
            status: 'mastered',
        },
    ],
    totalCards: 3,
    dueCount: 2,
    ...overrides,
});

const buildProps = (overrides: Partial<ComponentProps<typeof DeckDetailHeader>> = {}) => ({
    deck: buildDeck(),
    onBack: vi.fn(),
    onStudy: vi.fn(),
    onGenerateQuiz: vi.fn(),
    onExamSolver: vi.fn(),
    onAddCard: vi.fn(),
    onReadPdf: vi.fn(),
    onMagicGenerate: vi.fn(),
    onDeleteDeck: vi.fn(),
    onEditDeck: vi.fn(),
    ...overrides,
});

describe('DeckDetailHeader', () => {
    it('renders title, description, tags and due badge', () => {
        const props = buildProps();
        render(<DeckDetailHeader {...props} />);

        expect(screen.getByText('Anatomia Umana')).toBeInTheDocument();
        expect(screen.getByText('Deck di prova')).toBeInTheDocument();
        expect(screen.getByText(/2 da fare/i)).toBeInTheDocument();
        expect(screen.getByText('medicina')).toBeInTheDocument();
        expect(screen.getByText('biologia')).toBeInTheDocument();
    });

    it('runs top-level actions (back, read PDF, exam solver, study)', () => {
        const props = buildProps({
            deck: buildDeck({ pdfUrl: 'https://example.com/notes.pdf' }),
        });
        render(<DeckDetailHeader {...props} />);

        fireEvent.click(screen.getByRole('button', { name: /Torna indietro/i }));
        fireEvent.click(screen.getByRole('button', { name: /PDF/i }));
        fireEvent.click(screen.getByRole('button', { name: /Exam Solver/i }));
        fireEvent.click(screen.getByRole('button', { name: /Studia/i }));

        expect(props.onBack).toHaveBeenCalledTimes(1);
        expect(props.onReadPdf).toHaveBeenCalledTimes(1);
        expect(props.onExamSolver).toHaveBeenCalledTimes(1);
        expect(props.onStudy).toHaveBeenCalledTimes(1);
    });

    it('hides optional actions when deck has no cards and disables study', () => {
        const props = buildProps({
            deck: buildDeck({ cards: [], totalCards: 0, dueCount: 0, tags: [] }),
            onExamSolver: vi.fn(),
            onReadPdf: vi.fn(),
        });
        render(
            <DeckDetailHeader
                {...props}
                deck={{ ...props.deck, pdfUrl: null }}
            />
        );

        expect(screen.queryByRole('button', { name: /Exam Solver/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /PDF/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Studia/i })).toBeDisabled();
    });

    it('allows quiz generation from PDF even when there are fewer than 10 cards', () => {
        const props = buildProps({
            deck: buildDeck({ pdfUrl: 'https://example.com/notes.pdf' }),
        });
        render(<DeckDetailHeader {...props} />);

        const generateButton = screen.getByRole('button', { name: /Genera Quiz/i });
        expect(generateButton).toBeEnabled();

        fireEvent.click(generateButton);
        expect(props.onGenerateQuiz).toHaveBeenCalledTimes(1);
    });

    it('renders distribution legend and mastery progress labels', () => {
        const props = buildProps({
            deck: buildDeck({
                cards: [
                    { ...buildDeck().cards[0], id: 'new', status: 'new' },
                    { ...buildDeck().cards[0], id: 'learning', status: 'learning' },
                    { ...buildDeck().cards[0], id: 'review', status: 'review' },
                    { ...buildDeck().cards[0], id: 'mastered', status: 'mastered' },
                ],
                dueCount: 1,
            }),
        });
        render(<DeckDetailHeader {...props} />);

        expect(screen.getByText(/Distribuzione Carte/i)).toBeInTheDocument();
        expect(screen.getByText(/Nuove \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Studio \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Ripasso \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Padroneggiate \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Progresso Padronanza/i)).toBeInTheDocument();
        expect(screen.getAllByText('25%').length).toBeGreaterThanOrEqual(1);
    });
});
