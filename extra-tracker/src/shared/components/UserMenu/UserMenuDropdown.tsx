/**
 * USER MENU DROPDOWN
 *
 * Menu utente moderno con design geometrico.
 * Features:
 * - Design glassmorphism con forme geometriche
 * - Animazioni fluide
 * - Performance ottimizzata
 */

import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiLayout,
    FiTarget,
    FiSettings,
    FiLogOut,
    FiChevronDown,
    FiBookOpen,
    FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useSettings } from '../../../features/settings/context/SettingsContext';

// ============================================
// TYPES
// ============================================

interface MenuItem {
    path?: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    badge?: string | number;
    action?: () => void;
    isAdminOnly?: boolean;
}

interface MenuCategory {
    label: string;
    items: MenuItem[];
}

// ============================================
// MENU ITEM
// ============================================

const MenuItemComponent = memo(({
    item,
    isActive,
    onClick,
}: {
    item: MenuItem;
    isActive: boolean;
    onClick: () => void;
}) => {
    const handleClick = () => {
        if (item.action) {
            item.action();
        }
        onClick();
    };

    const className = `
        group flex items-center gap-3.5 px-4 py-3 mx-2 rounded-2xl transition-all duration-150 cursor-pointer
        ${isActive
            ? 'bg-gradient-to-r from-primary-500/25 to-violet-500/15 text-white border border-primary-500/25 shadow-lg shadow-primary-500/10'
            : 'text-white/70 hover:bg-white/[0.08] hover:text-white border border-transparent'
        }
    `;

    const content = (
        <>
            <div
                className={`
                    w-10 h-10 rounded-2xl flex items-center justify-center transition-all
                    ${isActive
                        ? 'bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-white/[0.06] group-hover:bg-white/[0.1]'
                    }
                `}
            >
                <item.icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium">{item.label}</p>
                <p className="text-xs text-white/50 truncate">{item.description}</p>
            </div>
            {item.badge && (
                <span className="px-2 py-1 text-[11px] font-bold rounded-md bg-primary-500/20 text-primary-300">
                    {item.badge}
                </span>
            )}
            {isActive && (
                <div className="w-1 h-7 rounded-full bg-gradient-to-b from-primary-400 to-violet-500" />
            )}
        </>
    );

    // If it has an action (no path), render as button
    if (item.action && !item.path) {
        return (
            <button onClick={handleClick} className={className}>
                {content}
            </button>
        );
    }

    // Otherwise render as Link
    return (
        <Link to={item.path || '/'} onClick={handleClick} className={className}>
            {content}
        </Link>
    );
});

MenuItemComponent.displayName = 'MenuItemComponent';

// ============================================
// MAIN COMPONENT
// ============================================

export const UserMenuDropdown = memo(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { profile } = useSettings();

    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    // User info
    const userInitials = (() => {
        const firstName = profile?.firstName?.trim();
        const lastName = profile?.lastName?.trim();
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        return 'US';
    })();

    const userLabel = (() => {
        const firstName = profile?.firstName?.trim();
        const lastName = profile?.lastName?.trim();
        if (firstName && lastName) return `${firstName} ${lastName}`;
        return user?.email || 'User';
    })();

    // Menu categories
    const menuCategories: MenuCategory[] = [
        {
            label: 'Principale',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: FiLayout, description: 'Centro di comando' },
            ],
        },
        {
            label: 'Produttività',
            items: [
                { path: '/goals', label: 'Obiettivi', icon: FiTarget, description: 'I tuoi traguardi' },
                { path: '/study', label: 'Flashcards', icon: FiBookOpen, description: 'Studio intelligente' },
            ],
        },
        {
            label: 'Account',
            items: [
                { path: '/settings', label: 'Impostazioni', icon: FiSettings, description: 'Personalizza' },
            ],
        },
        ...(isAdmin ? [
            {
                label: 'Admin',
                items: [
                    { path: '/admin/feedback', label: 'Feedbacks', icon: FiShield, description: 'Gestione feedback' },
                ],
            },
        ] : []),
    ];

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        navigate('/login');
    };

    const handleNavClick = () => setIsOpen(false);

    // Scroll lock quando il menu è aperto - Usa event listeners invece di modificare body styles
    useEffect(() => {
        if (isOpen) {
            // Salva lo scroll corrente
            const scrollY = window.scrollY;
            
            // Blocca lo scroll usando overflow hidden su html invece di body
            // Questo evita problemi di rendering e inversione colori
            const html = document.documentElement;
            const body = document.body;
            
            // Salva gli stili originali
            const originalHtmlOverflow = html.style.overflow;
            const originalBodyOverflow = body.style.overflow;
            
            // Blocca lo scroll solo con overflow, senza cambiare position
            html.style.overflow = 'hidden';
            body.style.overflow = 'hidden';
            
            // Previeni anche scroll con wheel e touch events come backup
            const preventScroll = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            };
            
            const preventScrollOptions = { passive: false, capture: true };
            document.addEventListener('wheel', preventScroll, preventScrollOptions);
            document.addEventListener('touchmove', preventScroll, preventScrollOptions);
            document.addEventListener('scroll', preventScroll, preventScrollOptions);
            
            return () => {
                // Ripristina gli stili
                html.style.overflow = originalHtmlOverflow;
                body.style.overflow = originalBodyOverflow;
                
                // Rimuovi event listeners
                document.removeEventListener('wheel', preventScroll, preventScrollOptions);
                document.removeEventListener('touchmove', preventScroll, preventScrollOptions);
                document.removeEventListener('scroll', preventScroll, preventScrollOptions);
                
                // Ripristina la posizione di scroll
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl transition-all duration-200
                    ${isOpen
                        ? 'bg-white/[0.1] shadow-lg shadow-black/20'
                        : 'bg-white/[0.04] hover:bg-white/[0.08]'
                    }
                    border border-white/[0.08] backdrop-blur-xl
                `}
            >
                {/* Avatar */}
                <div className="relative">
                    <div
                        className="flex items-center justify-center w-9 h-9 text-sm font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-primary-500 to-violet-600 shadow-primary-500/25"
                        title={userLabel}
                    >
                        {userInitials}
                    </div>
                </div>

                {/* User Info (desktop only) */}
                <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate max-w-[100px]">
                        {profile?.firstName || 'Utente'}
                    </p>
                </div>

                {/* Chevron */}
                <FiChevronDown
                    size={14}
                    className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </motion.button>

            {/* Sidebar - Renderizzata tramite Portal */}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop - Blocca il resto dello schermo */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                            />
                            
                            {/* Sidebar a destra */}
                            <motion.div
                                initial={{ x: '100%', opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed top-0 right-0 h-full w-full max-w-[420px] z-[9999] shadow-2xl"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(18, 16, 34, 0.98) 0%, rgba(12, 10, 24, 0.98) 100%)',
                                    backdropFilter: 'blur(28px) saturate(190%)',
                                }}
                                ref={menuRef}
                            >
                                <div className="h-full flex flex-col border-l border-white/[0.16] overflow-hidden">
                                    {/* Header con pulsante chiusura */}
                                    <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                                        <h2 className="text-lg font-semibold text-white">Menu</h2>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-hidden">
                                        {/* ===== USER PROFILE SECTION ===== */}
                                        <div className="relative p-5 overflow-hidden">
                                            {/* Background geometric shapes */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute top-0 right-0 w-36 h-36 bg-primary-500/15 rounded-[32px] blur-3xl transform translate-x-1/2 -translate-y-1/2 rotate-12" />
                                                <div className="absolute bottom-0 left-0 w-28 h-28 bg-violet-500/12 rounded-[26px] blur-2xl transform -translate-x-1/2 translate-y-1/2 -rotate-12" />
                                                {/* Geometric lines */}
                                                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100">
                                                    <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
                                                    <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" />
                                                </svg>
                                            </div>

                                            <div className="relative z-10">
                                                {/* User header */}
                                                <div className="flex items-start gap-4 mb-5">
                                                    <div className="relative">
                                                        <div className="flex items-center justify-center w-16 h-16 text-xl font-bold text-white rounded-2xl shadow-xl bg-gradient-to-br from-primary-500 via-primary-600 to-violet-600 shadow-primary-500/30">
                                                            {userInitials}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <p className="text-lg font-semibold text-white truncate">{userLabel}</p>
                                                        <p className="text-xs text-white/50 truncate mt-1">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider with glow */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

                                        {/* ===== MENU ITEMS ===== */}
                                        <div className="py-3">
                                            {menuCategories.map((category, catIndex) => (
                                                <div key={category.label}>
                                                    {catIndex > 0 && (
                                                        <div className="my-2 mx-4 h-px bg-white/[0.06]" />
                                                    )}
                                                    <p className="px-5 py-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">
                                                        {category.label}
                                                    </p>
                                                    {category.items.map((item) => {
                                                        const itemKey = item.path || item.label;
                                                        const isActive = item.path ? (location.pathname === item.path ||
                                                            (item.path !== '/' && location.pathname.startsWith(item.path))) : false;
                                                        return (
                                                            <MenuItemComponent
                                                                key={itemKey}
                                                                item={item}
                                                                isActive={isActive}
                                                                onClick={handleNavClick}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ===== LOGOUT SECTION - Fixed at bottom ===== */}
                                    <div className="p-4 border-t border-white/[0.08] bg-black/20">
                                        <motion.button
                                            whileHover={{ scale: 1.01, x: 2 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={handleLogout}
                                            className="flex items-center w-full gap-3 px-3 py-2.5 text-red-400/90 transition-all rounded-xl hover:bg-red-500/10 hover:text-red-400 group"
                                        >
                                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                                                <FiLogOut size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium">Disconnetti</p>
                                                <p className="text-[10px] text-white/40">Esci dal tuo account</p>
                                            </div>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
});

UserMenuDropdown.displayName = 'UserMenuDropdown';

export default UserMenuDropdown;
