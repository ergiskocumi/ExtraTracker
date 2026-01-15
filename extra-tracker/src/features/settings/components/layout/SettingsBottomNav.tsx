/**
 * 📱 SETTINGS BOTTOM NAV - Bottom Navigation per Mobile
 * 
 * Navigazione a fondo schermo per mobile con 4 categorie principali
 */

import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import type { SettingsTab, TabId } from './SettingsLayout';

interface SettingsBottomNavProps {
    tabs: SettingsTab[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    onMenuClick: () => void;
}

export const SettingsBottomNav: React.FC<SettingsBottomNavProps> = ({
    tabs,
    activeTab,
    onTabChange,
    onMenuClick,
}) => {
    // Mostra solo le prime 3 categorie + menu button
    const visibleTabs = tabs.slice(0, 3);

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/90 backdrop-blur-xl border-t border-white/[0.12] px-2 py-2 safe-area-inset-bottom"
        >
            <div className="flex items-center justify-around max-w-md mx-auto">
                {/* Menu Button */}
                <motion.button
                    onClick={onMenuClick}
                    whileTap={{ scale: 0.9 }}
                    className="touch-target flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors text-white/70 hover:text-white hover:bg-white/[0.08] min-w-[60px]"
                    aria-label="Apri menu categorie"
                >
                    <div className="p-2 rounded-lg bg-white/[0.08]">
                        <Menu className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">Menu</span>
                </motion.button>

                {/* Visible Tabs */}
                {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            whileTap={{ scale: 0.9 }}
                            className={`touch-target relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                                isActive
                                    ? 'text-white'
                                    : 'text-white/70 hover:text-white'
                            }`}
                            aria-label={`Vai a ${tab.label}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className={`p-2 rounded-lg transition-colors ${
                                isActive
                                    ? `bg-gradient-to-br ${tab.color} shadow-lg`
                                    : 'bg-white/[0.08]'
                            }`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-medium ${
                                isActive ? 'text-white' : 'text-white/70'
                            }`}>
                                {tab.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
};
