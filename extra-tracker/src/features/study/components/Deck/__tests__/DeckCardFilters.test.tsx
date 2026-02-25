import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeckCardFilters } from '../DeckCardFilters';

const buildProps = () => ({
    activeFilter: 'all' as const,
    onFilterChange: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    sortBy: 'order' as const,
    onSortChange: vi.fn(),
    counts: {
        all: 10,
        new: 3,
        learning: 2,
        review: 4,
        mastered: 1,
    },
});

describe('DeckCardFilters', () => {
    it('renders tabs with counts and changes active filter', () => {
        const props = buildProps();
        render(<DeckCardFilters {...props} />);

        expect(screen.getByRole('button', { name: /Tutte/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Nuove/i })).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Nuove/i }));
        expect(props.onFilterChange).toHaveBeenCalledWith('new');
    });

    it('updates search query and clears it with clear icon button', () => {
        const props = buildProps();
        const { rerender } = render(<DeckCardFilters {...props} />);

        let searchInput = screen.getByPlaceholderText(/Cerca carte/i);
        fireEvent.change(searchInput, { target: { value: 'biochimica' } });
        expect(props.onSearchChange).toHaveBeenCalledWith('biochimica');

        rerender(
            <DeckCardFilters
                {...props}
                searchQuery="biochimica"
            />
        );

        searchInput = screen.getByPlaceholderText(/Cerca carte/i);
        const clearButton = searchInput.parentElement?.querySelector('button') as HTMLButtonElement;
        fireEvent.click(clearButton);

        expect(props.onSearchChange).toHaveBeenCalledWith('');
    });

    it('changes sort option', () => {
        const props = buildProps();
        render(<DeckCardFilters {...props} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'interval' } });
        expect(props.onSortChange).toHaveBeenCalledWith('interval');
    });

    it('shows clear filters CTA only with active filter/search and resets both', () => {
        const props = buildProps();
        const { rerender } = render(<DeckCardFilters {...props} />);

        expect(screen.queryByText(/Cancella filtri/i)).not.toBeInTheDocument();

        rerender(
            <DeckCardFilters
                {...props}
                activeFilter="review"
                searchQuery="termine"
            />
        );

        fireEvent.click(screen.getByText(/Cancella filtri/i));
        expect(props.onFilterChange).toHaveBeenCalledWith('all');
        expect(props.onSearchChange).toHaveBeenCalledWith('');
    });
});
