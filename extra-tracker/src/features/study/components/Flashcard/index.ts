/**
 * FLASHCARD COMPONENTS - Barrel Export
 * ====================================
 *
 * Esporta tutti i componenti relativi alle Flashcard.
 *
 * @module Flashcard
 */

// Main Flashcard components
export { Flashcard, FlashcardSkeleton } from './Flashcard';
export type { default as FlashcardProps } from './Flashcard';

// Modular Flashcard (CSS-based)
export { FlashcardModular } from './FlashcardModular';
export type { FlashcardModularProps } from './FlashcardModular';

// Presentational components
export { FlashcardFront } from './FlashcardFront';
export type { FlashcardFrontProps } from './FlashcardFront';

export { FlashcardBack } from './FlashcardBack';
export type { FlashcardBackProps } from './FlashcardBack';

export { FlashcardControls } from './FlashcardControls';
export type { FlashcardControlsProps } from './FlashcardControls';

// FlashcardItem (for lists)
export { FlashcardItem } from './FlashcardItem';
export type { FlashcardItemProps } from './FlashcardItem.types';

// FlashcardList
export { FlashcardList } from './FlashcardList';

// FlashcardCarousel
export { FlashcardCarousel } from './FlashcardCarousel';

// CardContentRenderer
export { CardContentRenderer } from './CardContentRenderer';
export type { CardContentRendererProps } from './CardContentRenderer';

// CardEditor
export { CardEditor, MarkdownEditor, EditorPreview, FullscreenEditModal } from './CardEditor';
export type { CardEditorProps, EditorLayout, MarkdownEditorProps, FullscreenEditModalProps } from './CardEditor';

// Modals
export { AddCardModal } from './AddCardModal';
export { DeleteCardModal } from './DeleteCardModal';
