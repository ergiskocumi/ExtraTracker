/**
 * AccountSettings - Componente principale per la gestione dell'account
 * 
 * Questo componente coordina tutte le funzionalità relative alla gestione
 * dell'account utente:
 * - Esportazione dei dati in formato JSON
 * - Importazione dei dati da file JSON
 * - Visualizzazione delle informazioni account
 * - Eliminazione permanente dell'account
 * 
 * Il componente è stato refactorizzato seguendo i principi di clean code:
 * - Separazione delle responsabilità (ogni sezione è un componente separato)
 * - Funzioni helper pure per la logica di business
 * - Costanti centralizzate per valori magici
 * - Tipi ben definiti per type-safety
 * - Commenti esaustivi che spiegano il "perché"
 * 
 * @component
 */

import type { AccountSettingsProps } from './types';
import { ExportSection } from './ExportSection';
import { ImportSection } from './ImportSection';
import { DeleteAccountSection } from './DeleteAccountSection';
import { AccountInfo } from './AccountInfo';

/**
 * Componente principale per la gestione dell'account
 * 
 * Questo componente agisce come un orchestratore che coordina
 * le diverse sezioni (export, import, delete) senza contenere
 * logica di business complessa. Tutta la logica è delegata
 * ai componenti figli e alle funzioni helper.
 * 
 * @param props - Le props del componente (vedi AccountSettingsProps)
 * @returns Il componente AccountSettings renderizzato
 * 
 * @example
 * ```tsx
 * <AccountSettings
 *   accountEmail="user@example.com"
 *   onExport={handleExport}
 *   onCheckImport={handleCheckImport}
 *   onImport={handleImport}
 *   onDelete={handleDelete}
 *   status={formStatus}
 * />
 * ```
 */
export function AccountSettings({
    accountEmail,
    onExport,
    onCheckImport,
    onImport,
    onDelete,
    status,
}: AccountSettingsProps) {
    /**
     * Wrapper per onExport che gestisce eventuali errori
     * 
     * Questo wrapper permette di gestire errori in modo centralizzato
     * se necessario in futuro, senza dover modificare tutti i componenti figli.
     */
    const handleExport = async () => {
        try {
            await onExport();
        } catch (error) {
            // Gli errori vengono gestiti dal componente padre tramite lo status
            console.error('Errore durante l\'esportazione:', error);
        }
    };

    return (
        <div className="space-y-8">
            {/* 
                Sezione Export: Permette all'utente di scaricare
                una copia completa dei propri dati in formato JSON.
                Questa funzionalità è critica per permettere backup
                prima di operazioni rischiose come l'eliminazione account.
            */}
            <ExportSection
                isLoading={status.loading}
                onExport={handleExport}
            />

            {/* 
                Sezione Import: Permette all'utente di ripristinare
                i dati da un file JSON precedentemente esportato.
                Include validazioni, warning e feedback dettagliato.
            */}
            <ImportSection
                isLoading={status.loading}
                onCheckImport={onCheckImport}
                onImport={onImport}
            />

            {/* 
                Sezione Account Info: Mostra l'email dell'account
                corrente in modo chiaro e accessibile. Viene mostrata
                solo se l'email è disponibile.
            */}
            {accountEmail && (
                <AccountInfo email={accountEmail} />
            )}

            {/* 
                Sezione Delete Account: Permette l'eliminazione permanente
                dell'account con conferme multiple per prevenire eliminazioni
                accidentali. Richiede password e conferma esplicita.
            */}
            <DeleteAccountSection
                isLoading={status.loading}
                error={status.error}
                success={status.success}
                onDelete={onDelete}
            />
        </div>
    );
}
