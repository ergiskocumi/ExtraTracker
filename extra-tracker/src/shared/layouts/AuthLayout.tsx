/**
 * 🔐 AUTH LAYOUT - Layout per pagine di autenticazione
 * 
 * Layout minimalista per login e registrazione
 * Sfondo animato e branding pulito
 */

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../features/auth/context/AuthContext';

// OTTIMIZZATO: Lazy load AnimatedBackground (pesante, solo per auth)
const AnimatedBackground = lazy(() => import('../components/AnimatedBackground').then(m => ({ default: m.AnimatedBackground })));

export const AuthLayout = () => {
    const { isAuthenticated, isLoading } = useAuth();

    // Se sta caricando, mostra loading
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-500">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    // Se già autenticato, redirect a dashboard
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-dark-500 relative overflow-hidden">
            {/* Background animato premium - Lazy loaded */}
            <Suspense fallback={null}>
                <AnimatedBackground />
            </Suspense>

            {/* Contenuto Auth */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
                <Outlet />
            </main>

            {/* Footer minimalista */}
            <footer className="relative z-10 py-6 text-center">
                <p className="text-sm text-white/30">
                    © 2024 Silvi • Sicuro e protetto
                </p>
            </footer>
        </div>
    );
};
