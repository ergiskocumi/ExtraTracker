/**
 * 🗑️ ACCOUNT SETTINGS - Premium Account Management
 * 
 * Design premium con warning visivi chiari per azioni distruttive
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Database, 
    Download, 
    Trash2, 
    AlertTriangle, 
    Mail,
    CheckCircle2,
    AlertCircle,
    Shield
} from 'lucide-react';
import type { FormStatus } from './types';
import { SettingsInput, SettingsPasswordInput } from './fields';

interface AccountSettingsProps {
    accountEmail?: string;
    onExport: () => Promise<unknown | null>;
    onDelete: (password: string, confirmation: string) => Promise<boolean>;
    status: FormStatus;
}

export const AccountSettings = ({ accountEmail, onExport, onDelete, status }: AccountSettingsProps) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteErrors, setDeleteErrors] = useState<{ password?: string; confirmation?: string }>({});

    const handleExport = async () => {
        await onExport();
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const errors: { password?: string; confirmation?: string } = {};
        if (!password) {
            errors.password = 'Password richiesta';
        }
        if (confirmation !== 'DELETE') {
            errors.confirmation = 'Devi scrivere DELETE per confermare';
        }

        if (Object.keys(errors).length > 0) {
            setDeleteErrors(errors);
            return;
        }

        const success = await onDelete(password, confirmation);
        if (success) {
            setPassword('');
            setConfirmation('');
            setShowDeleteConfirm(false);
            setDeleteErrors({});
        }
    };

    return (
        <div className="space-y-6">
            {/* Export Data Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm p-6 card"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                        <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">Esporta dati</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Scarica una copia completa dei tuoi dati in formato JSON. Include tutti i tuoi obiettivi, 
                            progetti, flashcard e attività registrate.
                        </p>
                        <motion.button
                            onClick={handleExport}
                            disabled={status.loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-outline flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {status.loading ? 'Esportazione...' : 'Esporta dati'}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Account Info */}
            {accountEmail && (
                <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/20">
                        <Mail className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white/60">Email account</p>
                        <p className="text-white font-semibold">{accountEmail}</p>
                </div>
            </div>
            )}

            {/* Delete Account Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 p-6 card"
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-red-500/20">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-300 mb-1">Zona pericolosa</h3>
                        <p className="text-sm text-white/70">
                            Eliminare il tuo account è un'azione permanente e irreversibile. Tutti i tuoi dati, 
                            obiettivi, progetti e attività verranno eliminati definitivamente.
                        </p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <motion.button
                        onClick={() => setShowDeleteConfirm(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-danger w-full flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Elimina account
                    </motion.button>
                ) : (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleDelete}
                        className="space-y-4"
                    >
                        {/* Warning Box */}
                        <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 flex items-start gap-3">
                            <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-300 mb-1">Attenzione!</p>
                                <p className="text-xs text-white/70">
                                    Questa azione non può essere annullata. Assicurati di aver esportato i tuoi dati 
                                    prima di procedere.
                                </p>
                            </div>
                        </div>

                        {/* Password Field */}
                        <SettingsPasswordInput
                            label="Password account"
                            name="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (deleteErrors.password) {
                                    setDeleteErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.password;
                                        return newErrors;
                                    });
                                }
                            }}
                            error={deleteErrors.password}
                            icon={Shield}
                            autoComplete="current-password"
                        />

                        {/* Confirmation Field */}
                        <SettingsInput
                            label="Conferma eliminazione"
                            name="confirmation"
                            value={confirmation}
                            onChange={(e) => {
                                setConfirmation(e.target.value);
                                if (deleteErrors.confirmation) {
                                    setDeleteErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.confirmation;
                                        return newErrors;
                                    });
                                }
                            }}
                            error={deleteErrors.confirmation}
                            icon={AlertTriangle}
                            placeholder="Scrivi DELETE per confermare"
                            autoComplete="off"
                            hint="Digita DELETE per confermare l'eliminazione"
                        />

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
                                    <p className="text-sm text-emerald-300">Account eliminato con successo</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <motion.button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setPassword('');
                                    setConfirmation('');
                                    setDeleteErrors({});
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 btn-ghost"
                            >
                                Annulla
                            </motion.button>
                            <motion.button
                                type="submit"
                                disabled={status.loading || confirmation !== 'DELETE' || !password}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`flex-1 btn-danger ${
                                    confirmation !== 'DELETE' || !password
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                }`}
                            >
                                {status.loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                        Eliminazione...
                                    </span>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Elimina definitivamente
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.form>
                )}
            </motion.div>
        </div>
    );
};
