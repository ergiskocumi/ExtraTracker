import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckCardFilters } from '../DeckCardFilters';

describe('DeckCardFilters theme contract', () => {
    it('renders semantic theme classes for active tab and search controls', () => {
        const onFilterChange = vi.fn();
        const onSearchChange = vi.fn();
        const onSortChange = vi.fn();

        render(
            <DeckCardFilters
                activeFilter="all"
                onFilterChange={onFilterChange}
                searchQuery=""
                onSearchChange={onSearchChange}
                sortBy="order"
                onSortChange={onSortChange}
                counts={{ all: 12, new: 5, learning: 3, review: 2, mastered: 2 }}
            />
        );

        const allTab = screen.getByRole('button', { name: /tutte/i });
        expect(allTab).toHaveClass('bg-theme-surface');
        expect(allTab).toHaveClass('border-theme-strong');

        const searchInput = screen.getByPlaceholderText(/cerca carte/i);
        expect(searchInput).toHaveClass('bg-theme-card');
        expect(searchInput).toHaveClass('border-theme-default');
    });
});
