/**
 * ⚙️ SETTINGS PAGE - Pagina Impostazioni Completa
 * 
 * Sezioni:
 * 1. Profilo Utente - Dati personali
 * 2. Preferenze - Lingua, valuta, tema, ecc.
 * 3. Notifiche - Email e push
 * 4. Clienti/Progetti - Gestione progetti
 * 5. Sicurezza - Cambio password
 * 6. Privacy - Export e eliminazione dati
 */

import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { ProjectForm } from '../features/projects/ProjectForm';
import { authService } from '../services/authService';
import type { UserProfile, UserPreferences, UserNotifications } from '../services/settingsService';

// Icone locali
import { 
    UserIcon, 
    SettingsIcon, 
    BellIcon, 
    ShieldIcon,
    BriefcaseIcon,
    TrashIcon,
    DownloadIcon,
    CheckIcon,
    WarningIcon,
} from '../components/icons';

type TabId = 'profile' | 'preferences' | 'notifications' | 'projects' | 'security' | 'privacy';

interface IconProps {
    className?: string;
    size?: number;
}

interface Tab {
    id: TabId;
    name: string;
    icon: React.ComponentType<IconProps>;
}

const tabs: Tab[] = [
    { id: 'profile', name: 'Profilo', icon: UserIcon },
    { id: 'preferences', name: 'Preferenze', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifiche', icon: BellIcon },
    { id: 'projects', name: 'Clienti', icon: BriefcaseIcon },
    { id: 'security', name: 'Sicurezza', icon: ShieldIcon },
    { id: 'privacy', name: 'Privacy', icon: TrashIcon },
];

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<TabId>('profile');

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-1">Impostazioni</h2>
                <p className="text-white/50">Gestisci il tuo profilo, preferenze e account</p>
            </div>

            <div className="divider" />

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className={activeTab === tab.id ? 'text-white' : ''} size={20} />
                        <span className="hidden sm:inline">{tab.name}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="glass-card p-6 rounded-2xl">
                {activeTab === 'profile' && <ProfileSection />}
                {activeTab === 'preferences' && <PreferencesSection />}
                {activeTab === 'notifications' && <NotificationsSection />}
                {activeTab === 'projects' && <ProjectsSection />}
                {activeTab === 'security' && <SecuritySection />}
                {activeTab === 'privacy' && <PrivacySection />}
            </div>
        </div>
    );
};

// ==========================================
// SEZIONE PROFILO
// ==========================================

const ProfileSection = () => {
    const { profile, account, updateProfile, isLoading, error } = useSettings();
    const [formData, setFormData] = useState<UserProfile>({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await updateProfile(formData);
        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white">
                    {formData.firstName?.[0] || formData.displayName?.[0] || account?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white">
                        {formData.displayName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Il tuo profilo'}
                    </h3>
                    <p className="text-white/50">{account?.email}</p>
                    {account?.isEmailVerified ? (
                        <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <CheckIcon size={12} /> Email verificata
                        </span>
                    ) : (
                        <span className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                            <WarningIcon size={12} /> Email non verificata
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="Nome"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleChange}
                    placeholder="Mario"
                />
                <InputField
                    label="Cognome"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleChange}
                    placeholder="Rossi"
                />
                <InputField
                    label="Nome visualizzato"
                    name="displayName"
                    value={formData.displayName || ''}
                    onChange={handleChange}
                    placeholder="Come vuoi essere chiamato"
                />
                <InputField
                    label="Telefono"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    placeholder="+39 123 456 7890"
                />
                <InputField
                    label="Azienda"
                    name="company"
                    value={formData.company || ''}
                    onChange={handleChange}
                    placeholder="Nome azienda"
                />
                <InputField
                    label="Ruolo"
                    name="jobTitle"
                    value={formData.jobTitle || ''}
                    onChange={handleChange}
                    placeholder="Sviluppatore, Designer, ecc."
                />
                <InputField
                    label="Località"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleChange}
                    placeholder="Milano, Italia"
                />
                <InputField
                    label="Sito web"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleChange}
                    placeholder="https://tuosito.com"
                />
            </div>

            <div>
                <label className="block text-white/70 text-sm mb-2">Bio</label>
                <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    placeholder="Raccontaci qualcosa di te..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors resize-none"
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                    {error}
                </div>
            )}

            <div className="flex items-center gap-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                    {isLoading ? 'Salvataggio...' : 'Salva profilo'}
                </button>
                {saved && (
                    <span className="text-green-400 flex items-center gap-2 animate-fade-in">
                        <CheckIcon size={20} /> Salvato!
                    </span>
                )}
            </div>
        </form>
    );
};

// ==========================================
// SEZIONE PREFERENZE
// ==========================================

const PreferencesSection = () => {
    const { preferences, updatePreferences, isLoading } = useSettings();
    const [formData, setFormData] = useState<UserPreferences>(preferences);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(preferences);
    }, [preferences]);

    const handleChange = (name: keyof UserPreferences, value: unknown) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await updatePreferences(formData);
        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Preferenze Generali */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">🌍 Generali</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                        label="Lingua"
                        value={formData.language}
                        onChange={(v) => handleChange('language', v)}
                        options={[
                            { value: 'it', label: '🇮🇹 Italiano' },
                            { value: 'en', label: '🇬🇧 English' },
                            { value: 'es', label: '🇪🇸 Español' },
                            { value: 'de', label: '🇩🇪 Deutsch' },
                            { value: 'fr', label: '🇫🇷 Français' },
                        ]}
                    />
                    <SelectField
                        label="Fuso orario"
                        value={formData.timezone}
                        onChange={(v) => handleChange('timezone', v)}
                        options={[
                            { value: 'Europe/Rome', label: 'Roma (GMT+1)' },
                            { value: 'Europe/London', label: 'Londra (GMT)' },
                            { value: 'Europe/Paris', label: 'Parigi (GMT+1)' },
                            { value: 'Europe/Berlin', label: 'Berlino (GMT+1)' },
                            { value: 'America/New_York', label: 'New York (GMT-5)' },
                            { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
                        ]}
                    />
                    <SelectField
                        label="Formato data"
                        value={formData.dateFormat}
                        onChange={(v) => handleChange('dateFormat', v)}
                        options={[
                            { value: 'DD/MM/YYYY', label: 'GG/MM/AAAA (29/12/2025)' },
                            { value: 'MM/DD/YYYY', label: 'MM/GG/AAAA (12/29/2025)' },
                            { value: 'YYYY-MM-DD', label: 'AAAA-MM-GG (2025-12-29)' },
                        ]}
                    />
                    <SelectField
                        label="Formato ora"
                        value={formData.timeFormat}
                        onChange={(v) => handleChange('timeFormat', v)}
                        options={[
                            { value: '24h', label: '24 ore (14:30)' },
                            { value: '12h', label: '12 ore (2:30 PM)' },
                        ]}
                    />
                </div>
            </div>

            {/* Preferenze Valuta */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">💰 Valuta e Tariffe</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                        label="Valuta predefinita"
                        value={formData.currency}
                        onChange={(v) => handleChange('currency', v)}
                        options={[
                            { value: 'EUR', label: '€ Euro (EUR)' },
                            { value: 'USD', label: '$ Dollaro (USD)' },
                            { value: 'GBP', label: '£ Sterlina (GBP)' },
                            { value: 'CHF', label: 'CHF Franco Svizzero' },
                        ]}
                    />
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Tariffa oraria predefinita</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.defaultHourlyRate}
                                onChange={(e) => handleChange('defaultHourlyRate', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
                                {formData.currency}/h
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferenze Tema */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">🎨 Aspetto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                        label="Tema"
                        value={formData.theme}
                        onChange={(v) => handleChange('theme', v)}
                        options={[
                            { value: 'dark', label: '🌙 Scuro' },
                            { value: 'light', label: '☀️ Chiaro' },
                            { value: 'system', label: '💻 Sistema' },
                        ]}
                    />
                    <SelectField
                        label="Layout dashboard"
                        value={formData.dashboardLayout}
                        onChange={(v) => handleChange('dashboardLayout', v)}
                        options={[
                            { value: 'default', label: 'Standard' },
                            { value: 'compact', label: 'Compatto' },
                            { value: 'expanded', label: 'Espanso' },
                        ]}
                    />
                </div>
                <div className="mt-4">
                    <ToggleField
                        label="Mostra messaggi motivazionali"
                        description="Visualizza citazioni e suggerimenti nella dashboard"
                        checked={formData.showMotivationalMessages}
                        onChange={(v) => handleChange('showMotivationalMessages', v)}
                    />
                </div>
            </div>

            {/* Preferenze Lavoro */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">⏰ Lavoro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField
                        label="La settimana inizia di"
                        value={formData.weekStartsOn.toString()}
                        onChange={(v) => handleChange('weekStartsOn', parseInt(v))}
                        options={[
                            { value: '1', label: 'Lunedì' },
                            { value: '0', label: 'Domenica' },
                        ]}
                    />
                    <SelectField
                        label="Pagina iniziale"
                        value={formData.defaultView}
                        onChange={(v) => handleChange('defaultView', v)}
                        options={[
                            { value: 'dashboard', label: 'Dashboard' },
                            { value: 'timeline', label: 'Timeline' },
                            { value: 'goals', label: 'Obiettivi' },
                        ]}
                    />
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Obiettivo ore giornaliere</label>
                        <input
                            type="number"
                            value={formData.dailyGoalHours}
                            onChange={(e) => handleChange('dailyGoalHours', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="24"
                            step="0.5"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-sm mb-2">Obiettivo ore settimanali</label>
                        <input
                            type="number"
                            value={formData.weeklyGoalHours}
                            onChange={(e) => handleChange('weeklyGoalHours', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="168"
                            step="0.5"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                    {isLoading ? 'Salvataggio...' : 'Salva preferenze'}
                </button>
                {saved && (
                    <span className="text-green-400 flex items-center gap-2 animate-fade-in">
                        <CheckIcon size={20} /> Salvato!
                    </span>
                )}
            </div>
        </form>
    );
};

// ==========================================
// SEZIONE NOTIFICHE
// ==========================================

const NotificationsSection = () => {
    const { notifications, updateNotifications, isLoading } = useSettings();
    const [formData, setFormData] = useState<UserNotifications>(notifications);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(notifications);
    }, [notifications]);

    const handleEmailChange = (key: keyof typeof formData.email, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            email: { ...prev.email, [key]: value }
        }));
        setSaved(false);
    };

    const handlePushChange = (key: keyof typeof formData.push, value: boolean | string) => {
        setFormData(prev => ({
            ...prev,
            push: { ...prev.push, [key]: value }
        }));
        setSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await updateNotifications(formData);
        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">📧 Notifiche Email</h3>
                <div className="space-y-4">
                    <ToggleField
                        label="Abilita notifiche email"
                        description="Ricevi aggiornamenti via email"
                        checked={formData.email.enabled}
                        onChange={(v) => handleEmailChange('enabled', v)}
                    />
                    {formData.email.enabled && (
                        <div className="ml-6 space-y-4 border-l-2 border-white/10 pl-4">
                            <ToggleField
                                label="Report settimanale"
                                description="Ricevi un riepilogo delle tue attività ogni settimana"
                                checked={formData.email.weeklyReport}
                                onChange={(v) => handleEmailChange('weeklyReport', v)}
                            />
                            <ToggleField
                                label="Promemoria obiettivi"
                                description="Ricevi promemoria sui tuoi obiettivi in scadenza"
                                checked={formData.email.goalReminders}
                                onChange={(v) => handleEmailChange('goalReminders', v)}
                            />
                            <ToggleField
                                label="Aggiornamenti progetti"
                                description="Notifiche sui progetti e clienti"
                                checked={formData.email.projectUpdates}
                                onChange={(v) => handleEmailChange('projectUpdates', v)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Push */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">🔔 Notifiche Push</h3>
                <div className="space-y-4">
                    <ToggleField
                        label="Abilita notifiche push"
                        description="Ricevi notifiche sul browser"
                        checked={formData.push.enabled}
                        onChange={(v) => handlePushChange('enabled', v)}
                    />
                    {formData.push.enabled && (
                        <div className="ml-6 space-y-4 border-l-2 border-white/10 pl-4">
                            <ToggleField
                                label="Promemoria giornaliero"
                                description="Ricevi un promemoria per registrare le tue ore"
                                checked={formData.push.dailyReminder}
                                onChange={(v) => handlePushChange('dailyReminder', v)}
                            />
                            {formData.push.dailyReminder && (
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Orario promemoria</label>
                                    <input
                                        type="time"
                                        value={formData.push.reminderTime}
                                        onChange={(e) => handlePushChange('reminderTime', e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                    {isLoading ? 'Salvataggio...' : 'Salva notifiche'}
                </button>
                {saved && (
                    <span className="text-green-400 flex items-center gap-2 animate-fade-in">
                        <CheckIcon size={20} /> Salvato!
                    </span>
                )}
            </div>
        </form>
    );
};

// ==========================================
// SEZIONE PROGETTI/CLIENTI
// ==========================================

const ProjectsSection = () => {
    const { projects, addProject } = useProjects();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">👥 Gestione Clienti</h3>
                <p className="text-white/50 text-sm mb-6">
                    Aggiungi e gestisci i tuoi clienti con le rispettive tariffe orarie
                </p>
            </div>
            <ProjectForm projects={projects} onAdd={addProject} />
        </div>
    );
};

// ==========================================
// SEZIONE SICUREZZA
// ==========================================

const SecuritySection = () => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Le password non coincidono' });
            return;
        }

        if (formData.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'La password deve essere di almeno 8 caratteri' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const response = await authService.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword,
            });

            if (response.success) {
                setMessage({ type: 'success', text: 'Password aggiornata. Verrai disconnesso...' });
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                // Il backend forza il logout
            } else {
                setMessage({ type: 'error', text: response.error?.message || 'Errore nel cambio password' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Errore nel cambio password' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">🔐 Cambia Password</h3>
                <p className="text-white/50 text-sm mb-6">
                    Assicurati che la tua password sia sicura e unica
                </p>
            </div>

            <InputField
                label="Password attuale"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
            />

            <InputField
                label="Nuova password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
            />

            <InputField
                label="Conferma nuova password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
            />

            {message && (
                <div className={`p-4 rounded-xl ${
                    message.type === 'success' 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="btn-primary px-6 py-3 disabled:opacity-50"
            >
                {isLoading ? 'Aggiornamento...' : 'Aggiorna password'}
            </button>
        </form>
    );
};

// ==========================================
// SEZIONE PRIVACY (GDPR)
// ==========================================

const PrivacySection = () => {
    const { exportData, deleteAccount } = useSettings();
    const { logout } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteForm, setDeleteForm] = useState({ password: '', confirmation: '' });
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setMessage(null);

        try {
            const data = await exportData();
            if (data) {
                // Download come JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `extra-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setMessage({ type: 'success', text: 'Dati esportati con successo!' });
            } else {
                setMessage({ type: 'error', text: 'Errore nell\'export dei dati' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Errore nell\'export dei dati' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleDelete = async () => {
        if (deleteForm.confirmation !== 'ELIMINA IL MIO ACCOUNT') {
            setMessage({ type: 'error', text: 'Scrivi "ELIMINA IL MIO ACCOUNT" per confermare' });
            return;
        }

        setIsDeleting(true);
        setMessage(null);

        try {
            const success = await deleteAccount(deleteForm.password, deleteForm.confirmation);
            if (success) {
                await logout();
            } else {
                setMessage({ type: 'error', text: 'Errore nell\'eliminazione dell\'account' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Errore nell\'eliminazione dell\'account' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Export */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">📥 Esporta i tuoi dati</h3>
                <p className="text-white/50 text-sm mb-4">
                    Scarica una copia di tutti i tuoi dati in formato JSON (GDPR Art. 20)
                </p>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors disabled:opacity-50"
                >
                    <DownloadIcon size={20} />
                    {isExporting ? 'Esportazione...' : 'Esporta dati'}
                </button>
            </div>

            <div className="divider" />

            {/* Delete */}
            <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ Elimina account</h3>
                <p className="text-white/50 text-sm mb-4">
                    Elimina permanentemente il tuo account e tutti i dati associati.
                    Questa azione è irreversibile (GDPR Art. 17).
                </p>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 transition-colors"
                >
                    <TrashIcon size={20} />
                    Elimina account
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${
                    message.type === 'success' 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-base-200 rounded-2xl p-6 max-w-md w-full animate-scale-in">
                        <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Conferma eliminazione</h3>
                        <p className="text-white/70 mb-6">
                            Stai per eliminare permanentemente il tuo account e tutti i tuoi dati. 
                            Questa azione non può essere annullata.
                        </p>
                        
                        <div className="space-y-4">
                            <InputField
                                label="Password"
                                type="password"
                                name="password"
                                value={deleteForm.password}
                                onChange={(e) => setDeleteForm(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Inserisci la tua password"
                            />
                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    Scrivi <strong className="text-red-400">ELIMINA IL MIO ACCOUNT</strong> per confermare
                                </label>
                                <input
                                    type="text"
                                    value={deleteForm.confirmation}
                                    onChange={(e) => setDeleteForm(prev => ({ ...prev, confirmation: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteForm({ password: '', confirmation: '' });
                                }}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting || deleteForm.confirmation !== 'ELIMINA IL MIO ACCOUNT'}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Eliminazione...' : 'Elimina'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// COMPONENTI UI RIUTILIZZABILI
// ==========================================

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}

const InputField = ({ label, name, value, onChange, type = 'text', placeholder, required }: InputFieldProps) => (
    <div>
        <label className="block text-white/70 text-sm mb-2">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
        />
    </div>
);

interface SelectOption {
    value: string;
    label: string;
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
}

const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => (
    <div>
        <label className="block text-white/70 text-sm mb-2">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-base-300 text-white">
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

interface ToggleFieldProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleField = ({ label, description, checked, onChange }: ToggleFieldProps) => (
    <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative mt-0.5">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </div>
        <div>
            <span className="text-white group-hover:text-primary transition-colors">{label}</span>
            {description && <p className="text-white/50 text-sm mt-0.5">{description}</p>}
        </div>
    </label>
);
