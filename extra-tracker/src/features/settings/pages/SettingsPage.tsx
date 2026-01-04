/**
 * ⚙️ SETTINGS PAGE - Premium Settings System
 * 
 * Design premium con sidebar per categorie e feedback visivo immediato
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, 
    Settings, 
    Shield, 
    Trash2
} from 'lucide-react';
import { useSettingsPage } from '../hooks/useSettings';
import { ProfileSettings } from '../components/ProfileSettings';
import { PreferencesSettings } from '../components/PreferencesSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { AccountSettings } from '../components/AccountSettings';
import { emitToast } from '../../../shared/components/toast';

type TabId = 'profile' | 'preferences' | 'security' | 'account';

interface SettingsTab {
    id: TabId;
    label: string;
    icon: typeof User;
    description: string;
    color: string;
}

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
];

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const {
        profile,
        preferences,
        account,
        statuses,
        saveProfile,
        savePreferences,
        changePassword,
        exportData,
        deleteAccount,
    } = useSettingsPage();

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

    return (
        <div className="min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
            >
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Impostazioni</h1>
                    <p className="text-white/60 text-lg">Gestisci il tuo account e personalizza l'esperienza</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar - Categorie */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-3"
                    >
                        <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-4 space-y-2 card">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                
                                return (
                                    <motion.button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        whileHover={{ x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left group ${
                                            isActive
                                                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${
                                            isActive 
                                                ? 'bg-white/20' 
                                                : 'bg-white/[0.08] group-hover:bg-white/[0.12]'
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

                    {/* Content Area */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-9"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-8 card"
                            >
                                {/* Section Header */}
                                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/[0.08]">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${activeTabData.color} shadow-lg`}>
                                        <activeTabData.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{activeTabData.label}</h2>
                                        <p className="text-white/60 text-sm mt-1">{activeTabData.description}</p>
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
                                        onDelete={handleDeleteAccount}
                                        status={statuses.accountStatus}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
