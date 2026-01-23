/**
 * 🔒 ADMIN ROUTE - Protegge route admin
 *
 * Verifica che l'utente autenticato abbia ruolo admin
 * Altrimenti redirect alla home
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
    children,
    redirectTo = '/dashboard',
}) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Mostra loading mentre verifica
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark-500">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-white/50 text-sm">Verifica permessi...</p>
                </div>
            </div>
        );
    }

    // Se non autenticato, redirect a login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Se non admin, redirect alla home
    if (user?.role !== 'admin') {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
