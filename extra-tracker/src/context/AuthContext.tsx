/**
 * 🔐 AUTH CONTEXT - Gestione Stato Autenticazione
 * 
 * Fornisce:
 * - Stato utente corrente
 * - Metodi login/logout/register
 * - Verifica automatica sessione all'avvio
 * - Gestione sessione scaduta
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, type User, type LoginData, type RegisterData, type AuthResponse } from '../services/authService';

// ==========================================
// TIPI
// ==========================================

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface AuthContextValue extends AuthState {
    login: (data: LoginData) => Promise<AuthResponse>;
    register: (data: RegisterData) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

// ==========================================
// CONTEXT
// ==========================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true, // Inizia con loading per verificare sessione
        error: null,
    });

    /**
     * Verifica sessione esistente all'avvio
     */
    const checkAuth = useCallback(async () => {
        try {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));
            
            const response = await authService.checkAuth();
            
            if (response.success && response.data?.isAuthenticated) {
                setState({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            } else {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                });
            }
        } catch {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    }, []);

    /**
     * Login
     */
    const login = useCallback(async (data: LoginData): Promise<AuthResponse> => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await authService.login(data);

            if (response.success && response.data?.user) {
                setState({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            } else {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: response.error?.message || 'Errore durante il login',
                }));
            }

            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore durante il login';
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
            throw err;
        }
    }, []);

    /**
     * Registrazione
     */
    const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await authService.register(data);

            if (response.success && response.data?.user) {
                setState({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            } else {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: response.error?.message || 'Errore durante la registrazione',
                }));
            }

            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore durante la registrazione';
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
            throw err;
        }
    }, []);

    /**
     * Logout
     */
    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } finally {
            // Pulisci stato anche se la chiamata fallisce
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    }, []);

    /**
     * Pulisci errore
     */
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    /**
     * Gestisci evento sessione scaduta (emesso da apiClient)
     */
    useEffect(() => {
        const handleSessionExpired = () => {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Sessione scaduta. Effettua nuovamente il login.',
            });
        };

        window.addEventListener('auth:sessionExpired', handleSessionExpired);
        
        return () => {
            window.removeEventListener('auth:sessionExpired', handleSessionExpired);
        };
    }, []);

    /**
     * Verifica sessione all'avvio
     */
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const value: AuthContextValue = {
        ...state,
        login,
        register,
        logout,
        checkAuth,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ==========================================
// HOOK
// ==========================================

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    
    if (context === undefined) {
        throw new Error('useAuth deve essere usato dentro AuthProvider');
    }
    
    return context;
};

// ==========================================
// HELPER: Protected Route Component
// ==========================================

interface ProtectedRouteProps {
    children: ReactNode;
    redirectTo?: string;
}

export const ProtectedRoute = ({ children, redirectTo = '/login' }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Mostra loading mentre verifica
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark-500">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-white/50 text-sm">Verifica sessione...</p>
                </div>
            </div>
        );
    }

    // Se non autenticato, redirect a login salvando la pagina corrente
    if (!isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
