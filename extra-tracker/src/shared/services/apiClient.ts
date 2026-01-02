import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { emitToast } from '../components/toast';

/**
 * 🌐 API CLIENT - Configurato per Autenticazione Sicura
 * 
 * Caratteristiche:
 * - withCredentials: true per inviare cookies HttpOnly
 * - Interceptor per refresh automatico del token
 * - Gestione errori centralizzata con Toast automatici
 * 
 * 🎓 ARCHITETTURA: Centralized Error Handling
 * Intercettiamo TUTTI gli errori API in un unico punto.
 * Vantaggi:
 * 1. DRY (Don't Repeat Yourself): non devi gestire errori in ogni componente
 * 2. Consistenza: tutti gli errori appaiono nello stesso modo
 * 3. Manutenibilità: cambio il formato del toast in un solo posto
 */

// Preferisci same-origin per evitare problemi di cookie/CORS (soprattutto da mobile).
// In dev, Vite proxy inoltra /api al backend.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
// INTERCEPTOR ERRORI - Toast Automatici
// ==========================================

/**
 * 🎓 PATTERN: Response Interceptor per Error Handling
 * 
 * Questo interceptor cattura TUTTI gli errori HTTP e:
 * 1. Estrae il messaggio di errore dal backend
 * 2. Mostra un toast di errore automaticamente
 * 3. Permette comunque al chiamante di gestire l'errore (il reject passa)
 * 
 * 🎓 NOTA: Non mostriamo toast per:
 * - 401 (gestito separatamente con refresh/logout)
 * - Errori di rete senza risposta (gestiamo a parte)
 */
axiosInstance.interceptors.response.use(
    // Risposta OK: passa attraverso senza modifiche
    (response: AxiosResponse) => response,
    
    // Errore: mostra toast e poi rilancia
    (error: AxiosError<ApiResponse<unknown>>) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        
        // Skip toast per endpoint di auth (hanno gestione custom)
        const isAuthEndpoint = NO_REFRESH_URLS.some(url => requestUrl.includes(url));
        
        // Skip toast per 401 (gestito dal refresh token flow)
        if (status === 401) {
            return Promise.reject(error);
        }

        // Estrai il messaggio di errore
        let errorMessage = 'Si è verificato un errore imprevisto';
        
        if (error.response?.data?.error?.message) {
            // Errore strutturato dal backend
            errorMessage = error.response.data.error.message;
        } else if (error.response?.data?.message) {
            // Fallback: messaggio diretto
            errorMessage = error.response.data.message;
        } else if (error.message === 'Network Error') {
            errorMessage = 'Errore di connessione. Verifica la tua rete.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Richiesta scaduta. Riprova più tardi.';
        }

        // Mostra toast di errore (solo se non è un endpoint di auth)
        // Per auth, il componente gestisce manualmente il feedback
        if (!isAuthEndpoint) {
            emitToast.error(errorMessage, {
                title: 'Errore',
                duration: 6000, // Errori restano più a lungo
            });
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

    async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        const response = await axiosInstance.patch<ApiResponse<T>>(url, data);
        return response.data;
    },

    async delete<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        const response = await axiosInstance.delete<ApiResponse<T>>(url, { data });
        return response.data;
    },
};

// Export anche axios instance per usi avanzati
export default axiosInstance;
