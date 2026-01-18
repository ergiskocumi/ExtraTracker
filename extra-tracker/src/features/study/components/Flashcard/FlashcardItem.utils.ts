/**
 * 🎴 FLASHCARD ITEM - Utility Functions
 * =====================================
 * 
 * Pure utility functions for FlashcardItem component.
 */

import type { Card } from '../../services/studyService';
import { VALIDATION } from './FlashcardItem.constants';
import type { ValidationResult, ButtonState } from './FlashcardItem.types';

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates and trims card content, determining if save is allowed.
 * 
 * @param tempFront - Temporary front text
 * @param tempBack - Temporary back text
 * @param originalFront - Original front text
 * @param originalBack - Original back text
 * @param isSaving - Whether save operation is in progress
 * @returns Validation result with trimmed values and save eligibility
 */
export function validateCardContent(
    tempFront: string,
    tempBack: string,
    originalFront: string,
    originalBack: string,
    isSaving: boolean
): ValidationResult {
    const trimmedFront = tempFront.trim();
    const trimmedBack = tempBack.trim();
    const isDirty = trimmedFront !== originalFront || trimmedBack !== originalBack;
    const canSave = !isSaving && 
                   trimmedFront.length > VALIDATION.minTextLength && 
                   trimmedBack.length > VALIDATION.minTextLength && 
                   isDirty;

    return {
        trimmedFront,
        trimmedBack,
        isDirty,
        canSave,
    };
}

/**
 * Checks if a card is a temporary card (used for creation flow).
 * 
 * @param cardId - The card ID to check
 * @returns True if card is temporary
 */
export function isTemporaryCard(cardId: string): boolean {
    return cardId.startsWith(VALIDATION.tempCardPrefix);
}

// ============================================
// BUTTON STATE HELPERS
// ============================================

/**
 * Determines button visibility and state based on card metadata.
 * 
 * @param card - The card to check
 * @param onShowSource - Optional show source callback
 * @returns Button state information
 */
export function getButtonState(
    card: Card,
    onShowSource?: (card: Card) => void
): ButtonState {
    const hasSourceMetadata = Boolean(card.sourceMetadata);
    const hasOnShowSource = Boolean(onShowSource);
    const shouldShowSourceButton = hasSourceMetadata && hasOnShowSource;

    return {
        hasSourceMetadata,
        hasOnShowSource,
        shouldShowSourceButton,
    };
}

// ============================================
// EVENT HANDLERS HELPERS
// ============================================

/**
 * Checks if a click event should trigger card click handler.
 * Prevents card click when clicking on interactive elements.
 * 
 * @param event - Mouse event
 * @param isEditing - Whether card is in edit mode
 * @returns True if card click should be triggered
 */
export function shouldHandleCardClick(
    event: React.MouseEvent,
    isEditing: boolean
): boolean {
    if (isEditing) return false;
    
    const target = event.target as HTMLElement;
    return !target.closest('button') && !target.closest('textarea') && !target.closest('input');
}
