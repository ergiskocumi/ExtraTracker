/**
 * ✨ MODERN SETTINGS LAYOUT v2 - Full Width Layout
 * 
 * Ottimizzato per:
 * - Utilizzo completo dello schermo
 * - Sidebar fissa sinistra
 * - Contenuto espanso a destra
 * - Griglie responsive per i form
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { cn } from '../../../../lib/utils';

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
    const [_hoveredTab, setHoveredTab] = useState<TabId | null>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

    // Rileva dimensione schermo
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsCompact(width >= 768 && width < 1280);
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
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="mb-6 flex-shrink-0"
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
                        className="mb-4 overflow-hidden flex-shrink-0"
                    >
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500"
                            />
                            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
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
                        className="mb-4 overflow-hidden flex-shrink-0"
                    >
                        <motion.button
                            onClick={onSync}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                        >
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500"
                            />
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium flex-1 text-left">
                                {pendingCount} modifiche in attesa di sincronizzazione
                            </span>
                            <span className="text-xs text-blue-500/70 font-medium">Clicca per sincronizzare</span>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout - Full Height */}
            <div className="flex-1 flex gap-6 min-h-0">
                {/* Sidebar Navigation - Fixed Width */}
                {!isMobile && (
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
                    >
                        <div className="relative rounded-2xl border border-theme-default bg-theme-surface p-2 flex-1 overflow-y-auto">
                            {/* Animated Indicator */}
                            <motion.div
                                className="absolute left-2 right-2 rounded-xl bg-primary-500/10 border border-primary-500/20"
                                initial={false}
                                animate={{
                                    top: indicatorStyle.top + 8,
                                    height: indicatorStyle.height,
                                    opacity: indicatorStyle.height > 0 ? 1 : 0,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />

                            {/* Menu Items */}
                            <div className="relative space-y-1">
                                {tabs.map((tab, index) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <motion.button
                                            key={tab.id}
                                            ref={isActive ? activeTabRef : null}
                                            onClick={() => onTabChange(tab.id)}
                                            onMouseEnter={() => setHoveredTab(tab.id)}
                                            onMouseLeave={() => setHoveredTab(null)}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group relative overflow-hidden",
                                                isActive
                                                    ? 'text-theme-primary'
                                                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle'
                                            )}
                                        >
                                            {/* Icon Container */}
                                            <motion.div
                                                animate={{ scale: isActive ? 1.1 : 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={cn(
                                                    "relative z-10 p-2 rounded-xl flex-shrink-0",
                                                    isActive
                                                        ? `bg-gradient-to-br ${tab.gradient} shadow-lg`
                                                        : 'bg-theme-subtle group-hover:bg-theme-card'
                                                )}
                                            >
                                                <Icon className={cn("w-5 h-5", isActive ? 'text-white' : 'text-theme-secondary')} />
                                            </motion.div>

                                            {/* Label & Description */}
                                            <div className="flex-1 min-w-0 relative z-10 text-left">
                                                <p className={cn("font-semibold text-sm", isActive ? 'text-theme-primary' : 'text-theme-secondary')}>
                                                    {tab.label}
                                                </p>
                                                {!isCompact && (
                                                    <p className="text-xs text-theme-muted mt-0.5 truncate">
                                                        {tab.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Active Indicator Dot */}
                                            {isActive && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="w-2 h-2 rounded-full bg-primary-500"
                                                />
                                            )}
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
                            className="mt-4 p-4 rounded-xl border border-theme-default bg-theme-surface"
                        >
                            <p className="text-xs text-theme-muted">
                                <span className="text-theme-secondary font-medium">Pro tip:</span> Usa{' '}
                                <kbd className="px-1.5 py-0.5 rounded bg-theme-subtle text-theme-secondary text-[10px]">
                                    Ctrl+K
                                </kbd>{' '}
                                per cercare
                            </p>
                        </motion.div>
                    </motion.div>
                )}

                {/* Content Area - Expanded */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-1 min-w-0 flex flex-col"
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
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 flex-shrink-0",
                                            isActive
                                                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                                                : 'bg-theme-surface text-theme-secondary border border-theme-default'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{tab.label}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* Main Content Card - Full Height */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            ref={contentRef}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 rounded-2xl border border-theme-default bg-theme-surface overflow-hidden flex flex-col"
                        >
                            {/* Section Header */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center justify-between px-6 py-5 border-b border-theme-default bg-theme-subtle/30 flex-shrink-0"
                            >
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        className={cn("p-3 rounded-xl shadow-lg", `bg-gradient-to-br ${activeTabData.gradient}`)}
                                    >
                                        <activeTabData.icon className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <div>
                                        <motion.h2
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.15 }}
                                            className="text-2xl font-bold text-theme-primary"
                                        >
                                            {activeTabData.label}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-sm text-theme-secondary mt-0.5"
                                        >
                                            {activeTabData.description}
                                        </motion.p>
                                    </div>
                                </div>

                                {/* Breadcrumb */}
                                <div className="hidden md:flex items-center gap-2 text-sm text-theme-muted">
                                    <span>Impostazioni</span>
                                    <span>/</span>
                                    <span className="text-theme-primary">{activeTabData.label}</span>
                                </div>
                            </motion.div>

                            {/* Content - Scrollable */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex-1 overflow-y-auto p-6"
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

export default ModernSettingsLayout;
