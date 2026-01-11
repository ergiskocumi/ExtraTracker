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
        <div className="space-y-8">
            {/* Export Data Section - Balanced Style */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.1] 
                           bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                           backdrop-blur-2xl backdrop-saturate-150
                           shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                           p-8 transition-all duration-500
                           hover:border-white/[0.15] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative flex items-start gap-6">
                    {/* Icon Container - Simplified */}
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="flex-shrink-0 p-4 rounded-2xl 
                                   bg-blue-500/15
                                   border border-blue-500/20
                                   backdrop-blur-sm"
                    >
                        <Database className="w-7 h-7 text-blue-400" strokeWidth={2} />
                    </motion.div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                            Esporta dati
                        </h3>
                        <p className="text-[15px] text-white/65 leading-relaxed mb-6 max-w-2xl">
                            Scarica una copia completa dei tuoi dati in formato JSON. Include tutti i tuoi obiettivi, 
                            progetti, flashcard e attività registrate.
                        </p>
                        <motion.button
                            onClick={handleExport}
                            disabled={status.loading}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            className="group/btn relative px-6 py-3.5 rounded-xl
                                       bg-blue-500/20
                                       border border-blue-500/30
                                       text-blue-300 font-semibold text-[15px]
                                       backdrop-blur-sm
                                       hover:bg-blue-500/25
                                       hover:border-blue-400/40
                                       hover:text-blue-200
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       transition-all duration-300
                                       flex items-center gap-2.5"
                        >
                            <Download className="w-5 h-5 group-hover/btn:translate-y-[-2px] transition-transform duration-300" strokeWidth={2.5} />
                            <span>{status.loading ? 'Esportazione...' : 'Esporta dati'}</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Import Data Section - Balanced Style */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.1] 
                           bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                           backdrop-blur-2xl backdrop-saturate-150
                           shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                           p-8 transition-all duration-500
                           hover:border-white/[0.15] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
            >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative flex items-start gap-6">
                    {/* Icon Container - Simplified */}
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: -5 }}
                        className="flex-shrink-0 p-4 rounded-2xl 
                                   bg-emerald-500/15
                                   border border-emerald-500/20
                                   backdrop-blur-sm"
                    >
                        <Upload className="w-7 h-7 text-emerald-400" strokeWidth={2} />
                    </motion.div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                            Importa dati
                        </h3>
                        <p className="text-[15px] text-white/65 leading-relaxed mb-6 max-w-2xl">
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

                        <div className="space-y-4">
                            {selectedFile ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl 
                                               bg-gray-800/40
                                               border border-white/[0.1]
                                               backdrop-blur-sm"
                                >
                                    <div className="flex-shrink-0 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                                        <FileJson className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                                    </div>
                                    <span className="text-[15px] font-medium text-white/85 flex-1 truncate">
                                        {selectedFile.name}
                                    </span>
                                    {isChecking ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full flex-shrink-0"
                                        />
                                    ) : (
                                        <motion.button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setComparison(null);
                                                setShowLessDataWarning(false);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }}
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 
                                                       border border-white/10 hover:border-white/20
                                                       flex items-center justify-center
                                                       text-white/50 hover:text-white
                                                       transition-all duration-200 flex-shrink-0"
                                        >
                                            <span className="text-lg leading-none">×</span>
                                        </motion.button>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.button
                                    onClick={() => fileInputRef.current?.click()}
                                    whileHover={{ scale: 1.01, y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="group/btn w-full px-6 py-4 rounded-2xl
                                               bg-gray-800/40
                                               border border-white/[0.1]
                                               backdrop-blur-sm
                                               hover:border-white/[0.15]
                                               transition-all duration-300
                                               flex items-center justify-center gap-3"
                                >
                                    <Upload className="w-5 h-5 text-emerald-400 group-hover/btn:translate-y-[-2px] transition-transform duration-300" strokeWidth={2.5} />
                                    <span className="text-[15px] font-semibold text-white/85">Seleziona file JSON</span>
                                </motion.button>
                            )}

                            {/* Warning: Dati identici - Simplified */}
                            {comparison && comparison.isIdentical && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="p-5 rounded-2xl 
                                               bg-amber-500/15
                                               border border-amber-500/25
                                               backdrop-blur-sm"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                                            <AlertTriangle className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-amber-300 mb-2 tracking-tight">
                                                Dati identici
                                            </p>
                                            <p className="text-[14px] text-white/70 leading-relaxed">
                                                I dati da importare sono identici a quelli già presenti nel tuo account. 
                                                Non è necessario importarli.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Warning: Dati minori - Simplified */}
                            {comparison && comparison.hasLessData && showLessDataWarning && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="p-6 rounded-2xl 
                                               bg-orange-500/15
                                               border border-orange-500/25
                                               backdrop-blur-sm"
                                >
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="flex-shrink-0 p-2 rounded-xl bg-orange-500/20 border border-orange-500/30">
                                            <AlertTriangle className="w-5 h-5 text-orange-400" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-orange-300 mb-2 tracking-tight">
                                                Attenzione: Dati minori
                                            </p>
                                            <p className="text-[14px] text-white/70 leading-relaxed mb-4">
                                                I dati da importare contengono meno elementi di quelli attualmente presenti. 
                                                Sei sicuro di voler continuare?
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl bg-gray-800/30 border border-white/5">
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
                                                            <div key={key} className="flex items-center justify-between py-1.5">
                                                                <span className="text-[13px] text-white/70 font-medium">{label}</span>
                                                                <span className="text-[13px] text-orange-400 font-bold">
                                                                    {comparison.existing[key]} → {comparison.importing[key]} 
                                                                    <span className="ml-1.5 text-orange-500">({diff})</span>
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <motion.button
                                                    onClick={() => {
                                                        setShowLessDataWarning(false);
                                                        setSelectedFile(null);
                                                        setComparison(null);
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = '';
                                                        }
                                                    }}
                                                    whileHover={{ scale: 1.02, y: -1 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 px-5 py-3 rounded-xl
                                                               bg-gray-800/40 border border-white/10
                                                               text-white/80 font-semibold text-[14px]
                                                               hover:bg-gray-700/50 hover:border-white/15 hover:text-white
                                                               transition-all duration-300"
                                                >
                                                    Annulla
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleImport(true)}
                                                    disabled={status.loading}
                                                    whileHover={{ scale: 1.02, y: -1 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 px-5 py-3 rounded-xl
                                                               bg-orange-500/25
                                                               border border-orange-500/35
                                                               text-orange-200 font-bold text-[14px]
                                                               hover:bg-orange-500/30
                                                               hover:border-orange-400/45
                                                               hover:text-orange-100
                                                               disabled:opacity-50 disabled:cursor-not-allowed
                                                               transition-all duration-300"
                                                >
                                                    {status.loading ? 'Importazione...' : 'Sì, importa comunque'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Pulsante import normale (solo se non ci sono warning) - Simplified */}
                            {selectedFile && !comparison?.isIdentical && !showLessDataWarning && (
                                <motion.button
                                    onClick={() => handleImport(false)}
                                    disabled={status.loading || isChecking}
                                    whileHover={{ scale: 1.01, y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="group/btn w-full px-6 py-4 rounded-2xl
                                               bg-emerald-500/20
                                               border border-emerald-500/30
                                               text-emerald-100 font-bold text-[15px]
                                               backdrop-blur-sm
                                               hover:bg-emerald-500/25
                                               hover:border-emerald-400/40
                                               hover:text-white
                                               disabled:opacity-50 disabled:cursor-not-allowed
                                               transition-all duration-300
                                               flex items-center justify-center gap-3"
                                >
                                    <Upload className="w-5 h-5 group-hover/btn:translate-y-[-2px] transition-transform duration-300" strokeWidth={2.5} />
                                    <span>{status.loading ? 'Importazione...' : isChecking ? 'Verifica...' : 'Importa dati'}</span>
                                </motion.button>
                            )}

                            {/* Success Result - Simplified */}
                            {importResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    className="p-6 rounded-2xl 
                                               bg-emerald-500/15
                                               border border-emerald-500/25
                                               backdrop-blur-sm"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-emerald-300 mb-4 tracking-tight">
                                                Import completato con successo!
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-800/30 border border-white/5">
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Obiettivi</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.goals}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Progetti</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.projects}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Work Logs</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.workLogs}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Mazzi</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.decks}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Cartelle</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.folders}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Tag</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.tags}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Check-in</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.checkIns}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5">
                                                    <span className="text-[13px] text-white/70 font-medium">Todo</span>
                                                    <span className="text-[13px] text-emerald-300 font-bold">{importResult.imported.workTodos}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Account Info - Simplified */}
            {accountEmail && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-3xl border border-white/[0.1] 
                               bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                               backdrop-blur-2xl backdrop-saturate-150
                               shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                               p-6 flex items-center gap-4"
                >
                    <div className="flex-shrink-0 p-3 rounded-xl 
                                    bg-violet-500/15
                                    border border-violet-500/20
                                    backdrop-blur-sm">
                        <Mail className="w-5 h-5 text-violet-400" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/55 mb-1 uppercase tracking-wider">Email account</p>
                        <p className="text-[16px] font-bold text-white truncate">{accountEmail}</p>
                </div>
                </motion.div>
            )}

            {/* Delete Account Section - Simplified */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-3xl 
                           border-2 border-red-500/30 
                           bg-red-500/10
                           backdrop-blur-2xl backdrop-saturate-150
                           shadow-[0_8px_32px_0_rgba(239,68,68,0.2),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                           p-8 transition-all duration-500
                           hover:border-red-500/40 hover:shadow-[0_12px_48px_0_rgba(239,68,68,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
            >
                {/* Subtle red gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative flex items-start gap-6 mb-8">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: -5 }}
                        className="flex-shrink-0 p-4 rounded-2xl 
                                   bg-red-500/20
                                   border border-red-500/30
                                   backdrop-blur-sm"
                    >
                        <AlertTriangle className="w-7 h-7 text-red-400" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-red-300 mb-2 tracking-tight">Zona pericolosa</h3>
                        <p className="text-[15px] text-white/70 leading-relaxed">
                            Eliminare il tuo account è un'azione permanente e irreversibile. Tutti i tuoi dati, 
                            obiettivi, progetti e attività verranno eliminati definitivamente.
                        </p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <motion.button
                        onClick={() => setShowDeleteConfirm(true)}
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full px-6 py-4 rounded-2xl
                                   bg-red-500/25
                                   border border-red-500/35
                                   text-red-100 font-bold text-[15px]
                                   backdrop-blur-sm
                                   hover:bg-red-500/30
                                   hover:border-red-400/45
                                   hover:text-white
                                   transition-all duration-300
                                   flex items-center justify-center gap-3"
                    >
                        <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                        <span>Elimina account</span>
                    </motion.button>
                ) : (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        onSubmit={handleDelete}
                        className="space-y-5"
                    >
                        {/* Warning Box - Simplified */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-5 rounded-2xl 
                                       bg-red-500/15
                                       border border-red-500/25
                                       backdrop-blur-sm"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                                    <Shield className="w-5 h-5 text-red-400" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-red-300 mb-2 tracking-tight">Attenzione!</p>
                                    <p className="text-[14px] text-white/70 leading-relaxed">
                                    Questa azione non può essere annullata. Assicurati di aver esportato i tuoi dati 
                                    prima di procedere.
                                </p>
                            </div>
                        </div>
                        </motion.div>

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

                        {/* Action Buttons - Simplified */}
                        <div className="flex items-center gap-3 pt-2">
                            <motion.button
                                type="button"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setPassword('');
                                    setConfirmation('');
                                    setDeleteErrors({});
                                }}
                                whileHover={{ scale: 1.01, y: -1 }}
                                whileTap={{ scale: 0.99 }}
                                className="flex-1 px-5 py-3.5 rounded-xl
                                           bg-gray-800/40 border border-white/10
                                           text-white/80 font-semibold text-[14px]
                                           hover:bg-gray-700/50 hover:border-white/15 hover:text-white
                                           transition-all duration-300"
                            >
                                Annulla
                            </motion.button>
                            <motion.button
                                type="submit"
                                disabled={status.loading || confirmation !== 'DELETE' || !password}
                                whileHover={confirmation === 'DELETE' && password ? { scale: 1.01, y: -1 } : {}}
                                whileTap={confirmation === 'DELETE' && password ? { scale: 0.99 } : {}}
                                className={`flex-1 px-5 py-3.5 rounded-xl
                                           bg-red-500/30
                                           border border-red-500/40
                                           text-red-100 font-bold text-[14px]
                                           backdrop-blur-sm
                                           hover:bg-red-500/35
                                           hover:border-red-400/50
                                           hover:text-white
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           transition-all duration-300
                                           flex items-center justify-center gap-2.5`}
                            >
                                {status.loading ? (
                                    <span className="flex items-center justify-center gap-2.5">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                        <span>Eliminazione...</span>
                                    </span>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                        <span>Elimina definitivamente</span>
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
