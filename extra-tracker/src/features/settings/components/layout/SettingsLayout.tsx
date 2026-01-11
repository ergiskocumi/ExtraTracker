/**
 * 📱 SETTINGS LAYOUT - Layout Responsive per Impostazioni
 * 
 * Gestisce automaticamente il layout in base alla dimensione dello schermo:
 * - Mobile: Bottom navigation + Drawer
 * - Tablet: Sidebar collassabile
 * - Desktop: Sidebar fissa
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsDrawer } from './SettingsDrawer';
import { SettingsBottomNav } from './SettingsBottomNav';
import { SettingsBackButton } from './SettingsBackButton';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';

export type TabId = 'profile' | 'preferences' | 'security' | 'account';

export interface SettingsTab {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
}

interface SettingsLayoutProps {
    tabs: SettingsTab[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    children: React.ReactNode;
    header?: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
    tabs,
    activeTab,
    onTabChange,
    children,
    header,
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Rileva dimensione schermo
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Chiudi drawer quando cambia tab su mobile
    useEffect(() => {
        if (isMobile && isDrawerOpen) {
            setIsDrawerOpen(false);
        }
    }, [activeTab, isMobile, isDrawerOpen]);

    const handleTabChange = (tab: TabId) => {
        onTabChange(tab);
        if (isMobile) {
            setIsDrawerOpen(false);
        }
    };

    // Navigazione tra tab con swipe
    const getCurrentTabIndex = () => tabs.findIndex((t) => t.id === activeTab);
    const getNextTab = () => {
        const currentIndex = getCurrentTabIndex();
        return currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : null;
    };
    const getPreviousTab = () => {
        const currentIndex = getCurrentTabIndex();
        return currentIndex > 0 ? tabs[currentIndex - 1] : null;
    };

    const contentRef = useRef<HTMLDivElement>(null);
    const { elementRef } = useSwipeGestures({
        onSwipeLeft: () => {
            const nextTab = getNextTab();
            if (nextTab) handleTabChange(nextTab.id);
        },
        onSwipeRight: () => {
            const prevTab = getPreviousTab();
            if (prevTab) handleTabChange(prevTab.id);
        },
        enabled: isMobile,
    });

    // Combina i ref per swipe gestures
    useEffect(() => {
        if (contentRef.current && elementRef) {
            (elementRef as React.MutableRefObject<HTMLElement | null>).current = contentRef.current;
        }
    }, [elementRef, isMobile]);

    return (
        <div className="min-h-screen pb-20 md:pb-0">
            {/* Header */}
            {header && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6 md:mb-8"
                >
                    {header}
                </motion.div>
            )}

            {/* Layout Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                {/* Desktop/Tablet Sidebar */}
                {!isMobile && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`${isTablet ? 'lg:col-span-3' : 'lg:col-span-3'}`}
                    >
                        <SettingsSidebar
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            isTablet={isTablet}
                        />
                    </motion.div>
                )}

                {/* Content Area */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${isMobile ? 'col-span-1' : 'lg:col-span-9'}`}
                >
                    {/* Mobile Header con Back Button e Breadcrumb */}
                    {isMobile && header && (
                        <div className="mb-4 flex items-center gap-3">
                            <SettingsBackButton
                                onClick={() => {
                                    const prevTab = getPreviousTab();
                                    if (prevTab) handleTabChange(prevTab.id);
                                    else if (window.history.length > 1) window.history.back();
                                }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-white/50 flex items-center gap-1">
                                    <span>Impostazioni</span>
                                    <span>/</span>
                                    <span className="text-white/70 truncate">
                                        {tabs.find((t) => t.id === activeTab)?.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            ref={contentRef}
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl md:rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-4 md:p-6 lg:p-8 card mobile-padding"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Mobile Drawer */}
            {isMobile && (
                <SettingsDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            )}

            {/* Mobile Bottom Navigation */}
            {isMobile && (
                <SettingsBottomNav
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onMenuClick={() => setIsDrawerOpen(true)}
                />
            )}
        </div>
    );
};
