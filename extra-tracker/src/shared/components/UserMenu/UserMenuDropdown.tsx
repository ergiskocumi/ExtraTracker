/**
 * USER MENU DROPDOWN
 *
 * Menu utente moderno con design geometrico e dati gamification real-time.
 * Features:
 * - Design glassmorphism con forme geometriche
 * - Livello, XP e streak in tempo reale
 * - Animazioni fluide
 * - Performance ottimizzata
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiLayout,
    FiTarget,
    FiSettings,
    FiLogOut,
    FiChevronDown,
    FiBookOpen,
    FiAward,
    FiZap,
    FiTrendingUp,
    FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useSettings } from '../../../features/settings/context/SettingsContext';
import { useGamificationStatus } from '../../../features/gamification/hooks/useGamificationStatus';

// ============================================
// TYPES
// ============================================

interface MenuItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    badge?: string | number;
}

interface MenuCategory {
    label: string;
    items: MenuItem[];
}

// ============================================
// LEVEL BADGE COMPONENT
// ============================================

const LevelBadge = memo(({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeConfig = {
        sm: 'w-6 h-6 text-[10px]',
        md: 'w-8 h-8 text-xs',
        lg: 'w-10 h-10 text-sm',
    };

    const getRankGradient = (lvl: number) => {
        if (lvl >= 50) return 'from-violet-400 via-purple-500 to-indigo-600';
        if (lvl >= 30) return 'from-amber-400 via-yellow-500 to-orange-500';
        if (lvl >= 15) return 'from-cyan-400 via-blue-500 to-indigo-500';
        if (lvl >= 5) return 'from-emerald-400 via-green-500 to-teal-500';
        return 'from-slate-400 via-gray-500 to-slate-600';
    };

    return (
        <div
            className={`
                ${sizeConfig[size]} rounded-lg flex items-center justify-center font-bold text-white
                bg-gradient-to-br ${getRankGradient(level)} shadow-lg
                relative overflow-hidden
            `}
        >
            {/* Geometric overlay */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/20 transform rotate-45 translate-x-1/2 -translate-y-1/2" />
            </div>
            <span className="relative z-10">{level}</span>
        </div>
    );
});

LevelBadge.displayName = 'LevelBadge';

// ============================================
// XP PROGRESS BAR
// ============================================

const XpProgressBar = memo(({
    currentXp,
    currentLevelXp,
    nextLevelXp,
}: {
    currentXp: number;
    currentLevelXp: number;
    nextLevelXp: number;
}) => {
    const xpInLevel = currentXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progress = Math.min(100, (xpInLevel / xpNeeded) * 100);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/50 font-medium">
                    {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </span>
                <span className="text-[10px] text-primary-400 font-semibold">
                    {progress.toFixed(0)}%
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-violet-500"
                />
            </div>
        </div>
    );
});

XpProgressBar.displayName = 'XpProgressBar';

// ============================================
// STATS PILL
// ============================================

const StatPill = memo(({
    icon: Icon,
    value,
    label,
    color = 'primary',
}: {
    icon: React.ComponentType<{ className?: string }>;
    value: string | number;
    label: string;
    color?: 'primary' | 'amber' | 'emerald' | 'rose';
}) => {
    const colorConfig = {
        primary: 'bg-primary-500/15 text-primary-400 border-primary-500/20',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    };

    return (
        <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${colorConfig[color]}`}
            title={label}
        >
            <Icon className="w-3 h-3" />
            <span className="text-[11px] font-semibold">{value}</span>
        </div>
    );
});

StatPill.displayName = 'StatPill';

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
}) => (
    <Link
        to={item.path}
        onClick={onClick}
        className={`
            group flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-150
            ${isActive
                ? 'bg-gradient-to-r from-primary-500/20 to-violet-500/10 text-white border border-primary-500/20'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white border border-transparent'
            }
        `}
    >
        <div
            className={`
                w-9 h-9 rounded-xl flex items-center justify-center transition-all
                ${isActive
                    ? 'bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-white/[0.06] group-hover:bg-white/[0.1]'
                }
            `}
        >
            <item.icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-[10px] text-white/40 truncate">{item.description}</p>
        </div>
        {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-primary-500/20 text-primary-400">
                {item.badge}
            </span>
        )}
        {isActive && (
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary-400 to-violet-500" />
        )}
    </Link>
));

MenuItemComponent.displayName = 'MenuItemComponent';

// ============================================
// MAIN COMPONENT
// ============================================

export const UserMenuDropdown = memo(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { profile } = useSettings();
    const { status: gamification, isLoading: isGamificationLoading } = useGamificationStatus({
        enablePolling: true,
        refreshInterval: 60000,
    });

    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Gamification data with fallbacks
    const level = gamification?.level ?? user?.gamification?.level ?? 1;
    const title = gamification?.title ?? 'Principiante';
    const xp = gamification?.xp ?? user?.gamification?.xp ?? 0;
    const xpForCurrentLevel = gamification?.xpForCurrentLevel ?? 0;
    const xpForNextLevel = gamification?.xpForNextLevel ?? 100;
    const streak = gamification?.streak?.current ?? user?.gamification?.streak?.current ?? 0;
    const multiplier = gamification?.multipliers?.total ?? 1;

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
                { path: '/gamification', label: 'Progressi', icon: FiAward, description: 'Level up!' },
            ],
        },
        {
            label: 'Account',
            items: [
                { path: '/settings', label: 'Impostazioni', icon: FiSettings, description: 'Personalizza' },
            ],
        },
    ];

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        navigate('/login');
    };

    const handleNavClick = () => setIsOpen(false);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                {/* Level Badge + Avatar */}
                <div className="relative">
                    <div
                        className="flex items-center justify-center w-9 h-9 text-sm font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-primary-500 to-violet-600 shadow-primary-500/25"
                        title={userLabel}
                    >
                        {userInitials}
                    </div>
                    {/* Level indicator */}
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-md bg-dark-500 border border-white/20">
                        <span className="text-[9px] font-bold text-white">{level}</span>
                    </div>
                </div>

                {/* User Info (desktop only) */}
                <div className="hidden md:block text-left min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate max-w-[100px]">
                        {profile?.firstName || 'Utente'}
                    </p>
                    <div className="flex items-center gap-1">
                        <FiZap className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-[10px] text-white/50">{streak} giorni</span>
                    </div>
                </div>

                {/* Chevron */}
                <FiChevronDown
                    size={14}
                    className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/50 overflow-hidden z-50"
                        style={{
                            background: 'linear-gradient(145deg, rgba(30, 27, 50, 0.97) 0%, rgba(20, 18, 35, 0.98) 100%)',
                            backdropFilter: 'blur(24px) saturate(180%)',
                        }}
                    >
                        {/* ===== USER PROFILE SECTION ===== */}
                        <div className="relative p-4 overflow-hidden">
                            {/* Background geometric shapes */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
                                {/* Geometric lines */}
                                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100">
                                    <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
                                    <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" />
                                </svg>
                            </div>

                            <div className="relative z-10">
                                {/* User header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="relative">
                                        <div className="flex items-center justify-center w-14 h-14 text-xl font-bold text-white rounded-2xl shadow-xl bg-gradient-to-br from-primary-500 via-primary-600 to-violet-600 shadow-primary-500/30">
                                            {userInitials}
                                        </div>
                                        <LevelBadge level={level} size="sm" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <p className="text-base font-semibold text-white truncate">{userLabel}</p>
                                        <p className="text-xs text-primary-400/80 font-medium">{title}</p>
                                        <p className="text-[10px] text-white/40 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                </div>

                                {/* XP Progress */}
                                <div className="mb-3">
                                    <XpProgressBar
                                        currentXp={xp}
                                        currentLevelXp={xpForCurrentLevel}
                                        nextLevelXp={xpForNextLevel}
                                    />
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-2">
                                    <StatPill icon={FiZap} value={streak} label="Streak" color="amber" />
                                    <StatPill icon={FiTrendingUp} value={`${multiplier.toFixed(1)}x`} label="Multiplier" color="emerald" />
                                    <StatPill icon={FiAward} value={`${xp.toLocaleString()} XP`} label="Total XP" color="primary" />
                                </div>
                            </div>
                        </div>

                        {/* Divider with glow */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

                        {/* ===== MENU ITEMS ===== */}
                        <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {menuCategories.map((category, catIndex) => (
                                <div key={category.label}>
                                    {catIndex > 0 && (
                                        <div className="my-2 mx-4 h-px bg-white/[0.06]" />
                                    )}
                                    <p className="px-5 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                        {category.label}
                                    </p>
                                    {category.items.map((item) => {
                                        const isActive = location.pathname === item.path ||
                                            (item.path !== '/' && location.pathname.startsWith(item.path));
                                        return (
                                            <MenuItemComponent
                                                key={item.path}
                                                item={item}
                                                isActive={isActive}
                                                onClick={handleNavClick}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* ===== LOGOUT SECTION ===== */}
                        <div className="p-2 border-t border-white/[0.08] bg-black/20">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

UserMenuDropdown.displayName = 'UserMenuDropdown';

export default UserMenuDropdown;
