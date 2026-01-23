import axios from 'axios';
import type { AxiosError, AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { emitToast } from '../components/toast';

/**
 * 🌐 API CLIENT - Configurato per Autenticazione Sicura e Gestione Concorrenza
 * 
 * Caratteristiche:
 * - withCredentials: true per inviare cookies HttpOnly
 * - Interceptor per refresh automatico del token con MUTEX PATTERN
 * - Gestione errori centralizzata con Toast automatici
 * - Prevenzione "Effetto Valanga" (Avalanche Effect)
 * 
 * 🎓 ARCHITETTURA: Centralized Error Handling + Mutex Pattern
 * 
 * FLUSSO COMPLETO:
 * 1. Richiesta API fallisce con 401 (token scaduto)
 * 2. PRIMO INTERCEPTOR (Mutex):
 *    - Se refresh già in corso: metti richiesta in coda
 *    - Se primo refresh: acquisisci lock, fai refresh, sblocca coda
 *    - Se refresh fallisce: rifiuta tutte le richieste in coda, mostra UN SOLO toast
 * 3. SECONDO INTERCEPTOR (Toast):
 *    - Gestisce errori generici (non 401)
 *    - Mostra toast con messaggio user-friendly dal backend
 * 
 * Vantaggi:
 * 1. DRY (Don't Repeat Yourself): non devi gestire errori in ogni componente
 * 2. Consistenza: tutti gli errori appaiono nello stesso modo
 * 3. Manutenibilità: cambio il formato del toast in un solo posto
 * 4. Prevenzione DoS: solo UNA richiesta di refresh alla volta (anche con 100 richieste simultanee)
 * 5. UX Perfetta: nessun spam di toast, nessun loop infinito
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
    // CRITICO: Necessario per inviare/ricevere cookies cross-origin
    withCredentials: true,
    timeout: 60000, // 60 secondi timeout per richieste AI più lente
});

axiosInstance.interceptors.request.use((config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers) {
            delete (config.headers as any)['Content-Type'];
            delete (config.headers as any)['content-type'];
        }
    }
    return config;
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

// Flag globale: sessione definitivamente morta (account disattivato o refresh fallito definitivamente)
// Quando true, tutte le richieste future vengono rifiutate immediatamente senza provare refresh
let isSessionDead = false;

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
// Includiamo anche /auth/check perché è un endpoint di verifica sessione (utente anonimo è normale)
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/check'];

axiosInstance.interceptors.response.use(
    // Risposta OK: passa attraverso
    (response: AxiosResponse) => {
        // Se riceviamo una risposta OK da login/register, resetta il flag di sessione morta
        // Questo permette all'utente di fare login dopo che l'account è stato riattivato
        const requestUrl = response.config?.url || '';
        if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
            isSessionDead = false;
        }
        return response;
    },
    
    // Errore: gestisci 401 con refresh automatico (MUTEX PATTERN BLINDATO)
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Se la richiesta è stata annullata o non ha config, esci subito
        if (!originalRequest || error.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }
        
        const requestUrl = originalRequest.url || '';

        // NON fare refresh per endpoint di auth o se già in retry
        const shouldSkipRefresh = NO_REFRESH_URLS.some(url => requestUrl.includes(url));
        
        // ==========================================
        // GESTIONE 401: Refresh Token con Mutex (EFFETTO VALANGA PREVENUTO)
        // ==========================================
        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
            
            // CRITICO: Se la sessione è definitivamente morta, rifiuta immediatamente
            // Previene loop infiniti quando l'account è disattivato
            if (isSessionDead) {
                return Promise.reject(error);
            }
            
            // CASO 1: Refresh già in corso (MUTEX ATTIVO) - EFFETTO VALANGA PREVENUTO
            // Metti questa richiesta in coda e aspetta che il refresh finisca
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Se la sessione è morta mentre eravamo in coda, rifiuta immediatamente
                        if (isSessionDead) {
                            return Promise.reject(new Error('Sessione scaduta'));
                        }
                        
                        // Quando la coda viene risolta (refresh riuscito), riprova la richiesta originale
                        // IMPORTANTE: Clona la richiesta per evitare modifiche alla richiesta originale
                        return axiosInstance({
                            ...originalRequest,
                            headers: {
                                ...originalRequest.headers,
                            },
                        });
                    })
                    .catch((err) => {
                        // Se il refresh è fallito, rifiuta anche questa richiesta
                        return Promise.reject(err);
                    });
            }

            // CASO 2: Primo refresh (ACQUISISCI MUTEX) - SOLO UNA RICHIESTA FA REFRESH
            originalRequest._retry = true;
            isRefreshing = true; // Lock: nessun altro può fare refresh ora

            try {
                // Chiama l'endpoint di refresh
                // Nota: i cookie HttpOnly vengono gestiti automaticamente dal browser
                await axiosInstance.post('/auth/refresh');
                
                // Refresh riuscito: sblocca tutte le richieste in coda
                // Tutte le richieste in attesa verranno rieseguite automaticamente
                processQueue(null, null);
                
                // Riprova la richiesta originale che aveva fallito
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                // Verifica se l'errore indica che l'account è disattivato o la sessione è definitivamente morta
                const refreshErrorData = (refreshError as any)?.response?.data;
                const errorMessage = refreshErrorData?.error?.message || refreshErrorData?.message || '';
                const isAccountDeactivated = errorMessage.includes('disattivato') || errorMessage.includes('Account disattivato');
                
                // Se l'account è disattivato, marca la sessione come definitivamente morta
                // Questo previene qualsiasi tentativo futuro di refresh
                if (isAccountDeactivated) {
                    isSessionDead = true;
                }
                
                // Refresh fallito: rifiuta tutte le richieste in coda
                // Tutte le richieste in attesa riceveranno lo stesso errore
                processQueue(refreshError as Error, null);
                
                // Mostra toast di sessione scaduta (solo una volta, anti-spam)
                // Anche se 10 richieste falliscono, l'utente vede UN SOLO toast
                if (!isSessionExpiredToastShown) {
                    isSessionExpiredToastShown = true;
                    
                    const toastMessage = isAccountDeactivated 
                        ? 'Account disattivato. Contatta il supporto.'
                        : 'Sessione scaduta. Effettua nuovamente il login.';
                    
                    emitToast.error(toastMessage, {
                        title: isAccountDeactivated ? 'Account disattivato' : 'Sessione scaduta',
                        duration: 5000,
                        id: 'session-expired', // ID univoco per evitare duplicati visivi
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
                // IMPORTANTE: Se la sessione è morta, non permettere nuovi refresh
                isRefreshing = false;
            }
        }

        // ==========================================
        // GESTIONE 401 su endpoint di auth (login/register/check/refresh)
        // ==========================================
        // Per questi endpoint, NON fare refresh (sarebbe un loop infinito)
        // Ma estrai comunque il messaggio dal backend per mostrarlo all'utente
        if (error.response?.status === 401 && shouldSkipRefresh) {
            const errorData = error.response.data as any;
            
            // EVITA LOOP INFINITI: Se l'errore viene dalla rotta di refresh, è finita.
            // Non provare a fare refresh del refresh.
            if (requestUrl.includes('/auth/refresh')) {
                // Verifica se l'account è disattivato
                const errorData = error.response?.data as any;
                const errorMessage = errorData?.error?.message || errorData?.message || '';
                const isAccountDeactivated = errorMessage.includes('disattivato') || errorMessage.includes('Account disattivato');
                
                // Se l'account è disattivato, marca la sessione come definitivamente morta
                if (isAccountDeactivated) {
                    isSessionDead = true;
                }
                
                // Refresh fallito: sessione morta davvero
                if (!isSessionExpiredToastShown) {
                    isSessionExpiredToastShown = true;
                    
                    const toastMessage = isAccountDeactivated 
                        ? 'Account disattivato. Contatta il supporto.'
                        : 'Sessione scaduta. Effettua nuovamente il login.';
                    
                    emitToast.error(toastMessage, {
                        title: isAccountDeactivated ? 'Account disattivato' : 'Sessione scaduta',
                        duration: 5000,
                        id: 'session-expired',
                    });
                    
                    setTimeout(() => {
                        isSessionExpiredToastShown = false;
                    }, 5000);
                    
                    // Logout forzato lato client
                    window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                }
                
                return Promise.reject(error);
            }
            
            // Estrai messaggio per il componente (login/register/check)
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
// INTERCEPTOR ERRORI - Toast Automatici (Secondo Layer)
// ==========================================

/**
 * 🎓 PATTERN: Response Interceptor per Error Handling (Secondo Layer)
 * 
 * Questo interceptor è il SECONDO layer (dopo il refresh token mutex).
 * Cattura TUTTI gli errori HTTP rimanenti e:
 * 1. Estrae il messaggio di errore dal backend
 * 2. Mostra un toast di errore automaticamente
 * 3. Permette comunque al chiamante di gestire l'errore (il reject passa)
 * 
 * 🎓 NOTA: Non mostriamo toast per:
 * - 401 (già gestito dal primo interceptor con refresh/logout)
 * - Errori di rete annullati (ERR_CANCELED)
 * - Endpoint di auth (hanno gestione custom nei componenti)
 */
axiosInstance.interceptors.response.use(
    // Risposta OK: passa attraverso senza modifiche
    (response: AxiosResponse) => response,
    
    // Errore: mostra toast e poi rilancia
    (error: AxiosError<ApiResponse<unknown>>) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Skip toast per:
        // 1. Richieste annullate (utente naviga via, component unmount, etc.)
        if (error.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }
        
        // 2. Richieste già gestite dal primo interceptor (refresh token flow)
        if (status === 401 && !originalRequest._retry) {
            // Questo è già gestito dal mutex, non mostrare toast qui
            return Promise.reject(error);
        }
        
        // 3. Endpoint di auth (hanno gestione custom nei componenti)
        const isAuthEndpoint = NO_REFRESH_URLS.some(url => requestUrl.includes(url));
        if (status === 401 && isAuthEndpoint) {
            // Estrai messaggio per il componente (già fatto nel primo interceptor)
            return Promise.reject(error);
        }
        
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

        // Mostra toast di errore (solo per errori NON 401 e NON annullati)
        // Gli errori 401 sono già gestiti dal primo interceptor (refresh token mutex)
        if (status !== 401 && !isAuthEndpoint) {
            // Usa un ID basato sul messaggio per evitare spam dello stesso errore
            // Se lo stesso errore viene mostrato più volte, il toast viene aggiornato invece di duplicarsi
            emitToast.error(errorMessage, {
                title: 'Errore',
                duration: 6000, // Errori restano più a lungo
                id: `api-error-${errorMessage.substring(0, 50)}`, // ID basato sul messaggio (troncato per evitare ID troppo lunghi)
            });
        }

        return Promise.reject(error);
    }
);

// ==========================================
// API CLIENT WRAPPER
// ==========================================

export const apiClient = {
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.get<ApiResponse<T>>(url, config);
        return response.data;
    },

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
        return response.data;
    },

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
        return response.data;
    },

    async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
        return response.data;
    },

    async delete<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.delete<ApiResponse<T>>(url, { ...config, data });
        return response.data;
    },
};

// Export anche axios instance per usi avanzati
export default axiosInstance;
