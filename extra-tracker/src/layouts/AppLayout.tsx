/**
 * 🏠 APP LAYOUT - Layout principale per utenti autenticati
 * 
 * Contiene header, navigazione e footer
 * Separato per mantenere le pagine auth senza questi elementi
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLayout, FiTarget, FiSettings, FiClock, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/icons';

export const AppLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: FiLayout },
        { path: '/goals', label: 'Obiettivi', icon: FiTarget },
        { path: '/settings', label: 'Progetti', icon: FiSettings },
        { path: '/timeline', label: 'Timeline', icon: FiClock },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-dark-500/80 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm animate-float">
                                <LogoIcon className="text-white" size={22} />
                            </div>
                            <h1 className="text-2xl font-bold gradient-text">
                                Extra Tracker
                            </h1>
                        </Link>

                        {/* Navigation + User */}
                        <div className="flex items-center gap-4">
                            {/* MENU DI NAVIGAZIONE */}
                            <nav className="flex items-center gap-1 p-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08]">
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
                            <div className="flex items-center gap-2">
                                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03]">
                                    <FiUser className="text-primary-400" size={16} />
                                    <span className="text-sm text-white/70">{user?.email}</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLogout}
                                    className="p-2.5 rounded-lg bg-white/[0.03] hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                    title="Logout"
                                >
                                    <FiLogOut size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENUTO PAGINA */}
            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 animate-fade-in">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="py-6 text-center text-sm text-white/30">
                <p>© 2024 Extra Tracker • Gestisci il tuo tempo con stile</p>
            </footer>
        </div>
    );
};
