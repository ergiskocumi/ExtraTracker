/**
 * ↩️ USE UNDO - Sistema Undo/Redo per le modifiche
 * 
 * Hook che gestisce la cronologia delle modifiche con supporto per:
 * - Undo (annulla ultima modifica)
 * - Redo (ripristina modifica annullata)
 * - History limit (limite massimo di stati salvati)
 * - Reset history
 */

import { useState, useCallback, useRef } from 'react';
import { emitToast } from '../../../shared/components/toast';

interface UndoState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseUndoOptions<T> {
    maxHistory?: number;
    onUndo?: (previousState: T) => void;
    onRedo?: (nextState: T) => void;
    onChange?: (newState: T) => void;
}

interface UseUndoReturn<T> {
    state: T;
    setState: (newState: T | ((prev: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (newState: T) => void;
    clearHistory: () => void;
    historySize: number;
}

/**
 * Hook per gestire undo/redo delle modifiche
 * 
 * @example
 * const { state, setState, undo, redo, canUndo, canRedo } = useUndo(
 *     { name: '', email: '' },
 *     {
 *         maxHistory: 20,
 *         onUndo: (prev) => console.log('Undone to:', prev),
 *     }
 * );
 */
export const useUndo = <T extends Record<string, any>>(
    initialState: T,
    options: UseUndoOptions<T> = {}
): UseUndoReturn<T> => {
    const { maxHistory = 20, onUndo, onRedo, onChange } = options;

    const [undoState, setUndoState] = useState<UndoState<T>>({
        past: [],
        present: initialState,
        future: [],
    });

    // Ref per tracciare se stiamo facendo undo/redo (per evitare loop)
    const isUndoingRef = useRef<boolean>(false);

    /**
     * Imposta il nuovo stato aggiungendolo alla history
     */
    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        if (isUndoingRef.current) return;

        setUndoState(prev => {
            const resolvedState = typeof newState === 'function' 
                ? (newState as (prev: T) => T)(prev.present) 
                : newState;

            // Non salvare se lo stato è identico
            if (JSON.stringify(prev.present) === JSON.stringify(resolvedState)) {
                return prev;
            }

            // Mantieni solo maxHistory elementi nel passato
            const newPast = [prev.present, ...prev.past].slice(0, maxHistory);

            // Chiama callback onChange
            if (onChange) {
                onChange(resolvedState);
            }

            return {
                past: newPast,
                present: resolvedState,
                future: [], // Reset future quando c'è una nuova modifica
            };
        });
    }, [maxHistory, onChange]);

    /**
     * Annulla l'ultima modifica (undo)
     */
    const undo = useCallback(() => {
        setUndoState(prev => {
            if (prev.past.length === 0) return prev;

            const [newPresent, ...newPast] = prev.past;
            const newFuture = [prev.present, ...prev.future];

            isUndoingRef.current = true;

            // Chiama callback onUndo
            if (onUndo) {
                onUndo(newPresent);
            }

            // Reset flag dopo un frame
            requestAnimationFrame(() => {
                isUndoingRef.current = false;
            });

            return {
                past: newPast,
                present: newPresent,
                future: newFuture,
            };
        });

        // Toast di conferma
        emitToast.info('Modifica annullata', {
            title: 'Annulla',
        });
    }, [onUndo]);

    /**
     * Ripristina l'ultima modifica annullata (redo)
     */
    const redo = useCallback(() => {
        setUndoState(prev => {
            if (prev.future.length === 0) return prev;

            const [newPresent, ...newFuture] = prev.future;
            const newPast = [prev.present, ...prev.past];

            isUndoingRef.current = true;

            // Chiama callback onRedo
            if (onRedo) {
                onRedo(newPresent);
            }

            // Reset flag dopo un frame
            requestAnimationFrame(() => {
                isUndoingRef.current = false;
            });

            return {
                past: newPast,
                present: newPresent,
                future: newFuture,
            };
        });

        // Toast di conferma
        emitToast.info('Modifica ripristinata', {
            title: 'Annulla',
        });
    }, [onRedo]);

    /**
     * Resetta lo stato e la history
     */
    const reset = useCallback((newState: T) => {
        setUndoState({
            past: [],
            present: newState,
            future: [],
        });
    }, []);

    /**
     * Cancella la history mantenendo lo stato attuale
     */
    const clearHistory = useCallback(() => {
        setUndoState(prev => ({
            past: [],
            present: prev.present,
            future: [],
        }));
    }, []);

    const canUndo = undoState.past.length > 0;
    const canRedo = undoState.future.length > 0;
    const historySize = undoState.past.length + undoState.future.length;

    return {
        state: undoState.present,
        setState,
        undo,
        redo,
        canUndo,
        canRedo,
        reset,
        clearHistory,
        historySize,
    };
};

/**
 * Hook specializzato per gestire undo/redo nei form
 * Aggiunge helper per modifiche di campo singolo
 */
export const useFormUndo = <T extends Record<string, any>>(
    initialState: T,
    options: UseUndoOptions<T> = {}
) => {
    const undo = useUndo(initialState, options);

    /**
     * Aggiorna un singolo campo preservando gli altri
     */
    const updateField = useCallback(<K extends keyof T>(
        field: K,
        value: T[K]
    ) => {
        undo.setState(prev => ({
            ...prev,
            [field]: value,
        }));
    }, [undo]);

    /**
     * Aggiorna multipli campi contemporaneamente
     */
    const updateFields = useCallback((fields: Partial<T>) => {
        undo.setState(prev => ({
            ...prev,
            ...fields,
        }));
    }, [undo]);

    return {
        ...undo,
        updateField,
        updateFields,
    };
};
