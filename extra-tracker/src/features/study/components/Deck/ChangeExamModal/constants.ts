/**
 * Costanti per il componente ChangeExamModal
 * 
 * Questo file centralizza tutti i valori magici e le costanti
 * utilizzate nel componente, rendendo il codice più manutenibile
 * e facilitando eventuali modifiche future.
 */

/**
 * Messaggi di feedback per l'utente
 * 
 * Questi messaggi vengono mostrati all'utente durante le varie
 * fasi dell'operazione di cambio esame.
 */
export const USER_MESSAGES = {
    /** Messaggio mostrato quando l'esame viene cambiato con successo */
    SUCCESS: 'Esame associato aggiornato con successo',
    
    /** Titolo del messaggio di successo */
    SUCCESS_TITLE: 'Il mazzo è stato spostato al nuovo esame',
    
    /** Messaggio mostrato quando non ci sono esami disponibili */
    NO_EXAMS_AVAILABLE: 'Nessun esame disponibile. Crea un esame prima di associare un mazzo.',
    
    /** Messaggio mostrato quando si verifica un errore generico */
    ERROR_GENERIC: 'Errore nell\'aggiornamento dell\'esame',
    
    /** Messaggio mostrato quando l'esame selezionato è lo stesso di quello corrente */
    SAME_EXAM: 'L\'esame selezionato è già quello corrente',
    
    /** Messaggio mostrato quando non è stato selezionato un esame valido */
    NO_EXAM_SELECTED: 'Seleziona un esame valido',
} as const;

/**
 * Configurazione delle animazioni
 * 
 * Questi valori definiscono le animazioni utilizzate nel componente
 * per creare un'esperienza utente fluida e professionale.
 */
export const ANIMATION_CONFIG = {
    /** Durata standard per le transizioni */
    DURATION_STANDARD: 0.2,
    
    /** Durata per le animazioni più lunghe */
    DURATION_LONG: 0.3,
    
    /** Curve di easing per animazioni naturali */
    EASING_SMOOTH: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;
