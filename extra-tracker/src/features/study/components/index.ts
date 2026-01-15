/**
 * 📚 Study Components - Barrel Export
 */

// Flashcard components
export { Flashcard, FlashcardSkeleton } from './Flashcard/Flashcard';
export { FlashcardItem } from './Flashcard/FlashcardItem';
export { FlashcardList } from './Flashcard/FlashcardList';
export { FlashcardCarousel } from './Flashcard/FlashcardCarousel';

// Modals
export { CreateDeckModal } from './Modals/CreateDeckModal';
export { MagicGenerateModal } from './Modals/MagicGenerateModal';
export { StudyModeSelector, type StudyMode } from './Modals/StudyModeSelector';

// Study components
export { StudySidebar, CardModal } from './Study/StudySidebar';
export { QuizView } from './Study/QuizView';
export { TypingView } from './Study/TypingView';

// PDF components
export { PDFChat } from './PDF/PDFChat';

// Deck components
export { DeckAnalytics } from './Deck/DeckAnalytics';
export { DeckGrid } from './Deck/DeckGrid';
export { DeckSettings } from './Deck/DeckSettings';
export { DeckNotifications } from './Deck/DeckNotifications';
export { PerformanceCharts } from './Deck/PerformanceCharts';

// Organization components
export { FolderTree } from './Organization/FolderTree';
export { TagCloud } from './Organization/TagCloud';

// Dashboard components
export { DashboardEmptyState } from './Dashboard/DashboardEmptyState';
