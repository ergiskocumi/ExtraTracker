/**
 * ⚙️ PREFERENCES SETTINGS - Premium Preferences Management
 * 
 * Design premium con toggle switches e feedback immediato
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, 
    Palette, 
    DollarSign, 
    Clock, 
    Layout, 
    Bell,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';

interface PreferencesSettingsProps {
    preferences: UserPreferences;
    onSave: (data: Partial<UserPreferences>) => Promise<boolean>;
    status: FormStatus;
}

// Toggle Switch Component
const ToggleSwitch = ({ 
    enabled, 
    onChange, 
    label 
}: { 
    enabled: boolean; 
    onChange: (enabled: boolean) => void;
    label: string;
}) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <button
            type="button"
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary-500' : 'bg-white/20'
            }`}
        >
            <motion.span
                animate={{ x: enabled ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg"
            />
        </button>
    </div>
);

// Select Component Premium
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

    useEffect(() => {
        setFormData(preferences);
        setHasChanges(false);
    }, [preferences]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as never }));
        setHasChanges(true);
    };

    const handleToggle = (key: keyof UserPreferences, value: boolean) => {
        setFormData(prev => ({ ...prev, [key]: value as never }));
        setHasChanges(true);
    };

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                </div>
            </div>

            {/* Formatting Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary-400" />
                    Formattazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <p className="text-sm text-white/50">
                    {hasChanges ? 'Hai modifiche non salvate' : 'Tutto aggiornato'}
                </p>
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
