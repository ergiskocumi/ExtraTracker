/**
 * ⚙️ PREFERENCES SETTINGS - Premium Preferences Management
 * 
 * Design premium con toggle switches e feedback immediato
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, 
    Palette, 
    DollarSign, 
    Clock, 
    Layout, 
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsSelect } from './fields';
import { SettingsError, SettingsSuccess } from './feedback';

interface PreferencesSettingsProps {
    preferences: UserPreferences;
    onSave: (data: Partial<UserPreferences>) => Promise<boolean>;
    status: FormStatus;
}


export const PreferencesSettings = ({ preferences, onSave, status }: PreferencesSettingsProps) => {
    const [formData, setFormData] = useState<UserPreferences>(preferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setFormData(preferences);
        setHasChanges(false);
    }, [preferences]);

    // Auto-save per preferenze non critiche
    const autoSave = useCallback(async () => {
        if (hasChanges && !status.loading) {
            await onSave(formData);
            setHasChanges(false);
        }
    }, [formData, hasChanges, onSave, status.loading]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as never }));
        setHasChanges(true);

        // Auto-save dopo 2 secondi di inattività per preferenze non critiche
        const autoSaveFields = ['language', 'theme', 'timeFormat', 'currency'];
        if (autoSaveFields.includes(name)) {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer);
            }
            const timer = setTimeout(() => {
                autoSave();
            }, 2000);
            setAutoSaveTimer(timer);
        }
    };

    useEffect(() => {
        return () => {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer);
            }
        };
    }, [autoSaveTimer]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(formData);
        if (success) {
            setHasChanges(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Language & Theme Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Globe className="w-5 h-5" style={{ color: 'var(--primary-500)' }} />
                    Localizzazione e Visualizzazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <SettingsSelect
                        label="Lingua"
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        icon={Globe}
                        options={[
                            { value: 'it', label: '🇮🇹 Italiano' },
                            { value: 'en', label: '🇬🇧 English' },
                            { value: 'es', label: '🇪🇸 Español' },
                            { value: 'de', label: '🇩🇪 Deutsch' },
                            { value: 'fr', label: '🇫🇷 Français' },
                        ]}
                        tooltipTitle="Lingua interfaccia"
                        tooltipContent="La lingua selezionata verrà applicata immediatamente a tutta l'interfaccia"
                    />

                    <SettingsSelect
                        label="Tema"
                        name="theme"
                        value={formData.theme}
                        onChange={handleChange}
                        icon={Palette}
                        options={[
                            { value: 'dark', label: '🌙 Dark' },
                            { value: 'light', label: '☀️ Light' },
                            { value: 'system', label: '💻 System' },
                        ]}
                        tooltipTitle="Tema applicazione"
                        tooltipContent="Il tema viene applicato immediatamente. 'System' segue le preferenze del tuo sistema operativo"
                    />
                        {/* Theme Preview */}
                        {formData.theme && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 p-3 rounded-xl border bg-theme-surface"
                                style={{ borderColor: 'var(--border-default)' }}
                            >
                                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Anteprima:</p>
                                <div 
                                    className="flex items-center gap-2 p-2 rounded-lg transition-all duration-300"
                                    style={{
                                        background: formData.theme === 'dark' 
                                            ? 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)'
                                            : formData.theme === 'light'
                                            ? 'linear-gradient(135deg, #f8f7f5 0%, #ffffff 100%)'
                                            : 'linear-gradient(135deg, #0a0a1a 0%, #f8f7f5 100%)',
                                        color: formData.theme === 'dark' 
                                            ? '#ffffff'
                                            : formData.theme === 'light'
                                            ? '#1a1a2e'
                                            : '#ffffff',
                                        border: '1px solid var(--border-default)'
                                    }}
                                >
                                    <div 
                                        className="w-2 h-2 rounded-full opacity-60"
                                        style={{
                                            background: formData.theme === 'dark' 
                                                ? '#8b5cf6'
                                                : formData.theme === 'light'
                                                ? '#7c3aed'
                                                : '#8b5cf6'
                                        }}
                                    />
                                    <span className="text-xs font-medium">
                                        {formData.theme === 'dark' && 'Tema scuro'}
                                        {formData.theme === 'light' && 'Tema chiaro'}
                                        {formData.theme === 'system' && 'Tema sistema'}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                </div>
            </div>

            {/* Formatting Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Layout className="w-5 h-5" style={{ color: 'var(--primary-500)' }} />
                    Formattazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <SettingsSelect
                        label="Valuta"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        icon={DollarSign}
                        options={[
                            { value: 'EUR', label: '€ Euro (EUR)' },
                            { value: 'USD', label: '$ Dollar (USD)' },
                            { value: 'GBP', label: '£ Pound (GBP)' },
                            { value: 'CHF', label: 'CHF Swiss Franc' },
                        ]}
                    />

                    <SettingsSelect
                        label="Formato ora"
                        name="timeFormat"
                        value={formData.timeFormat}
                        onChange={handleChange}
                        icon={Clock}
                        options={[
                            { value: '24h', label: '24 ore (14:30)' },
                            { value: '12h', label: '12 ore (2:30 PM)' },
                        ]}
                    />
                </div>
            </div>


            {/* Status Messages */}
            <AnimatePresence>
                {status.error && (
                    <SettingsError
                        message={status.error}
                        title="Errore nel salvataggio"
                    />
                )}
                {status.success && (
                    <SettingsSuccess
                        message="Preferenze aggiornate con successo!"
                        title="Preferenze salvate"
                    />
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {hasChanges ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: 'var(--warning)' }}
                                />
                                Modifiche non salvate
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                Tutto aggiornato
                            </span>
                        )}
                    </p>
                    {hasChanges && (
                        <motion.button
                            type="button"
                            onClick={() => {
                                setFormData(preferences);
                                setHasChanges(false);
                                if (autoSaveTimer) {
                                    clearTimeout(autoSaveTimer);
                                }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </motion.button>
                    )}
                </div>
                <motion.button
                    type="submit"
                    disabled={status.loading || !hasChanges}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${
                        !hasChanges ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {status.loading ? (
                        <span className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Salvataggio...
                        </span>
                    ) : (
                        'Salva preferenze'
                    )}
                </motion.button>
            </div>
        </form>
    );
};
