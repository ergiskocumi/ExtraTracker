/**
 * 📱 SETTINGS LAYOUT - Layout Responsive per Impostazioni
 * 
 * Gestisce automaticamente il layout in base alla dimensione dello schermo:
 * - Mobile: Bottom navigation + Drawer
 * - Tablet: Sidebar collassabile
 * - Desktop: Sidebar fissa
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsDrawer } from './SettingsDrawer';
import { SettingsBottomNav } from './SettingsBottomNav';

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
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl md:rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-4 md:p-6 lg:p-8 card"
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
