/**
 * ⚙️ SETTINGS PAGE - Premium Settings System v2.0
 * 
 * Design futuristico con:
 * - Glassmorphism avanzato
 * - Animazioni spring fluide
 * - Supporto offline
 * - Undo/Redo
 * - Avatar upload
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings,
    Shield,
    Trash2,
    Bell,
    Lock,
    Search,
    WifiOff,
    Undo2,
    Redo2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSettingsPage } from '../hooks/useSettings';
import { useConfirmModal, confirmPresets } from '../hooks/useConfirmModal';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useUndo } from '../hooks/useUndo';
import { ProfileSettings } from '../components/ProfileSettings';
import { PreferencesSettings } from '../components/PreferencesSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { AccountSettings } from '../components/AccountSettings/index';
import { NotificationsSettings } from '../components/NotificationsSettings';
import { PrivacySettings } from '../components/PrivacySettings';
import { SettingsSearch } from '../components/SettingsSearch';
import { ConfirmModal } from '../components/ConfirmModal';
import { ModernSettingsLayout, type TabId } from '../components/layout/ModernSettingsLayout';
import {
    ProfileSkeleton,
    PreferencesSkeleton,
    SecuritySkeleton,
    NotificationsSkeleton,
    PrivacySkeleton,
} from '../components/skeletons';
import { emitToast } from '../../../shared/components/toast';

// Tab configuration
const tabs = [
    { 
        id: 'profile' as TabId, 
        label: 'Profilo', 
        icon: User, 
        description: 'Informazioni personali e avatar',
        color: 'from-blue-500 to-cyan-500',
        gradient: 'from-blue-500 to-cyan-400',
    },
    { 
        id: 'preferences' as TabId, 
        label: 'Preferenze', 
        icon: Settings, 
        description: 'Lingua, tema e visualizzazione',
        color: 'from-purple-500 to-pink-500',
        gradient: 'from-purple-500 to-pink-400',
    },
    { 
        id: 'security' as TabId, 
        label: 'Sicurezza', 
        icon: Shield, 
        description: 'Password e autenticazione',
        color: 'from-emerald-500 to-teal-500',
        gradient: 'from-emerald-500 to-teal-400',
    },
    {
        id: 'notifications' as TabId,
        label: 'Notifiche',
        icon: Bell,
        description: 'Email e notifiche push',
        color: 'from-amber-500 to-orange-500',
        gradient: 'from-amber-500 to-orange-400',
    },
    {
        id: 'privacy' as TabId,
        label: 'Privacy',
        icon: Lock,
        description: 'Visibilità e dati personali',
        color: 'from-indigo-500 to-violet-500',
        gradient: 'from-indigo-500 to-violet-400',
    },
    {
        id: 'account' as TabId,
        label: 'Account',
        icon: Trash2,
        description: 'Esporta dati e elimina account',
        color: 'from-rose-500 to-red-500',
        gradient: 'from-rose-500 to-red-400',
    },
];

const skeletonComponents = {
    profile: ProfileSkeleton,
    preferences: PreferencesSkeleton,
    security: SecuritySkeleton,
    notifications: NotificationsSkeleton,
    privacy: PrivacySkeleton,
    account: ProfileSkeleton,
};

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    const {
        profile,
        preferences,
        notifications,
        account,
        statuses,
        saveProfile,
        savePreferences,
        saveNotifications,
        changePassword,
        exportData,
        checkImportData,
        importData,
        deleteAccount,
        uploadAvatar,
        deleteAvatar,
    } = useSettingsPage();

    const confirmModal = useConfirmModal();

    const offlineSync = useOfflineSync({
        storageKey: 'settings_pending_changes',
        onSync: async (changes) => {
            for (const change of changes) {
                if (change.section === 'profile') {
                    await saveProfile(change.data);
                } else if (change.section === 'preferences') {
                    await savePreferences(change.data);
                } else if (change.section === 'notifications') {
                    await saveNotifications(change.data);
                }
            }
            return true;
        },
    });

    const undoState = useUndo({
        past: [] as { tab: TabId; data: unknown }[],
        present: { tab: 'profile' as TabId, data: null },
        future: [],
    });

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab && tabs.some((item) => item.id === tab)) {
            setActiveTab(tab as TabId);
        }
    }, [location.search]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === '/' && !isSearchOpen && !(e.target instanceof HTMLInputElement)) {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoState.undo();
            }
            if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
                ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                undoState.redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, undoState]);

    const handleChangePassword = async (data: Parameters<typeof changePassword>[0]): Promise<boolean> => {
        return new Promise((resolve) => {
            confirmModal.openConfirm(
                confirmPresets.changePassword(),
                async () => {
                    const success = await changePassword(data);
                    if (success) emitToast.success('Password aggiornata!', { title: 'Sicurezza' });
                    else emitToast.error('Errore nel cambio password');
                    resolve(success);
                },
                () => resolve(false)
            );
        });
    };

    const handleDeleteAccount = async (password: string, confirmation: string): Promise<boolean> => {
        return new Promise((resolve) => {
            confirmModal.openConfirm(
                confirmPresets.deleteAccount(confirmation),
                async () => {
                    const success = await deleteAccount(password, confirmation);
                    if (success) emitToast.success('Account eliminato', { title: 'Account rimosso' });
                    else emitToast.error('Errore nell\'eliminazione');
                    resolve(success);
                },
                () => resolve(false)
            );
        });
    };

    const handleSaveProfile = async (data: Partial<typeof profile>): Promise<boolean> => {
        if (!offlineSync.isOnline) {
            offlineSync.saveChange(data, 'profile');
            return true;
        }
        const success = await saveProfile(data);
        if (success) emitToast.success('Profilo aggiornato!', { title: 'Profilo salvato' });
        return success;
    };

    const handleSavePreferences = async (data: Partial<typeof preferences>): Promise<boolean> => {
        if (!offlineSync.isOnline) {
            offlineSync.saveChange(data, 'preferences');
            return true;
        }
        const success = await savePreferences(data);
        if (success) emitToast.success('Preferenze aggiornate!', { title: 'Preferenze salvate' });
        return success;
    };

    const handleSaveNotifications = async (data: Partial<typeof notifications>): Promise<boolean> => {
        if (!offlineSync.isOnline) {
            offlineSync.saveChange(data, 'notifications');
            return true;
        }
        const success = await saveNotifications(data);
        if (success) emitToast.success('Notifiche aggiornate!', { title: 'Impostazioni salvate' });
        return success;
    };

    const handleAvatarUpload = async (file: File): Promise<string | null> => {
        return await uploadAvatar(file);
    };

    const handleAvatarDelete = async (): Promise<boolean> => {
        return await deleteAvatar();
    };

    const handleSearchSelect = (category: string, itemId?: string) => {
        setActiveTab(category as TabId);
        setIsSearchOpen(false);
        if (itemId) {
            setTimeout(() => {
                const element = document.getElementById(`setting-${itemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-primary-500/50');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-primary-500/50'), 2000);
                }
            }, 300);
        }
    };

    const SkeletonComponent = skeletonComponents[activeTab];

    return (
        <>
            <ModernSettingsLayout
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOnline={offlineSync.isOnline}
                pendingCount={offlineSync.pendingCount}
                onSync={offlineSync.syncNow}
                header={
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="settings-page-title text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent"
                            >
                                Impostazioni
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-white/50 mt-2 text-lg"
                            >
                                Personalizza la tua esperienza
                            </motion.p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Undo/Redo – stile Apple, adatta a light/dark (come la barra di ricerca) */}
                            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-full border backdrop-blur-sm transition-[background-color,border-color] duration-200 bg-[var(--bg-input)] hover:bg-[var(--bg-surface-hover)] border-[var(--border-subtle)] hover:border-[var(--border-default)] shadow-[var(--shadow-sm)]">
                                <motion.button
                                    type="button"
                                    onClick={undoState.undo}
                                    disabled={!undoState.canUndo}
                                    whileHover={{ scale: undoState.canUndo ? 1.08 : 1 }}
                                    whileTap={{ scale: undoState.canUndo ? 0.95 : 1 }}
                                    className="p-2.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-inset"
                                    title="Annulla (Ctrl+Z)"
                                    aria-label="Annulla (Ctrl+Z)"
                                >
                                    <Undo2 className="w-4 h-4" />
                                </motion.button>
                                <div className="w-px h-4 bg-[var(--border-subtle)]" aria-hidden />
                                <motion.button
                                    type="button"
                                    onClick={undoState.redo}
                                    disabled={!undoState.canRedo}
                                    whileHover={{ scale: undoState.canRedo ? 1.08 : 1 }}
                                    whileTap={{ scale: undoState.canRedo ? 0.95 : 1 }}
                                    className="p-2.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-inset"
                                    title="Ripristina (Ctrl+Shift+Z)"
                                    aria-label="Ripristina (Ctrl+Shift+Z)"
                                >
                                    <Redo2 className="w-4 h-4" />
                                </motion.button>
                            </div>

                            {/* Search bar – stile Apple, adatta a light/dark */}
                            <motion.button
                                type="button"
                                onClick={() => setIsSearchOpen(true)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="flex items-center gap-3 min-w-[220px] sm:min-w-[280px] pl-4 pr-3 py-2.5 rounded-full border backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 bg-[var(--bg-input)] hover:bg-[var(--bg-surface-hover)] border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] shadow-[var(--shadow-sm)]"
                                aria-label="Cerca nelle impostazioni (Ctrl+K)"
                            >
                                <Search className="w-4 h-4 flex-shrink-0 opacity-70" />
                                <span className="flex-1 text-left text-sm font-medium truncate">Cerca nelle impostazioni</span>
                                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0 bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                    {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
                                </kbd>
                            </motion.button>
                        </div>
                    </div>
                }
            >
                {isLoading ? (
                    <SkeletonComponent />
                ) : (
                    <>
                        {activeTab === 'profile' && (
                            <ProfileSettings
                                profile={profile}
                                accountEmail={account?.email}
                                onSave={handleSaveProfile}
                                status={statuses.profileStatus}
                                onAvatarUpload={handleAvatarUpload}
                                onAvatarDelete={handleAvatarDelete}
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
                        {activeTab === 'notifications' && (
                            <NotificationsSettings
                                notifications={notifications}
                                onSave={handleSaveNotifications}
                                status={statuses.preferencesStatus}
                            />
                        )}
                        {activeTab === 'privacy' && (
                            <PrivacySettings
                                onSave={async (data) => {
                                    emitToast.success('Privacy aggiornata!');
                                    return true;
                                }}
                                status={statuses.preferencesStatus}
                            />
                        )}
                        {activeTab === 'account' && (
                            <AccountSettings
                                accountEmail={account?.email}
                                onExport={exportData}
                                onCheckImport={checkImportData}
                                onImport={async (file, force = false) => {
                                    if (!force) {
                                        return new Promise((resolve) => {
                                            confirmModal.openConfirm(
                                                confirmPresets.importData(),
                                                async () => {
                                                    const result = await importData(file, false);
                                                    resolve(result);
                                                },
                                                () => resolve(null)
                                            );
                                        });
                                    }
                                    return await importData(file, true);
                                }}
                                onDelete={handleDeleteAccount}
                                status={statuses.accountStatus}
                            />
                        )}
                    </>
                )}
            </ModernSettingsLayout>

            {/* Search Modal – AnimatePresence per uscita fluida */}
            <AnimatePresence mode="wait">
                {isSearchOpen && (
                    <SettingsSearch
                        key="settings-search-modal"
                        isOpen={isSearchOpen}
                        onClose={() => setIsSearchOpen(false)}
                        onSelect={handleSearchSelect}
                    />
                )}
            </AnimatePresence>

            {/* Confirm Modal */}
            {confirmModal.isOpen && confirmModal.config && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.config.title}
                    message={confirmModal.config.message}
                    type={confirmModal.config.type}
                    confirmLabel={confirmModal.config.confirmLabel}
                    cancelLabel={confirmModal.config.cancelLabel}
                    requireTextInput={confirmModal.config.requireTextInput}
                    onConfirm={confirmModal.confirm}
                    onCancel={confirmModal.cancel}
                />
            )}
        </>
    );
};
