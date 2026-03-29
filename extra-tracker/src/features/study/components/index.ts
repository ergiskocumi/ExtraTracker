/**
 * 📚 Study Components - Barrel Export
 */

// Providers
export { StudyProviders } from './StudyProviders';

// Flashcard components
export { Flashcard, FlashcardSkeleton } from './Flashcard/Flashcard';
export { FlashcardItem } from './Flashcard/FlashcardItem';
export { FlashcardList } from './Flashcard/FlashcardList';
export { FlashcardCarousel } from './Flashcard/FlashcardCarousel';
export { CardContentRenderer } from './Flashcard/CardContentRenderer/index';
export type { CardContentRendererProps, ContentVariant, TextSize } from './Flashcard/CardContentRenderer/index';

// Modals
export { CreateDeckModal } from './Modals/CreateDeckModal';
export { MagicGenerateModal } from './Modals/MagicGenerateModal';
export { StudyModeSelector, type StudyMode, type StudyStartConfig } from './Modals/StudyModeSelector';

// Study components
export { StudySidebar, CardModal } from './Study/StudySidebar';
export { QuizView } from './Study/QuizView';
export { TypingView } from './Study/TypingView';

// PDF components
export { PDFChat } from './PDF/PDFChat';

// Deck components
export { DeckGrid } from './Deck/DeckGrid';
export { DeckNotifications } from './Deck/DeckNotifications';

// Organization components
export { FolderTree } from './Organization/FolderTree';
export { TagCloud } from './Organization/TagCloud';

// Dashboard components
export { DashboardEmptyState } from './Dashboard/DashboardEmptyState';
