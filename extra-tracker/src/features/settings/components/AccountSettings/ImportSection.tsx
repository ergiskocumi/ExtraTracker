/**
 * ImportSection - Sezione per l'importazione dei dati
 * 
 * Questo componente gestisce l'intero flusso di importazione:
 * 1. Selezione del file JSON
 * 2. Validazione e verifica dei dati
 * 3. Mostra warning se necessario (dati identici o minori)
 * 4. Conferma e importazione
 * 5. Mostra risultato dell'operazione
 * 
 * @component
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileJson, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ImportComparison, ImportResult } from './types';
import { ANIMATION_CONFIG } from './constants';
import { DATA_CATEGORY_LABELS } from './types';
import { validateImportFile, isFileSizeError, clearFileInput, getResetImportState } from './utils';

interface ImportSectionProps {
    /** Indica se l'operazione di import è in corso */
    isLoading: boolean;
    
    /** Callback per verificare i dati prima dell'import */
    onCheckImport: (file: File) => Promise<ImportComparison | null>;
    
    /** Callback per importare i dati */
    onImport: (file: File, force?: boolean) => Promise<ImportResult | null>;
}

/**
 * Componente per la sezione di importazione dati
 * 
 * Gestisce tutto il flusso di importazione con validazioni,
 * warning e feedback all'utente. È progettato per prevenire
 * errori e guidare l'utente attraverso il processo.
 */
export function ImportSection({ isLoading, onCheckImport, onImport }: ImportSectionProps) {
    // Stato locale per gestire il file selezionato e i risultati
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [comparison, setComparison] = useState<ImportComparison | null>(null);
    const [showLessDataWarning, setShowLessDataWarning] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    
    // Riferimento all'input file per poterlo resettare programmaticamente
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Gestisce la selezione di un file da parte dell'utente
     * 
     * Valida il file, lo salva nello stato e avvia la verifica
     * dei dati con il backend. Gestisce anche gli errori di validazione.
     */
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Valida il file prima di procedere
        const validation = validateImportFile(file);
        if (!validation.isValid) {
            alert(validation.error);
            clearFileInput(fileInputRef);
            return;
        }

        // Reset dello stato precedente quando si seleziona un nuovo file
        const resetState = getResetImportState();
        setSelectedFile(file);
        setImportResult(resetState.importResult);
        setComparison(resetState.comparison);
        setShowLessDataWarning(resetState.showLessDataWarning);

        // Avvia la verifica dei dati con il backend
        setIsChecking(true);
        try {
            const checkResult = await onCheckImport(file);
            if (checkResult) {
                setComparison(checkResult);
                
                // Se i dati sono identici, non permettere l'import
                // Se i dati sono minori, mostra un warning e chiedi conferma
                if (checkResult.hasLessData) {
                    setShowLessDataWarning(true);
                }
            }
        } catch (error) {
            console.error('Errore nel controllo dati:', error);
            
            // Gestisce errori specifici di dimensione file
            if (isFileSizeError(error)) {
                alert('Il file è troppo grande. Il limite massimo è 50MB.');
                setSelectedFile(null);
                clearFileInput(fileInputRef);
            }
        } finally {
            setIsChecking(false);
        }
    };

    /**
     * Gestisce l'importazione dei dati
     * 
     * Se force è true, ignora i warning e procede comunque.
     * Dopo l'importazione riuscita, resetta lo stato e mostra il risultato.
     */
    const handleImport = async (force = false) => {
        if (!selectedFile) return;

        try {
            const result = await onImport(selectedFile, force);
            if (result) {
                setImportResult(result);
                
                // Reset completo dopo importazione riuscita
                const resetState = getResetImportState();
                setSelectedFile(resetState.selectedFile);
                setComparison(resetState.comparison);
                setShowLessDataWarning(resetState.showLessDataWarning);
                clearFileInput(fileInputRef);
            }
        } catch (error) {
            // Gestisce errori specifici di dimensione file
            if (isFileSizeError(error)) {
                alert('Il file è troppo grande. Il limite massimo è 50MB. Prova a esportare solo i dati necessari.');
            }
        }
    };

    /**
     * Resetta la selezione del file e lo stato correlato
     * 
     * Chiamato quando l'utente vuole annullare l'operazione
     * o selezionare un nuovo file.
     */
    const handleClearFile = () => {
        const resetState = getResetImportState();
        setSelectedFile(resetState.selectedFile);
        setComparison(resetState.comparison);
        setShowLessDataWarning(resetState.showLessDataWarning);
        clearFileInput(fileInputRef);
    };

    /**
     * Annulla l'importazione quando ci sono dati minori
     * 
     * Chiamato quando l'utente decide di non procedere
     * dopo aver visto il warning sui dati minori.
     */
    const handleCancelLessDataWarning = () => {
        handleClearFile();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: ANIMATION_CONFIG.DURATION_LONG, 
                delay: ANIMATION_CONFIG.DELAY_SHORT,
                ease: ANIMATION_CONFIG.EASING_SMOOTH 
            }}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.1] 
                       bg-gradient-to-br from-gray-800/50 via-gray-800/40 to-gray-900/50
                       backdrop-blur-2xl backdrop-saturate-150
                       shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                       p-8 transition-all duration-500
                       hover:border-white/[0.15] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
        >
            {/* Overlay gradient per feedback visivo */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative flex items-start gap-6">
                {/* Icona con animazione */}
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
                    
                    {/* Input file nascosto - viene attivato dal pulsante */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="space-y-4">
                        {/* Mostra il file selezionato o il pulsante per selezionare */}
                        {selectedFile ? (
                            <SelectedFileDisplay
                                fileName={selectedFile.name}
                                isChecking={isChecking}
                                onClear={handleClearFile}
                            />
                        ) : (
                            <SelectFileButton
                                onClick={() => fileInputRef.current?.click()}
                            />
                        )}

                        {/* Warning: Dati identici - blocca l'import */}
                        {comparison?.isIdentical && (
                            <IdenticalDataWarning />
                        )}

                        {/* Warning: Dati minori - chiede conferma */}
                        {comparison?.hasLessData && showLessDataWarning && (
                            <LessDataWarning
                                comparison={comparison}
                                isLoading={isLoading}
                                onCancel={handleCancelLessDataWarning}
                                onConfirm={() => handleImport(true)}
                            />
                        )}

                        {/* Pulsante import normale (solo se non ci sono warning) */}
                        {selectedFile && !comparison?.isIdentical && !showLessDataWarning && (
                            <ImportButton
                                isLoading={isLoading}
                                isChecking={isChecking}
                                onClick={() => handleImport(false)}
                            />
                        )}

                        {/* Risultato dell'importazione */}
                        {importResult && (
                            <ImportSuccessResult result={importResult} />
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Componente per mostrare il file selezionato
 */
function SelectedFileDisplay({ 
    fileName, 
    isChecking, 
    onClear 
}: { 
    fileName: string; 
    isChecking: boolean; 
    onClear: () => void;
}) {
    return (
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
                {fileName}
            </span>
            {isChecking ? (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full flex-shrink-0"
                />
            ) : (
                <motion.button
                    onClick={onClear}
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
    );
}

/**
 * Pulsante per selezionare un file
 */
function SelectFileButton({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
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
    );
}

/**
 * Warning quando i dati da importare sono identici a quelli esistenti
 */
function IdenticalDataWarning() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: ANIMATION_CONFIG.DURATION_STANDARD, ease: ANIMATION_CONFIG.EASING_SMOOTH }}
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
    );
}

/**
 * Warning quando i dati da importare sono minori di quelli esistenti
 */
function LessDataWarning({ 
    comparison, 
    isLoading, 
    onCancel, 
    onConfirm 
}: { 
    comparison: ImportComparison; 
    isLoading: boolean; 
    onCancel: () => void; 
    onConfirm: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: ANIMATION_CONFIG.DURATION_STANDARD, ease: ANIMATION_CONFIG.EASING_SMOOTH }}
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
                    
                    {/* Mostra le differenze per categoria */}
                    <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl bg-gray-800/30 border border-white/5">
                        {Object.entries(comparison.differences).map(([key, diff]) => {
                            if (diff < 0) {
                                const label = DATA_CATEGORY_LABELS[key] || key;
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
                    
                    {/* Pulsanti di azione */}
                    <div className="flex items-center gap-3">
                        <motion.button
                            onClick={onCancel}
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
                            onClick={onConfirm}
                            disabled={isLoading}
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
                            {isLoading ? 'Importazione...' : 'Sì, importa comunque'}
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Pulsante per avviare l'importazione
 */
function ImportButton({ 
    isLoading, 
    isChecking, 
    onClick 
}: { 
    isLoading: boolean; 
    isChecking: boolean; 
    onClick: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            disabled={isLoading || isChecking}
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
            <span>{isLoading ? 'Importazione...' : isChecking ? 'Verifica...' : 'Importa dati'}</span>
        </motion.button>
    );
}

/**
 * Componente per mostrare il risultato dell'importazione
 */
function ImportSuccessResult({ result }: { result: ImportResult }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: ANIMATION_CONFIG.DURATION_STANDARD, ease: ANIMATION_CONFIG.EASING_SMOOTH }}
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
                        {Object.entries(result.imported).map(([key, count]) => {
                            const label = DATA_CATEGORY_LABELS[key] || key;
                            return (
                                <div key={key} className="flex items-center justify-between py-1.5">
                                    <span className="text-[13px] text-white/70 font-medium">{label}</span>
                                    <span className="text-[13px] text-emerald-300 font-bold">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
