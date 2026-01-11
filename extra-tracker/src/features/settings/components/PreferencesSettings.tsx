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
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsTooltip } from './SettingsTooltip';

interface PreferencesSettingsProps {
    preferences: UserPreferences;
    onSave: (data: Partial<UserPreferences>) => Promise<boolean>;
    status: FormStatus;
}


// Select Component Premium - Touch-optimized
const SelectField = ({ 
    label, 
    name, 
    value, 
    onChange, 
    options, 
    icon: Icon 
}: { 
    label: string;
    name: keyof UserPreferences;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
    icon: typeof Globe;
}) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Icon className="w-4 h-4 text-white/50" />
            {label}
        </label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full select"
            aria-label={label}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-dark-300 text-white">
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

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
        const autoSaveFields = ['language', 'theme', 'timeFormat', 'currency', 'defaultView'];
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
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-400" />
                    Localizzazione e Visualizzazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <SelectField
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
                            />
                            <SettingsTooltip
                                title="Lingua interfaccia"
                                content="La lingua selezionata verrà applicata immediatamente a tutta l'interfaccia"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <SelectField
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
                            />
                            <SettingsTooltip
                                title="Tema applicazione"
                                content="Il tema viene applicato immediatamente. 'System' segue le preferenze del tuo sistema operativo"
                            />
                        </div>
                        {/* Theme Preview */}
                        {formData.theme && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 p-3 rounded-xl border border-white/[0.1] bg-white/[0.03]"
                            >
                                <p className="text-xs font-semibold text-white/60 mb-2">Anteprima:</p>
                                <div className={`flex items-center gap-2 p-2 rounded-lg ${
                                    formData.theme === 'dark' 
                                        ? 'bg-dark-500 text-white' 
                                        : formData.theme === 'light'
                                        ? 'bg-white text-gray-900'
                                        : 'bg-gradient-to-r from-dark-500 to-white text-white'
                                }`}>
                                    <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                                    <span className="text-xs">
                                        {formData.theme === 'dark' && 'Tema scuro'}
                                        {formData.theme === 'light' && 'Tema chiaro'}
                                        {formData.theme === 'system' && 'Tema sistema'}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Formatting Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary-400" />
                    Formattazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <SelectField
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

                    <SelectField
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

            {/* Default View Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary-400" />
                    Vista Predefinita
                </h3>
                <SelectField
                    label="Pagina iniziale"
                    name="defaultView"
                    value={formData.defaultView || 'dashboard'}
                    onChange={handleChange}
                    icon={Layout}
                    options={[
                        { value: 'dashboard', label: '📊 Dashboard' },
                        { value: 'goals', label: '🎯 Obiettivi' },
                        { value: 'timeline', label: '📅 Timeline' },
                    ]}
                />
            </div>


            {/* Status Messages */}
            <AnimatePresence>
                {status.error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{status.error}</p>
                    </motion.div>
                )}
                {status.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-sm text-emerald-300">Preferenze aggiornate con successo!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-white/50">
                        {hasChanges ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-2 h-2 rounded-full bg-amber-400"
                                />
                                Modifiche non salvate
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
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
