import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../FlashcardList.Header';

describe('FlashcardList Header', () => {
    it('renders singular count and add action', () => {
        const onAddCard = vi.fn();

        render(
            <Header
                cardCount={1}
                showBackButton={false}
                showAddButton
                onAddCard={onAddCard}
            />
        );

        expect(screen.getByText('1 carta')).toBeInTheDocument();
        expect(screen.queryByLabelText('Torna al mazzo')).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Aggiungi carta'));
        expect(onAddCard).toHaveBeenCalledTimes(1);
    });

    it('renders plural count and both actions when callbacks are provided', () => {
        const onAddCard = vi.fn();
        const onNavigateBack = vi.fn();

        render(
            <Header
                cardCount={3}
                showBackButton
                showAddButton
                onAddCard={onAddCard}
                onNavigateBack={onNavigateBack}
            />
        );

        expect(screen.getByText('3 carte')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Torna al mazzo'));
        fireEvent.click(screen.getByLabelText('Aggiungi carta'));

        expect(onNavigateBack).toHaveBeenCalledTimes(1);
        expect(onAddCard).toHaveBeenCalledTimes(1);
    });

    it('hides back button when callback is missing', () => {
        render(
            <Header
                cardCount={2}
                showBackButton
                showAddButton={false}
                onAddCard={vi.fn()}
            />
        );

        expect(screen.queryByLabelText('Torna al mazzo')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Aggiungi carta')).not.toBeInTheDocument();
    });
});

