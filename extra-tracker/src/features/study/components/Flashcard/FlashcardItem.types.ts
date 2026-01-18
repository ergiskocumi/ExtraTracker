/**
 * 🎴 FLASHCARD ITEM - Type Definitions
 * ====================================
 * 
 * Type-safe definitions for FlashcardItem component.
 */

import type { Card } from '../../services/studyService';

// ============================================
// COMPONENT PROPS
// ============================================

export interface FlashcardItemProps {
    /** The card data to display */
    card: Card;
    /** Callback to update card content */
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    /** Optional callback when card is clicked */
    onClick?: (card: Card) => void;
    /** Optional callback to delete the card */
    onDelete?: (cardId: string) => void;
    /** If true, card starts in editing mode */
    initialEditing?: boolean;
    /** Callback when card edit is cancelled (for temporary cards) */
    onCancel?: () => void;
    /** Callback to create a new card (for temporary cards) */
    onCreate?: (front: string, back: string) => Promise<void>;
    /** Callback when "Show Source" is clicked */
    onShowSource?: (card: Card) => void;
    /** If true, card is highlighted as "source active" */
    isSourceActive?: boolean;
    /** Callback when editing state changes (for disabling drag during edit) */
    onEditingChange?: (isEditing: boolean) => void;
}

// ============================================
// INTERNAL STATE
// ============================================

export interface FlashcardItemState {
    isEditing: boolean;
    tempFront: string;
    tempBack: string;
    saving: boolean;
}

// ============================================
// VALIDATION RESULT
// ============================================

export interface ValidationResult {
    trimmedFront: string;
    trimmedBack: string;
    isDirty: boolean;
    canSave: boolean;
}

// ============================================
// BUTTON STATES
// ============================================

export interface ButtonState {
    hasSourceMetadata: boolean;
    hasOnShowSource: boolean;
    shouldShowSourceButton: boolean;
}
