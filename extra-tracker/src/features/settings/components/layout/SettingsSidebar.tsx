/**
 * 🎯 SETTINGS SIDEBAR - Sidebar per Desktop/Tablet
 * 
 * Sidebar fissa per desktop, collassabile per tablet
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { SettingsTab, TabId } from './SettingsLayout';

interface SettingsSidebarProps {
    tabs: SettingsTab[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    isTablet?: boolean;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
    tabs,
    activeTab,
    onTabChange,
    isTablet = false,
}) => {
    return (
        <div className="rounded-2xl md:rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-3 md:p-4 space-y-2 card sticky top-4">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <motion.button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl transition-all text-left group ${
                            isActive
                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                        }`}
                    >
                        <div className={`p-1.5 md:p-2 rounded-lg flex-shrink-0 ${
                            isActive
                                ? 'bg-white/20'
                                : 'bg-white/[0.08] group-hover:bg-white/[0.12]'
                        }`}>
                            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm md:text-base ${isActive ? 'text-white' : 'text-white/90'}`}>
                                {tab.label}
                            </p>
                            {!isTablet && (
                                <p className={`text-xs mt-0.5 ${
                                    isActive ? 'text-white/80' : 'text-white/50'
                                }`}>
                                    {tab.description}
                                </p>
                            )}
                        </div>
                        {isActive && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-full bg-white flex-shrink-0"
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};
