/**
 * 📦 TOAST MODULE - Barrel Export
 * 
 * 🎓 PATTERN: Barrel Export
 * Un singolo punto di accesso per tutto il modulo toast.
 * Vantaggi:
 * 1. Import più puliti: import { useToast, ToastProvider } from '@/shared/components/toast'
 * 2. Nasconde la struttura interna dei file
 * 3. Facilita refactoring futuro (puoi spostare file senza rompere import esterni)
 */

// Context e Hook
export { ToastProvider, useToast } from './ToastContext';

// Event Emitter per codice non-React
export { emitToast, TOAST_EVENT } from './toastEvents';

// Types (per chi vuole usarli)
export type { 
    Toast, 
    ToastType, 
    ToastOptions, 
    ToastPosition,
    ToastProviderConfig,
    ToastMethods,
    ToastContextValue,
} from './types';
