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
     * Esporta tutti i dati "lavoro" utente (GDPR)
     * Scarica automaticamente il file JSON
     */
    async exportData(): Promise<unknown | null> {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${API_BASE_URL}${this.baseUrl}/export`, {
                method: 'GET',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Per i cookie HttpOnly
            });

            if (!response.ok) {
                throw new Error('Errore durante l\'esportazione');
            }

            const data = await response.json();
            
            // Crea e scarica il file JSON
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `extra-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return data;
        } catch (error) {
            console.error('Export error:', error);
            return null;
        }
    }

    /**
     * Verifica i dati da importare senza importarli
     * Restituisce confronto con dati esistenti
     */
    async checkImportData(file: File): Promise<ApiResponse<{
        isIdentical: boolean;
        hasLessData: boolean;
        existing: Record<string, number>;
        importing: Record<string, number>;
        differences: Record<string, number>;
    }>> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const jsonData = JSON.parse(e.target?.result as string);
                    const response = await apiClient.post<{
                        isIdentical: boolean;
                        hasLessData: boolean;
                        existing: Record<string, number>;
                        importing: Record<string, number>;
                        differences: Record<string, number>;
                    }>(`${this.baseUrl}/import/check`, jsonData);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Errore nella lettura del file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Importa dati utente da file JSON
     * @param file File JSON da importare
     * @param force Se true, ignora warning e forza l'import
     */
    async importData(file: File, force = false): Promise<ApiResponse<{
        success: boolean;
        imported: {
            exams: number;
            projects: number;
            workLogs: number;
            decks: number;
            folders: number;
            tags: number;
            workTodos: number;
        };
    }>> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const jsonData = JSON.parse(e.target?.result as string);
                    
                    // Verifica dimensione JSON stringificato (approssimativa)
                    const jsonString = JSON.stringify(jsonData);
                    const sizeMB = new Blob([jsonString]).size / 1024 / 1024;
                    
                    if (sizeMB > 50) {
                        reject(new Error(`Il file è troppo grande (${sizeMB.toFixed(2)}MB). Il limite massimo è 50MB.`));
                        return;
                    }
                    
                    const response = await apiClient.post<{
                        success: boolean;
                        imported: {
                            exams: number;
                            projects: number;
                            workLogs: number;
                            decks: number;
                            folders: number;
                            tags: number;
                            workTodos: number;
                        };
                    }>(`${this.baseUrl}/import`, {
                        data: jsonData,
                        force: force,
                    });
                    resolve(response);
                } catch (error: any) {
                    // Se è un errore di dimensione, migliora il messaggio
                    if (error?.response?.data?.error?.code === 'FILE_TOO_LARGE' || 
                        error?.response?.data?.error?.code === 'PAYLOAD_TOO_LARGE') {
                        const errorMessage = error.response.data.error.message || 
                            'Il file è troppo grande. Il limite massimo è 50MB.';
                        reject(new Error(errorMessage));
                    } else {
                        reject(error);
                    }
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Errore nella lettura del file'));
            };
            
            reader.readAsText(file);
        });
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

    // ==========================================
    // AVATAR
    // ==========================================

    /**
     * Upload avatar utente
     * @param file File immagine dell'avatar
     * @returns URL dell'avatar caricato
     */
    async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
        const formData = new FormData();
        formData.append('avatar', file);

        return apiClient.post<{ avatarUrl: string }>(`${this.baseUrl}/avatar`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * Elimina avatar utente
     */
    async deleteAvatar(): Promise<ApiResponse<void>> {
        return apiClient.delete(`${this.baseUrl}/avatar`);
    }
}

export const settingsService = new SettingsService();
