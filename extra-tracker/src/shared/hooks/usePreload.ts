/**
 * 🚀 USE PRELOAD - Hook per preload di moduli lazy on hover/focus
 *
 * Migliora la perceived performance precaricando i moduli
 * quando l'utente passa sopra o mette focus su un link.
 *
 * @see bundle-preload (Vercel React Best Practices)
 *
 * @example
 * const preloadStudySession = usePreload(
 *   () => import('../features/study/pages/StudySessionPage')
 * );
 *
 * <button onMouseEnter={preloadStudySession} onFocus={preloadStudySession}>
 *   Studia
 * </button>
 */

import { useCallback, useRef } from 'react';

type ModuleLoader = () => Promise<unknown>;

/**
 * Hook per preloadare un modulo lazy al primo hover/focus
 *
 * @param loader - Funzione che importa il modulo (es. () => import('./Page'))
 * @returns Callback da passare a onMouseEnter/onFocus
 */
export function usePreload(loader: ModuleLoader): () => void {
    const hasPreloadedRef = useRef(false);

    return useCallback(() => {
        // Preload solo una volta
        if (hasPreloadedRef.current) return;
        hasPreloadedRef.current = true;

        // Preload in background senza bloccare
        loader().catch(() => {
            // Ignora errori di preload - non è critico
            hasPreloadedRef.current = false;
        });
    }, [loader]);
}

/**
 * Preload multiple modules at once
 *
 * @param loaders - Array di funzioni loader
 * @returns Callback che preloada tutti i moduli
 */
export function usePreloadAll(loaders: ModuleLoader[]): () => void {
    const hasPreloadedRef = useRef(false);

    return useCallback(() => {
        if (hasPreloadedRef.current) return;
        hasPreloadedRef.current = true;

        // Preload tutti in parallelo
        Promise.all(loaders.map((loader) => loader().catch(() => null)));
    }, [loaders]);
}

/**
 * Crea una funzione preload standalone (senza hook)
 * Utile per preload da event handlers
 */
export function createPreloader(loader: ModuleLoader): () => void {
    let hasPreloaded = false;

    return () => {
        if (hasPreloaded) return;
        hasPreloaded = true;
        loader().catch(() => {
            hasPreloaded = false;
        });
    };
}

/**
 * Preloaders per le pagine principali dell'app
 * Possono essere usati direttamente senza hook
 */
export const pagePreloaders = {
    studySession: createPreloader(
        () => import('../../features/study/pages/StudySessionPage')
    ),
    deckDetail: createPreloader(
        () => import('../../features/study/pages/DeckDetailPage')
    ),
    cinemaPage: createPreloader(
        () => import('../../features/study/pages/CinemaPage')
    ),
    dashboard: createPreloader(
        () => import('../../features/dashboard/pages/DashboardPage')
    ),
};

export default usePreload;
