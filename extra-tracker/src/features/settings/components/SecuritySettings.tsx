import { useState } from 'react';
import type { FormStatus } from './types';

interface SecuritySettingsProps {
    onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<boolean>;
    status: FormStatus;
}

export const SecuritySettings = ({ onChangePassword, status }: SecuritySettingsProps) => {
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onChangePassword(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField label="Password attuale" name="currentPassword" value={formData.currentPassword} onChange={handleChange} />
            <PasswordField label="Nuova password" name="newPassword" value={formData.newPassword} onChange={handleChange} />
            <PasswordField label="Conferma nuova password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />

            {status.error && <p className="text-sm text-red-400">{status.error}</p>}
            {status.success && <p className="text-sm text-green-400">Password aggiornata</p>}

            <button
                type="submit"
                disabled={status.loading}
                className="btn-primary px-4 py-2 disabled:opacity-50"
            >
                {status.loading ? 'Aggiornamento...' : 'Aggiorna password'}
            </button>
        </form>
    );
};

interface PasswordFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PasswordField = ({ label, name, value, onChange }: PasswordFieldProps) => (
    <div className="space-y-1">
        <label className="text-sm text-white/70">{label}</label>
        <input
            type="password"
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary"
        />
    </div>
);
