import { useEffect, useState } from 'react';
import type { UserProfile } from '../services/settingsService';
import type { FormStatus } from './types';

interface ProfileSettingsProps {
    profile: UserProfile;
    accountEmail?: string;
    onSave: (data: Partial<UserProfile>) => Promise<boolean>;
    status: FormStatus;
}

export const ProfileSettings = ({ profile, accountEmail, onSave, status }: ProfileSettingsProps) => {
    const [formData, setFormData] = useState<UserProfile>(profile);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome" name="firstName" value={formData.firstName || ''} onChange={handleChange} />
                <Input label="Cognome" name="lastName" value={formData.lastName || ''} onChange={handleChange} />
                <Input label="Nome visualizzato" name="displayName" value={formData.displayName || ''} onChange={handleChange} />
                <Input label="Telefono" name="phone" value={formData.phone || ''} onChange={handleChange} />
                <Input label="Azienda" name="company" value={formData.company || ''} onChange={handleChange} />
                <Input label="Ruolo" name="jobTitle" value={formData.jobTitle || ''} onChange={handleChange} />
                <Input label="Località" name="location" value={formData.location || ''} onChange={handleChange} />
                <Input label="Sito web" name="website" value={formData.website || ''} onChange={handleChange} />
            </div>

            <div>
                <label className="block text-white/70 text-sm mb-2">Bio</label>
                <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Raccontaci qualcosa di te"
                />
            </div>

            {accountEmail && (
                <p className="text-xs text-white/60">Email account: {accountEmail}</p>
            )}

            {status.error && <p className="text-sm text-red-400">{status.error}</p>}
            {status.success && <p className="text-sm text-green-400">Salvato</p>}

            <button
                type="submit"
                disabled={status.loading}
                className="btn-primary px-4 py-2 disabled:opacity-50"
            >
                {status.loading ? 'Salvataggio...' : 'Salva profilo'}
            </button>
        </form>
    );
};

interface InputProps {
    label: string;
    name: keyof UserProfile;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({ label, name, value, onChange }: InputProps) => (
    <div className="space-y-1">
        <label className="text-sm text-white/70">{label}</label>
        <input
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary"
        />
    </div>
);
