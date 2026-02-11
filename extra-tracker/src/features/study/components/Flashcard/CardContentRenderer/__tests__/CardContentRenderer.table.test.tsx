import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardContentRenderer } from '../index';

describe('CardContentRenderer table theme contract', () => {
    it('renders markdown tables with shared themed table classes', () => {
        const markdownTable = [
            '| Campo | Valore |',
            '| --- | --- |',
            '| Stato | Attivo |',
            '| Priorita | Alta |',
        ].join('\n');

        render(<CardContentRenderer content={markdownTable} variant="answer" />);

        const table = screen.getByRole('table');

        expect(table).toHaveClass('table-modern');
        expect(table).toHaveClass('table-modern--compact');

        const wrapper = table.closest('div');
        expect(wrapper).toHaveClass('border-theme-default');
        expect(wrapper).toHaveClass('bg-theme-elevated');
        expect(wrapper).toHaveClass('shadow-theme-sm');
    });
});
