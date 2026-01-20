/**
 * USE GAMIFICATION STATUS HOOK
 *
 * Hook per fetch dei dati gamification con caching e real-time updates.
 * Ottimizzato per performance con stale-while-revalidate pattern.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { gamificationService, type GamificationStatus } from '../services/gamificationService';

interface UseGamificationStatusOptions {
    /** Intervallo di refresh in ms (default: 60000 - 1 minuto) */
    refreshInterval?: number;
    /** Se true, non fa il fetch iniziale automatico */
    skipInitialFetch?: boolean;
    /** Se true, abilita polling automatico */
    enablePolling?: boolean;
}

interface UseGamificationStatusReturn {
    status: GamificationStatus | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    /** Ultimo timestamp di aggiornamento */
    lastUpdated: number | null;
}

// Cache globale per evitare refetch inutili tra componenti
let globalCache: {
    data: GamificationStatus | null;
    timestamp: number;
    promise: Promise<GamificationStatus> | null;
} = {
    data: null,
    timestamp: 0,
    promise: null,
};

const CACHE_TTL = 30000; // 30 secondi

export const useGamificationStatus = (
    options: UseGamificationStatusOptions = {}
): UseGamificationStatusReturn => {
    const {
        refreshInterval = 60000,
        skipInitialFetch = false,
        enablePolling = true,
    } = options;

    const [status, setStatus] = useState<GamificationStatus | null>(globalCache.data);
    const [isLoading, setIsLoading] = useState(!globalCache.data);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(globalCache.timestamp || null);

    const isMountedRef = useRef(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = useCallback(async (force = false) => {
        const now = Date.now();

        // Se abbiamo dati in cache recenti e non forziamo il refresh, usa la cache
        if (!force && globalCache.data && (now - globalCache.timestamp) < CACHE_TTL) {
            if (isMountedRef.current) {
                setStatus(globalCache.data);
                setLastUpdated(globalCache.timestamp);
                setIsLoading(false);
            }
            return;
        }

        // Se c'è già una richiesta in corso, aspetta quella
        if (globalCache.promise) {
            try {
                const data = await globalCache.promise;
                if (isMountedRef.current) {
                    setStatus(data);
                    setLastUpdated(globalCache.timestamp);
                    setIsLoading(false);
                }
                return;
            } catch {
                // La richiesta precedente è fallita, proviamo di nuovo
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            // Crea la promise e salvala nella cache
            globalCache.promise = gamificationService.getStatus();
            const data = await globalCache.promise;

            // Aggiorna cache globale
            globalCache.data = data;
            globalCache.timestamp = Date.now();
            globalCache.promise = null;

            if (isMountedRef.current) {
                setStatus(data);
                setLastUpdated(globalCache.timestamp);
                setError(null);
            }
        } catch (err) {
            globalCache.promise = null;
            if (isMountedRef.current) {
                setError(err instanceof Error ? err : new Error('Errore nel caricamento'));
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    const refresh = useCallback(async () => {
        await fetchStatus(true);
    }, [fetchStatus]);

    // Initial fetch
    useEffect(() => {
        isMountedRef.current = true;

        if (!skipInitialFetch) {
            fetchStatus();
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [fetchStatus, skipInitialFetch]);

    // Polling
    useEffect(() => {
        if (!enablePolling || refreshInterval <= 0) {
            return;
        }

        intervalRef.current = setInterval(() => {
            fetchStatus();
        }, refreshInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchStatus, enablePolling, refreshInterval]);

    return {
        status,
        isLoading,
        error,
        refresh,
        lastUpdated,
    };
};

// Funzione per invalidare la cache (utile dopo azioni che modificano i dati)
export const invalidateGamificationCache = () => {
    globalCache.data = null;
    globalCache.timestamp = 0;
    globalCache.promise = null;
};

// Funzione per aggiornare la cache manualmente (utile per optimistic updates)
export const updateGamificationCache = (updater: (prev: GamificationStatus | null) => GamificationStatus | null) => {
    globalCache.data = updater(globalCache.data);
    globalCache.timestamp = Date.now();
};

export default useGamificationStatus;
