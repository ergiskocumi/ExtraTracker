/**
 * WorkLog - Log di lavoro unificato (supporta sia Timer che Journal)
 */
export interface WorkLog {
    id: string; // identificativo unico per il mongodb
    projectId: string; // identificativo del progetto associato
    date: string; // data del lavoro svolto (YYYY-MM-DD)
    title: string; // titolo dell'attività (required)
    description?: string; // descrizione/note del lavoro svolto
    tags?: string[]; // tag per categorizzazione
    mood?: 'high' | 'neutral' | 'low'; // umore durante il lavoro
    isBillable?: boolean; // indica se il lavoro è fatturabile (default: true)
    startTime?: string; // orario di inizio del lavoro (HH:mm) - OPZIONALE
    endTime?: string; // orario di fine del lavoro (HH:mm) - OPZIONALE
    durationMinutes?: number; // durata in minuti (calcolata se orari presenti, altrimenti 0)
    createdAt: string; // timestamp creazione
    updatedAt: string; // timestamp ultimo aggiornamento
}

export type WorkLogFormMode = "new" | "edit" | "smartCopy";
