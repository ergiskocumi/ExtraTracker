/**
 * 🔒 AUTH SERVICE - Frontend
 * 
 * Gestisce comunicazione sicura con il backend per autenticazione.
 * I token sono gestiti via HttpOnly cookies (non accessibili da JS).
 */

import { apiClient, type ApiResponse } from './api/apiClient';

// Tipi
export interface User {
    id: string;
    email: string;
    isEmailVerified?: boolean;
    createdAt?: string;
}

export interface AuthData {
    user: User;
    isAuthenticated?: boolean;
}
export type AuthResponse = ApiResponse<AuthData>;

export interface RegisterData {
    email: string;
    password: string;
    acceptTerms: boolean;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/**
 * Servizio Autenticazione
 * 
 * IMPORTANTE: Usa credentials: 'include' per inviare/ricevere cookies
 */
class AuthService {
    private baseUrl = '/auth';

    /**
     * Registra nuovo utente
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await apiClient.post<AuthData>(`${this.baseUrl}/register`, data);
        return response;
    }

    /**
     * Login utente
     */
    async login(data: LoginData): Promise<AuthResponse> {
        const response = await apiClient.post<AuthData>(`${this.baseUrl}/login`, data);
        return response;
    }

    /**
     * Logout utente
     */
    async logout(): Promise<AuthResponse> {
        const response = await apiClient.post<AuthData>(`${this.baseUrl}/logout`, {});
        return response;
    }

    /**
     * Rinnova access token
     */
    async refresh(): Promise<AuthResponse> {
        const response = await apiClient.post<AuthData>(`${this.baseUrl}/refresh`, {});
        return response;
    }

    /**
     * Verifica se utente è autenticato
     */
    async checkAuth(): Promise<AuthResponse> {
        try {
            const response = await apiClient.get<AuthData>(`${this.baseUrl}/check`);
            return response;
        } catch {
            return {
                success: false,
                message: 'Non autenticato',
            };
        }
    }

    /**
     * Ottieni profilo utente
     */
    async getProfile(): Promise<AuthResponse> {
        const response = await apiClient.get<AuthData>(`${this.baseUrl}/me`);
        return response;
    }

    /**
     * Cambia password
     */
    async changePassword(data: ChangePasswordData): Promise<AuthResponse> {
        const response = await apiClient.put<AuthData>(`${this.baseUrl}/password`, data);
        return response;
    }
}

export const authService = new AuthService();
