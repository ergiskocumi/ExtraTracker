import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewMode } from '../FlashcardItem.ViewMode';
import { EditMode } from '../FlashcardItem.EditMode';
import { TEXT_CONTENT } from '../FlashcardItem.constants';
import type { Card } from '../../../services/studyService';
import type { ButtonState } from '../FlashcardItem.types';

vi.mock('../CardContentRenderer/index', () => ({
    CardContentRenderer: ({
        content,
        variant,
    }: {
        content: string;
        variant: string;
    }) => <div data-testid={`renderer-${variant}`}>{content}</div>,
}));

vi.mock('../CardEditor', () => ({
    MarkdownEditor: ({
        value,
        onChange,
        label,
        placeholder,
        disabled,
    }: {
        value: string;
        onChange: (value: string) => void;
        label?: string;
        placeholder?: string;
        disabled?: boolean;
    }) => (
        <textarea
            aria-label={label || placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
        />
    ),
}));

const card: Card = {
    id: 'card-1',
    front: 'Front content',
    back: 'Back content',
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new',
    sourceMetadata: {
        pageNumber: 1,
        originalText: 'Source text',
    },
};

describe('FlashcardItem ViewMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders content and triggers edit/delete/card click handlers', () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onCardClick = vi.fn();

        const buttonState: ButtonState = {
            hasSourceMetadata: false,
            hasOnShowSource: false,
            shouldShowSourceButton: false,
        };

        render(
            <ViewMode
                card={card}
                buttonState={buttonState}
                isSourceActive={false}
                onEdit={onEdit}
                onDelete={onDelete}
                onCardClick={onCardClick}
            />
        );

        expect(screen.getByTestId('renderer-question')).toHaveTextContent('Front content');
        expect(screen.getByTestId('renderer-answer')).toHaveTextContent('Back content');
        expect(screen.queryByLabelText(TEXT_CONTENT.ariaLabels.showSource)).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('renderer-question'));
        fireEvent.click(screen.getByLabelText(TEXT_CONTENT.ariaLabels.edit));
        fireEvent.click(screen.getByLabelText(TEXT_CONTENT.ariaLabels.delete));

        expect(onCardClick).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith('card-1');
    });

    it('renders disabled source button when callback is missing', () => {
        const buttonState: ButtonState = {
            hasSourceMetadata: true,
            hasOnShowSource: false,
            shouldShowSourceButton: true,
        };

        render(
            <ViewMode
                card={card}
                buttonState={buttonState}
                isSourceActive={false}
                onEdit={vi.fn()}
            />
        );

        const sourceButton = screen.getByLabelText(TEXT_CONTENT.ariaLabels.showSourceDisabled);
        expect(sourceButton).toBeDisabled();
    });

    it('calls source callback when source button is active', () => {
        const onShowSource = vi.fn();
        const buttonState: ButtonState = {
            hasSourceMetadata: true,
            hasOnShowSource: true,
            shouldShowSourceButton: true,
        };

        render(
            <ViewMode
                card={card}
                buttonState={buttonState}
                isSourceActive
                onEdit={vi.fn()}
                onShowSource={onShowSource}
            />
        );

        fireEvent.click(screen.getByLabelText(TEXT_CONTENT.ariaLabels.showSource));
        expect(onShowSource).toHaveBeenCalledTimes(1);
    });
});

describe('FlashcardItem EditMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders inputs and propagates value changes', () => {
        const onFrontChange = vi.fn();
        const onBackChange = vi.fn();

        render(
            <EditMode
                frontValue="front"
                backValue="back"
                isSaving={false}
                canSave
                onFrontChange={onFrontChange}
                onBackChange={onBackChange}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        fireEvent.change(screen.getByLabelText(TEXT_CONTENT.labels.front), {
            target: { value: 'new front' },
        });
        fireEvent.change(screen.getByLabelText(TEXT_CONTENT.labels.back), {
            target: { value: 'new back' },
        });

        expect(onFrontChange).toHaveBeenCalledWith('new front');
        expect(onBackChange).toHaveBeenCalledWith('new back');
    });

    it('handles cancel and save actions', () => {
        const onSave = vi.fn();
        const onCancel = vi.fn();

        render(
            <EditMode
                frontValue="front"
                backValue="back"
                isSaving={false}
                canSave
                onFrontChange={vi.fn()}
                onBackChange={vi.fn()}
                onSave={onSave}
                onCancel={onCancel}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Annulla/i }));
        fireEvent.click(screen.getByRole('button', { name: /Salva/i }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('shows loading state and disables cancel while saving', () => {
        render(
            <EditMode
                frontValue="front"
                backValue="back"
                isSaving
                canSave
                onFrontChange={vi.fn()}
                onBackChange={vi.fn()}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        expect(screen.getByText(TEXT_CONTENT.buttons.saving)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Annulla/i })).toBeDisabled();
    });

    it('disables save when content is invalid', () => {
        render(
            <EditMode
                frontValue=""
                backValue=""
                isSaving={false}
                canSave={false}
                onFrontChange={vi.fn()}
                onBackChange={vi.fn()}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: /Salva/i })).toBeDisabled();
    });
});

