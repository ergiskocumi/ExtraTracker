/**
 * ⚙️ SETTINGS CONTEXT - Gestione Impostazioni Utente
 * 
 * Fornisce:
 * - Stato impostazioni utente (profilo, preferenze, notifiche)
 * - Metodi per aggiornare le impostazioni
 * - Sincronizzazione con backend
 * - Gestione tema e preferenze UI
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
    // Metodi
    loadSettings: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
    updatePreferences: (data: Partial<UserPreferences>) => Promise<boolean>;
    updateNotifications: (data: Partial<UserNotifications>) => Promise<boolean>;
    exportData: () => Promise<unknown | null>;
    deleteAccount: (password: string, confirmation: string) => Promise<boolean>;
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
    dailyGoalHours: 8,
    weeklyGoalHours: 40,
};

const defaultNotifications: UserNotifications = {
    email: {
        enabled: true,
        weeklyReport: true,
        goalReminders: true,
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
                setState({
                    profile: data.profile || {},
                    preferences: { ...defaultPreferences, ...data.preferences },
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
    }, [isAuthenticated]);

    /**
     * Aggiorna profilo utente
     */
    const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await settingsService.updateProfile(data);

            if (response.success && response.data) {
                setState(prev => ({
                    ...prev,
                    profile: { ...prev.profile, ...response.data?.profile },
                    isLoading: false,
                }));
                
                // ✅ Toast di successo
                emitToast.success('Profilo aggiornato con successo!', {
                    title: 'Profilo Salvato',
                });
                
                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.error?.message || 'Errore aggiornamento profilo',
                }));
                return false;
            }
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Errore aggiornamento profilo',
            }));
            return false;
        }
    }, []);

    /**
     * Aggiorna preferenze utente
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
    }, [state.preferences]);

    /**
     * Aggiorna notifiche
     */
    const updateNotifications = useCallback(async (data: Partial<UserNotifications>): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await settingsService.updateNotifications(data);

            if (response.success && response.data) {
                setState(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, ...response.data?.notifications },
                    isLoading: false,
                }));
                
                // ✅ Toast di successo
                emitToast.success('Notifiche aggiornate!', {
                    title: 'Impostazioni Salvate',
                });
                
                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.error?.message || 'Errore aggiornamento notifiche',
                }));
                return false;
            }
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Errore aggiornamento notifiche',
            }));
            return false;
        }
    }, []);

    /**
     * Esporta dati utente (GDPR)
     */
    const exportData = useCallback(async (): Promise<unknown | null> => {
        try {
            const response = await settingsService.exportData();
            if (response.success) {
                return response.data;
            }
            return null;
        } catch {
            return null;
        }
    }, []);

    /**
     * Elimina account (GDPR)
     */
    const deleteAccount = useCallback(async (password: string, confirmation: string): Promise<boolean> => {
        try {
            const response = await settingsService.deleteAccount(password, confirmation);
            return response.success;
        } catch {
            return false;
        }
    }, []);

    /**
     * Pulisci errore
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * Applica tema al documento
     */
    const applyTheme = (theme: 'dark' | 'light' | 'system') => {
        const root = document.documentElement;
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', theme);
        }
    };

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
        }
    }, [isAuthenticated, loadSettings]);

    // Ascolta cambio preferenza sistema per tema
    useEffect(() => {
        if (state.preferences.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [state.preferences.theme]);

    const value: SettingsContextValue = {
        ...state,
        loadSettings,
        updateProfile,
        updatePreferences,
        updateNotifications,
        exportData,
        deleteAccount,
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
