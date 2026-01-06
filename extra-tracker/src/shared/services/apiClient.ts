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
    timeout: 25000, // 25 secondi timeout per richieste AI più lente
});

// ==========================================
// MUTEX PATTERN: Refresh Token Management
// ==========================================

/**
 * 🎓 PATTERN: Mutex (Mutual Exclusion) per Refresh Token
 * 
 * Problema: Con multiple richieste simultanee (dashboard, summary, projects, etc.),
 * ognuna che riceve 401 prova a fare refresh, causando:
 * - Spam di richieste refresh al backend
 * - Spam di toast di errore
 * - DoS involontario
 * 
 * Soluzione: Solo UNA richiesta può fare refresh alla volta.
 * Le altre aspettano in coda e vengono risvegliate quando il refresh finisce.
 */

// Mutex: lock per refresh token (solo uno alla volta)
let isRefreshing = false;

// Coda delle richieste in attesa del refresh
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

// Flag anti-spam per toast di sessione scaduta
let isSessionExpiredToastShown = false;

/**
 * Processa la coda delle richieste in attesa
 * @param error - Se presente, tutte le richieste vengono rifiutate
 * @param token - Se presente, tutte le richieste vengono risolte (refresh riuscito)
 */
const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
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
    
    // Errore: gestisci 401 con refresh automatico (MUTEX PATTERN)
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const requestUrl = originalRequest?.url || '';

        // NON fare refresh per endpoint di auth o se già in retry
        const shouldSkipRefresh = NO_REFRESH_URLS.some(url => requestUrl.includes(url));
        
        // ==========================================
        // GESTIONE 401: Refresh Token con Mutex
        // ==========================================
        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
            
            // CASO 1: Refresh già in corso (MUTEX ATTIVO)
            // Metti questa richiesta in coda e aspetta che il refresh finisca
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Quando la coda viene risolta (refresh riuscito), riprova la richiesta originale
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        // Se il refresh è fallito, rifiuta anche questa richiesta
                        return Promise.reject(err);
                    });
            }

            // CASO 2: Primo refresh (ACQUISISCI MUTEX)
            originalRequest._retry = true;
            isRefreshing = true; // Lock: nessun altro può fare refresh ora

            try {
                // Chiama l'endpoint di refresh
                // Nota: i cookie HttpOnly vengono gestiti automaticamente dal browser
                await axiosInstance.post('/auth/refresh');
                
                // Refresh riuscito: sblocca tutte le richieste in coda
                processQueue(null, null);
                
                // Riprova la richiesta originale che aveva fallito
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                // Refresh fallito: rifiuta tutte le richieste in coda
                processQueue(refreshError as Error, null);
                
                // Mostra toast di sessione scaduta (solo una volta, anti-spam)
                if (!isSessionExpiredToastShown) {
                    isSessionExpiredToastShown = true;
                    
                    emitToast.error('Sessione scaduta. Effettua nuovamente il login.', {
                        title: 'Sessione scaduta',
                        duration: 5000,
                        id: 'session-expired', // ID univoco per evitare duplicati
                    });
                    
                    // Reset flag dopo 5 secondi (quando il toast scompare)
                    setTimeout(() => {
                        isSessionExpiredToastShown = false;
                    }, 5000);
                    
                    // Emetti evento per logout pulito (pulire stato utente)
                    window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                }

                return Promise.reject(refreshError);
            } finally {
                // Rilascia il lock sempre, sia in caso di successo che errore
                isRefreshing = false;
            }
        }

        // ==========================================
        // GESTIONE 401 su endpoint di auth (login/register)
        // ==========================================
        // Per questi endpoint, NON fare refresh (sarebbe un loop infinito)
        // Ma estrai comunque il messaggio dal backend per mostrarlo all'utente
        if (error.response?.status === 401 && shouldSkipRefresh) {
            const errorData = error.response.data as any;
            
            // Evita loop infinito: se il refresh stesso fallisce, fermati
            if (requestUrl.includes('/auth/refresh')) {
                // Refresh fallito: sessione morta davvero
                if (!isSessionExpiredToastShown) {
                    isSessionExpiredToastShown = true;
                    
                    emitToast.error('Sessione scaduta. Effettua nuovamente il login.', {
                        title: 'Sessione scaduta',
                        duration: 5000,
                        id: 'session-expired',
                    });
                    
                    setTimeout(() => {
                        isSessionExpiredToastShown = false;
                    }, 5000);
                    
                    window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                }
            }
            
            // Estrai messaggio per il componente
            if (errorData?.error?.message) {
                (error as any).userMessage = errorData.error.message;
            } else if (errorData?.message) {
                (error as any).userMessage = errorData.message;
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
        
        // Estrai il messaggio di errore DAL BACKEND (non dal messaggio generico di Axios)
        let errorMessage = 'Si è verificato un errore imprevisto';
        
        // PRIORITÀ 1: Messaggio dal backend (error.response.data)
        if (error.response?.data?.error?.message) {
            // Errore strutturato dal backend (formato nuovo)
            errorMessage = error.response.data.error.message;
        } else if (error.response?.data?.message) {
            // Fallback: messaggio diretto nel body
            errorMessage = error.response.data.message;
        } else if (error.message === 'Network Error') {
            // Errore di rete (nessuna risposta dal server)
            errorMessage = 'Errore di connessione. Verifica la tua rete.';
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            errorMessage = 'Richiesta scaduta. Riprova più tardi.';
        } else if (error.message && !error.message.includes('status code')) {
            // Usa il messaggio di Axios solo se non è il generico "Request failed with status code XXX"
            errorMessage = error.message;
        }

        // Per 401 su endpoint di auth (login/register), NON mostrare toast
        // Il componente gestirà l'errore manualmente
        // Ma estraiamo comunque il messaggio per il componente
        if (status === 401 && isAuthEndpoint) {
            // Aggiungi il messaggio estratto all'errore per facilitare l'accesso nel componente
            (error as any).userMessage = errorMessage;
            return Promise.reject(error);
        }

        // Mostra toast di errore (solo se non è un endpoint di auth e non è 401)
        // Per auth, il componente gestisce manualmente il feedback
        // Per 401, è già gestito dal refresh token flow sopra
        if (!isAuthEndpoint && status !== 401 && error.code !== 'ERR_CANCELED') {
            // Usa il messaggio come ID per evitare spam dello stesso errore
            emitToast.error(errorMessage, {
                title: 'Errore',
                duration: 6000, // Errori restano più a lungo
                id: `error-${errorMessage}`, // ID basato sul messaggio per evitare duplicati
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
