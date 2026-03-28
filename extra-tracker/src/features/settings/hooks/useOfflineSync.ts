/**
 * 📡 USE OFFLINE SYNC - Gestione sincronizzazione offline/online
 * 
 * Questo hook gestisce:
 * - Persistenza dei dati modificati in localStorage quando offline
 * - Notifica all'utente dello stato di connessione
 * - Sincronizzazione automatica quando torna online
 * - Coda delle modifiche pendenti
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { emitToast } from '../../../shared/components/toast';

interface PendingChange<T> {
    id: string;
    timestamp: number;
    data: T;
    section: string;
}

interface UseOfflineSyncOptions<T> {
    storageKey: string;
    onSync: (changes: PendingChange<T>[]) => Promise<boolean>;
    onChangePending?: (hasPending: boolean) => void;
}

interface UseOfflineSyncReturn<T> {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    saveChange: (data: T, section: string) => void;
    syncNow: () => Promise<boolean>;
    clearPending: () => void;
    lastSyncAt: number | null;
}

/**
 * Hook per gestire la sincronizzazione offline/online
 * 
 * @example
 * const { isOnline, saveChange, syncNow, pendingCount } = useOfflineSync({
 *     storageKey: 'settings_pending',
 *     onSync: async (changes) => {
 *         // Invia modifiche al server
 *         return await api.syncChanges(changes);
 *     }
 * });
 */
export const useOfflineSync = <T extends Record<string, any>>(
    options: UseOfflineSyncOptions<T>
): UseOfflineSyncReturn<T> => {
    const { storageKey, onSync, onChangePending } = options;

    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [pendingChanges, setPendingChanges] = useState<PendingChange<T>[]>([]);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
    
    // Ref per tracciare se abbiamo già mostrato il toast offline
    const offlineToastShown = useRef<boolean>(false);
    // Ref per tracciare lo stato precedente della connessione
    const wasOnlineRef = useRef<boolean>(navigator.onLine);
    // Ref per il timer di sync automatico
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Carica modifiche pendenti dal localStorage all'avvio
     */
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as PendingChange<T>[];
                setPendingChanges(parsed);
                if (parsed.length > 0 && onChangePending) {
                    onChangePending(true);
                }
            }
        } catch (error) {
            console.error('Errore nel caricamento modifiche offline:', error);
        }
    }, [storageKey, onChangePending]);

    /**
     * Salva modifiche pendenti nel localStorage
     */
    useEffect(() => {
        try {
            if (pendingChanges.length > 0) {
                localStorage.setItem(storageKey, JSON.stringify(pendingChanges));
            } else {
                localStorage.removeItem(storageKey);
            }
            if (onChangePending) {
                onChangePending(pendingChanges.length > 0);
            }
        } catch (error) {
            console.error('Errore nel salvataggio modifiche offline:', error);
        }
    }, [pendingChanges, storageKey, onChangePending]);

    /**
     * Monitora lo stato della connessione
     */
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Mostra toast solo se stavamo offline
            if (!wasOnlineRef.current) {
                emitToast.success('Connessione ripristinata', {
                    title: 'Sei di nuovo online',
                    duration: 3000,
                });
            }
            wasOnlineRef.current = true;
        };

        const handleOffline = () => {
            setIsOnline(false);
            // Mostra toast solo una volta
            if (!offlineToastShown.current) {
                emitToast.warning('Le modifiche verranno salvate localmente e sincronizzate al ripristino', {
                    title: 'Connessione assente',
                    duration: 5000,
                });
                offlineToastShown.current = true;
            }
            wasOnlineRef.current = false;
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Resetta il flag del toast quando torniamo online
     */
    useEffect(() => {
        if (isOnline) {
            offlineToastShown.current = false;
        }
    }, [isOnline]);

    /**
     * Salva una modifica (online o offline)
     */
    const saveChange = useCallback((data: T, section: string) => {
        const newChange: PendingChange<T> = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            data,
            section,
        };

        setPendingChanges(prev => [...prev, newChange]);

        // Se siamo offline, informa l'utente che è stata salvata localmente
        if (!navigator.onLine) {
            emitToast.info('Verrà sincronizzata quando tornerai online', {
                title: 'Modifica salvata in locale',
                duration: 2000,
            });
        }
    }, []);

    /**
     * Sincronizza le modifiche pendenti con il server
     */
    const syncNow = useCallback(async (): Promise<boolean> => {
        if (pendingChanges.length === 0) return true;
        if (!navigator.onLine) {
            emitToast.warning('Sei ancora offline', {
                title: 'Impossibile sincronizzare',
            });
            return false;
        }

        setIsSyncing(true);

        try {
            const success = await onSync(pendingChanges);
            
            if (success) {
                setPendingChanges([]);
                setLastSyncAt(Date.now());
                localStorage.removeItem(storageKey);
                emitToast.success('Tutte le modifiche sono state sincronizzate!', {
                    title: 'Sincronizzazione completata',
                });
                return true;
            } else {
                emitToast.error('Le modifiche rimarranno salvate in locale', {
                    title: 'Errore durante la sincronizzazione',
                });
                return false;
            }
        } catch (error) {
            console.error('Errore sync:', error);
            emitToast.error('Riprova più tardi', {
                title: 'Errore di sincronizzazione',
            });
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [pendingChanges, onSync, storageKey]);

    /**
     * Sincronizzazione automatica quando torna online
     */
    useEffect(() => {
        // Pulisci timer precedente se esiste
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            syncTimerRef.current = null;
        }
        
        if (isOnline && pendingChanges.length > 0 && !isSyncing) {
            // Piccolo delay per assicurarci che la connessione sia stabile
            syncTimerRef.current = setTimeout(() => {
                syncNow();
                syncTimerRef.current = null;
            }, 1000);
        }
        
        // Cleanup al dismount
        return () => {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        };
    }, [isOnline, pendingChanges.length, isSyncing, syncNow]);

    /**
     * Cancella tutte le modifiche pendenti
     */
    const clearPending = useCallback(() => {
        setPendingChanges([]);
        localStorage.removeItem(storageKey);
        emitToast.info('Modifiche locali cancellate');
    }, [storageKey]);

    return {
        isOnline,
        pendingCount: pendingChanges.length,
        isSyncing,
        saveChange,
        syncNow,
        clearPending,
        lastSyncAt,
    };
};
