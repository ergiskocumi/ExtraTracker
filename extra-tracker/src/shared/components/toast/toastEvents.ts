/**
 * 🎯 TOAST EVENT EMITTER - Bridge tra codice non-React e React Context
 * 
 * 🎓 PROBLEMA ARCHITETTURALE:
 * Il file apiClient.ts è puro JavaScript/TypeScript, NON un componente React.
 * Non può usare hooks come useContext o useToast.
 * 
 * 🎓 SOLUZIONE: Event Emitter Pattern
 * Creiamo un "ponte" usando eventi custom del browser:
 * 1. apiClient emette un evento quando c'è un errore
 * 2. ToastProvider ascolta questi eventi e mostra il toast
 * 
 * 🎓 ALTERNATIVA: Singleton con callback
 * Potremmo usare un singleton con una funzione registrata dal Provider,
 * ma gli eventi sono più puliti e disaccoppiati (Loose Coupling).
 * 
 * 🎓 PRINCIPIO: Inversion of Control (IoC)
 * Il codice non-React non chiama direttamente React.
 * Emette eventi, e React decide come gestirli.
 */

import type { ToastType, ToastOptions } from './types';

// ==========================================
// DEFINIZIONE EVENTI CUSTOM
// ==========================================

/**
 * Nome dell'evento custom per i toast
 * Usiamo un namespace per evitare collisioni con altri eventi
 */
export const TOAST_EVENT = 'toast:show' as const;

/**
 * Payload dell'evento toast
 */
export interface ToastEventDetail {
    type: ToastType;
    message: string;
    options?: Partial<Omit<ToastOptions, 'message'>>;
}

/**
 * Tipo dell'evento custom per TypeScript
 */
export type ToastCustomEvent = CustomEvent<ToastEventDetail>;

// ==========================================
// FUNZIONI DI EMISSIONE (per codice non-React)
// ==========================================

/**
 * Emette un evento toast che verrà catturato dal ToastProvider
 * 
 * 🎓 UTILIZZO:
 * Chiamare queste funzioni da qualsiasi file JS/TS (anche non-React)
 * per mostrare un toast nell'interfaccia.
 * 
 * @example
 * // In apiClient.ts (file non-React)
 * import { emitToast } from './toast/toastEvents';
 * emitToast.error('Errore di connessione');
 */
const emit = (type: ToastType, message: string, options?: Partial<Omit<ToastOptions, 'message'>>) => {
    const event = new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
        detail: { type, message, options },
    });
    window.dispatchEvent(event);
};

/**
 * API pubblica per emettere toast da codice non-React
 * 
 * 🎓 PATTERN: Facade
 * Esponiamo metodi semplici che nascondono la complessità degli eventi.
 */
export const emitToast = {
    success: (message: string, options?: Partial<Omit<ToastOptions, 'message'>>) => 
        emit('success', message, options),
    
    error: (message: string, options?: Partial<Omit<ToastOptions, 'message'>>) => 
        emit('error', message, options),
    
    info: (message: string, options?: Partial<Omit<ToastOptions, 'message'>>) => 
        emit('info', message, options),
    
    warning: (message: string, options?: Partial<Omit<ToastOptions, 'message'>>) => 
        emit('warning', message, options),
};

// ==========================================
// TYPE AUGMENTATION per window
// ==========================================

/**
 * Estendiamo WindowEventMap per TypeScript
 * Questo permette a TypeScript di riconoscere il nostro evento custom
 */
declare global {
    interface WindowEventMap {
        [TOAST_EVENT]: ToastCustomEvent;
    }
}
