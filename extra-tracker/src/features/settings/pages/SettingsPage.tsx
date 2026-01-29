/**
 * ⚙️ SETTINGS PAGE - Premium Settings System
 * 
 * Design premium con sidebar per categorie e feedback visivo immediato
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings,
    Shield,
    Trash2,
    MessageSquare,
    Search,
    Command,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSettingsPage } from '../hooks/useSettings';
import { ProfileSettings } from '../components/ProfileSettings';
import { PreferencesSettings } from '../components/PreferencesSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { AccountSettings } from '../components/AccountSettings/index';
import { FeedbackSettings } from '../../feedback/components/FeedbackSettings';
import { SettingsSearch } from '../components/SettingsSearch';
import { SettingsLayout, type SettingsTab, type TabId } from '../components/layout/SettingsLayout';
import { SettingsDrawer } from '../components/layout/SettingsDrawer';
import { SettingsBottomNav } from '../components/layout/SettingsBottomNav';
import { emitToast } from '../../../shared/components/toast';

// Types sono ora importati da SettingsLayout

const tabs: SettingsTab[] = [
    { 
        id: 'profile', 
        label: 'Profilo', 
        icon: User, 
        description: 'Informazioni personali e avatar',
        color: 'from-blue-500 to-cyan-500'
    },
    { 
        id: 'preferences', 
        label: 'Preferenze', 
        icon: Settings, 
        description: 'Lingua, tema e visualizzazione',
        color: 'from-purple-500 to-pink-500'
    },
    { 
        id: 'security', 
        label: 'Sicurezza', 
        icon: Shield, 
        description: 'Password e autenticazione',
        color: 'from-emerald-500 to-teal-500'
    },
    {
        id: 'account',
        label: 'Account',
        icon: Trash2,
        description: 'Esporta dati e elimina account',
        color: 'from-rose-500 to-red-500'
    },
    {
        id: 'feedback',
        label: 'Feedback',
        icon: MessageSquare,
        description: 'Segnalazioni e stato ticket',
        color: 'from-amber-500 to-orange-500'
    },
];

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const location = useLocation();

    // Rileva dimensione schermo per mobile
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab && tabs.some((item) => item.id === tab)) {
            setActiveTab(tab as TabId);
        }
    }, [location.search]);
    const {
        profile,
        preferences,
        account,
        statuses,
        saveProfile,
        savePreferences,
        changePassword,
        exportData,
        checkImportData,
        importData,
        deleteAccount,
    } = useSettingsPage();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K or Cmd+K to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // / to open search
            if (e.key === '/' && !isSearchOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // Escape to close search
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    const handleSearchSelect = (category: string, itemId?: string) => {
        setActiveTab(category as TabId);
        setIsSearchOpen(false);
        
        // Scroll to specific item if needed
        if (itemId) {
            setTimeout(() => {
                const element = document.getElementById(`setting-${itemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-primary-500/50');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-primary-500/50');
                    }, 2000);
                }
            }, 300);
        }
    };

    const handleSaveProfile = async (data: Parameters<typeof saveProfile>[0]): Promise<boolean> => {
        const success = await saveProfile(data);
        if (success) {
            emitToast.success('Profilo aggiornato con successo!', { title: 'Profilo salvato' });
        } else {
            emitToast.error('Errore nel salvataggio del profilo');
        }
        return success;
    };

    const handleSavePreferences = async (data: Parameters<typeof savePreferences>[0]): Promise<boolean> => {
        const success = await savePreferences(data);
        if (success) {
            emitToast.success('Preferenze aggiornate!', { title: 'Preferenze salvate' });
            // Le preferenze hanno impatto immediato - potremmo triggerare un refresh del tema/lingua
        } else {
            emitToast.error('Errore nel salvataggio delle preferenze');
        }
        return success;
    };

    const handleChangePassword = async (data: Parameters<typeof changePassword>[0]): Promise<boolean> => {
        const success = await changePassword(data);
        if (success) {
            emitToast.success('Password aggiornata con successo!', { title: 'Sicurezza' });
        } else {
            emitToast.error('Errore nel cambio password');
        }
        return success;
    };

    const handleExportData = async (): Promise<unknown | null> => {
        const data = await exportData();
        if (data) {
            emitToast.success('Dati esportati con successo!', { title: 'Export completato' });
        } else {
            emitToast.error('Errore nell\'esportazione dei dati');
        }
        return data;
    };

    const handleDeleteAccount = async (password: string, confirmation: string): Promise<boolean> => {
        const success = await deleteAccount(password, confirmation);
        if (success) {
            emitToast.success('Account eliminato', { title: 'Account rimosso' });
        } else {
            emitToast.error('Errore nell\'eliminazione dell\'account');
        }
        return success;
    };

    const activeTabData = tabs.find(t => t.id === activeTab)!;

    // Chiudi drawer quando cambia tab su mobile
    useEffect(() => {
        if (isMobile && isDrawerOpen) {
            setIsDrawerOpen(false);
        }
    }, [activeTab, isMobile, isDrawerOpen]);

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab);
        if (isMobile) {
            setIsDrawerOpen(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 md:pb-0">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6 md:space-y-8"
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Impostazioni</h1>
                        <p className="text-white/60 text-base sm:text-lg">Gestisci il tuo account e personalizza l'esperienza</p>
                    </div>
                    
                    {/* Search Button */}
                    <motion.button
                        onClick={() => setIsSearchOpen(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white w-full sm:w-auto justify-center sm:justify-start"
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-sm font-medium">Cerca</span>
                        <div className="hidden sm:flex items-center gap-1 text-xs text-white/40">
                            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] border border-white/[0.1]">
                                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                            </kbd>
                            <span>K</span>
                        </div>
                    </motion.button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                    {/* Sidebar - Solo Desktop/Tablet (nascosta su mobile) */}
                    {!isMobile && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-3"
                        >
                            <div className="rounded-2xl md:rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-3 md:p-4 space-y-2 card sticky top-4">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    
                                    return (
                                        <motion.button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
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
                                                <p className={`text-xs mt-0.5 hidden md:block ${
                                                    isActive ? 'text-white/80' : 'text-white/50'
                                                }`}>
                                                    {tab.description}
                                                </p>
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
                        </motion.div>
                    )}

                    {/* Content Area */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className={isMobile ? 'col-span-1' : 'lg:col-span-9'}
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
                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/[0.08] gap-4">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`p-2.5 md:p-3 rounded-xl bg-gradient-to-br ${activeTabData.color} shadow-lg`}>
                                            <activeTabData.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-bold text-white">{activeTabData.label}</h2>
                                            <p className="text-white/60 text-xs md:text-sm mt-1">{activeTabData.description}</p>
                                        </div>
                                    </div>
                                    {/* Breadcrumb */}
                                    <div className="hidden md:flex items-center gap-2 text-sm text-white/40">
                                        <span>Impostazioni</span>
                                        <span>/</span>
                                        <span className="text-white/60">{activeTabData.label}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                {activeTab === 'profile' && (
                                    <ProfileSettings
                                        profile={profile}
                                        accountEmail={account?.email}
                                        onSave={handleSaveProfile}
                                        status={statuses.profileStatus}
                                    />
                                )}

                                {activeTab === 'preferences' && (
                                    <PreferencesSettings
                                        preferences={preferences}
                                        onSave={handleSavePreferences}
                                        status={statuses.preferencesStatus}
                                    />
                                )}

                                {activeTab === 'security' && (
                                    <SecuritySettings
                                        onChangePassword={handleChangePassword}
                                        status={statuses.passwordStatus}
                                    />
                                )}

                                {activeTab === 'account' && (
                                    <AccountSettings
                                        accountEmail={account?.email}
                                        onExport={handleExportData}
                                        onCheckImport={async (file) => {
                                            const result = await checkImportData(file);
                                            return result;
                                        }}
                                        onImport={async (file, force = false) => {
                                            try {
                                                const result = await importData(file, force);
                                                if (result) {
                                                    emitToast.success('Dati importati con successo!', { title: 'Import completato' });
                                                    // Ricarica le impostazioni per vedere i nuovi dati
                                                    setTimeout(() => {
                                                        window.location.reload();
                                                    }, 2000);
                                                } else {
                                                    emitToast.error('Errore nell\'importazione dei dati');
                                                }
                                                return result;
                                            } catch (error: any) {
                                                // Mostra messaggio di errore dettagliato
                                                const errorMessage = error?.message ||
                                                    error?.response?.data?.error?.message ||
                                                    'Errore nell\'importazione dei dati';
                                                emitToast.error(errorMessage, {
                                                    title: 'Errore importazione',
                                                    duration: 6000,
                                                });
                                                return null;
                                            }
                                        }}
                                        onDelete={handleDeleteAccount}
                                        status={statuses.accountStatus}
                                    />
                                )}

                                {activeTab === 'feedback' && (
                                    <FeedbackSettings />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>

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

            {/* Search Modal */}
            <SettingsSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={handleSearchSelect}
            />
        </div>
    );
};
