import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * 🌐 API CLIENT - Configurato per Autenticazione Sicura
 * 
 * Caratteristiche:
 * - withCredentials: true per inviare cookies HttpOnly
 * - Interceptor per refresh automatico del token
 * - Gestione errori centralizzata
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiError {
    message: string;
    code: string;
    details?: Array<{ field: string; message: string }>;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    error?: ApiError;
}

// Configurazione base
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // CRITICO: Necessario per inviare/ricevere cookies cross-origin
    withCredentials: true,
    timeout: 10000, // 10 secondi timeout
});

// Flag per evitare loop infiniti di refresh
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    failedQueue = [];
};

// ==========================================
// INTERCEPTOR RESPONSE - Auto Refresh Token
// ==========================================

// URL che NON devono triggerare il refresh automatico
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

axiosInstance.interceptors.response.use(
    // Risposta OK: passa attraverso
    (response: AxiosResponse) => response,
    
    // Errore: gestisci 401 con refresh automatico
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const requestUrl = originalRequest?.url || '';

        // NON fare refresh per endpoint di auth o se già in retry
        const shouldSkipRefresh = NO_REFRESH_URLS.some(url => requestUrl.includes(url));
        
        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
            // Se stiamo già facendo refresh, accoda la richiesta
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axiosInstance(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Prova a fare refresh del token
                await axiosInstance.post('/auth/refresh');
                processQueue(null);
                
                // Riprova la richiesta originale
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error);
                
                // Refresh fallito: emetti evento per logout
                window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ==========================================
// API CLIENT WRAPPER
// ==========================================

export const apiClient = {
    async get<T>(url: string): Promise<ApiResponse<T>> {
        const response = await axiosInstance.get<ApiResponse<T>>(url);
        return response.data;
    },

    async post<T>(url: string, data: unknown): Promise<ApiResponse<T>> {
        const response = await axiosInstance.post<ApiResponse<T>>(url, data);
        return response.data;
    },

    async put<T>(url: string, data: unknown): Promise<ApiResponse<T>> {
        const response = await axiosInstance.put<ApiResponse<T>>(url, data);
        return response.data;
    },

    async delete<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        const response = await axiosInstance.delete<ApiResponse<T>>(url, { data });
        return response.data;
    },
};

// Export anche axios instance per usi avanzati
export default axiosInstance;
