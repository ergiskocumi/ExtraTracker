import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardItem } from '../FlashcardItem';
import type { Card } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';

vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../FlashcardItem.ViewMode', () => ({
    ViewMode: ({
        onEdit,
        onShowSource,
        onDelete,
    }: {
        onEdit: () => void;
        onShowSource?: (e: React.MouseEvent) => void;
        onDelete?: (cardId: string) => void;
    }) => (
        <div data-testid="view-mode">
            <button type="button" onClick={onEdit}>
                edit-card
            </button>
            <button type="button" onClick={(e) => onShowSource?.(e as unknown as React.MouseEvent)}>
                show-source
            </button>
            <button type="button" onClick={() => onDelete?.('card-1')}>
                delete-card
            </button>
        </div>
    ),
}));

vi.mock('../FlashcardItem.EditMode', () => ({
    EditMode: ({
        onFrontChange,
        onBackChange,
        onSave,
        onCancel,
        canSave,
        isSaving,
    }: {
        onFrontChange: (value: string) => void;
        onBackChange: (value: string) => void;
        onSave: () => void;
        onCancel: () => void;
        canSave: boolean;
        isSaving: boolean;
    }) => (
        <div data-testid="edit-mode">
            <button type="button" onClick={() => onFrontChange('  updated front  ')}>
                change-front
            </button>
            <button type="button" onClick={() => onBackChange('  updated back  ')}>
                change-back
            </button>
            <button type="button" onClick={onCancel}>
                cancel-edit
            </button>
            <button type="button" onClick={onSave}>
                force-save
            </button>
            <button type="button" onClick={onSave} disabled={!canSave}>
                safe-save
            </button>
            {isSaving ? <span>saving</span> : <span>idle</span>}
        </div>
    ),
}));

vi.mock('../CardEditor', () => ({
    FullscreenEditModal: ({
        isOpen,
        onClose,
        onSave,
    }: {
        isOpen: boolean;
        onClose: () => void;
        onSave: (front: string, back: string) => Promise<void>;
    }) =>
        isOpen ? (
            <div data-testid="fullscreen-modal">
                <button
                    type="button"
                    onClick={() => {
                        void onSave('updated front', 'updated back').catch(() => {});
                    }}
                >
                    modal-save
                </button>
                <button type="button" onClick={onClose}>
                    modal-close
                </button>
            </div>
        ) : null,
}));

const baseCard: Card = {
    id: 'card-1',
    front: 'front',
    back: 'back',
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new',
};

const renderCard = (overrides: Partial<React.ComponentProps<typeof FlashcardItem>> = {}) => {
    const props: React.ComponentProps<typeof FlashcardItem> = {
        card: baseCard,
        onUpdate: vi.fn().mockResolvedValue(undefined),
        onClick: vi.fn(),
        ...overrides,
    };
    const utils = render(<FlashcardItem {...props} />);
    return { ...utils, props };
};

describe('FlashcardItem', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('triggers card click when clicking on card container', () => {
        const { container, props } = renderCard();
        const clickableCard = container.querySelector('.group');

        expect(clickableCard).toBeInTheDocument();
        fireEvent.click(clickableCard as Element);

        expect(props.onClick).toHaveBeenCalledWith(baseCard);
    });

    it('opens fullscreen modal for normal cards and saves successfully', async () => {
        const onUpdate = vi.fn().mockResolvedValue(undefined);
        renderCard({ onUpdate });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        expect(screen.getByTestId('fullscreen-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'modal-save' }));

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith('card-1', 'updated front', 'updated back');
            expect(emitToast.success).toHaveBeenCalled();
        });
    });

    it('shows toast error when fullscreen save fails', async () => {
        const onUpdate = vi.fn().mockRejectedValue(new Error('modal-save-failed'));
        renderCard({ onUpdate });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        fireEvent.click(screen.getByRole('button', { name: 'modal-save' }));

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('modal-save-failed', expect.any(Object));
        });
    });

    it('uses inline edit flow for temporary cards and calls onCreate', async () => {
        const onCreate = vi.fn().mockResolvedValue(undefined);
        const onEditingChange = vi.fn();
        renderCard({
            card: { ...baseCard, id: 'temp-123', front: 'temp front', back: 'temp back' },
            onCreate,
            onEditingChange,
        });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        expect(screen.getByTestId('edit-mode')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'change-front' }));
        fireEvent.click(screen.getByRole('button', { name: 'change-back' }));
        fireEvent.click(screen.getByRole('button', { name: 'safe-save' }));

        await waitFor(() => {
            expect(onCreate).toHaveBeenCalledWith('updated front', 'updated back');
        });

        expect(onEditingChange).toHaveBeenCalledWith(true);
        expect(onEditingChange).toHaveBeenCalledWith(false);
    });

    it('uses inline edit flow in compact mode for existing cards', async () => {
        const onUpdate = vi.fn().mockResolvedValue(undefined);
        const onEditingChange = vi.fn();
        renderCard({
            compactMode: true,
            onUpdate,
            onEditingChange,
        });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        fireEvent.click(screen.getByRole('button', { name: 'change-front' }));
        fireEvent.click(screen.getByRole('button', { name: 'change-back' }));
        fireEvent.click(screen.getByRole('button', { name: 'safe-save' }));

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith('card-1', 'updated front', 'updated back');
            expect(emitToast.success).toHaveBeenCalled();
        });

        expect(onEditingChange).toHaveBeenCalledWith(true);
        expect(onEditingChange).toHaveBeenCalledWith(false);
    });

    it('keeps editing mode and shows error when inline save fails', async () => {
        const onUpdate = vi.fn().mockRejectedValue(new Error('inline-save-failed'));
        renderCard({
            compactMode: true,
            onUpdate,
        });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        fireEvent.click(screen.getByRole('button', { name: 'change-front' }));
        fireEvent.click(screen.getByRole('button', { name: 'change-back' }));
        fireEvent.click(screen.getByRole('button', { name: 'safe-save' }));

        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('inline-save-failed', expect.any(Object));
            expect(screen.getByTestId('edit-mode')).toBeInTheDocument();
        });
    });

    it('does not save when validation forbids it', async () => {
        const onUpdate = vi.fn().mockResolvedValue(undefined);
        renderCard({ compactMode: true, onUpdate });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        fireEvent.click(screen.getByRole('button', { name: 'force-save' }));

        await waitFor(() => {
            expect(onUpdate).not.toHaveBeenCalled();
        });
    });

    it('cancels edit flow and calls optional onCancel callback', async () => {
        const onCancel = vi.fn();
        renderCard({
            card: { ...baseCard, id: 'temp-456', front: 'f1', back: 'b1' },
            onCreate: vi.fn().mockResolvedValue(undefined),
            onCancel,
        });

        fireEvent.click(screen.getByRole('button', { name: 'edit-card' }));
        expect(screen.getByTestId('edit-mode')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'cancel-edit' }));

        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledTimes(1);
            expect(screen.queryByTestId('edit-mode')).not.toBeInTheDocument();
        });
    });

    it('handles show source only when metadata exists', async () => {
        const onShowSource = vi.fn();
        const { rerender } = render(
            <FlashcardItem
                card={baseCard}
                onUpdate={vi.fn().mockResolvedValue(undefined)}
                onShowSource={onShowSource}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'show-source' }));
        expect(onShowSource).not.toHaveBeenCalled();

        rerender(
            <FlashcardItem
                card={{
                    ...baseCard,
                    sourceMetadata: {
                        pageNumber: 3,
                        originalText: 'source',
                    },
                }}
                onUpdate={vi.fn().mockResolvedValue(undefined)}
                onShowSource={onShowSource}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'show-source' }));

        await waitFor(() => {
            expect(onShowSource).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'card-1' })
            );
        });
    });
});

