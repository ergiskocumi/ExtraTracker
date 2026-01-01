import { useState } from 'react';
import type { FormStatus } from './types';

interface AccountSettingsProps {
    accountEmail?: string;
    onExport: () => Promise<unknown | null>;
    onDelete: (password: string, confirmation: string) => Promise<boolean>;
    status: FormStatus;
}

export const AccountSettings = ({ accountEmail, onExport, onDelete, status }: AccountSettingsProps) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('DELETE');

    const handleExport = async () => {
        await onExport();
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        await onDelete(password, confirmation);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-semibold">Esporta dati</p>
                        <p className="text-xs text-white/60">Scarica una copia dei tuoi dati</p>
                    </div>
                    <button onClick={handleExport} disabled={status.loading} className="btn-secondary px-4 py-2 disabled:opacity-50">Export</button>
                </div>
            </div>

            <form onSubmit={handleDelete} className="rounded-xl border border-red-500/30 p-4 space-y-3 bg-red-500/5">
                <div>
                    <p className="text-white font-semibold">Elimina account</p>
                    <p className="text-xs text-white/60">Questa azione è irreversibile. Digita DELETE per confermare.</p>
                    {accountEmail && <p className="text-xs text-white/50">Account: {accountEmail}</p>}
                </div>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                />
                <input
                    type="text"
                    placeholder="Scrivi DELETE"
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                />
                {status.error && <p className="text-sm text-red-300">{status.error}</p>}
                {status.success && <p className="text-sm text-green-400">Operazione completata</p>}
                <button type="submit" disabled={status.loading || confirmation !== 'DELETE'} className="btn-danger px-4 py-2 disabled:opacity-50">
                    {status.loading ? 'Eliminazione...' : 'Elimina account'}
                </button>
            </form>
        </div>
    );
};
