/**
 * Costanti per il componente AccountSettings
 * 
 * Questo file centralizza tutti i valori magici e le costanti
 * utilizzate nel componente, rendendo il codice più manutenibile
 * e facilitando eventuali modifiche future.
 */

/**
 * Limite massimo di dimensione per i file di import (50MB)
 * 
 * Questo limite previene il sovraccarico del server e garantisce
 * tempi di risposta ragionevoli. Se necessario, può essere aumentato
 * modificando solo questo valore.
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Messaggi di errore per la validazione dei file
 * 
 * Questi messaggi vengono mostrati all'utente quando il file
 * selezionato non rispetta i requisiti.
 */
export const FILE_VALIDATION_MESSAGES = {
    TOO_LARGE: (sizeInMB: number) => 
        `Il file è troppo grande (${sizeInMB.toFixed(2)}MB). Il limite massimo è 50MB.`,
    INVALID_TYPE: 'Per favore seleziona un file JSON valido',
    UPLOAD_TOO_LARGE: 'Il file è troppo grande. Il limite massimo è 50MB. Prova a esportare solo i dati necessari.',
} as const;

/**
 * Messaggi di errore per la validazione del form di eliminazione
 * 
 * Questi messaggi guidano l'utente nella correzione degli errori
 * durante la conferma dell'eliminazione dell'account.
 */
export const DELETE_VALIDATION_MESSAGES = {
    PASSWORD_REQUIRED: 'Password richiesta',
    CONFIRMATION_REQUIRED: 'Devi scrivere DELETE per confermare',
} as const;

/**
 * Testo di conferma richiesto per eliminare l'account
 * 
 * Questo valore deve essere digitato esattamente dall'utente
 * per confermare l'intenzione di eliminare l'account, prevenendo
 * eliminazioni accidentali.
 */
export const DELETE_CONFIRMATION_TEXT = 'DELETE' as const;

/**
 * Codici di errore del backend per gestione file
 * 
 * Questi codici vengono restituiti dal backend quando ci sono
 * problemi con il caricamento del file. Li usiamo per mostrare
 * messaggi di errore appropriati all'utente.
 */
export const FILE_ERROR_CODES = {
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const;

/**
 * Configurazione delle animazioni
 * 
 * Questi valori definiscono le animazioni utilizzate nel componente
 * per creare un'esperienza utente fluida e professionale.
 */
export const ANIMATION_CONFIG = {
    // Durata standard per le transizioni
    DURATION_STANDARD: 0.3,
    DURATION_LONG: 0.4,
    
    // Curve di easing per animazioni naturali
    EASING_SMOOTH: [0.16, 1, 0.3, 1] as [number, number, number, number],
    
    // Delay tra le animazioni per creare un effetto a cascata
    DELAY_SHORT: 0.1,
    DELAY_MEDIUM: 0.15,
    DELAY_LONG: 0.2,
} as const;
