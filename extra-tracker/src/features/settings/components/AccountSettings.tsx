/**
 * 🗑️ ACCOUNT SETTINGS - Premium Account Management
 * 
 * Design premium con warning visivi chiari per azioni distruttive
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Database, 
    Download, 
    Upload,
    Trash2, 
    AlertTriangle, 
    Mail,
    Shield,
    FileJson,
    CheckCircle
} from 'lucide-react';
import type { FormStatus } from './types';
import { SettingsInput, SettingsPasswordInput } from './fields';
import { SettingsError, SettingsSuccess } from './feedback';

interface AccountSettingsProps {
    accountEmail?: string;
    onExport: () => Promise<unknown | null>;
    onCheckImport: (file: File) => Promise<{
        isIdentical: boolean;
        hasLessData: boolean;
        existing: Record<string, number>;
        importing: Record<string, number>;
        differences: Record<string, number>;
    } | null>;
    onImport: (file: File, force?: boolean) => Promise<{
        success: boolean;
        imported: {
            goals: number;
            projects: number;
            workLogs: number;
            decks: number;
            folders: number;
            tags: number;
            checkIns: number;
            workTodos: number;
        };
    } | null>;
    onDelete: (password: string, confirmation: string) => Promise<boolean>;
    status: FormStatus;
}

export const AccountSettings = ({ accountEmail, onExport, onCheckImport, onImport, onDelete, status }: AccountSettingsProps) => {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteErrors, setDeleteErrors] = useState<{ password?: string; confirmation?: string }>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        imported: {
            goals: number;
            projects: number;
            workLogs: number;
            decks: number;
            folders: number;
            tags: number;
            checkIns: number;
            workTodos: number;
        };
    } | null>(null);
    const [comparison, setComparison] = useState<{
        isIdentical: boolean;
        hasLessData: boolean;
        existing: Record<string, number>;
        importing: Record<string, number>;
        differences: Record<string, number>;
    } | null>(null);
    const [showLessDataWarning, setShowLessDataWarning] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        await onExport();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Verifica dimensione file (50MB limite)
            const maxSize = 50 * 1024 * 1024; // 50MB in bytes
            if (file.size > maxSize) {
                alert(`Il file è troppo grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Il limite massimo è 50MB.`);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                alert('Per favore seleziona un file JSON valido');
                return;
            }
            setSelectedFile(file);
            setImportResult(null);
            setComparison(null);
            setShowLessDataWarning(false);

            // Verifica i dati prima di importare
            setIsChecking(true);
            try {
                const checkResult = await onCheckImport(file);
                if (checkResult) {
                    setComparison(checkResult);
                    
                    // Se dati identici, mostra warning e blocca
                    if (checkResult.isIdentical) {
                        // Warning già mostrato dal backend
                    }
                    // Se dati minori, mostra warning e chiedi conferma
                    if (checkResult.hasLessData) {
                        setShowLessDataWarning(true);
                    }
                }
            } catch (error: any) {
                console.error('Errore nel controllo dati:', error);
                // Gestisci errori specifici
                if (error?.response?.data?.error?.code === 'FILE_TOO_LARGE' || 
                    error?.response?.data?.error?.code === 'PAYLOAD_TOO_LARGE') {
                    alert('Il file è troppo grande. Il limite massimo è 50MB.');
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            } finally {
                setIsChecking(false);
            }
        }
    };

    const handleImport = async (force = false) => {
        if (!selectedFile) {
            return;
        }

        try {
            const result = await onImport(selectedFile, force);
            if (result) {
                setImportResult(result);
                setSelectedFile(null);
                setComparison(null);
                setShowLessDataWarning(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (error: any) {
            // Gestisci errori specifici
            if (error?.response?.data?.error?.code === 'FILE_TOO_LARGE' || 
                error?.response?.data?.error?.code === 'PAYLOAD_TOO_LARGE') {
                alert('Il file è troppo grande. Il limite massimo è 50MB. Prova a esportare solo i dati necessari.');
            }
        }
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

            {/* Import Data Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm p-6 card"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/20">
                        <Upload className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">Importa dati</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Carica un file JSON precedentemente esportato per ripristinare i tuoi dati. 
                            I dati verranno aggiunti al tuo account esistente.
                        </p>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="space-y-3">
                            {selectedFile ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <FileJson className="w-5 h-5 text-emerald-400" />
                                    <span className="text-sm text-white/80 flex-1 truncate">{selectedFile.name}</span>
                                    {isChecking ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full"
                                        />
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setComparison(null);
                                                setShowLessDataWarning(false);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }}
                                            className="text-white/40 hover:text-white transition-colors"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <motion.button
                                    onClick={() => fileInputRef.current?.click()}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="btn-outline flex items-center gap-2 w-full"
                                >
                                    <Upload className="w-4 h-4" />
                                    Seleziona file JSON
                                </motion.button>
                            )}

                            {/* Warning: Dati identici */}
                            {comparison && comparison.isIdentical && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-300 mb-1">
                                                Dati identici
                                            </p>
                                            <p className="text-xs text-white/70">
                                                I dati da importare sono identici a quelli già presenti nel tuo account. 
                                                Non è necessario importarli.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Warning: Dati minori */}
                            {comparison && comparison.hasLessData && showLessDataWarning && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-orange-300 mb-1">
                                                Attenzione: Dati minori
                                            </p>
                                            <p className="text-xs text-white/70 mb-3">
                                                I dati da importare contengono meno elementi di quelli attualmente presenti. 
                                                Sei sicuro di voler continuare?
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-white/60 mb-3">
                                                {Object.entries(comparison.differences).map(([key, diff]) => {
                                                    if (diff < 0) {
                                                        const label = {
                                                            goals: 'Obiettivi',
                                                            projects: 'Progetti',
                                                            workLogs: 'Work Logs',
                                                            decks: 'Mazzi',
                                                            folders: 'Cartelle',
                                                            tags: 'Tag',
                                                            checkIns: 'Check-in',
                                                            workTodos: 'Todo',
                                                        }[key] || key;
                                                        return (
                                                            <div key={key} className="flex items-center justify-between">
                                                                <span>{label}:</span>
                                                                <span className="text-orange-400 font-semibold">
                                                                    {comparison.existing[key]} → {comparison.importing[key]} ({diff})
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <motion.button
                                                    onClick={() => {
                                                        setShowLessDataWarning(false);
                                                        setSelectedFile(null);
                                                        setComparison(null);
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = '';
                                                        }
                                                    }}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 btn-ghost text-xs py-2"
                                                >
                                                    Annulla
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleImport(true)}
                                                    disabled={status.loading}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 btn-primary text-xs py-2"
                                                >
                                                    {status.loading ? 'Importazione...' : 'Sì, importa comunque'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Pulsante import normale (solo se non ci sono warning) */}
                            {selectedFile && !comparison?.isIdentical && !showLessDataWarning && (
                                <motion.button
                                    onClick={() => handleImport(false)}
                                    disabled={status.loading || isChecking}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="btn-primary flex items-center gap-2 w-full"
                                >
                                    <Upload className="w-4 h-4" />
                                    {status.loading ? 'Importazione...' : isChecking ? 'Verifica...' : 'Importa dati'}
                                </motion.button>
                            )}

                            {importResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-emerald-300 mb-2">
                                                Import completato con successo!
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                                                <div>Obiettivi: {importResult.imported.goals}</div>
                                                <div>Progetti: {importResult.imported.projects}</div>
                                                <div>Work Logs: {importResult.imported.workLogs}</div>
                                                <div>Mazzi: {importResult.imported.decks}</div>
                                                <div>Cartelle: {importResult.imported.folders}</div>
                                                <div>Tag: {importResult.imported.tags}</div>
                                                <div>Check-in: {importResult.imported.checkIns}</div>
                                                <div>Todo: {importResult.imported.workTodos}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
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
                                <SettingsError
                                    message={status.error}
                                    title="Errore nell'eliminazione"
                                />
                            )}
                            {status.success && (
                                <SettingsSuccess
                                    message="Account eliminato con successo"
                                    title="Account rimosso"
                                />
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
