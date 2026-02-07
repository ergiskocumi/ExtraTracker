/**
 * 🎴 FLASHCARD LIST - Type Definitions
 * ====================================
 * 
 * Type-safe definitions for FlashcardList component.
 */

import type { Deck, Card } from '../../services/studyService';
import type { ViewModeType } from './FlashcardList.constants';

// ============================================
// COMPONENT PROPS
// ============================================

export interface FlashcardListProps {
    /** The deck containing the cards */
    deck: Deck;
    /** Callback to add a new card */
    onAddCard: () => void;
    /** Callback to update card content */
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    /** Optional callback when card is clicked */
    onCardClick?: (card: Card) => void;
    /** Optional callback to delete a card */
    onDelete?: (cardId: string) => void;
    /** Whether to show the header */
    showHeader?: boolean;
    /** Optional callback for back navigation */
    onNavigateBack?: () => void;
    /** Callback when deck is updated (for refresh) */
    onDeckUpdate?: (updatedDeck: Deck) => void;
    /** Filtered cards to display (optional, uses deck.cards if not provided) */
    filteredCards?: Card[];
    /** Display mode: 'list' (vertical list) or 'grid' (square grid) */
    viewMode?: ViewModeType;
    /** Callback when "Show Source" is clicked on a card */
    onShowSource?: (card: Card) => void;
    /** ID of the card currently highlighted as "source active" */
    activeSourceCardId?: string | null;
    /** Compact mode for cinema view - uses inline editing instead of fullscreen modal */
    compactMode?: boolean;
}

// ============================================
// SUB-COMPONENT PROPS
// ============================================

export interface InsertButtonProps {
    /** Position index where card should be inserted */
    position: number;
    /** Callback when insert button is clicked */
    onInsert: (position: number) => void;
    /** Whether the button is visible */
    isVisible: boolean;
}

export interface HeaderProps {
    /** Number of cards */
    cardCount: number;
    /** Whether to show back button */
    showBackButton: boolean;
    /** Whether to show add button */
    showAddButton: boolean;
    /** Callback for back navigation */
    onNavigateBack?: () => void;
    /** Callback for adding card */
    onAddCard: () => void;
}

export interface EmptyStateProps {
    /** Empty state message */
    message: string;
}

export interface DragOverlayContentProps {
    /** The card being dragged */
    card: Card;
    /** Display mode */
    viewMode: ViewModeType;
    /** Current items list */
    items: Card[];
    /** Callback to update card */
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    /** Optional callback when card is clicked */
    onCardClick?: (card: Card) => void;
    /** Optional callback to delete card */
    onDelete?: (cardId: string) => void;
    /** Optional callback for show source */
    onShowSource?: (card: Card) => void;
    /** Whether card is source active */
    isSourceActive: boolean;
}

// ============================================
// INTERNAL STATE
// ============================================

export interface FlashcardListState {
    items: Card[];
    activeId: string | null;
    insertingIndex: number | null;
    isDeleteModalOpen: boolean;
    cardToDelete: Card | null;
    isDeleting: boolean;
    hoveredInsertPosition: number | null;
}

// ============================================
// REORDERING HELPERS
// ============================================

export interface ReorderResult {
    finalOrder: string[];
    newOrder: Card[];
}
