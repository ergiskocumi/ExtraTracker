/**
 * ⚙️ SETTINGS CONTEXT - Provider globale tema e profilo utente
 *
 * Fornisce a tutta l'app:
 * - Profilo utente (nome, avatar) e preferenze (tema, formato data/ora)
 * - Cambio tema (chiamato da ThemeToggle)
 * - Caricamento silenzioso al login, nessuna UI di gestione dedicata
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import {
    settingsService,
    type UserProfile,
    type UserPreferences,
    type UserNotifications,
    type AllSettingsData,
} from '../services/settingsService';
import { emitToast } from '../../../shared/components/toast';
import { applyThemePreference } from '../../../shared/utils/theme';

// ==========================================
// TIPI
// ==========================================

interface SettingsState {
    profile: UserProfile;
    preferences: UserPreferences;
    notifications: UserNotifications;
    account: {
        email: string;
        isEmailVerified: boolean;
        createdAt: string;
        lastLoginAt?: string;
    } | null;
    isLoading: boolean;
    hasLoaded: boolean;
    error: string | null;
}

interface SettingsContextValue extends SettingsState {
    loadSettings: () => Promise<void>;
    updatePreferences: (data: Partial<UserPreferences>) => Promise<boolean>;
    clearError: () => void;
}

// ==========================================
// VALORI DEFAULT
// ==========================================

const defaultPreferences: UserPreferences = {
    language: 'it',
    timezone: 'Europe/Rome',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    defaultHourlyRate: 0,
    theme: 'dark',
    compactMode: false,
    dashboardLayout: 'default',
    showMotivationalMessages: true,
    defaultView: 'dashboard',
    weekStartsOn: 1,
    workingDays: [1, 2, 3, 4, 5],
    dailyGoalHours: 4,
    weeklyGoalHours: 20,
};

const defaultNotifications: UserNotifications = {
    email: {
        enabled: true,
        weeklyReport: true,
        projectUpdates: false,
    },
    push: {
        enabled: false,
        dailyReminder: false,
        reminderTime: '09:00',
    },
};

// ==========================================
// CONTEXT
// ==========================================

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();

    const [state, setState] = useState<SettingsState>({
        profile: {},
        preferences: defaultPreferences,
        notifications: defaultNotifications,
        account: null,
        isLoading: false,
        hasLoaded: false,
        error: null,
    });

    const applyTheme = useCallback((theme: 'dark' | 'light' | 'system') => {
        applyThemePreference(theme);
    }, []);

    /**
     * Carica tutte le impostazioni dal server
     */
    const loadSettings = useCallback(async () => {
        if (!isAuthenticated) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await settingsService.getAllSettings();

            if (response.success && response.data) {
                const data = response.data as AllSettingsData;
                const normalizedPreferences = { ...defaultPreferences, ...data.preferences };
                setState({
                    profile: data.profile || {},
                    preferences: normalizedPreferences,
                    notifications: { ...defaultNotifications, ...data.notifications },
                    account: data.account,
                    isLoading: false,
                    hasLoaded: true,
                    error: null,
                });

                // Applica tema se necessario
                applyTheme(data.preferences?.theme || 'dark');
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    hasLoaded: true,
                    error: response.error?.message || 'Errore nel caricamento impostazioni',
                }));
            }
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                hasLoaded: true,
                error: err instanceof Error ? err.message : 'Errore nel caricamento impostazioni',
            }));
        }
    }, [isAuthenticated, applyTheme]);

    /**
     * Aggiorna preferenze utente (usato da ThemeToggle per il cambio tema)
     */
    const updatePreferences = useCallback(async (data: Partial<UserPreferences>): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await settingsService.updatePreferences(data);

            if (response.success && response.data) {
                const newPreferences = { ...state.preferences, ...response.data.preferences };
                setState(prev => ({
                    ...prev,
                    preferences: newPreferences,
                    isLoading: false,
                }));

                // Applica tema se cambiato
                if (data.theme) {
                    applyTheme(data.theme);
                }

                // ✅ Toast di successo
                emitToast.success('Preferenze aggiornate!', {
                    title: 'Preferenze Salvate',
                });

                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.error?.message || 'Errore aggiornamento preferenze',
                }));
                return false;
            }
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Errore aggiornamento preferenze',
            }));
            return false;
        }
    }, [state.preferences, applyTheme]);

    /**
     * Pulisci errore
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Carica impostazioni quando l'utente è autenticato
    useEffect(() => {
        if (isAuthenticated) {
            loadSettings();
        } else {
            // Reset a valori default se non autenticato
            setState({
                profile: {},
                preferences: defaultPreferences,
                notifications: defaultNotifications,
                account: null,
                isLoading: false,
                hasLoaded: false,
                error: null,
            });

            // Mantiene tema consistente anche nelle route pubbliche
            applyTheme(defaultPreferences.theme);
        }
    }, [isAuthenticated, loadSettings, applyTheme]);

    // Ascolta cambio preferenza sistema per tema
    useEffect(() => {
        if (state.preferences.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [state.preferences.theme, applyTheme]);

    const value: SettingsContextValue = {
        ...state,
        loadSettings,
        updatePreferences,
        clearError,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

// ==========================================
// HOOK
// ==========================================

export const useSettings = (): SettingsContextValue => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings deve essere usato dentro un SettingsProvider');
    }
    return context;
};

// Export di default preferences per uso esterno
export { defaultPreferences, defaultNotifications };
