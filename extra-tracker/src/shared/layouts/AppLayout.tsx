/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 * 
 * Contiene header, navigazione e footer
 * Separato per mantenere le pagine auth senza questi elementi
 */

import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiLayout, 
    FiTarget, 
    FiSettings, 
    FiClock, 
    FiLogOut, 
    FiChevronDown,
    FiFolder,
    FiMenu,
    FiBookOpen
} from 'react-icons/fi';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useSettings } from '../../features/settings/context/SettingsContext';
import { LogoIcon } from '../components/icons';
import { UserLevelWidget } from '../../features/gamification/UserLevelWidget';

export const AppLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { profile } = useSettings();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const gamification = user?.gamification;
    const level = gamification?.level ?? 1;
    const xp = gamification?.xp ?? 0;
    const streakCurrent = gamification?.streak?.current ?? 0;
    const nextLevelXp = Math.max(100, Math.pow(level, 2) * 100);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        await logout();
        navigate('/login');
    };

    // Chiudi menu quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handler per chiudere menu quando si naviga
    const handleNavClick = () => {
        setIsMenuOpen(false);
    };

    // Menu organizzato per categorie
    const menuCategories = [
        {
            label: 'Principale',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: FiLayout, description: 'Panoramica generale' },
                { path: '/timeline', label: 'Timeline', icon: FiClock, description: 'Storico attività' },
            ]
        },
        {
            label: 'Gestione',
            items: [
                { path: '/goals', label: 'Obiettivi', icon: FiTarget, description: 'I tuoi traguardi' },
                { path: '/projects', label: 'Progetti', icon: FiFolder, description: 'Clienti e commesse' },
                { path: '/study', label: 'Flashcards', icon: FiBookOpen, description: 'Ripetizione spaziata' },
            ]
        },
        {
            label: 'Sistema',
            items: [
                { path: '/settings', label: 'Impostazioni', icon: FiSettings, description: 'Preferenze account' },
            ]
        },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-dark-500/95 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="px-4 py-3 mx-auto max-w-7xl sm:px-6">
                    <div className="flex items-center justify-between">
                        {/* SINISTRA: Brand (Logo + Nome) */}
                        <Link
                            to="/"
                            className="flex items-center gap-3 group"
                            title={`${APP_NAME}${appVersion ? ` v${appVersion}` : ''}`}
                        >
                            <div className="flex items-center justify-center w-10 h-10 transition-shadow shadow-lg rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/25 group-hover:shadow-primary-500/40">
                                <LogoIcon className="text-white" size={22} />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold leading-tight gradient-text">
                                    {APP_NAME}
                                </h1>
                                {appVersion && (
                                    <span className="text-[10px] text-white/30 font-medium">v{appVersion}</span>
                                )}
                            </div>
                        </Link>

                        {/* DESTRA: Avatar + Menu + Logout */}
                        <div className="flex items-center gap-3" ref={menuRef}>
                            {/* Menu Dropdown Button */}
                            <div className="relative">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200
                                        ${isMenuOpen 
                                            ? 'bg-white/[0.08] shadow-lg' 
                                            : 'bg-white/[0.03] hover:bg-white/[0.06]'
                                        }
                                        border border-white/[0.08]
                                    `}
                                >
                                    {/* Avatar Grande */}
                                    <div
                                        className="flex items-center justify-center w-10 h-10 text-base font-bold text-white rounded-full shadow-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/20"
                                        title={userLabel}
                                    >
                                        {userInitials}
                                    </div>
                                    
                                    {/* Nome utente (solo desktop) */}
                                    <div className="hidden text-left md:block">
                                        <p className="text-sm font-medium leading-tight text-white/90">
                                            {profile?.firstName || 'Utente'}
                                        </p>
                                        <p className="text-xs text-white/40 truncate max-w-[120px]">
                                            {user?.email}
                                        </p>
                                    </div>

                                    {/* Icona Menu */}
                                    <div className="flex items-center gap-1 text-white/50">
                                        <FiMenu size={18} className="sm:hidden" />
                                        <FiChevronDown 
                                            size={16} 
                                            className={`hidden sm:block transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} 
                                        />
                                    </div>
                                </motion.button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/[0.15] shadow-2xl shadow-black/60 overflow-hidden"
                                            style={{
                                                background: 'rgba(30, 27, 45, 0.92)',
                                                backdropFilter: 'blur(24px) saturate(180%)',
                                                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                            }}
                                        >
                                            {/* Header Menu - Info Utente */}
                                            <div className="px-4 py-4 border-b border-white/[0.1]" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full shadow-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/30">
                                                        {userInitials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-white truncate">
                                                            {userLabel}
                                                        </p>
                                                        <p className="text-xs truncate text-white/60">
                                                            {user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* Gamification Widget nel menu */}
                                                <div className="mt-3">
                                                    <UserLevelWidget
                                                        avatarUrl={profile?.avatar}
                                                        displayName={userLabel}
                                                        level={level}
                                                        xp={xp}
                                                        nextLevelXp={nextLevelXp}
                                                        streakCurrent={streakCurrent}
                                                        compact={true}
                                                    />
                                                </div>
                                            </div>

                                            {/* Menu Items per Categoria */}
                                            <div className="py-2">
                                                {menuCategories.map((category, catIndex) => (
                                                    <div key={category.label}>
                                                        {catIndex > 0 && (
                                                            <div className="my-2 mx-3 border-t border-white/[0.08]" />
                                                        )}
                                                        <p className="px-4 py-2 text-[10px] font-extrabold text-primary-300/60 uppercase tracking-[0.2em] select-none" style={{ letterSpacing: '0.2em' }}>
                                                            {category.label}
                                                        </p>
                                                        {category.items.map((item) => {
                                                            const isActive = location.pathname === item.path ||
                                                                (item.path !== '/' && location.pathname.startsWith(item.path));
                                                            return (
                                                                <Link
                                                                    key={item.path}
                                                                    to={item.path}
                                                                    onClick={handleNavClick}
                                                                    className={`
                                                                        flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-150
                                                                        ${isActive 
                                                                            ? 'bg-primary-500/25 text-white' 
                                                                            : 'text-white/80 hover:bg-white/[0.1] hover:text-white'
                                                                        }
                                                                    `}
                                                                >
                                                                    <div className={`
                                                                        w-9 h-9 rounded-lg flex items-center justify-center
                                                                        ${isActive 
                                                                            ? 'bg-primary-500/30 text-primary-300' 
                                                                            : 'bg-white/[0.08]'
                                                                        }
                                                                    `}>
                                                                        <item.icon size={18} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium">{item.label}</p>
                                                                        <p className="text-[11px] text-white/50">{item.description}</p>
                                                                    </div>
                                                                    {isActive && (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                                                                    )}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Footer Menu - Logout */}
                                            <div className="p-2 border-t border-white/[0.1]" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={handleLogout}
                                                    className="flex items-center w-full gap-3 px-4 py-3 text-red-400 transition-colors rounded-xl hover:bg-red-500/15"
                                                >
                                                    <div className="flex items-center justify-center rounded-lg w-9 h-9 bg-red-500/15">
                                                        <FiLogOut size={18} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-medium">Esci</p>
                                                        <p className="text-[11px] text-white/50">Disconnetti account</p>
                                                    </div>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
