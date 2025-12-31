/**
 * 🔐 AUTH LAYOUT - Layout per pagine di autenticazione
 * 
 * Layout minimalista per login e registrazione
 * Sfondo animato e branding pulito
 */

import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogoIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';

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
            {/* Sfondo animato */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradiente principale */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-700/5" />
                
                {/* Cerchi decorativi */}
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary-500/10 blur-3xl"
                />
                <motion.div
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.1, 0.15, 0.1]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary-600/10 blur-3xl"
                />

                {/* Pattern griglia */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            </div>

            {/* Header minimalista */}
            <header className="relative z-10 py-8 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm">
                            <LogoIcon className="text-white" size={26} />
                        </div>
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
