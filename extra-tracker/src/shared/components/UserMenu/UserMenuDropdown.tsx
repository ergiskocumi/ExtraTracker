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
import { RankBadge } from '../../../features/gamification/components/RankBadge';
import { LevelBadge } from '../../../features/gamification/components/LevelBadge';

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
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/70 font-medium">
                    {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </span>
                <span className="text-[11px] text-primary-300 font-semibold">
                    {progress.toFixed(0)}%
                </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-violet-500 shadow-lg shadow-primary-500/25"
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${colorConfig[color]}`}
            title={label}
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{value}</span>
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
            group flex items-center gap-3.5 px-4 py-3 mx-2 rounded-2xl transition-all duration-150
            ${isActive
                ? 'bg-gradient-to-r from-primary-500/25 to-violet-500/15 text-white border border-primary-500/25 shadow-lg shadow-primary-500/10'
                : 'text-white/70 hover:bg-white/[0.08] hover:text-white border border-transparent'
            }
        `}
    >
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
    const rank = gamification?.rank ?? user?.gamification?.rank ?? 'Unranked';
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
                        className="absolute right-0 mt-3 w-[360px] rounded-3xl border border-white/[0.16] shadow-2xl shadow-black/60 overflow-hidden z-50"
                        style={{
                            background: 'linear-gradient(145deg, rgba(18, 16, 34, 0.98) 0%, rgba(12, 10, 24, 0.98) 100%)',
                            backdropFilter: 'blur(28px) saturate(190%)',
                        }}
                    >
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
                                        <LevelBadge level={level} size="sm" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <p className="text-lg font-semibold text-white truncate">{userLabel}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-primary-300/90 font-medium">{title}</p>
                                            <RankBadge rank={rank} size="sm" variant="icon" />
                                        </div>
                                        <p className="text-xs text-white/50 truncate mt-1">{user?.email}</p>
                                    </div>
                                </div>

                                {/* XP Progress */}
                                <div className="mb-4">
                                    <XpProgressBar
                                        currentXp={xp}
                                        currentLevelXp={xpForCurrentLevel}
                                        nextLevelXp={xpForNextLevel}
                                    />
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-2.5">
                                    <StatPill icon={FiZap} value={streak} label="Streak" color="amber" />
                                    <StatPill icon={FiTrendingUp} value={`${multiplier.toFixed(1)}x`} label="Multiplier" color="emerald" />
                                    <StatPill icon={FiAward} value={`${xp.toLocaleString()} XP`} label="Total XP" color="primary" />
                                </div>
                            </div>
                        </div>

                        {/* Divider with glow */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

                        {/* ===== MENU ITEMS ===== */}
                        <div className="py-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                            {menuCategories.map((category, catIndex) => (
                                <div key={category.label}>
                                    {catIndex > 0 && (
                                        <div className="my-2 mx-4 h-px bg-white/[0.06]" />
                                    )}
                                    <p className="px-5 py-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.25em]">
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
