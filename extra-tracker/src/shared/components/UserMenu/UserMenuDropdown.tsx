/**
 * USER MENU DROPDOWN - Versione Migliorata
 *
 * Menu utente moderno con:
 * - Avatar foto profilo con bordo animato
 * - Indicatore stato online/offline con animazione pulse
 * - Design glassmorphism avanzato
 * - Animazioni fluide e performanti
 */

import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiLayout,
    FiSettings,
    FiLogOut,
    FiChevronDown,
    FiBookOpen,
    FiShield,
    FiWifi,
    FiWifiOff,
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
// AVATAR COMPONENT CON STATO ONLINE
// ============================================

interface UserAvatarProps {
    avatarUrl?: string;
    initials: string;
    size?: 'sm' | 'md' | 'lg';
    showStatus?: boolean;
    isOnline?: boolean;
    isAnimated?: boolean;
}

const UserAvatar = memo(({
    avatarUrl,
    initials,
    size = 'md',
    showStatus = true,
    isOnline = true,
    isAnimated = true,
}: UserAvatarProps) => {
    const sizeClasses = {
        sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2.5 h-2.5', border: 'border-2' },
        md: { container: 'w-9 h-9', text: 'text-sm', status: 'w-3 h-3', border: 'border-2' },
        lg: { container: 'w-16 h-16', text: 'text-xl', status: 'w-4 h-4', border: 'border-[3px]' },
    };

    const s = sizeClasses[size];

    return (
        <div className="relative inline-flex">
            {/* Avatar Container con bordo animato */}
            <motion.div
                className={`relative ${s.container} rounded-xl overflow-hidden shadow-lg`}
                whileHover={isAnimated ? { scale: 1.05 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                {/* Bordo gradiente animato */}
                <div 
                    className="absolute inset-0 rounded-xl z-0"
                    style={{
                        background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--violet-500) 50%, var(--primary-600) 100%)',
                        padding: '2px',
                    }}
                >
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary-500 to-violet-600" />
                </div>

                {/* Immagine o Iniziali */}
                <div className="absolute inset-[2px] rounded-[10px] overflow-hidden bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Se l'immagine fallisce, mostra le iniziali
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : null}
                    <span className={`${s.text} font-bold text-white drop-shadow-md ${avatarUrl ? 'hidden' : 'block'}`}>
                        {initials}
                    </span>
                </div>
            </motion.div>

            {/* Indicatore Stato Online */}
            {showStatus && (
                <div className={`absolute -bottom-0.5 -right-0.5 ${s.border} border-[var(--bg-surface)] rounded-full`}>
                    <motion.div
                        className={`${s.status} rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        animate={isOnline ? {
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.8, 1],
                        } : {}}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{
                            boxShadow: isOnline 
                                ? '0 0 8px rgba(16, 185, 129, 0.6)' 
                                : '0 0 8px rgba(245, 158, 11, 0.6)',
                        }}
                    />
                    {/* Anello esterno animato per stato online */}
                    {isOnline && (
                        <motion.div
                            className="absolute inset-0 rounded-full bg-emerald-500/30"
                            animate={{
                                scale: [1, 1.5],
                                opacity: [0.6, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeOut',
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
});

UserAvatar.displayName = 'UserAvatar';

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
            ? 'bg-gradient-to-r from-primary-500/25 to-violet-500/15 border border-primary-500/25 shadow-lg shadow-primary-500/10'
            : 'hover:bg-white/[0.08] border border-transparent'
        }
    `;
    const activeTextColor = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
    const activeDescColor = 'var(--text-muted)';

    const content = (
        <>
            <div
                className={`
                    w-10 h-10 rounded-2xl flex items-center justify-center transition-all
                    ${isActive
                        ? 'bg-gradient-to-br from-primary-500 to-violet-600 shadow-lg shadow-primary-500/30'
                        : 'bg-white/[0.06] group-hover:bg-white/[0.1]'
                    }
                `}
                style={{ color: isActive ? 'white' : activeTextColor }}
            >
                <item.icon size={20} />
            </div>
            <div className="flex-1 min-w-0" style={{ color: activeTextColor }}>
                <p className="text-base font-medium">{item.label}</p>
                <p className="text-xs truncate" style={{ color: activeDescColor }}>{item.description}</p>
            </div>
            {item.badge && (
                <span className="px-2 py-1 text-[11px] font-bold rounded-md badge-primary">
                    {item.badge}
                </span>
            )}
            {isActive && (
                <div className="w-1 h-7 rounded-full bg-gradient-to-b from-primary-400 to-violet-500" />
            )}
        </>
    );

    if (item.action && !item.path) {
        return (
            <button onClick={handleClick} className={className}>
                {content}
            </button>
        );
    }

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
    const [isOnline, setIsOnline] = useState(true);
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

    // Monitora stato connessione
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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

    // Scroll lock quando il menu è aperto
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            const html = document.documentElement;
            const body = document.body;
            
            const originalHtmlOverflow = html.style.overflow;
            const originalBodyOverflow = body.style.overflow;
            
            html.style.overflow = 'hidden';
            body.style.overflow = 'hidden';
            
            const preventScroll = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            };
            
            const preventScrollOptions = { passive: false, capture: true };
            document.addEventListener('wheel', preventScroll, preventScrollOptions);
            document.addEventListener('touchmove', preventScroll, preventScrollOptions);
            document.addEventListener('scroll', preventScroll, preventScrollOptions);
            
            return () => {
                html.style.overflow = originalHtmlOverflow;
                body.style.overflow = originalBodyOverflow;
                document.removeEventListener('wheel', preventScroll, preventScrollOptions);
                document.removeEventListener('touchmove', preventScroll, preventScrollOptions);
                document.removeEventListener('scroll', preventScroll, preventScrollOptions);
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
            {/* Trigger Button - Versione Migliorata */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl transition-all duration-200 border backdrop-blur-xl"
                style={{
                    background: isOpen
                        ? 'var(--bg-surface-hover)'
                        : 'var(--bg-surface)',
                    borderColor: isOpen ? 'var(--primary-500/30)' : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    boxShadow: isOpen ? '0 0 20px var(--primary-500/10)' : 'none',
                }}
            >
                {/* Avatar con Foto e Stato */}
                <UserAvatar
                    avatarUrl={profile?.avatar}
                    initials={userInitials}
                    size="md"
                    isOnline={isOnline}
                    showStatus={true}
                />

                {/* User Info (desktop only) */}
                <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                        {profile?.firstName || 'Utente'}
                    </p>
                    <div className="flex items-center gap-1">
                        {isOnline ? (
                            <FiWifi size={10} className="text-emerald-500" />
                        ) : (
                            <FiWifiOff size={10} className="text-amber-500" />
                        )}
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>

                {/* Chevron animato */}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <FiChevronDown
                        size={14}
                        style={{ color: 'var(--text-muted)' }}
                    />
                </motion.div>
            </motion.button>

            {/* Sidebar - Renderizzata tramite Portal */}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop */}
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
                                    background: `linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)`,
                                    backdropFilter: 'blur(28px) saturate(190%)',
                                    borderLeft: '1px solid var(--border-subtle)',
                                }}
                                ref={menuRef}
                            >
                                <div className="h-full flex flex-col overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Menu</h2>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 rounded-lg transition-colors hover:bg-white/[0.08]"
                                            style={{ color: 'var(--text-muted)' }}
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
                                            </div>

                                            <div className="relative z-10">
                                                {/* User header con avatar grande */}
                                                <div className="flex items-start gap-4 mb-5">
                                                    <UserAvatar
                                                        avatarUrl={profile?.avatar}
                                                        initials={userInitials}
                                                        size="lg"
                                                        isOnline={isOnline}
                                                        showStatus={true}
                                                    />
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <p className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{userLabel}</p>
                                                        <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {isOnline ? 'Connesso' : 'Non in linea'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px mx-4" style={{ background: 'var(--border-subtle)' }} />

                                        {/* ===== MENU ITEMS ===== */}
                                        <div className="py-3">
                                            {menuCategories.map((category, catIndex) => (
                                                <div key={category.label}>
                                                    {catIndex > 0 && (
                                                        <div className="my-2 mx-4 h-px" style={{ background: 'var(--border-subtle)' }} />
                                                    )}
                                                    <p className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
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

                                    {/* ===== LOGOUT SECTION ===== */}
                                    <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.01, x: 2 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={handleLogout}
                                            className="flex items-center w-full gap-3 px-3 py-2.5 transition-all rounded-xl group"
                                            style={{ color: 'var(--text-danger)' }}
                                        >
                                            <div className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors" style={{
                                                background: 'var(--bg-danger-subtle)',
                                            }}>
                                                <FiLogOut size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium">Disconnetti</p>
                                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Esci dal tuo account</p>
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
