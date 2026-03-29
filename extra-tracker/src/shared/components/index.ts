/**
 * 📦 SHARED COMPONENTS - Barrel Export
 *
 * 🎓 PATTERN: Barrel Export
 * Punto di accesso unificato per tutti i componenti condivisi.
 * Semplifica gli import e nasconde la struttura interna.
 *
 * @example
 * import { Button, Card, LoadingState, useToast } from '@/shared/components';
 */

// ============================================
// UI COMPONENTS (base)
// ============================================
export { Button } from './ui/button';
export type { ButtonProps } from './ui/button';

export { Input, Textarea } from './ui/input';
export type { InputProps, TextareaProps } from './ui/input';

export { Card, CardHeader, CardContent, CardFooter } from './ui/card';
export type { CardProps } from './ui/card';

export { Badge } from './ui/badge';

// ============================================
// FEEDBACK COMPONENTS
// ============================================
export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

// ============================================
// TOAST SYSTEM
// ============================================
export { ToastProvider, useToast } from './toast';
export { emitToast, TOAST_EVENT, TOAST_DURATIONS } from './toast';
export type {
  Toast,
  ToastType,
  ToastOptions,
  ToastPosition,
  ToastProviderConfig,
  ToastMethods,
  ToastContextValue,
} from './toast';

// ============================================
// UTILITY COMPONENTS
// ============================================
export { ThemeToggle } from './ThemeToggle';
export { ScrollToTop } from './ScrollToTop';
export { ConfirmationModal } from './ConfirmationModal';
export { TimeTrackingBackground } from './TimeTrackingBackground';

// ============================================
// BRAND COMPONENTS
// ============================================
export { Logo } from './Brand/Logo';

// ============================================
// USER COMPONENTS
// ============================================
export { UserMenuDropdown } from './UserMenu';

// ============================================
// SKELETON COMPONENTS
// ============================================
export {
  Skeleton,
  DeckCardSkeleton,
  DeckGridSkeleton,
  FlashcardSkeleton,
} from './skeleton';

// ============================================
// TUTORIAL COMPONENTS
// ============================================
export {
  TutorialManager,
  TutorialOverlay,
  TutorialButton,
} from './Tutorial';
