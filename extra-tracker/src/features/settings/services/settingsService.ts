/**
 * ⚙️ SETTINGS SERVICE - Frontend
 * 
 * Gestisce comunicazione con il backend per le impostazioni utente:
 * - Profilo
 * - Preferenze
 * - Notifiche
 * - Export/Delete account (GDPR)
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

export interface ProfileData {
    profile: UserProfile;
    email: string;
    isEmailVerified: boolean;
    createdAt: string;
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
    defaultView: 'dashboard' | 'timeline' | 'goals';
    
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
    goalReminders: boolean;
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

export interface NotificationsData {
    notifications: UserNotifications;
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

    // ==========================================
    // IMPOSTAZIONI COMPLETE
    // ==========================================

    /**
     * Ottieni tutte le impostazioni utente
     */
    async getAllSettings(): Promise<ApiResponse<AllSettingsData>> {
        return apiClient.get<AllSettingsData>(this.baseUrl);
    }

    // ==========================================
    // PROFILO
    // ==========================================

    /**
     * Ottieni profilo utente
     */
    async getProfile(): Promise<ApiResponse<ProfileData>> {
        return apiClient.get<ProfileData>(`${this.baseUrl}/profile`);
    }

    /**
     * Aggiorna profilo utente
     */
    async updateProfile(data: Partial<UserProfile>): Promise<ApiResponse<{ profile: UserProfile }>> {
        return apiClient.put<{ profile: UserProfile }>(`${this.baseUrl}/profile`, data);
    }

    // ==========================================
    // PREFERENZE
    // ==========================================

    /**
     * Ottieni preferenze utente
     */
    async getPreferences(): Promise<ApiResponse<PreferencesData>> {
        return apiClient.get<PreferencesData>(`${this.baseUrl}/preferences`);
    }

    /**
     * Aggiorna preferenze utente
     */
    async updatePreferences(data: Partial<UserPreferences>): Promise<ApiResponse<PreferencesData>> {
        return apiClient.put<PreferencesData>(`${this.baseUrl}/preferences`, data);
    }

    // ==========================================
    // NOTIFICHE
    // ==========================================

    /**
     * Ottieni preferenze notifiche
     */
    async getNotifications(): Promise<ApiResponse<NotificationsData>> {
        return apiClient.get<NotificationsData>(`${this.baseUrl}/notifications`);
    }

    /**
     * Aggiorna preferenze notifiche
     */
    async updateNotifications(data: Partial<UserNotifications>): Promise<ApiResponse<NotificationsData>> {
        return apiClient.put<NotificationsData>(`${this.baseUrl}/notifications`, data);
    }

    // ==========================================
    // GDPR
    // ==========================================

    /**
     * Esporta tutti i dati utente (GDPR)
     */
    async exportData(): Promise<ApiResponse<unknown>> {
        return apiClient.get(`${this.baseUrl}/export`);
    }

    /**
     * Elimina account utente (GDPR)
     */
    async deleteAccount(password: string, confirmation: string): Promise<ApiResponse<void>> {
        return apiClient.delete(`${this.baseUrl}/account`, {
            password,
            confirmation,
        });
    }
}

export const settingsService = new SettingsService();
