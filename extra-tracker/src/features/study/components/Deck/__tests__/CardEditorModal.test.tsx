import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CardEditorModal } from '../CardEditorModal';

vi.mock('../../Flashcard/CardContentRenderer', () => ({
    CardContentRenderer: ({ content }: { content: string }) => (
        <div data-testid="card-content-renderer">{content}</div>
    ),
}));

const buildProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    frontContent: 'Domanda iniziale',
    backContent: 'Risposta iniziale',
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    title: 'Editor Carta',
    cardNumber: 2,
    totalCards: 5,
    onNavigate: vi.fn(),
});

describe('CardEditorModal', () => {
    it('returns null when closed', () => {
        const props = buildProps();
        render(
            <CardEditorModal
                {...props}
                isOpen={false}
            />
        );

        expect(screen.queryByText(/Editor Carta/i)).not.toBeInTheDocument();
    });

    it('renders modal, switches tabs and handles optional actions', async () => {
        const props = buildProps();
        render(<CardEditorModal {...props} />);

        expect(screen.getByText('Editor Carta')).toBeInTheDocument();
        expect(screen.getByText(/Carta 2 di 5/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Anteprima/i));
        expect(screen.getAllByTestId('card-content-renderer')).toHaveLength(2);
        expect(screen.getByText('Domanda iniziale')).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Modifica/i));
        expect(screen.getByPlaceholderText(/Scrivi la domanda/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Scrivi la risposta/i)).toBeInTheDocument();

        fireEvent.click(screen.getByTitle(/Carta precedente/i));
        fireEvent.click(screen.getByTitle(/Carta successiva/i));
        fireEvent.click(screen.getByText(/Elimina/i));
        fireEvent.click(screen.getByText(/Annulla/i));

        expect(props.onNavigate).toHaveBeenNthCalledWith(1, 'prev');
        expect(props.onNavigate).toHaveBeenNthCalledWith(2, 'next');
        expect(props.onDelete).toHaveBeenCalledTimes(1);
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('handles toolbar interaction and saves trimmed values', async () => {
        const props = buildProps();
        render(
            <CardEditorModal
                {...props}
                frontContent="  Front test  "
                backContent=" Back test "
            />
        );

        const frontTextarea = screen.getByPlaceholderText(/Scrivi la domanda/i) as HTMLTextAreaElement;
        fireEvent.click(screen.getAllByTitle(/Grassetto/i)[0]);

        fireEvent.change(frontTextarea, { target: { value: '  Front aggiornato  ' } });
        fireEvent.change(screen.getByPlaceholderText(/Scrivi la risposta/i), { target: { value: '  Back aggiornato  ' } });

        fireEvent.click(screen.getByRole('button', { name: /Salva/i }));
        await waitFor(() => {
            expect(props.onSave).toHaveBeenCalledTimes(1);
            const [savedFront, savedBack] = props.onSave.mock.calls[0];
            expect(savedFront).toContain('Front');
            expect(savedBack).toBe('Back aggiornato');
            expect(props.onClose).toHaveBeenCalledTimes(1);
        });
    });

    it('supports keyboard shortcuts for save/close/navigation', async () => {
        const props = buildProps();
        render(<CardEditorModal {...props} />);

        fireEvent.keyDown(window, { key: 's', ctrlKey: true });
        await waitFor(() => {
            expect(props.onSave).toHaveBeenCalled();
        });

        fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
        fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true });
        expect(props.onNavigate).toHaveBeenCalledWith('prev');
        expect(props.onNavigate).toHaveBeenCalledWith('next');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(props.onClose).toHaveBeenCalled();
    });

    it('shows preview empty-state when side content is missing', () => {
        const props = buildProps();
        render(
            <CardEditorModal
                {...props}
                frontContent=""
                backContent=""
            />
        );

        fireEvent.click(screen.getByText(/Anteprima/i));
        expect(screen.getAllByText(/Nessun contenuto/i)).toHaveLength(2);
    });

    it('logs save errors and keeps modal open', async () => {
        const saveError = new Error('Save failed');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const props = buildProps();
        props.onSave.mockRejectedValue(saveError);

        render(<CardEditorModal {...props} />);

        fireEvent.click(screen.getByRole('button', { name: /Salva/i }));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Error saving card:', saveError);
        });
        expect(props.onClose).not.toHaveBeenCalled();
    });

    it('closes when backdrop is clicked and prevents close while saving', async () => {
        let resolveSave: (() => void) | null = null;
        const onSave = vi.fn().mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                })
        );
        const props = buildProps();
        render(
            <CardEditorModal
                {...props}
                onSave={onSave}
            />
        );

        const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
        fireEvent.click(backdrop);
        expect(props.onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /Salva/i }));
        expect(await screen.findByText(/Salvataggio/i)).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.click(backdrop);
        expect(props.onClose).toHaveBeenCalledTimes(1);

        resolveSave?.();
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });
});
