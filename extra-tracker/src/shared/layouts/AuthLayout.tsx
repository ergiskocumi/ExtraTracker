/**
 * 🔐 AUTH LAYOUT - Layout per pagine di autenticazione
 * 
 * Layout minimalista per login e registrazione
 * Sfondo animato e branding pulito
 */

import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogoIcon } from '../components/icons';
import { useAuth } from '../../features/auth/context/AuthContext';
import { AnimatedBackground } from '../components/AnimatedBackground';

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
            {/* Background animato premium */}
            <AnimatedBackground />

            {/* Header minimalista */}
            <header className="relative z-10 py-8 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3"
                    >
                        <motion.div 
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-glow-sm relative overflow-hidden"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                            <LogoIcon className="text-white relative z-10" size={26} />
                        </motion.div>
                        <h1 className="text-3xl font-bold gradient-text">
                            LifeOS
                        </h1>
                    </motion.div>
                </div>
            </header>

            {/* Contenuto Auth */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
                <Outlet />
            </main>

            {/* Footer minimalista */}
            <footer className="relative z-10 py-6 text-center">
                <p className="text-sm text-white/30">
                    © 2024 LifeOS • Sicuro e protetto
                </p>
            </footer>
        </div>
    );
};
