import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardInlineForm } from '../FlashcardInlineForm';

vi.mock('../CardEditor', () => ({
    MarkdownEditor: ({
        value,
        onChange,
        placeholder,
        disabled,
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        disabled?: boolean;
    }) => (
        <textarea
            aria-label={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
        />
    ),
}));

const getSaveButton = () => screen.getByRole('button', { name: /Salva|Salvataggio/i });
const getCancelButton = () => screen.getByRole('button', { name: /Annulla/i });

describe('FlashcardInlineForm', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('does not save when fields are empty', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<FlashcardInlineForm onSave={onSave} onCancel={vi.fn()} />);

        fireEvent.click(getSaveButton());

        await waitFor(() => {
            expect(onSave).not.toHaveBeenCalled();
            expect(getSaveButton()).toBeDisabled();
        });
    });

    it('trims values and saves when both fields are valid', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<FlashcardInlineForm onSave={onSave} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Inserisci la domanda...'), {
            target: { value: '  Domanda test  ' },
        });
        fireEvent.change(screen.getByLabelText('Inserisci la risposta...'), {
            target: { value: '  Risposta test  ' },
        });

        fireEvent.click(getSaveButton());

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
            expect(onSave).toHaveBeenCalledWith('Domanda test', 'Risposta test');
        });
    });

    it('calls onCancel from action bar', () => {
        const onCancel = vi.fn();
        render(<FlashcardInlineForm onSave={vi.fn()} onCancel={onCancel} />);

        fireEvent.click(getCancelButton());

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('shows saving state and disables controls while save is pending', async () => {
        let resolveSave: (() => void) | null = null;
        const onSave = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                })
        );

        render(<FlashcardInlineForm onSave={onSave} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Inserisci la domanda...'), {
            target: { value: 'Domanda' },
        });
        fireEvent.change(screen.getByLabelText('Inserisci la risposta...'), {
            target: { value: 'Risposta' },
        });

        fireEvent.click(getSaveButton());

        await waitFor(() => {
            expect(screen.getByText('Salvataggio...')).toBeInTheDocument();
            expect(getCancelButton()).toBeDisabled();
            expect(screen.getByLabelText('Inserisci la domanda...')).toBeDisabled();
            expect(screen.getByLabelText('Inserisci la risposta...')).toBeDisabled();
        });

        resolveSave!();

        await waitFor(() => {
            expect(screen.getByText('Salva')).toBeInTheDocument();
            expect(getCancelButton()).not.toBeDisabled();
        });
    });

    it('handles save errors and restores normal state', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onSave = vi.fn().mockRejectedValue(new Error('save-failed'));

        render(<FlashcardInlineForm onSave={onSave} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Inserisci la domanda...'), {
            target: { value: 'Domanda' },
        });
        fireEvent.change(screen.getByLabelText('Inserisci la risposta...'), {
            target: { value: 'Risposta' },
        });

        fireEvent.click(getSaveButton());

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving card:', expect.any(Error));
            expect(screen.getByText('Salva')).toBeInTheDocument();
        });
    });
});

