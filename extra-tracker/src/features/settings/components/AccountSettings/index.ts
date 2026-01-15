/**
 * Export principale del componente AccountSettings
 * 
 * Questo file esporta il componente principale e tutti i tipi
 * necessari per utilizzare AccountSettings in altri componenti.
 * 
 * La struttura modulare permette di importare solo ciò che serve:
 * - Il componente principale per l'uso normale
 * - I tipi per type-safety e sviluppo
 */

export { AccountSettings } from './AccountSettings';
export type { 
    AccountSettingsProps, 
    ImportComparison, 
    ImportResult,
    DeleteAccountErrors 
} from './types';

// Re-export delle costanti e utility per uso avanzato
export { DATA_CATEGORY_LABELS } from './types';
export { 
    MAX_FILE_SIZE_BYTES,
    DELETE_CONFIRMATION_TEXT,
    ANIMATION_CONFIG 
} from './constants';
export {
    validateImportFile,
    isFileSizeError,
    validateDeleteForm,
} from './utils';
