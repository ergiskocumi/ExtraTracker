/**
 * 🏗️ TOAST CONTEXT & PROVIDER - Gestione centralizzata delle notifiche
 * 
 * 🎓 PERCHÉ CONTEXT API invece di:
 * 
 * 1. PROPS DRILLING:
 *    - Passare toast/setToast attraverso 10+ livelli di componenti è un incubo
 *    - Ogni componente intermedio dovrebbe conoscere i toast anche se non li usa
 *    - Context risolve questo: qualsiasi componente può accedere ai toast direttamente
 * 
 * 2. REDUX/ZUSTAND:
 *    - Overhead eccessivo per un sistema di notifiche
 *    - Context è built-in in React, zero dipendenze
 *    - I toast sono UI locale, non "stato applicativo" che necessita persistence
 * 
 * 3. LIBRERIE ESTERNE (react-toastify, react-hot-toast):
 *    - Aggiungono 5-15KB al bundle
 *    - Meno controllo sullo styling (devi "lottare" con i loro CSS)
 *    - Con Tailwind, è più pulito costruire il proprio sistema
 * 
 * 🎓 PRINCIPIO: Separation of Concerns
 * - ToastContext: gestisce lo STATO (lista toast, aggiunta, rimozione)
 * - ToastItem: gestisce la PRESENTAZIONE (come appare un singolo toast)
 * - ToastContainer: gestisce il LAYOUT (dove appaiono i toast)
 */

import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import type { 
    Toast, 
    ToastType, 
    ToastOptions, 
    ToastContextValue, 
    ToastPosition,
    ToastProviderConfig 
} from './types';
import { TOAST_EVENT, type ToastCustomEvent } from './toastEvents';
import { ToastItem } from './ToastItem';

// ==========================================
// REDUCER - Gestione stato immutabile
// ==========================================

/**
 * 🎓 PATTERN: Reducer
 * Usiamo useReducer invece di useState perché:
 * 1. Lo stato ha più azioni (add, remove, removeAll)
 * 2. Le azioni sono più prevedibili e debuggabili
 * 3. Facilita i test unitari
 */

type ToastAction = 
    | { type: 'ADD_TOAST'; payload: Toast }
    | { type: 'REMOVE_TOAST'; payload: string }
    | { type: 'REMOVE_ALL' }
    | { type: 'SET_POSITION'; payload: ToastPosition };

interface ToastState {
    toasts: Toast[];
    position: ToastPosition;
}

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
    switch (action.type) {
        case 'ADD_TOAST':
            return {
                ...state,
                // Aggiungiamo in cima (LIFO - Last In First Out)
                toasts: [action.payload, ...state.toasts],
            };
        case 'REMOVE_TOAST':
            return {
                ...state,
                toasts: state.toasts.filter(t => t.id !== action.payload),
            };
        case 'REMOVE_ALL':
            return {
                ...state,
                toasts: [],
            };
        case 'SET_POSITION':
            return {
                ...state,
                position: action.payload,
            };
        default:
            return state;
    }
};

// ==========================================
// CONTEXT
// ==========================================

/**
 * 🎓 PATTERN: Context con valore di default null
 * Usiamo null come default e controlliamo nel hook.
 * Questo ci permette di dare errori chiari se useToast
 * viene chiamato fuori dal Provider.
 */
const ToastContext = createContext<ToastContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================

interface ToastProviderProps {
    children: React.ReactNode;
    config?: ToastProviderConfig;
}

/**
 * 🎓 PATTERN: Provider Component
 * Avvolge l'app e fornisce il contesto a tutti i figli.
 * Gestisce anche l'ascolto degli eventi dal bridge non-React.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ 
    children, 
    config = {} 
}) => {
    const { 
        maxToasts = 5, 
        position: initialPosition = 'top-right',
        defaultDuration = 5000,
    } = config;

    const [state, dispatch] = useReducer(toastReducer, {
        toasts: [],
        position: initialPosition,
    });

    // ==========================================
    // GENERATORE ID UNIVOCI
    // ==========================================
    
    /**
     * 🎓 NOTA: Usiamo un counter semplice invece di UUID
     * Per toast temporanei, non serve la garanzia di unicità globale.
     * Questo è più leggero e veloce.
     */
    const idCounterRef = React.useRef(0);
    const generateId = useCallback(() => {
        idCounterRef.current += 1;
        return `toast-${Date.now()}-${idCounterRef.current}`;
    }, []);

    // ==========================================
    // AZIONI
    // ==========================================

    /**
     * Aggiunge un toast con le opzioni specificate
     * @returns L'ID del toast creato (per eventuale dismiss manuale)
     * 
     * ANTI-SPAM: Se viene fornito un ID nelle opzioni e un toast con quell'ID esiste già,
     * non viene aggiunto un duplicato (utile per evitare spam di toast identici)
     */
    const addToast = useCallback((
        type: ToastType, 
        message: string, 
        options?: Partial<ToastOptions>
    ): string => {
        // Se è fornito un ID nelle opzioni, usalo (per evitare duplicati)
        // Altrimenti genera un nuovo ID
        const id = options?.id || generateId();
        
        // ANTI-SPAM: Se un toast con questo ID esiste già, non aggiungerlo
        if (state.toasts.some(t => t.id === id)) {
            return id;
        }
        
        const toast: Toast = {
            id,
            type,
            message,
            duration: options?.duration ?? defaultDuration,
            dismissible: options?.dismissible ?? true,
            title: options?.title,
            action: options?.action,
        };

        dispatch({ type: 'ADD_TOAST', payload: toast });

        // Rimuovi i toast più vecchi se superiamo il limite
        // Nota: Questo viene fatto dopo l'aggiunta
        setTimeout(() => {
            dispatch({ type: 'REMOVE_TOAST', payload: '' }); // Trigger re-render per cleanup
        }, 0);

        return id;
    }, [defaultDuration, generateId, state.toasts]);

    /**
     * Rimuove un toast specifico per ID
     */
    const dismiss = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, []);

    /**
     * Rimuove tutti i toast
     */
    const dismissAll = useCallback(() => {
        dispatch({ type: 'REMOVE_ALL' });
    }, []);

    /**
     * Cambia la posizione del container
     */
    const setPosition = useCallback((position: ToastPosition) => {
        dispatch({ type: 'SET_POSITION', payload: position });
    }, []);

    // ==========================================
    // METODI SHORTCUT
    // ==========================================

    /**
     * 🎓 PATTERN: Facade
     * Metodi semplici che nascondono la complessità di addToast
     */
    const success = useCallback((message: string, options?: Partial<ToastOptions>) => 
        addToast('success', message, options), [addToast]);
    
    const error = useCallback((message: string, options?: Partial<ToastOptions>) => 
        addToast('error', message, options), [addToast]);
    
    const info = useCallback((message: string, options?: Partial<ToastOptions>) => 
        addToast('info', message, options), [addToast]);
    
    const warning = useCallback((message: string, options?: Partial<ToastOptions>) => 
        addToast('warning', message, options), [addToast]);

    // ==========================================
    // BRIDGE: Ascolto eventi da codice non-React
    // ==========================================

    /**
     * 🎓 PATTERN: Event Listener Bridge
     * Questo useEffect crea il "ponte" tra il mondo non-React
     * (apiClient.ts) e il nostro Context.
     */
    useEffect(() => {
        const handleToastEvent = (event: ToastCustomEvent) => {
            const { type, message, options } = event.detail;
            addToast(type, message, options);
        };

        // Registra listener
        window.addEventListener(TOAST_EVENT, handleToastEvent);

        // Cleanup al unmount
        return () => {
            window.removeEventListener(TOAST_EVENT, handleToastEvent);
        };
    }, [addToast]);

    // ==========================================
    // CONTEXT VALUE
    // ==========================================

    /**
     * 🎓 OTTIMIZZAZIONE: useMemo per il value
     * Memorizziamo il valore del context per evitare re-render
     * inutili dei consumer quando cambia solo lo stato interno.
     */
    const contextValue = React.useMemo<ToastContextValue>(() => ({
        toasts: state.toasts.slice(0, maxToasts), // Limita i toast visibili
        position: state.position,
        setPosition,
        success,
        error,
        info,
        warning,
        dismiss,
        dismissAll,
    }), [state.toasts, state.position, maxToasts, setPosition, success, error, info, warning, dismiss, dismissAll]);

    // ==========================================
    // POSIZIONI CONTAINER
    // ==========================================

    const positionClasses: Record<ToastPosition, string> = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            
            {/* Toast Container - Portal fixed */}
            <div
                aria-live="polite"
                aria-label="Notifiche"
                className={`
                    fixed z-50 
                    flex flex-col gap-3
                    pointer-events-none
                    ${positionClasses[state.position]}
                `}
            >
                {contextValue.toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem 
                            toast={toast} 
                            onDismiss={dismiss} 
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// ==========================================
// CUSTOM HOOK
// ==========================================

/**
 * 🎓 PATTERN: Custom Hook
 * 
 * Perché un hook invece di esportare direttamente il context?
 * 1. Controllo errori: possiamo verificare che sia usato dentro il Provider
 * 2. API più pulita: useToast() invece di useContext(ToastContext)
 * 3. Estendibilità: possiamo aggiungere logica senza modificare i consumer
 * 
 * @example
 * const toast = useToast();
 * toast.success('Salvato con successo!');
 * toast.error('Errore durante il salvataggio');
 */
export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    
    if (!context) {
        throw new Error(
            '❌ useToast deve essere usato dentro un <ToastProvider>.\n' +
            'Assicurati di avvolgere la tua app con <ToastProvider> in main.tsx o App.tsx'
        );
    }
    
    return context;
};
