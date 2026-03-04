/**
 * USER MENU DROPDOWN - Versione Pulita
 *
 * Menu utente moderno con:
 * - Avatar foto profilo con bordo animato
 * - Design glassmorphism avanzato
 * - Animazioni fluide
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
    FiMessageCircle,
    FiCpu,
} from 'react-icons/fi';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useSettings } from '../../../features/settings/context/SettingsContext';
import { useFeedback } from '../../../features/feedback/context/FeedbackContext';

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
// AVATAR COMPONENT
// ============================================

interface UserAvatarProps {
    avatarUrl?: string;
    initials: string;
    size?: 'sm' | 'md' | 'lg';
    isAnimated?: boolean;
}

const UserAvatar = memo(({
    avatarUrl,
    initials,
    size = 'md',
    isAnimated = true,
}: UserAvatarProps) => {
    const sizeClasses = {
        sm: { container: 'w-8 h-8', text: 'text-xs' },
        md: { container: 'w-9 h-9', text: 'text-sm' },
        lg: { container: 'w-16 h-16', text: 'text-xl' },
    };

    const s = sizeClasses[size];

    return (
        <motion.div
            className={`relative ${s.container} rounded-xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-700/50`}
            whileHover={isAnimated ? { scale: 1.05 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-900 flex items-center justify-center">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : null}
                <span className={`${s.text} font-bold text-white drop-shadow-sm ${avatarUrl ? 'hidden' : 'block'}`}>
                    {initials}
                </span>
            </div>
        </motion.div>
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
    const { openFeedback } = useFeedback();

    const [isOpen, setIsOpen] = useState(false);
    const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
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
                { path: '/ai-dashboard', label: 'AI Usage', icon: FiCpu, description: 'Token, prompt e costi' },
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
        {
            label: 'Aiuto',
            items: [
                { label: 'Segnala un problema', description: 'Bug o suggerimento', icon: FiMessageCircle, action: () => openFeedback() },
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

    // Escape chiude il lightbox avatar + lock scroll quando lightbox aperto
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAvatarLightboxOpen(false);
        };
        if (avatarLightboxOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [avatarLightboxOpen]);

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl transition-all duration-200 border backdrop-blur-xl ${isOpen
                        ? 'bg-slate-100/90 border-slate-300 dark:bg-slate-800/90 dark:border-slate-600 shadow-md'
                        : 'bg-white/60 border-slate-200/80 hover:bg-white shadow-sm dark:bg-slate-800/40 dark:border-slate-700/80 dark:hover:bg-slate-800/80'
                    }`}
            >
                {/* Avatar - click apre fullscreen */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (profile?.avatar) setAvatarLightboxOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && profile?.avatar) {
                            e.preventDefault();
                            e.stopPropagation();
                            setAvatarLightboxOpen(true);
                        }
                    }}
                    className={profile?.avatar ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl' : ''}
                >
                    <UserAvatar
                        avatarUrl={profile?.avatar}
                        initials={userInitials}
                        size="md"
                    />
                </div>

                {/* User Info (desktop only) */}
                <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium truncate max-w-[100px] text-slate-700 dark:text-slate-200">
                        {profile?.firstName || 'Utente'}
                    </p>
                </div>

                {/* Chevron */}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <FiChevronDown
                        size={14}
                        className="text-slate-500 dark:text-slate-400"
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

                            {/* Sidebar */}
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
                                        {/* User Profile Section */}
                                        <div className="relative p-5 overflow-hidden">
                                            {/* Background */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute top-0 right-0 w-36 h-36 bg-primary-500/15 rounded-[32px] blur-3xl transform translate-x-1/2 -translate-y-1/2 rotate-12" />
                                                <div className="absolute bottom-0 left-0 w-28 h-28 bg-violet-500/12 rounded-[26px] blur-2xl transform -translate-x-1/2 translate-y-1/2 -rotate-12" />
                                            </div>

                                            <div className="relative z-10">
                                                <div className="flex items-start gap-4 mb-5">
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => profile?.avatar && setAvatarLightboxOpen(true)}
                                                        onKeyDown={(e) => {
                                                            if ((e.key === 'Enter' || e.key === ' ') && profile?.avatar) {
                                                                e.preventDefault();
                                                                setAvatarLightboxOpen(true);
                                                            }
                                                        }}
                                                        className={profile?.avatar ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl' : ''}
                                                    >
                                                        <UserAvatar
                                                            avatarUrl={profile?.avatar}
                                                            initials={userInitials}
                                                            size="lg"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <p className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{userLabel}</p>
                                                        <p className="text-xs truncate mt-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px mx-4" style={{ background: 'var(--border-subtle)' }} />

                                        {/* Menu Items */}
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

                                    {/* Logout Section */}
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

            {/* Lightbox avatar a schermo intero - click fuori chiude */}
            {typeof window !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {avatarLightboxOpen && profile?.avatar && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                                onClick={() => setAvatarLightboxOpen(false)}
                                role="button"
                                tabIndex={0}
                                aria-label="Chiudi anteprima avatar"
                            >
                                <motion.img
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    src={profile.avatar}
                                    alt="Avatar a schermo intero"
                                    className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                    draggable={false}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
});

UserMenuDropdown.displayName = 'UserMenuDropdown';

export default UserMenuDropdown;
