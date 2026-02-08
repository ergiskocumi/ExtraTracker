/**
 * 💀 USE SETTINGS SKELETON - Skeleton Loading States per Settings
 * 
 * Hook che gestisce gli stati di skeleton loading professionali
 * con simulazione realistica del caricamento
 */

import { useState, useEffect, useCallback } from 'react';

type SkeletonType = 'profile' | 'preferences' | 'security' | 'account' | 'notifications' | 'privacy';

interface SkeletonState {
    isLoading: boolean;
    showContent: boolean;
    hasError: boolean;
}

type SkeletonStates = Record<SkeletonType, SkeletonState>;

interface UseSettingsSkeletonOptions {
    simulatedDelay?: number;
    staggerDelay?: number;
}

interface UseSettingsSkeletonReturn {
    states: SkeletonStates;
    isAnyLoading: boolean;
    startLoading: (type: SkeletonType) => void;
    stopLoading: (type: SkeletonType, hasError?: boolean) => void;
    startAllLoading: () => void;
    stopAllLoading: () => void;
    refresh: (type: SkeletonType) => void;
}

const defaultState: SkeletonState = {
    isLoading: false,
    showContent: true,
    hasError: false,
};

const initialStates: SkeletonStates = {
    profile: { ...defaultState },
    preferences: { ...defaultState },
    security: { ...defaultState },
    account: { ...defaultState },
    notifications: { ...defaultState },
    privacy: { ...defaultState },
};

/**
 * Hook per gestire skeleton loading nei settings
 * 
 * @example
 * const { states, isAnyLoading, startLoading, stopLoading } = useSettingsSkeleton();
 * 
 * // Usa nello skeleton
 * {states.profile.isLoading && <ProfileSkeleton />}
 * 
 * // Avvia caricamento
 * startLoading('profile');
 * 
 * // Ferma caricamento
 * stopLoading('profile');
 */
export const useSettingsSkeleton = (
    options: UseSettingsSkeletonOptions = {}
): UseSettingsSkeletonReturn => {
    const { simulatedDelay = 0, staggerDelay = 100 } = options;

    const [states, setStates] = useState<SkeletonStates>(initialStates);

    /**
     * Avvia il caricamento per una sezione specifica
     */
    const startLoading = useCallback((type: SkeletonType) => {
        setStates(prev => ({
            ...prev,
            [type]: {
                isLoading: true,
                showContent: false,
                hasError: false,
            },
        }));
    }, []);

    /**
     * Ferma il caricamento per una sezione specifica
     */
    const stopLoading = useCallback((type: SkeletonType, hasError = false) => {
        setStates(prev => ({
            ...prev,
            [type]: {
                isLoading: false,
                showContent: true,
                hasError,
            },
        }));
    }, []);

    /**
     * Avvia il caricamento per tutte le sezioni con stagger
     */
    const startAllLoading = useCallback(() => {
        const types: SkeletonType[] = ['profile', 'preferences', 'security', 'account', 'notifications', 'privacy'];
        
        types.forEach((type, index) => {
            setTimeout(() => {
                startLoading(type);
            }, index * staggerDelay);
        });
    }, [startLoading, staggerDelay]);

    /**
     * Ferma il caricamento per tutte le sezioni
     */
    const stopAllLoading = useCallback(() => {
        const types: SkeletonType[] = ['profile', 'preferences', 'security', 'account', 'notifications', 'privacy'];
        
        types.forEach(type => {
            stopLoading(type);
        });
    }, [stopLoading]);

    /**
     * Refresh di una sezione (ricarica con animazione)
     */
    const refresh = useCallback((type: SkeletonType) => {
        startLoading(type);
        
        // Simula un minimo di delay per l'animazione
        setTimeout(() => {
            stopLoading(type);
        }, Math.max(simulatedDelay, 300));
    }, [startLoading, stopLoading, simulatedDelay]);

    // Computed: verifica se c'è qualche caricamento in corso
    const isAnyLoading = Object.values(states).some(s => s.isLoading);

    return {
        states,
        isAnyLoading,
        startLoading,
        stopLoading,
        startAllLoading,
        stopAllLoading,
        refresh,
    };
};

/**
 * Hook specifico per skeleton di un singolo componente
 */
export const useComponentSkeleton = (
    isLoadingProp?: boolean,
    minDisplayTime: number = 300
) => {
    const [isLoading, setIsLoading] = useState(isLoadingProp ?? true);
    const [showSkeleton, setShowSkeleton] = useState(true);

    useEffect(() => {
        if (isLoadingProp !== undefined) {
            if (isLoadingProp) {
                setIsLoading(true);
                setShowSkeleton(true);
            } else {
                // Minimo tempo di visualizzazione per evitare flash
                const timer = setTimeout(() => {
                    setIsLoading(false);
                    setTimeout(() => setShowSkeleton(false), 150); // Fade out
                }, minDisplayTime);
                return () => clearTimeout(timer);
            }
        }
    }, [isLoadingProp, minDisplayTime]);

    const skeletonProps = {
        'aria-busy': isLoading,
        'aria-live': 'polite' as const,
    };

    return {
        isLoading,
        showSkeleton,
        skeletonProps,
    };
};
