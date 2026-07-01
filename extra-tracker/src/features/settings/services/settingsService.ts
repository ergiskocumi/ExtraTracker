/**
 * ⚙️ SETTINGS SERVICE - Frontend
 *
 * Gestisce la lettura delle impostazioni utente e l'aggiornamento delle
 * preferenze (tema). Usato solo da SettingsContext come provider globale.
 */

import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';

// ==========================================
// TIPI PROFILO
// ==========================================

export interface UserProfile {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    bio?: string;
    avatar?: string;
    company?: string;
    jobTitle?: string;
    location?: string;
    website?: string;
}

// ==========================================
// TIPI PREFERENZE
// ==========================================

export interface UserPreferences {
    // Generali
    language: 'it' | 'en' | 'es' | 'de' | 'fr';
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '24h' | '12h';

    // Valuta
    currency: 'EUR' | 'USD' | 'GBP' | 'CHF';
    defaultHourlyRate: number;

    // Tema/UI
    theme: 'dark' | 'light' | 'system';
    compactMode: boolean;

    // Dashboard
    dashboardLayout: 'default' | 'compact' | 'expanded';
    showMotivationalMessages: boolean;
    defaultView: 'dashboard';

    // Lavoro
    weekStartsOn: 0 | 1;
    workingDays: number[];
    dailyGoalHours: number;
    weeklyGoalHours: number;
}

export interface PreferencesData {
    preferences: UserPreferences;
}

// ==========================================
// TIPI NOTIFICHE
// ==========================================

export interface EmailNotifications {
    enabled: boolean;
    weeklyReport: boolean;
    projectUpdates: boolean;
}

export interface PushNotifications {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string;
}

export interface UserNotifications {
    email: EmailNotifications;
    push: PushNotifications;
}

// ==========================================
// TIPI IMPOSTAZIONI COMPLETE
// ==========================================

export interface AllSettingsData {
    profile: UserProfile;
    preferences: UserPreferences;
    notifications: UserNotifications;
    account: {
        email: string;
        isEmailVerified: boolean;
        createdAt: string;
        lastLoginAt?: string;
    };
}

// ==========================================
// SERVICE
// ==========================================

class SettingsService {
    private baseUrl = '/settings';

    /**
     * Ottieni tutte le impostazioni utente (profilo, preferenze, notifiche, account)
     */
    async getAllSettings(): Promise<ApiResponse<AllSettingsData>> {
        return apiClient.get<AllSettingsData>(this.baseUrl);
    }

    /**
     * Aggiorna preferenze utente (usato per il cambio tema dall'header)
     */
    async updatePreferences(data: Partial<UserPreferences>): Promise<ApiResponse<PreferencesData>> {
        return apiClient.put<PreferencesData>(`${this.baseUrl}/preferences`, data);
    }
}

export const settingsService = new SettingsService();
