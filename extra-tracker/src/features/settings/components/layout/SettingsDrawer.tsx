/**
 * 📱 SETTINGS DRAWER - Drawer per Mobile
 * 
 * Drawer laterale per navigazione categorie su mobile
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { SettingsTab, TabId } from './SettingsLayout';

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tabs: SettingsTab[];
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
    isOpen,
    onClose,
    tabs,
    activeTab,
    onTabChange,
}) => {
    const handleTabClick = (tab: TabId) => {
        onTabChange(tab);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-r border-white/[0.12] z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/[0.08] p-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Categorie</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="p-4 space-y-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <motion.button
                                        key={tab.id}
                                        onClick={() => handleTabClick(tab.id)}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left ${
                                            isActive
                                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${
                                            isActive
                                                ? 'bg-white/20'
                                                : 'bg-white/[0.08]'
                                        }`}>
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold ${isActive ? 'text-white' : 'text-white/90'}`}>
                                                {tab.label}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${
                                                isActive ? 'text-white/80' : 'text-white/50'
                                            }`}>
                                                {tab.description}
                                            </p>
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-2 h-2 rounded-full bg-white"
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
