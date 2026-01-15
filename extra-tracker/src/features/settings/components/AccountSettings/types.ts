/**
 * Tipi e interfacce per il componente AccountSettings
 * 
 * Questo file contiene tutte le definizioni di tipo necessarie per gestire
 * le operazioni di export, import e eliminazione account in modo type-safe.
 */

/**
 * Risultato della verifica dei dati prima dell'import
 * 
 * Contiene informazioni sulla comparazione tra i dati esistenti
 * e quelli che si vogliono importare, per permettere all'utente
 * di prendere decisioni informate.
 */
export interface ImportComparison {
    /** Indica se i dati da importare sono identici a quelli esistenti */
    isIdentical: boolean;
    
    /** Indica se i dati da importare contengono meno elementi */
    hasLessData: boolean;
    
    /** Conteggio degli elementi esistenti per categoria */
    existing: Record<string, number>;
    
    /** Conteggio degli elementi da importare per categoria */
    importing: Record<string, number>;
    
    /** Differenze tra dati esistenti e importati (valori negativi = perdita di dati) */
    differences: Record<string, number>;
}

/**
 * Risultato dell'operazione di import
 * 
 * Contiene il conteggio degli elementi importati per ogni categoria,
 * permettendo di mostrare all'utente un feedback dettagliato.
 */
export interface ImportResult {
    /** Indica se l'import è stato completato con successo */
    success: boolean;
    
    /** Conteggio degli elementi importati per categoria */
    imported: {
        goals: number;
        projects: number;
        workLogs: number;
        decks: number;
        folders: number;
        tags: number;
        checkIns: number;
        workTodos: number;
    };
}

/**
 * Errori di validazione per il form di eliminazione account
 * 
 * Ogni campo può avere un messaggio di errore specifico
 * che viene mostrato all'utente per guidarlo nella correzione.
 */
export interface DeleteAccountErrors {
    password?: string;
    confirmation?: string;
}

/**
 * Props del componente AccountSettings
 * 
 * Definisce tutte le dipendenze esterne del componente,
 * permettendo di testarlo facilmente e di capire le sue responsabilità.
 */
export interface AccountSettingsProps {
    /** Email dell'account corrente, mostrata per informazione */
    accountEmail?: string;
    
    /** Callback per esportare i dati dell'utente */
    onExport: () => Promise<unknown | null>;
    
    /** Callback per verificare i dati prima dell'import */
    onCheckImport: (file: File) => Promise<ImportComparison | null>;
    
    /** Callback per importare i dati */
    onImport: (file: File, force?: boolean) => Promise<ImportResult | null>;
    
    /** Callback per eliminare l'account */
    onDelete: (password: string, confirmation: string) => Promise<boolean>;
    
    /** Stato del form (loading, success, error) */
    status: {
        loading: boolean;
        success: boolean;
        error: string | null;
    };
}

/**
 * Stato interno del componente AccountSettings
 * 
 * Gestisce tutto lo stato locale necessario per il funzionamento
 * delle sezioni di export, import e eliminazione.
 */
export interface AccountSettingsState {
    // Stato per l'eliminazione account
    password: string;
    confirmation: string;
    showDeleteConfirm: boolean;
    deleteErrors: DeleteAccountErrors;
    
    // Stato per l'import
    selectedFile: File | null;
    importResult: ImportResult | null;
    comparison: ImportComparison | null;
    showLessDataWarning: boolean;
    isChecking: boolean;
}

/**
 * Mappatura delle categorie di dati per la visualizzazione
 * 
 * Converte le chiavi tecniche in etichette user-friendly in italiano.
 */
export const DATA_CATEGORY_LABELS: Record<string, string> = {
    goals: 'Obiettivi',
    projects: 'Progetti',
    workLogs: 'Work Logs',
    decks: 'Mazzi',
    folders: 'Cartelle',
    tags: 'Tag',
    checkIns: 'Check-in',
    workTodos: 'Todo',
} as const;
