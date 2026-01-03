/**
 * 📱 useMediaQuery Hook
 * =====================
 * 
 * Custom hook for responsive design.
 * Returns true if the media query matches.
 */

import { useSyncExternalStore, useCallback } from 'react';

function getServerSnapshot(): boolean {
    return false;
}

export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback((callback: () => void) => {
        if (typeof window === 'undefined') return () => {};
        
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener('change', callback);
        return () => mediaQuery.removeEventListener('change', callback);
    }, [query]);

    const getSnapshot = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    }, [query]);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Preset breakpoints matching Tailwind
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsMobile = () => !useMediaQuery('(min-width: 768px)');
