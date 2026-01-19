/**
 * 🎴 FLASHCARD LIST - Utility Functions
 * =====================================
 * 
 * Pure utility functions for FlashcardList component.
 */

import { arrayMove } from '@dnd-kit/sortable';
import type { Card } from '../../services/studyService';
import type { ReorderResult } from './FlashcardList.types';

// ============================================
// CARD COMPARISON
// ============================================

/**
 * Compares two card arrays by their IDs to determine if they're different.
 * Used to avoid unnecessary state updates during drag operations.
 * 
 * @param currentCards - Current card array
 * @param newCards - New card array
 * @returns True if card IDs have changed (not just reordered)
 */
export function haveCardIdsChanged(currentCards: Card[], newCards: Card[]): boolean {
    const currentIds = currentCards.map(c => c.id).sort().join(',');
    const newIds = newCards.map(c => c.id).sort().join(',');
    return currentIds !== newIds;
}

// ============================================
// REORDERING LOGIC
// ============================================

/**
 * Calculates the final card order after a drag operation.
 * Handles filtered cards by mapping visible order to full deck order.
 * 
 * @param items - Current card items
 * @param oldIndex - Original index of dragged card
 * @param newIndex - New index after drag
 * @param fullDeckCards - All cards in the deck (not filtered)
 * @param filteredCards - Currently visible/filtered cards (optional)
 * @returns Final order with card IDs and reordered items
 */
export function calculateReorderResult(
    items: Card[],
    oldIndex: number,
    newIndex: number,
    fullDeckCards: Card[],
    filteredCards?: Card[]
): ReorderResult {
    // Update local state immediately for instant feedback
    const newOrder = arrayMove(items, oldIndex, newIndex);

    let finalOrder: string[];

    if (filteredCards && filteredCards.length > 0 && filteredCards.length !== fullDeckCards.length) {
        // If we have filtered cards, map the new order to the full deck
        const newOrderIds = newOrder.map(c => c.id);
        const visibleCardIds = filteredCards.map(c => c.id);
        const hiddenCardIds = fullDeckCards
            .map(c => c.id)
            .filter(id => !visibleCardIds.includes(id));

        // Combine: hidden cards first, then the reordered visible cards
        finalOrder = [...hiddenCardIds, ...newOrderIds];
    } else {
        // Simple case: just use the new order
        finalOrder = newOrder.map(card => card.id);
    }

    return {
        finalOrder,
        newOrder,
    };
}

// ============================================
// INSERT POSITION CALCULATION
// ============================================

/**
 * Calculates the actual insert position in the full deck
 * when inserting a card at a specific position in filtered view.
 * 
 * @param position - Desired position in filtered view
 * @param filteredCards - Currently visible cards
 * @param fullDeckCards - All cards in the deck
 * @returns Actual position in full deck
 */
export function calculateInsertPosition(
    position: number,
    filteredCards: Card[] | undefined,
    fullDeckCards: Card[]
): number {
    if (!filteredCards || filteredCards.length === 0 || filteredCards.length === fullDeckCards.length) {
        return position;
    }

    if (position === 0) {
        // Insert at the beginning of the deck
        return 0;
    }

    if (position >= filteredCards.length) {
        // Insert at the end of the deck
        return fullDeckCards.length;
    }

    // Find the position of the previous card in the full deck
    const previousCard = filteredCards[position - 1];
    const previousIndex = fullDeckCards.findIndex(c => c.id === previousCard.id);
    
    return previousIndex >= 0 ? previousIndex + 1 : fullDeckCards.length;
}

// ============================================
// CARD FINDING
// ============================================

/**
 * Finds a card by ID in the items array.
 * 
 * @param items - Card array to search
 * @param cardId - ID of the card to find
 * @returns The card if found, undefined otherwise
 */
export function findCardById(items: Card[], cardId: string): Card | undefined {
    return items.find(card => card.id === cardId);
}

/**
 * Finds the index of a card in the items array.
 * 
 * @param items - Card array to search
 * @param cardId - ID of the card to find
 * @returns The index if found, -1 otherwise
 */
export function findCardIndex(items: Card[], cardId: string): number {
    return items.findIndex(card => card.id === cardId);
}
