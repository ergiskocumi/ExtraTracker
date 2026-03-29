import React from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    FileText,
    AlertCircle,
    Trash2,
} from 'lucide-react';
import { PIPELINE_PHASES } from '../../../hooks/useMagicGenerate';

interface StepUploadProps {
    file: File | null;
    isDragging: boolean;
    error: string | null;
    estimatedAutoCards: number;
    estimatedDuration: string;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (e: React.MouseEvent) => void;
    onChangeFile: (e: React.MouseEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onSubmit: () => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({
    file,
    isDragging,
    error,
    estimatedAutoCards,
    estimatedDuration,
    fileInputRef,
    onFileSelect,
    onRemoveFile,
    onChangeFile,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onSubmit,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-12"
        >
            <section className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl border border-theme-default bg-gradient-to-br from-theme-surface to-theme-elevated p-5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-theme-muted mb-2">Nuovo Flusso</p>
                    <h3 className="text-2xl font-semibold text-theme-primary tracking-tight mb-2">
                        Crea flashcard con una pipeline trasparente
                    </h3>
                    <p className="text-sm text-theme-muted leading-relaxed">
                        Vedi in tempo reale cosa sta succedendo: upload, analisi, chunking, generazione e deduplica.
                        Nessun passaggio nascosto.
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={onFileSelect}
                    className="hidden"
                />

                <div
                    onDragEnter={!file ? onDragEnter : undefined}
                    onDragLeave={!file ? onDragLeave : undefined}
                    onDragOver={!file ? onDragOver : undefined}
                    onDrop={!file ? onDrop : undefined}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={`
                        relative w-full min-h-[230px] rounded-2xl border border-dashed transition-all duration-300
                        flex flex-col items-center justify-center gap-4 px-6 py-8
                        ${file
                            ? 'border-emerald-500/40 bg-emerald-500/10 cursor-default'
                            : isDragging
                                ? 'border-primary-500 bg-primary-500/10 cursor-pointer'
                                : 'border-theme-default bg-theme-surface/80 hover:border-primary-500/60 hover:bg-theme-surface cursor-pointer'
                        }
                    `}
                >
                    <div className={`p-3 rounded-2xl ${
                        file
                            ? 'bg-emerald-500/20 border border-emerald-500/40'
                            : 'bg-primary-500/12 border border-primary-500/25'
                    }`}>
                        {file ? (
                            <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                            <Upload className="w-8 h-8 text-primary-600 dark:text-primary-300" />
                        )}
                    </div>

                    {file ? (
                        <>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-theme-primary break-all">{file.name}</p>
                                <p className="text-xs text-theme-muted mt-1">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB · PDF pronto
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onChangeFile}
                                    className="px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface/80 border border-theme-default text-theme-primary text-xs font-medium transition-colors flex items-center gap-1.5"
                                    type="button"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Sostituisci
                                </button>
                                <button
                                    onClick={onRemoveFile}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                                    type="button"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Rimuovi
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm font-semibold text-theme-primary">Trascina il PDF qui</p>
                            <p className="text-xs text-theme-muted mt-1">oppure clicca per selezionare il file da analizzare</p>
                        </div>
                    )}
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                )}
            </section>

            <aside className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-theme-default bg-theme-surface/75 p-4">
                    <p className="text-xs font-semibold text-theme-secondary mb-2">Target automatico</p>
                    <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-primary-700 dark:text-primary-300 mb-1">
                            Ottimizzazione costi attiva
                        </p>
                        <p className="text-lg font-semibold text-theme-primary">
                            ~ {file ? estimatedAutoCards : '--'} flashcard stimate
                        </p>
                        <p className="text-[11px] text-theme-muted mt-1">
                            Il sistema decide automaticamente quante card generare in base a lunghezza,
                            densità e struttura del PDF.
                        </p>
                    </div>
                    <p className="text-[11px] text-theme-muted mt-3">
                        Nessuna scelta manuale: riduciamo token inutili mantenendo copertura utile.
                    </p>
                </div>

                <div className="rounded-2xl border border-theme-default bg-theme-surface/75 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-theme-muted uppercase tracking-[0.14em]">Preview pipeline</p>
                        <p className="text-xs text-theme-secondary font-semibold">~ {estimatedDuration}</p>
                    </div>
                    <div className="space-y-2">
                        {PIPELINE_PHASES.map((phase) => {
                            const PhaseIcon = phase.icon;
                            return (
                                <div key={phase.key} className="flex items-start gap-3 p-2 rounded-lg bg-theme-elevated/70 border border-theme-subtle">
                                    <div className={`mt-0.5 p-1.5 rounded-md bg-gradient-to-br ${phase.accent}/20 border border-theme-subtle`}>
                                        <PhaseIcon className="w-3.5 h-3.5 text-theme-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-theme-primary">{phase.label}</p>
                                        <p className="text-[11px] text-theme-muted">{phase.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <motion.button
                    initial={{ opacity: 0.9, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={onSubmit}
                    disabled={!file}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
                        file
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40'
                            : 'bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed'
                    }`}
                >
                    Avvia Generazione
                </motion.button>
            </aside>
        </motion.div>
    );
};

export default StepUpload;
