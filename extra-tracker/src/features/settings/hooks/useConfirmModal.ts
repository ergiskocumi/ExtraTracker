/**
 * ⚠️ USE CONFIRM MODAL - Gestione modali di conferma
 * 
 * Hook per gestire modali di conferma riutilizzabili con:
 * - Configurazione dinamica (titolo, messaggio, tipo)
 * - Callbacks per confirm/cancel
 * - Stato aperto/chiuso
 */

import { useState, useCallback } from 'react';

export type ConfirmModalType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalConfig {
    title: string;
    message: string;
    type: ConfirmModalType;
    confirmLabel?: string;
    cancelLabel?: string;
    requireTextInput?: string; // Testo che l'utente deve digitare per confermare (es. "DELETE")
}

interface UseConfirmModalReturn {
    // Stato
    isOpen: boolean;
    config: ConfirmModalConfig | null;
    
    // Azioni
    openConfirm: (config: ConfirmModalConfig, onConfirm: () => void, onCancel?: () => void) => void;
    closeConfirm: () => void;
    confirm: () => void;
    cancel: () => void;
    
    // Callbacks (impostati quando si apre il modal)
    onConfirmCallback: (() => void) | null;
    onCancelCallback: (() => void) | null;
}

/**
 * Hook per gestire modali di conferma
 * 
 * @example
 * const { isOpen, config, openConfirm, closeConfirm, confirm, cancel } = useConfirmModal();
 * 
 * // Apri modal
 * openConfirm(
 *     {
 *         title: 'Eliminare account?',
 *         message: 'Questa azione è irreversibile',
 *         type: 'danger',
 *         confirmLabel: 'Elimina',
 *     },
 *     () => deleteAccount(),
 *     () => console.log('Cancellato')
 * );
 */
export const useConfirmModal = (): UseConfirmModalReturn => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<ConfirmModalConfig | null>(null);
    const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
    const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);

    /**
     * Apre il modal con la configurazione specificata
     */
    const openConfirm = useCallback((
        newConfig: ConfirmModalConfig,
        onConfirm: () => void,
        onCancel?: () => void
    ) => {
        setConfig({
            confirmLabel: 'Conferma',
            cancelLabel: 'Annulla',
            ...newConfig,
        });
        setOnConfirmCallback(() => onConfirm);
        setOnCancelCallback(() => onCancel || null);
        setIsOpen(true);
    }, []);

    /**
     * Chiude il modal
     */
    const closeConfirm = useCallback(() => {
        setIsOpen(false);
        // Reset dopo l'animazione di chiusura
        setTimeout(() => {
            setConfig(null);
            setOnConfirmCallback(null);
            setOnCancelCallback(null);
        }, 200);
    }, []);

    /**
     * Conferma l'azione
     */
    const confirm = useCallback(() => {
        if (onConfirmCallback) {
            onConfirmCallback();
        }
        closeConfirm();
    }, [onConfirmCallback, closeConfirm]);

    /**
     * Annulla l'azione
     */
    const cancel = useCallback(() => {
        if (onCancelCallback) {
            onCancelCallback();
        }
        closeConfirm();
    }, [onCancelCallback, closeConfirm]);

    return {
        // Stato
        isOpen,
        config,
        
        // Azioni
        openConfirm,
        closeConfirm,
        confirm,
        cancel,
        
        // Callbacks
        onConfirmCallback,
        onCancelCallback,
    };
};

/**
 * Preset comuni per modali di conferma
 */
export const confirmPresets = {
    deleteAccount: (confirmText: string): ConfirmModalConfig => ({
        title: 'Elimina account',
        message: `Stai per eliminare permanentemente il tuo account e tutti i dati associati. Questa azione è irreversibile. Digita "${confirmText}" per confermare.`,
        type: 'danger',
        confirmLabel: 'Elimina account',
        cancelLabel: 'Annulla',
        requireTextInput: confirmText,
    }),
    
    changePassword: (): ConfirmModalConfig => ({
        title: 'Cambio password',
        message: 'Stai per modificare la tua password. Dovrai effettuare nuovamente il login su tutti i dispositivi.',
        type: 'warning',
        confirmLabel: 'Cambia password',
        cancelLabel: 'Annulla',
    }),
    
    importData: (): ConfirmModalConfig => ({
        title: 'Importa dati',
        message: 'L\'importazione sovrascriverà eventuali dati esistenti. Vuoi procedere?',
        type: 'warning',
        confirmLabel: 'Importa',
        cancelLabel: 'Annulla',
    }),
    
    forceImportData: (): ConfirmModalConfig => ({
        title: 'Forza importazione',
        message: 'Stai importando dati più vecchi di quelli esistenti. Questo potrebbe causare perdita di informazioni recenti. Vuoi procedere comunque?',
        type: 'danger',
        confirmLabel: 'Forza importazione',
        cancelLabel: 'Annulla',
    }),
    
    resetSettings: (): ConfirmModalConfig => ({
        title: 'Ripristina impostazioni',
        message: 'Stai per ripristinare tutte le impostazioni ai valori predefiniti. Questa azione non può essere annullata.',
        type: 'warning',
        confirmLabel: 'Ripristina',
        cancelLabel: 'Annulla',
    }),
    
    removeAvatar: (): ConfirmModalConfig => ({
        title: 'Rimuovi foto profilo',
        message: 'La tua foto profilo verrà rimossa e sostituita con un avatar predefinito.',
        type: 'info',
        confirmLabel: 'Rimuovi',
        cancelLabel: 'Annulla',
    }),
};
