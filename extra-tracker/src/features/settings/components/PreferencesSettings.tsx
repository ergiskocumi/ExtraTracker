import { useState, useEffect } from 'react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';

interface PreferencesSettingsProps {
    preferences: UserPreferences;
    onSave: (data: Partial<UserPreferences>) => Promise<boolean>;
    status: FormStatus;
}

export const PreferencesSettings = ({ preferences, onSave, status }: PreferencesSettingsProps) => {
    const [formData, setFormData] = useState<UserPreferences>(preferences);

    useEffect(() => {
        setFormData(preferences);
    }, [preferences]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as never }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Lingua" name="language" value={formData.language} onChange={handleChange} options={[
                    { value: 'it', label: 'Italiano' },
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'de', label: 'Deutsch' },
                    { value: 'fr', label: 'Français' },
                ]} />

                <Select label="Tema" name="theme" value={formData.theme} onChange={handleChange} options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                    { value: 'system', label: 'System' },
                ]} />

                <Select label="Valuta" name="currency" value={formData.currency} onChange={handleChange} options={[
                    { value: 'EUR', label: 'Euro' },
                    { value: 'USD', label: 'Dollar' },
                    { value: 'GBP', label: 'Pound' },
                    { value: 'CHF', label: 'Swiss Franc' },
                ]} />

                <Select label="Formato ora" name="timeFormat" value={formData.timeFormat} onChange={handleChange} options={[
                    { value: '24h', label: '24h' },
                    { value: '12h', label: '12h' },
                ]} />
            </div>

            {status.error && <p className="text-sm text-red-400">{status.error}</p>}
            {status.success && <p className="text-sm text-green-400">Salvato</p>}

            <button
                type="submit"
                disabled={status.loading}
                className="btn-primary px-4 py-2 disabled:opacity-50"
            >
                {status.loading ? 'Salvataggio...' : 'Salva preferenze'}
            </button>
        </form>
    );
};

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    label: string;
    name: keyof UserPreferences;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
}

const Select = ({ label, name, value, onChange, options }: SelectProps) => (
    <div className="space-y-1">
        <label className="text-sm text-white/70">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);
