import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GenerateQuizModal } from '../GenerateQuizModal';

describe('GenerateQuizModal', () => {
    it('shows AI true/false copy when a PDF is available', () => {
        render(
            <GenerateQuizModal
                isOpen
                totalCards={12}
                hasPdf
                onClose={vi.fn()}
                onGenerate={vi.fn()}
            />
        );

        expect(
            screen.getByText(/Affermazioni AI dal contenuto del capitolo/i)
        ).toBeInTheDocument();
    });

    it('shows fallback true/false copy when no PDF is available', () => {
        render(
            <GenerateQuizModal
                isOpen
                totalCards={12}
                hasPdf={false}
                onClose={vi.fn()}
                onGenerate={vi.fn()}
            />
        );

        expect(
            screen.getByText(/Affermazioni V\/F per ripasso rapido/i)
        ).toBeInTheDocument();
    });

    it('allows true/false generation from PDF even with fewer than 10 cards', () => {
        render(
            <GenerateQuizModal
                isOpen
                totalCards={2}
                hasPdf
                onClose={vi.fn()}
                onGenerate={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Vero o Falso/i }));

        expect(screen.getByRole('button', { name: /Genera Quiz/i })).toBeEnabled();
    });
});
