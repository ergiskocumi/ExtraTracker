/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 * 
 * Contiene header, navigazione e footer
 * Separato per mantenere le pagine auth senza questi elementi
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLayout, FiTarget, FiSettings, FiClock, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { LogoIcon } from '../components/icons';

export const AppLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { profile } = useSettings();

    const APP_NAME = 'LifeOS';
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

    const userInitials = (() => {
        const firstName = profile?.firstName?.trim();
        const lastName = profile?.lastName?.trim();
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return 'US';
    })();

    const userLabel = (() => {
        const firstName = profile?.firstName?.trim();
        const lastName = profile?.lastName?.trim();
        if (firstName && lastName) return `${firstName} ${lastName}`;
        return user?.email || 'User';
    })();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: FiLayout },
        { path: '/goals', label: 'Obiettivi', icon: FiTarget },
        { path: '/projects', label: 'Progetti', icon: FiSettings },
        { path: '/settings', label: 'Impostazioni', icon: FiSettings },
        { path: '/timeline', label: 'Timeline', icon: FiClock },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-dark-500/80 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-6xl px-6 py-4 mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Brand (Logo + Nome) */}
                        <Link
                            to="/"
                            className="flex items-center gap-3 shrink-0"
                            title={`${APP_NAME}${appVersion ? ` v${appVersion}` : ''}`}
                            aria-label={`${APP_NAME}${appVersion ? ` v${appVersion}` : ''}`}
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-sm animate-float">
                                <LogoIcon className="text-white" size={22} />
                            </div>
                            <h1 className="text-2xl font-bold gradient-text">
                                {APP_NAME}
                            </h1>
                        </Link>

                        {/* Navigation + User */}
                        <div className="flex items-center justify-end flex-1 min-w-0 gap-4">
                            {/* MENU DI NAVIGAZIONE */}
                            <nav className="order-3 w-full sm:order-none sm:w-auto flex items-center gap-1 p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08] overflow-x-auto">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path || 
                                        (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`nav-link ${isActive ? 'active' : ''}`}
                                        >
                                            <item.icon size={18} />
                                            <span className="hidden sm:inline">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* User Menu */}
                            <div className="flex items-center order-2 gap-2 sm:order-none shrink-0">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                    title="Logout"
                                >
                                    <FiLogOut size={18} />
                                    <span className="hidden text-sm sm:inline">Logout</span>
                                </motion.button>

                                <div
                                    className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/80"
                                    title={userLabel}
                                    aria-label={userLabel}
                                >
                                    {userInitials}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENUTO PAGINA */}
            <main className="flex-1 w-full max-w-6xl px-6 py-8 mx-auto animate-fade-in">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="py-6 text-sm text-center text-white/30">
                <p>© 2024 LifeOS • Gestisci il tuo tempo con stile</p>
            </footer>
        </div>
    );
};
