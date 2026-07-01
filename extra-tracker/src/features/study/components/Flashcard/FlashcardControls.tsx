/**
 * FLASHCARD CONTROLS - Action Buttons Component
 * =============================================
 *
 * Barra di controlli per la flashcard con pulsanti per:
 * - Modifica
 * - Elimina
 * - Gira (flip)
 *
 * IMPORTANTE: Tutti i pulsanti usano e.stopPropagation() per evitare
 * che il click si propaghi al container e faccia girare la carta.
 *
 * @module FlashcardControls
 */

import React, { memo, useCallback } from 'react';
import { Edit, Trash2, RefreshCw } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface FlashcardControlsProps {
    /** Callback per modifica */
    onEdit?: () => void;
    /** Callback per eliminazione */
    onDelete?: () => void;
    /** Callback per girare la carta */
    onFlip?: () => void;
    /** Mostra pulsante modifica */
    showEdit?: boolean;
    /** Mostra pulsante elimina */
    showDelete?: boolean;
    /** Mostra pulsante gira */
    showFlip?: boolean;
    /** Testo pulsante modifica */
    editLabel?: string;
    /** Testo pulsante elimina */
    deleteLabel?: string;
    /** Testo pulsante gira */
    flipLabel?: string;
    /** Disabilita tutti i controlli */
    disabled?: boolean;
    /** Classi CSS aggiuntive */
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardControls - Barra azioni per flashcard.
 *
 * Usa stopPropagation su tutti i click per evitare
 * interferenze con il flip handler del container.
 */
const FlashcardControlsComponent: React.FC<FlashcardControlsProps> = ({
    onEdit,
    onDelete,
    onFlip,
    showEdit = true,
    showDelete = true,
    showFlip = false,
    editLabel = 'Modifica',
    deleteLabel = 'Elimina',
    flipLabel = 'Gira',
    disabled = false,
    className = '',
}) => {
    // Wrapper handlers con stopPropagation
    const handleEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!disabled && onEdit) {
            onEdit();
        }
    }, [disabled, onEdit]);

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!disabled && onDelete) {
            onDelete();
        }
    }, [disabled, onDelete]);

    const handleFlip = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!disabled && onFlip) {
            onFlip();
        }
    }, [disabled, onFlip]);

    // Non renderizza se non ci sono pulsanti da mostrare
    const hasButtons = (showEdit && onEdit) || (showDelete && onDelete) || (showFlip && onFlip);
    if (!hasButtons) return null;

    return (
        <div
            className={`flashcard-controls ${className}`}
            onClick={(e) => e.stopPropagation()} // Previene click sul container
        >
            {/* Edit Button */}
            {showEdit && onEdit && (
                <button
                    type="button"
                    onClick={handleEdit}
                    disabled={disabled}
                    className="btn-edit"
                    aria-label={editLabel}
                    title={editLabel}
                >
                    <Edit className="w-4 h-4" />
                    <span>{editLabel}</span>
                </button>
            )}

            {/* Flip Button */}
            {showFlip && onFlip && (
                <button
                    type="button"
                    onClick={handleFlip}
                    disabled={disabled}
                    className="btn-flip"
                    aria-label={flipLabel}
                    title={flipLabel}
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>{flipLabel}</span>
                </button>
            )}

            {/* Delete Button */}
            {showDelete && onDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={disabled}
                    className="btn-delete"
                    aria-label={deleteLabel}
                    title={deleteLabel}
                >
                    <Trash2 className="w-4 h-4" />
                    <span>{deleteLabel}</span>
                </button>
            )}
        </div>
    );
};

/**
 * Memoized version per performance.
 */
export const FlashcardControls = memo(FlashcardControlsComponent, (prev, next) => {
    return (
        prev.onEdit === next.onEdit &&
        prev.onDelete === next.onDelete &&
        prev.onFlip === next.onFlip &&
        prev.showEdit === next.showEdit &&
        prev.showDelete === next.showDelete &&
        prev.showFlip === next.showFlip &&
        prev.disabled === next.disabled
    );
});

FlashcardControls.displayName = 'FlashcardControls';

export default FlashcardControls;
