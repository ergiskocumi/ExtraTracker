/**
 * 📋 TOAST TYPES - Definizioni TypeScript per il sistema di notifiche
 * 
 * 🎓 PRINCIPIO: Single Source of Truth (SSOT)
 * Definire i tipi in un file separato ci permette di:
 * 1. Condividerli tra Context, Components e Services
 * 2. Evitare dipendenze circolari tra moduli
 * 3. Facilitare il testing e la manutenzione
 */

// Tipi di toast disponibili - facilmente estendibile
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Posizioni supportate per il container dei toast
export type ToastPosition = 
    | 'top-right' 
    | 'top-left' 
    | 'bottom-right' 
    | 'bottom-left' 
    | 'top-center' 
    | 'bottom-center';

/**
 * Singolo Toast - Rappresenta una notifica
 * 
 * 🎓 PRINCIPIO: Interface Segregation
 * Definiamo solo le proprietà necessarie per un toast.
 * L'id viene generato internamente, non dall'utente.
 */
export interface Toast {
    id: string;                    // UUID univoco generato automaticamente
    type: ToastType;               // Tipo visivo (colore, icona)
    message: string;               // Testo principale
    title?: string;                // Titolo opzionale (es. "Successo!")
    duration?: number;             // Durata in ms (default: 5000)
    dismissible?: boolean;         // Mostra pulsante X (default: true)
    action?: {                     // Azione opzionale (es. "Riprova")
        label: string;
        onClick: () => void;
    };
}

/**
 * Opzioni per creare un nuovo toast
 * Omit<Toast, 'id'> = Tutto tranne l'id (generato automaticamente)
 * Partial = Tutto opzionale tranne message
 */
export type ToastOptions = Partial<Omit<Toast, 'id' | 'message'>> & {
    message: string;
};

/**
 * Metodi esposti dall'hook useToast
 * 
 * 🎓 PRINCIPIO: Facade Pattern
 * Esponiamo metodi semplici (success, error, info) che nascondono
 * la complessità interna del sistema.
 */
export interface ToastMethods {
    success: (message: string, options?: Partial<ToastOptions>) => string;
    error: (message: string, options?: Partial<ToastOptions>) => string;
    info: (message: string, options?: Partial<ToastOptions>) => string;
    warning: (message: string, options?: Partial<ToastOptions>) => string;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

/**
 * Stato del ToastContext
 */
export interface ToastState {
    toasts: Toast[];
    position: ToastPosition;
}

/**
 * Valore completo del Context
 */
export interface ToastContextValue extends ToastMethods {
    toasts: Toast[];
    position: ToastPosition;
    setPosition: (position: ToastPosition) => void;
}

/**
 * Configurazione globale del ToastProvider
 */
export interface ToastProviderConfig {
    maxToasts?: number;            // Max toast visibili (default: 5)
    position?: ToastPosition;      // Posizione iniziale
    defaultDuration?: number;      // Durata default in ms
}
