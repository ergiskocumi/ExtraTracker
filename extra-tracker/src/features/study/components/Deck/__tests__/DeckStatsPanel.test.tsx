import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeckStatsPanel } from '../DeckStatsPanel';
import type { Deck } from '../../../services/studyService';

const buildCard = (overrides: Record<string, any> = {}) => ({
    id: `card-${Math.random()}`,
    front: 'Domanda',
    back: 'Risposta',
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new' as const,
    ...overrides,
});

const buildDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: 'deck-1',
    title: 'Deck Test',
    tags: [],
    cards: [],
    totalCards: 0,
    dueCount: 0,
    ...overrides,
});

describe('DeckStatsPanel', () => {
    it('shows empty state when deck has no cards', () => {
        render(<DeckStatsPanel deck={buildDeck()} />);
        expect(screen.getByText(/Aggiungi carte per vedere le statistiche/i)).toBeInTheDocument();
    });

    it('renders warning tip when there are many due cards', () => {
        const deck = buildDeck({
            dueCount: 25,
            cards: [
                buildCard({ status: 'learning' }),
                buildCard({ status: 'review' }),
                buildCard({ status: 'mastered' }),
            ],
        });

        render(<DeckStatsPanel deck={deck} />);
        expect(screen.getByText(/Molte carte in scadenza/i)).toBeInTheDocument();
        expect(screen.getByText(/Inizia Studio/i)).toBeInTheDocument();
    });

    it('renders due tip and growth tip when due cards are moderate and new exceeds mastered', () => {
        const deck = buildDeck({
            dueCount: 5,
            cards: [
                buildCard({ id: 'new-1', status: 'new' }),
                buildCard({ id: 'new-2', status: 'new' }),
                buildCard({ id: 'mastered-1', status: 'mastered' }),
                buildCard({ id: 'review-1', status: 'review' }),
            ],
        });

        render(<DeckStatsPanel deck={deck} />);
        expect(screen.getByText(/Carte in scadenza/i)).toBeInTheDocument();
        expect(screen.getByText(/Tante nuove carte/i)).toBeInTheDocument();
    });

    it('renders success tip when mastery exceeds 70%', () => {
        const deck = buildDeck({
            dueCount: 0,
            cards: [
                buildCard({ id: 'm-1', status: 'mastered' }),
                buildCard({ id: 'm-2', status: 'mastered' }),
                buildCard({ id: 'm-3', status: 'mastered' }),
                buildCard({ id: 'r-1', status: 'review' }),
            ],
        });

        render(<DeckStatsPanel deck={deck} />);
        expect(screen.getByText(/Ottimo progresso/i)).toBeInTheDocument();
        expect(screen.getByText(/75% delle carte/i)).toBeInTheDocument();
    });

    it('renders advanced stats and triggers optional quick actions', () => {
        const onSettings = vi.fn();
        const onExport = vi.fn();
        const onShare = vi.fn();
        const onResetProgress = vi.fn();
        const deck = buildDeck({
            dueCount: 2,
            cards: [
                buildCard({ id: 'a', status: 'learning', interval: 2, easinessFactor: 2.4 }),
                buildCard({ id: 'b', status: 'review', interval: 6, easinessFactor: 2.8 }),
                buildCard({ id: 'c', status: 'mastered', interval: 8, easinessFactor: 3.0 }),
            ],
        });

        render(
            <DeckStatsPanel
                deck={deck}
                onSettings={onSettings}
                onExport={onExport}
                onShare={onShare}
                onResetProgress={onResetProgress}
            />
        );

        expect(screen.getByText(/Statistiche Avanzate/i)).toBeInTheDocument();
        expect(screen.getByText(/Intervallo medio/i)).toBeInTheDocument();
        expect(screen.getByText(/Facilità media/i)).toBeInTheDocument();
        expect(screen.getByText(/Tempo stimato/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Impostazioni mazzo/i));
        fireEvent.click(screen.getByText(/Esporta carte/i));
        fireEvent.click(screen.getByText(/Condividi mazzo/i));
        fireEvent.click(screen.getByText(/Reset progresso/i));

        expect(onSettings).toHaveBeenCalledTimes(1);
        expect(onExport).toHaveBeenCalledTimes(1);
        expect(onShare).toHaveBeenCalledTimes(1);
        expect(onResetProgress).toHaveBeenCalledTimes(1);
    });
});
