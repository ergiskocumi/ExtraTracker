/**
 * Tipi per il componente ChangeExamModal
 * 
 * Questo file contiene tutte le definizioni di tipo necessarie per gestire
 * il cambio di esame associato a un deck in modo type-safe.
 */

import type { Deck } from '../../../services/studyService';
import type { Exam } from '../../../types/exam';

/**
 * Props del componente ChangeExamModal
 * 
 * Definisce tutte le dipendenze esterne del componente,
 * permettendo di testarlo facilmente e di capire le sue responsabilità.
 */
export interface ChangeExamModalProps {
    /** 
     * Il deck per cui cambiare l'esame associato.
     * Deve contenere almeno l'id e l'examId corrente.
     */
    deck: Deck;
    
    /** 
     * Callback chiamato quando l'esame viene cambiato con successo.
     * Riceve il deck aggiornato come parametro.
     */
    onExamChanged: (updatedDeck: Deck) => void;
    
    /** 
     * Callback chiamato quando l'utente chiude il modal senza salvare.
     * Opzionale, utile per gestire lo stato del modal nel componente padre.
     */
    onClose?: () => void;
    
    /** 
     * Indica se il modal è aperto o chiuso.
     * Permette al componente padre di controllare la visibilità.
     */
    isOpen: boolean;
}

/**
 * Stato interno del componente ChangeExamModal
 * 
 * Gestisce tutto lo stato locale necessario per il funzionamento
 * del modal di cambio esame.
 */
export interface ChangeExamModalState {
    /** 
     * ID dell'esame attualmente selezionato nel dropdown.
     * Può essere null se nessun esame è selezionato.
     */
    selectedExamId: string | null;
    
    /** 
     * Lista degli esami disponibili per la selezione.
     * Viene caricata all'apertura del modal.
     */
    availableExams: Exam[];
    
    /** 
     * Indica se gli esami sono in fase di caricamento.
     * Mostra un indicatore di loading durante il fetch.
     */
    isLoadingExams: boolean;
    
    /** 
     * Indica se l'operazione di cambio esame è in corso.
     * Disabilita i controlli durante il salvataggio.
     */
    isSaving: boolean;
    
    /** 
     * Eventuale messaggio di errore da mostrare all'utente.
     * Null se non ci sono errori.
     */
    error: string | null;
}
