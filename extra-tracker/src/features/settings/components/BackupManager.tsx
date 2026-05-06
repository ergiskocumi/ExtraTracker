/**
 * 💾 BACKUP MANAGER - Sistema Backup Avanzato
 * 
 * Features:
 * - Creazione backup manuale
 * - Lista backup con paginazione
 * - Restore backup
 * - Validazione integrità
 * - Blocco/Sblocco backup
 * - Esportazione JSON
 * - Statistiche spazio
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Download,
    Upload,
    Trash2,
    Lock,
    Unlock,
    CheckCircle,
    AlertTriangle,
    Clock,
    HardDrive,
    RefreshCw,
    ChevronDown,
    Plus,
} from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';
import { emitToast } from '../../../shared/components/toast';

interface Backup {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    checksum: string;
    status: 'ready' | 'creating' | 'failed' | 'archived';
    type: 'manual' | 'automatic' | 'scheduled';
    statistics: {
        totalRecords: number;
        uncompressedSize: number;
        compressedSize: number;
        compressionRatio: number;
        duration: number;
    };
    restoreCount: number;
    isLocked: boolean;
}

interface BackupStats {
    totalBackups: number;
    totalSize: number;
    averageSize: number;
    averageRecords: number;
    lockedCount: number;
}

export const BackupManager = () => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [newBackupName, setNewBackupName] = useState('');
    const [newBackupDesc, setNewBackupDesc] = useState('');

    const normalizeBackupList = (
        data: Backup[] | { items: Backup[]; pagination?: { pages?: number } }
    ) => {
        if (Array.isArray(data)) {
            return { items: data, pages: 0 };
        }
        return {
            items: data.items,
            pages: data.pagination?.pages ?? 0,
        };
    };

    // Carica backup e statistiche
    useEffect(() => {
        loadBackups();
        loadStats();
    }, [page]);

    const loadBackups = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<
                Backup[] | { items: Backup[]; pagination?: { pages?: number } }
            >(`/backup/list?page=${page}&limit=10`);
            if (response.success && response.data) {
                const normalized = normalizeBackupList(response.data);
                setBackups(normalized.items);
                setTotalPages(normalized.pages);
            }
        } catch (error) {
            emitToast.error(`Errore caricamento backup: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await apiClient.get<BackupStats>('/backup/stats');
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Errore caricamento statistiche:', error);
        }
    };

    const createBackup = async () => {
        if (!newBackupName.trim()) {
            emitToast.warning('Inserisci un nome per il backup');
            return;
        }

        try {
            setIsCreating(true);
            const response = await apiClient.post<Backup>('/backup/create', {
                name: newBackupName,
                description: newBackupDesc,
            });

            if (response.success) {
                emitToast.success('✅ Backup creato con successo');
                setNewBackupName('');
                setNewBackupDesc('');
                loadBackups();
                loadStats();
            }
        } catch (error) {
            emitToast.error(`Errore creazione backup: ${error}`);
        } finally {
            setIsCreating(false);
        }
    };

    const restoreBackup = async (backupId: string) => {
        const confirmation = prompt(
            'Digitare "RIPRISTINA BACKUP" per confermare il ripristino dei dati:'
        );

        if (confirmation !== 'RIPRISTINA BACKUP') {
            emitToast.info('Ripristino annullato');
            return;
        }

        try {
            const response = await apiClient.post<Backup>(`/backup/${backupId}/restore`, {
                strategy: 'merge',
                confirmation: 'RIPRISTINA BACKUP',
            });

            if (response.success) {
                emitToast.success('✅ Dati ripristinati con successo');
                // Ricarica la pagina dopo 2 secondi per mostrare i dati
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error) {
            emitToast.error(`Errore ripristino: ${error}`);
        }
    };

    const deleteBackup = async (backupId: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo backup?')) {
            return;
        }

        try {
            const response = await apiClient.delete(`/backup/${backupId}`);
            if (response.success) {
                emitToast.success('✅ Backup eliminato');
                loadBackups();
                loadStats();
            }
        } catch (error) {
            emitToast.error(`Errore eliminazione: ${error}`);
        }
    };

    const lockBackup = async (backupId: string) => {
        try {
            const response = await apiClient.post(`/backup/${backupId}/lock`, {
                reason: 'Bloccato per evitare eliminazione accidentale',
            });
            if (response.success) {
                emitToast.success('🔒 Backup bloccato');
                loadBackups();
            }
        } catch (error) {
            emitToast.error(`Errore blocco: ${error}`);
        }
    };

    const unlockBackup = async (backupId: string) => {
        try {
            const response = await apiClient.post(`/backup/${backupId}/unlock`, {});
            if (response.success) {
                emitToast.success('🔓 Backup sbloccato');
                loadBackups();
            }
        } catch (error) {
            emitToast.error(`Errore sblocco: ${error}`);
        }
    };

    const validateBackup = async (backupId: string) => {
        try {
            const response = await apiClient.post<{ isValid: boolean }>(
                `/backup/${backupId}/validate`,
                {}
            );
            if (response.success) {
                const isValid = response.data?.isValid ?? false;
                if (isValid) {
                    emitToast.success('✅ Backup valido e integro');
                } else {
                    emitToast.error('❌ Backup danneggiato');
                }
                loadBackups();
            }
        } catch (error) {
            emitToast.error(`Errore validazione: ${error}`);
        }
    };

    const exportJSON = async () => {
        try {
            const response = await apiClient.get<Record<string, unknown>>('/backup/export/json');
            const exportData = response.data ?? {};
            const element = document.createElement('a');
            const file = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json',
            });
            element.href = URL.createObjectURL(file);
            element.download = `extra-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            emitToast.success('✅ Dati esportati con successo');
        } catch (error) {
            emitToast.error(`Errore esportazione: ${error}`);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('it-IT');
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                            <Save className="w-6 h-6" />
                            Sistema Backup Avanzato
                        </h2>
                        <p className="text-blue-100">
                            Salva e ripristina i tuoi dati in qualsiasi momento
                        </p>
                    </div>
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={exportJSON}
                            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Esporta JSON
                        </button>
                    </div>
                </div>
            </div>

            {/* STATISTICHE */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Backup</p>
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                    {stats.totalBackups}
                                </p>
                            </div>
                            <Save className="w-8 h-8 text-blue-400 dark:text-blue-300 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Spazio Usato</p>
                                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatSize(stats.totalSize)}
                                </p>
                            </div>
                            <HardDrive className="w-8 h-8 text-purple-400 dark:text-purple-300 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-300 font-medium">Avg. Dimensione</p>
                                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                    {formatSize(stats.averageSize)}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-green-400 dark:text-green-300 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/40">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Bloccati</p>
                                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                                    {stats.lockedCount}
                                </p>
                            </div>
                            <Lock className="w-8 h-8 text-amber-400 dark:text-amber-300 opacity-50" />
                        </div>
                    </div>
                </div>
            )}

            {/* CREAZIONE NUOVO BACKUP */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-dark-400 rounded-lg p-6 border border-gray-200 dark:border-white/10 shadow-sm"
            >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    Crea Nuovo Backup
                </h3>

                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Nome backup (es: Backup Importante 2024)"
                        value={newBackupName}
                        onChange={(e) => setNewBackupName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-400 text-gray-900 dark:text-white"
                    />

                    <textarea
                        placeholder="Descrizione (opzionale)"
                        value={newBackupDesc}
                        onChange={(e) => setNewBackupDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-400 text-gray-900 dark:text-white"
                    />

                    <button
                        onClick={createBackup}
                        disabled={isCreating}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Creazione in corso...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Crea Backup Ora
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* LISTA BACKUP */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold">I Tuoi Backup</h3>

                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-300 mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">Caricamento backup...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-dark-400/70 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-white/10">
                        <Save className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Nessun backup ancora</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Crea il tuo primo backup per proteggere i dati
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {backups.map((backup) => (
                                <motion.div
                                    key={backup.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-dark-400 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
                                >
                                    <div
                                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        onClick={() =>
                                            setExpandedId(
                                                expandedId === backup.id ? null : backup.id
                                            )
                                        }
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    {backup.status === 'ready' && (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    )}
                                                    {backup.status === 'creating' && (
                                                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                                                    )}
                                                    {backup.status === 'failed' && (
                                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                                    )}

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-theme-primary">
                                                                {backup.name}
                                                            </h4>
                                                            {backup.isLocked && (
                                                                <Lock className="w-4 h-4 text-amber-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {formatDate(backup.createdAt)} • {backup.statistics.totalRecords} record •{' '}
                                                            {formatSize(backup.statistics.compressedSize)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                                    {backup.type}
                                                </span>
                                                <ChevronDown
                                                    className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${
                                                        expandedId === backup.id
                                                            ? 'rotate-180'
                                                            : ''
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* DETTAGLI ESPANSI */}
                                    <AnimatePresence>
                                        {expandedId === backup.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-400 dark:to-dark-500 border-t border-gray-200 dark:border-white/10 p-4 space-y-3"
                                            >
                                                {/* INFO */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-gray-600 dark:text-gray-300 font-medium">Record</p>
                                                        <p className="text-theme-primary font-semibold">
                                                            {backup.statistics.totalRecords}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                                                            Compressione
                                                        </p>
                                                        <p className="text-theme-primary font-semibold">
                                                            {backup.statistics.compressionRatio.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                                                            Tempo creazione
                                                        </p>
                                                        <p className="text-theme-primary font-semibold">
                                                            {backup.statistics.duration}ms
                                                        </p>
                                                    </div>
                                                </div>

                                                {backup.description && (
                                                    <div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                            Descrizione
                                                        </p>
                                                        <p className="text-gray-700 dark:text-gray-200 text-sm mt-1">
                                                            {backup.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* PULSANTI AZIONI */}
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    <button
                                                        onClick={() => restoreBackup(backup.id)}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 transition-all"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        Ripristina
                                                    </button>

                                                    <button
                                                        onClick={() => validateBackup(backup.id)}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 transition-all"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Valida
                                                    </button>

                                                    {!backup.isLocked ? (
                                                        <button
                                                            onClick={() => lockBackup(backup.id)}
                                                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 transition-all"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                            Blocca
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => unlockBackup(backup.id)}
                                                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 transition-all"
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                            Sblocca
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => deleteBackup(backup.id)}
                                                        disabled={backup.isLocked}
                                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Elimina
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* PAGINAZIONE */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-dark-200 transition-all"
                        >
                            ← Precedente
                        </button>

                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Pagina {page + 1} di {totalPages}
                        </span>

                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page === totalPages - 1}
                            className="px-4 py-2 bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-dark-200 transition-all"
                        >
                            Successivo →
                        </button>
                    </div>
                )}
            </div>

            {/* INFO IMPORTANTE */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    ℹ️ Informazioni Importanti
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-7">
                    <li>✓ I backup sono salvati in modo sicuro e compresso</li>
                    <li>✓ Usa "Blocca" per proteggere i backup importanti</li>
                    <li>✓ Valida regolarmente l'integrità dei backup</li>
                    <li>✓ Scarica i file JSON per backup completamente indipendenti</li>
                    <li>✓ I backup possono essere ripristinati in qualsiasi momento</li>
                </ul>
            </div>
        </div>
    );
};
