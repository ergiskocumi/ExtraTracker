/**
 * ✨ MODERN SETTINGS LAYOUT - Layout futuristico con animazioni
 * 
 * Design ispirato alle moderne app con:
 * - Glassmorphism avanzato
 * - Animazioni spring fluide
 * - Micro-interazioni
 * - Transizioni morbide
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';

export type TabId = 'profile' | 'preferences' | 'security' | 'notifications' | 'privacy' | 'account';

export interface SettingsTab {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
    gradient: string;
}

interface ModernSettingsLayoutProps {
    tabs: SettingsTab[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    children: React.ReactNode;
    header?: React.ReactNode;
    isOnline: boolean;
    pendingCount: number;
    onSync: () => void;
}

// Animazioni spring per un feeling naturale
const springTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
};

const menuItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
};

const contentVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.98,
    },
};

export const ModernSettingsLayout: React.FC<ModernSettingsLayoutProps> = ({
    tabs,
    activeTab,
    onTabChange,
    children,
    header,
    isOnline,
    pendingCount,
    onSync,
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<TabId | null>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

    // Rileva dimensione schermo
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsCompact(width >= 768 && width < 1024);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Aggiorna indicatore posizione
    useEffect(() => {
        if (activeTabRef.current && !isMobile) {
            const rect = activeTabRef.current.getBoundingClientRect();
            const parentRect = activeTabRef.current.parentElement?.getBoundingClientRect();
            if (parentRect) {
                setIndicatorStyle({
                    top: rect.top - parentRect.top,
                    height: rect.height,
                });
            }
        }
    }, [activeTab, isMobile]);

    // Navigazione swipe
    const contentRef = useRef<HTMLDivElement>(null);
    const { elementRef } = useSwipeGestures({
        onSwipeLeft: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab);
            if (currentIndex < tabs.length - 1) {
                onTabChange(tabs[currentIndex + 1].id);
            }
        },
        onSwipeRight: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab);
            if (currentIndex > 0) {
                onTabChange(tabs[currentIndex - 1].id);
            }
        },
        enabled: isMobile,
    });

    useEffect(() => {
        if (contentRef.current && elementRef) {
            (elementRef as React.MutableRefObject<HTMLElement | null>).current = contentRef.current;
        }
    }, [elementRef, isMobile]);

    const activeTabData = tabs.find(t => t.id === activeTab)!;

    return (
        <div className="min-h-screen pb-24 md:pb-0">
            {/* Header Section con Glassmorphism */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="mb-8"
            >
                {header}
            </motion.div>

            {/* Connection Status Banner */}
            <AnimatePresence mode="wait">
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500"
                            />
                            <span className="text-sm text-amber-400 font-medium">
                                Sei offline. Le modifiche verranno sincronizzate automaticamente.
                            </span>
                        </div>
                    </motion.div>
                )}

                {isOnline && pendingCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 overflow-hidden"
                    >
                        <motion.button
                            onClick={onSync}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm hover:bg-blue-500/20 transition-colors cursor-pointer"
                        >
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
                            />
                            <span className="text-sm text-blue-400 font-medium flex-1 text-left">
                                {pendingCount} modifiche in attesa di sincronizzazione
                            </span>
                            <span className="text-xs text-blue-400/70 font-medium">Clicca per sincronizzare</span>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar Navigation */}
                {!isMobile && (
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-4 xl:col-span-3"
                    >
                        <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl p-2 shadow-2xl shadow-black/20">
                            {/* Animated Indicator */}
                            <motion.div
                                className="absolute left-2 right-2 rounded-2xl bg-gradient-to-r from-primary-500/20 to-primary-600/10 border border-primary-500/20"
                                initial={false}
                                animate={{
                                    top: indicatorStyle.top + 8,
                                    height: indicatorStyle.height,
                                    opacity: indicatorStyle.height > 0 ? 1 : 0,
                                }}
                                transition={springTransition}
                            />

                            {/* Menu Items */}
                            <div className="relative space-y-1">
                                {tabs.map((tab, index) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    const isHovered = hoveredTab === tab.id;

                                    return (
                                        <motion.button
                                            key={tab.id}
                                            ref={isActive ? activeTabRef : null}
                                            onClick={() => onTabChange(tab.id)}
                                            onMouseEnter={() => setHoveredTab(tab.id)}
                                            onMouseLeave={() => setHoveredTab(null)}
                                            initial="initial"
                                            animate="animate"
                                            variants={menuItemVariants}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl 
                                                transition-all duration-300 text-left group relative overflow-hidden
                                                ${isActive
                                                    ? 'text-white'
                                                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                                                }
                                            `}
                                        >
                                            {/* Hover Glow Effect */}
                                            <AnimatePresence>
                                                {isHovered && !isActive && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent"
                                                    />
                                                )}
                                            </AnimatePresence>

                                            {/* Icon Container */}
                                            <motion.div
                                                animate={{
                                                    scale: isActive ? 1.1 : 1,
                                                    rotate: isActive ? [0, -10, 10, 0] : 0,
                                                }}
                                                transition={{
                                                    scale: { duration: 0.2 },
                                                    rotate: { duration: 0.5, delay: 0.1 },
                                                }}
                                                className={`
                                                    relative z-10 p-2.5 rounded-xl flex-shrink-0
                                                    ${isActive
                                                        ? `bg-gradient-to-br ${tab.gradient} shadow-lg shadow-${tab.color.split('-')[1]}-500/25`
                                                        : 'bg-white/[0.06] group-hover:bg-white/[0.10]'
                                                    }
                                                `}
                                            >
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                                            </motion.div>

                                            {/* Label & Description */}
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <motion.p
                                                    animate={{ x: isActive ? 2 : 0 }}
                                                    className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-white/90'}`}
                                                >
                                                    {tab.label}
                                                </motion.p>
                                                <AnimatePresence>
                                                    {!isCompact && (
                                                        <motion.p
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 0.6, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="text-xs text-white/60 mt-0.5 truncate"
                                                        >
                                                            {tab.description}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Active Indicator Dot */}
                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Help Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-6 mb-6 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
                        >
                            <p className="text-xs text-white/40">
                                <span className="text-white/60 font-medium">Pro tip:</span> Usa{' '}
                                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white/70 text-[10px]">
                                    Ctrl+K
                                </kbd>{' '}
                                per cercare nelle impostazioni
                            </p>
                        </motion.div>
                    </motion.div>
                )}

                {/* Content Area */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`${isMobile ? 'col-span-1' : 'lg:col-span-8 xl:col-span-9'}`}
                >
                    {/* Mobile Tab Selector */}
                    {isMobile && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                        >
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <motion.button
                                        key={tab.id}
                                        onClick={() => onTabChange(tab.id)}
                                        whileTap={{ scale: 0.95 }}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap
                                            transition-all duration-300 flex-shrink-0
                                            ${isActive
                                                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                                                : 'bg-white/[0.05] text-white/60 border border-white/[0.08]'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{tab.label}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* Main Content Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            ref={contentRef}
                            variants={contentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl p-6 md:p-8 shadow-2xl shadow-black/20 overflow-hidden"
                        >
                            {/* Background Gradient Decoration */}
                            <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${activeTabData.gradient} opacity-10 blur-3xl rounded-full pointer-events-none`} />
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent opacity-30 blur-3xl rounded-full pointer-events-none" />

                            {/* Section Header */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-white/[0.06]"
                            >
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        className={`p-3 rounded-2xl bg-gradient-to-br ${activeTabData.gradient} shadow-lg`}
                                    >
                                        <activeTabData.icon className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <div>
                                        <motion.h2
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.15 }}
                                            className="text-2xl md:text-3xl font-bold text-white"
                                        >
                                            {activeTabData.label}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-white/50 text-sm mt-1"
                                        >
                                            {activeTabData.description}
                                        </motion.p>
                                    </div>
                                </div>

                                {/* Breadcrumb */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="hidden md:flex items-center gap-2 text-sm text-white/30 mt-4 sm:mt-0"
                                >
                                    <span>Impostazioni</span>
                                    <motion.span
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        /
                                    </motion.span>
                                    <span className="text-white/60">{activeTabData.label}</span>
                                </motion.div>
                            </motion.div>

                            {/* Content */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative"
                            >
                                {children}
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};
