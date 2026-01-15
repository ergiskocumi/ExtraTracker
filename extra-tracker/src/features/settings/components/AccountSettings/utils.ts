/**
 * Utility functions per AccountSettings
 * 
 * Questo file contiene funzioni helper pure che possono essere
 * facilmente testate e riutilizzate. Ogni funzione ha una singola
 * responsabilità e un nome che descrive chiaramente il suo scopo.
 */

import { MAX_FILE_SIZE_BYTES, FILE_ERROR_CODES } from './constants';
import type { DeleteAccountErrors } from './types';

/**
 * Verifica se un file rispetta i requisiti per l'import
 * 
 * Controlla sia la dimensione che il tipo del file, restituendo
 * un oggetto con il risultato della validazione e un eventuale
 * messaggio di errore.
 * 
 * @param file - Il file da validare
 * @returns Oggetto con `isValid` (boolean) e `error` (string | null)
 * 
 * @example
 * const validation = validateImportFile(selectedFile);
 * if (!validation.isValid) {
 *   showError(validation.error);
 * }
 */
export function validateImportFile(file: File): { isValid: boolean; error: string | null } {
    // Verifica dimensione file
    if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeInMB = file.size / 1024 / 1024;
        return {
            isValid: false,
            error: `Il file è troppo grande (${sizeInMB.toFixed(2)}MB). Il limite massimo è 50MB.`,
        };
    }

    // Verifica tipo file (deve essere JSON)
    const isJsonFile = file.type === 'application/json' || file.name.endsWith('.json');
    if (!isJsonFile) {
        return {
            isValid: false,
            error: 'Per favore seleziona un file JSON valido',
        };
    }

    return { isValid: true, error: null };
}

/**
 * Verifica se un errore è relativo alla dimensione del file
 * 
 * Controlla se l'errore ricevuto dal backend indica che il file
 * è troppo grande, permettendo di mostrare un messaggio appropriato.
 * 
 * @param error - L'errore da verificare (può essere di qualsiasi tipo)
 * @returns `true` se l'errore è relativo alla dimensione del file
 * 
 * @example
 * try {
 *   await importData(file);
 * } catch (error) {
 *   if (isFileSizeError(error)) {
 *     showError('File troppo grande');
 *   }
 * }
 */
export function isFileSizeError(error: unknown): boolean {
    // Type guard per verificare se l'errore ha la struttura attesa
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { code?: string } } } }).response;
        const errorCode = response?.data?.error?.code;
        
        return errorCode === FILE_ERROR_CODES.FILE_TOO_LARGE || 
               errorCode === FILE_ERROR_CODES.PAYLOAD_TOO_LARGE;
    }
    
    return false;
}

/**
 * Valida i campi del form di eliminazione account
 * 
 * Controlla che la password sia presente e che la conferma
 * sia esattamente "DELETE", restituendo un oggetto con gli errori
 * trovati (se presenti).
 * 
 * @param password - La password inserita dall'utente
 * @param confirmation - Il testo di conferma inserito dall'utente
 * @returns Oggetto con gli errori di validazione (vuoto se tutto è valido)
 * 
 * @example
 * const errors = validateDeleteForm(password, confirmation);
 * if (Object.keys(errors).length > 0) {
 *   setDeleteErrors(errors);
 *   return;
 * }
 */
export function validateDeleteForm(
    password: string,
    confirmation: string
): DeleteAccountErrors {
    const errors: DeleteAccountErrors = {};

    // La password è obbligatoria per sicurezza
    if (!password.trim()) {
        errors.password = 'Password richiesta';
    }

    // La conferma deve essere esattamente "DELETE" per prevenire eliminazioni accidentali
    if (confirmation !== 'DELETE') {
        errors.confirmation = 'Devi scrivere DELETE per confermare';
    }

    return errors;
}

/**
 * Resetta lo stato del form di eliminazione
 * 
 * Funzione helper per resettare tutti i campi e gli errori
 * del form di eliminazione, utilizzata quando l'utente annulla
 * l'operazione o dopo un'eliminazione riuscita.
 * 
 * @returns Oggetto con tutti i valori resettati
 * 
 * @example
 * const resetState = getResetDeleteFormState();
 * setPassword(resetState.password);
 * setConfirmation(resetState.confirmation);
 * setDeleteErrors(resetState.deleteErrors);
 */
export function getResetDeleteFormState() {
    return {
        password: '',
        confirmation: '',
        deleteErrors: {} as DeleteAccountErrors,
    };
}

/**
 * Resetta lo stato dell'import
 * 
 * Funzione helper per resettare tutti i campi e i risultati
 * dell'operazione di import, utilizzata quando l'utente seleziona
 * un nuovo file o annulla l'operazione.
 * 
 * @returns Oggetto con tutti i valori resettati
 * 
 * @example
 * const resetState = getResetImportState();
 * setSelectedFile(resetState.selectedFile);
 * setComparison(resetState.comparison);
 * setImportResult(resetState.importResult);
 */
export function getResetImportState() {
    return {
        selectedFile: null,
        comparison: null,
        importResult: null,
        showLessDataWarning: false,
    };
}

/**
 * Pulisce il valore dell'input file
 * 
 * Resetta il valore dell'input file HTML, permettendo all'utente
 * di selezionare lo stesso file nuovamente se necessario.
 * 
 * @param fileInputRef - Riferimento all'elemento input file (può essere null)
 * 
 * @example
 * clearFileInput(fileInputRef);
 */
export function clearFileInput(fileInputRef: React.RefObject<HTMLInputElement | null>): void {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
}
