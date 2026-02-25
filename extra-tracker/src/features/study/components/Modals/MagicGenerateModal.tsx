/**
 * ✨ MAGIC GENERATE MODAL V2 - Theme Aware con supporto Light/Dark
 * 
 * Design completamente rinnovato con:
 * - Supporto tema chiaro e scuro
 * - Glassmorphism marcato
 * - Tempo stimato visibile
 * - Effetti di analisi AI coinvolgenti
 * - Animazioni fluide e naturali
 * - Supporto per generazione in background
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    X, 
    Upload, 
    FileText, 
    Brain, 
    Zap, 
    CheckCircle2, 
    AlertCircle, 
    BookOpen, 
    Lightbulb, 
    Target, 
    TrendingUp, 
    Trash2,
    Minimize2
} from 'lucide-react';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { useSSE, type SSEPayload } from '../../../../hooks/useSSE';
import { useFlashcardGeneration } from '../../context/FlashcardGenerationContext';

interface MagicGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void;
}

type AnalysisStep = 'idle' | 'uploading' | 'analyzing' | 'processing' | 'generating' | 'completed' | 'error';

type LogEntry = {
    id: string;
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'analysis';
    icon?: React.ElementType;
};

type ProgressData = {
    step: AnalysisStep;
    estimatedTime?: number;
    elapsedTime?: number;
    progress?: number;
    currentChunk?: number;
    totalChunks?: number;
    generatedCount?: number;
    message?: string;
    blueprint?: {
        documentType?: string;
        mainTopics?: string[];
        densityScore?: number;
    };
    concepts?: string[];
    currentTopic?: string;
};

let logIdCounter = 0;
const CARD_TARGET_OPTIONS = [80, 120, 160, 200] as const;
const DEFAULT_TARGET_CARDS = 120;

export const MagicGenerateModal: React.FC<MagicGenerateModalProps> = ({
    isOpen,
    onClose,
    deckId,
    deckTitle,
    onSuccess,
}) => {
    // Context per generazione in background
    const { 
        activeJob, 
        startJob, 
        updateJob, 
        completeJob, 
        failJob, 
        dismissToBackground 
    } = useFlashcardGeneration();

    // Local state
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [maxCards, setMaxCards] = useState<number>(DEFAULT_TARGET_CARDS);
    const [progress, setProgress] = useState<ProgressData>({ step: 'idle' });
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Check if we have an active job for this deck
    const isProcessingCurrentDeck = activeJob?.deckId === deckId && 
        activeJob?.step !== 'completed' && 
        activeJob?.step !== 'error';

    // Funzione per aggiungere log
    const addLogMemo = useCallback((message: string, type: LogEntry['type'] = 'info', icon?: React.ElementType) => {
        setLogs(prev => [...prev, {
            id: `log-${++logIdCounter}`,
            timestamp: Date.now(),
            message,
            type,
            icon,
        }]);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Sync with active job from context
    useEffect(() => {
        if (activeJob && activeJob.deckId === deckId) {
            setCurrentJobId(activeJob.id);
            
            // Sync progress state from active job
            setProgress({
                step: activeJob.step,
                progress: activeJob.progress,
                generatedCount: activeJob.generatedCount,
                totalChunks: activeJob.totalChunks,
                currentChunk: activeJob.currentChunk,
                message: activeJob.message,
                elapsedTime: activeJob.elapsedTime,
                blueprint: activeJob.blueprint,
                concepts: activeJob.concepts,
                currentTopic: activeJob.currentTopic,
            });
        }
    }, [activeJob, deckId]);

    // Reset quando si apre il modal senza job attivo
    useEffect(() => {
        if (isOpen && !isProcessingCurrentDeck) {
            setFile(null);
            setMaxCards(DEFAULT_TARGET_CARDS);
            setProgress({ step: 'idle' });
            setError(null);
            setLogs([]);
            setCurrentJobId(null);
        }
    }, [isOpen, isProcessingCurrentDeck]);

    // SSE listeners per aggiornamenti real-time
    const sseListeners = useMemo(() => {
        if (!currentJobId) return [];
        
        return [
            {
                event: 'pdf-progress',
                handler: (payload: SSEPayload<any>) => {
                    const data = payload?.data;
                    if (!data || typeof data !== 'object') return;

                    if (data.step === 'analyzing' || data.step === 'blueprint') {
                        const newProgress = {
                            step: 'analyzing' as const,
                            message: data.message || 'Analisi del documento in corso...',
                            estimatedTime: 30,
                            blueprint: data.blueprint,
                        };
                        setProgress(prev => ({ ...prev, ...newProgress }));
                        updateJob(currentJobId, {
                            step: 'analyzing',
                            message: data.message || 'Analisi del documento in corso...',
                            blueprint: data.blueprint,
                        });
                        if (data.message) {
                            addLogMemo(data.message, 'analysis', Brain);
                        }
                        if (data.blueprint?.mainTopics) {
                            addLogMemo(`Trovati ${data.blueprint.mainTopics.length} argomenti principali`, 'success', Target);
                        }
                    } else if (data.step === 'chunking') {
                        const newProgress = {
                            step: 'processing' as const,
                            message: data.message || 'Preparazione del contenuto...',
                            totalChunks: data.totalChunks || 0,
                            estimatedTime: (data.totalChunks || 0) * 5 + 20,
                        };
                        setProgress(prev => ({ ...prev, ...newProgress }));
                        updateJob(currentJobId, {
                            step: 'processing',
                            message: data.message || 'Preparazione del contenuto...',
                            totalChunks: data.totalChunks || 0,
                        });
                        if (data.message) {
                            addLogMemo(data.message, 'info', FileText);
                        }
                        if (data.totalChunks) {
                            addLogMemo(`Documento diviso in ${data.totalChunks} sezioni`, 'info', BookOpen);
                        }
                    } else if (data.step === 'concepts') {
                        setProgress(prev => ({
                            ...prev,
                            concepts: data.concepts || prev.concepts,
                        }));
                        updateJob(currentJobId, {
                            concepts: data.concepts,
                        });
                        if (data.message) {
                            addLogMemo(data.message, 'analysis', Lightbulb);
                        }
                        if (data.concepts && data.concepts.length > 0) {
                            addLogMemo(`Estratti ${data.concepts.length} concetti chiave`, 'success', Target);
                        }
                    } else if (data.step === 'generating') {
                        const progress_pct = data.totalChunks 
                            ? Math.round(((data.currentChunk || 0) / data.totalChunks) * 100)
                            : 0;
                        
                        const newProgress = {
                            step: 'generating' as const,
                            message: data.message || 'Generazione delle flashcard...',
                            currentChunk: data.currentChunk || 0,
                            totalChunks: data.totalChunks || progress.totalChunks || 0,
                            generatedCount: data.generatedSoFar || 0,
                            currentTopic: data.currentTopic || progress.currentTopic,
                            progress: progress_pct,
                        };
                        setProgress(prev => ({ ...prev, ...newProgress }));
                        updateJob(currentJobId, {
                            step: 'generating',
                            message: data.message || 'Generazione delle flashcard...',
                            currentChunk: data.currentChunk || 0,
                            totalChunks: data.totalChunks || progress.totalChunks || 0,
                            generatedCount: data.generatedSoFar || 0,
                            currentTopic: data.currentTopic || progress.currentTopic,
                            progress: progress_pct,
                        });
                        if (data.currentTopic && data.currentTopic !== progress.currentTopic) {
                            addLogMemo(`Elaborando: ${data.currentTopic}`, 'info', TrendingUp);
                        }
                        if (data.generatedSoFar && data.generatedSoFar % 5 === 0) {
                            addLogMemo(`${data.generatedSoFar} flashcard generate finora`, 'success', Zap);
                        }
                    } else if (data.step === 'completed') {
                        const totalCards = data.totalCards || progress.generatedCount || 0;
                        setProgress(prev => ({
                            ...prev,
                            step: 'completed',
                            progress: 100,
                            generatedCount: totalCards,
                            message: 'Completato!',
                        }));
                        addLogMemo(`Generazione completata! ${totalCards} flashcard create`, 'success', CheckCircle2);
                        
                        // Complete job in context
                        completeJob(currentJobId, totalCards);
                        
                        // Call onSuccess callback
                        setTimeout(() => {
                            onSuccess(totalCards);
                        }, 1500);
                    }
                },
            },
        ];
    }, [currentJobId, progress, addLogMemo, updateJob, completeJob, onSuccess]);

    useSSE('/api/sse/stream', sseListeners);

    const handleClose = useCallback(() => {
        const isProcessing = ['uploading', 'analyzing', 'processing', 'generating'].includes(progress.step);
        
        if (isProcessing && currentJobId) {
            dismissToBackground();
        }
        
        onClose();
    }, [progress.step, currentJobId, dismissToBackground, onClose]);

    const handleDismissToBackground = useCallback(() => {
        if (currentJobId) {
            dismissToBackground();
        }
        onClose();
    }, [currentJobId, dismissToBackground, onClose]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Seleziona un file PDF valido');
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleRemoveFile = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleChangeFile = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (progress.step !== 'idle') return;

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            setFile(droppedFile);
            setError(null);
        } else {
            setError('Seleziona un file PDF valido');
        }
    }, [progress.step]);

    const handleSubmit = useCallback(async () => {
        if (!file || progress.step !== 'idle') return;

        try {
            const jobId = startJob({
                deckId,
                deckTitle,
                fileName: file.name,
                maxCards,
            });
            setCurrentJobId(jobId);

            setProgress({ step: 'uploading', message: 'Caricamento del file...', estimatedTime: 10 });
            addLogMemo('Inizio caricamento PDF...', 'info', Upload);

            await studyService.generateFromPDF(deckId, file, { maxCards });
            addLogMemo('File caricato con successo', 'success', CheckCircle2);
        } catch (err: any) {
            const errorMsg = err.message || 'Errore durante la generazione';
            setError(errorMsg);
            setProgress({ step: 'error', message: errorMsg });
            addLogMemo(`Errore: ${errorMsg}`, 'warning', AlertCircle);
            emitToast.error(errorMsg, { title: 'Generazione fallita' });
            
            if (currentJobId) {
                failJob(currentJobId, errorMsg);
            }
        }
    }, [file, deckId, deckTitle, maxCards, progress.step, startJob, addLogMemo, currentJobId, failJob]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const getStepConfig = (step: AnalysisStep) => {
        switch (step) {
            case 'idle':
                return { icon: Upload, label: 'Carica PDF', color: 'text-blue-500 dark:text-blue-400' };
            case 'uploading':
                return { icon: Upload, label: 'Caricamento...', color: 'text-blue-500 dark:text-blue-400' };
            case 'analyzing':
                return { icon: Brain, label: 'Analisi AI', color: 'text-violet-500 dark:text-violet-400' };
            case 'processing':
                return { icon: FileText, label: 'Elaborazione', color: 'text-indigo-500 dark:text-indigo-400' };
            case 'generating':
                return { icon: Zap, label: 'Generazione', color: 'text-amber-500 dark:text-amber-400' };
            case 'completed':
                return { icon: CheckCircle2, label: 'Completato', color: 'text-emerald-500 dark:text-emerald-400' };
            case 'error':
                return { icon: AlertCircle, label: 'Errore', color: 'text-red-500 dark:text-red-400' };
        }
    };

    const stepConfig = getStepConfig(progress.step);
    const isProcessing = ['uploading', 'analyzing', 'processing', 'generating'].includes(progress.step);
    const isCompleted = progress.step === 'completed';

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={handleClose}
                style={{ backgroundColor: 'var(--bg-overlay)' }}
            >
                {/* Backdrop blur */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                    style={{ WebkitBackdropFilter: 'blur(30px)' }}
                />

                {/* Modal Window - Theme Aware */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ 
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg bg-theme-elevated backdrop-blur-3xl rounded-3xl border border-theme-default shadow-theme-lg overflow-hidden"
                    style={{ 
                        WebkitBackdropFilter: 'blur(50px)',
                        backdropFilter: 'blur(50px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-theme-elevated/80">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-500/15 border border-primary-500/30">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary">Silvi AI</h2>
                                <p className="text-xs text-theme-muted">Mazzo: {deckTitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Minimize button during processing */}
                            {isProcessing && (
                                <button
                                    onClick={handleDismissToBackground}
                                    className="p-2 rounded-lg hover:bg-theme-surface transition-colors group"
                                    title="Continua in background"
                                >
                                    <Minimize2 className="w-4 h-4 text-theme-muted group-hover:text-theme-primary" />
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
                            >
                                <X className="w-5 h-5 text-theme-muted hover:text-theme-primary" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-theme-elevated/40">
                        {/* Background Mode Banner */}
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3"
                            >
                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                <p className="text-sm text-primary-700 dark:text-primary-300 flex-1">
                                    Generazione in corso... Puoi chiudere e continuare ad usare l&apos;app
                                </p>
                                <button
                                    onClick={handleDismissToBackground}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-700 dark:text-primary-300 transition-colors"
                                >
                                    Minimizza
                                </button>
                            </motion.div>
                        )}

                        {/* AI Algorithm Explanation - Solo quando idle */}
                        {progress.step === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-2xl bg-theme-surface border border-theme-default backdrop-blur-xl"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30">
                                        <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-theme-primary mb-1">Cosa fa Silvi AI?</h3>
                                        <p className="text-xs text-theme-muted mb-3">
                                            Analizza il tuo PDF e genera domande intelligenti in vari passaggi:
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 text-xs">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mt-0.5">
                                            <span className="text-violet-600 dark:text-violet-400 font-semibold text-[10px]">1</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-theme-primary font-medium mb-0.5">Analisi Strutturale</p>
                                            <p className="text-theme-muted leading-relaxed">
                                                Identifica la struttura del documento e i principali argomenti per creare un contesto per l&apos;analisi.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-xs">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mt-0.5">
                                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px]">2</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-theme-primary font-medium mb-0.5">Estrazione Concetti Chiave</p>
                                            <p className="text-theme-muted leading-relaxed">
                                                Estraggo i concetti dai vari argomenti per evitare duplicati e garantire varietà nelle domande.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 text-xs">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mt-0.5">
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-[10px]">3</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-theme-primary font-medium mb-0.5">Controllo Qualità</p>
                                            <p className="text-theme-muted leading-relaxed">
                                                Rimuovo automaticamente le domande duplicate o troppo simili per garantire qualità e accuratezza.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-theme-subtle">
                                    <p className="text-[10px] text-theme-muted leading-relaxed">
                                        💡 <span className="text-theme-secondary font-medium">Risultato:</span> Riceverai flashcard di alta qualità, uniche e ottimizzate per lo studio efficace con il sistema di ripetizione spaziata.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Upload Area */}
                        {progress.step === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div
                                    onDragEnter={!file ? handleDragEnter : undefined}
                                    onDragLeave={!file ? handleDragLeave : undefined}
                                    onDragOver={!file ? handleDragOver : undefined}
                                    onDrop={!file ? handleDrop : undefined}
                                    onClick={() => !file && fileInputRef.current?.click()}
                                    className={`
                                        relative w-full h-48 rounded-2xl border-2 border-dashed transition-all duration-300
                                        flex flex-col items-center justify-center gap-4
                                        ${file 
                                            ? 'border-emerald-500/50 bg-emerald-500/10 cursor-default'
                                            : isDragging 
                                                ? 'border-primary-500/50 bg-primary-500/10 cursor-pointer'
                                                : 'border-theme-default bg-theme-surface hover:border-primary-500/50 hover:bg-theme-surface/80 cursor-pointer'
                                        }
                                    `}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    {file ? (
                                        <>
                                            <FileText className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                            <div className="text-center px-4">
                                                <p className="text-sm font-medium text-theme-primary">{file.name}</p>
                                                <p className="text-xs text-theme-muted mt-1">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            {progress.step === 'idle' && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={handleChangeFile}
                                                        className="px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface/80 border border-theme-default text-theme-primary text-xs font-medium transition-colors flex items-center gap-1.5"
                                                        type="button"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Cambia
                                                    </button>
                                                    <button
                                                        onClick={handleRemoveFile}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                                                        type="button"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Rimuovi
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-theme-muted" />
                                            <div className="text-center px-4">
                                                <p className="text-sm font-medium text-theme-secondary">
                                                    Trascina il PDF qui
                                                </p>
                                                <p className="text-xs text-theme-muted mt-1">
                                                    oppure clicca per selezionare
                                                </p>
                                            </div>
                                        </>
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

                                <div className="p-3 rounded-xl bg-theme-surface border border-theme-default">
                                    <label className="block text-xs font-medium text-theme-secondary mb-2">
                                        Quantità target flashcard
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {CARD_TARGET_OPTIONS.map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setMaxCards(option)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                    maxCards === option
                                                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-700 dark:text-primary-300'
                                                        : 'bg-theme-surface border-theme-default text-theme-secondary hover:bg-theme-surface/80 hover:text-theme-primary'
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-theme-muted mt-2">
                                        La generazione si adatta al contenuto, ma non supererà il target scelto.
                                    </p>
                                </div>

                                {file && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={handleSubmit}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
                                    >
                                        Inizia Generazione
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* Processing State */}
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Header con Tempo Trascorso */}
                                <div className="flex items-center justify-between pb-4 border-b border-theme-subtle">
                                    <div>
                                        <h3 className="text-lg font-semibold text-theme-primary mb-1">{stepConfig.label}</h3>
                                        {progress.message && (
                                            <p className="text-sm text-theme-muted">{progress.message}</p>
                                        )}
                                    </div>
                                    {progress.elapsedTime !== undefined && (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 backdrop-blur-sm">
                                            <motion.div
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="w-2 h-2 rounded-full bg-primary-500"
                                            />
                                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                                {formatTime(progress.elapsedTime)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline delle Fasi */}
                                <div className="space-y-6">
                                    {/* Fase 1: Uploading */}
                                    <div className="relative">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 relative">
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                    ${progress.step === 'uploading' 
                                                        ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                        : ['analyzing', 'processing', 'generating', 'completed'].includes(progress.step)
                                                        ? 'bg-primary-500/10 border border-primary-500/30'
                                                        : 'bg-theme-surface border border-theme-default'
                                                    }
                                                `}>
                                                    {progress.step === 'uploading' ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                        >
                                                            <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                        </motion.div>
                                                    ) : ['analyzing', 'processing', 'generating', 'completed'].includes(progress.step) ? (
                                                        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-theme-muted" />
                                                    )}
                                                </div>
                                                {!['idle', 'uploading'].includes(progress.step) && (
                                                    <div className="absolute left-5 top-10 w-0.5 h-full bg-primary-500/30" />
                                                )}
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-sm font-medium text-theme-primary">Caricamento PDF</p>
                                                    {progress.step === 'uploading' && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">In corso...</span>
                                                    )}
                                                    {['analyzing', 'processing', 'generating', 'completed'].includes(progress.step) && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Completato</span>
                                                    )}
                                                </div>
                                                {progress.step === 'uploading' && (
                                                    <div className="h-1 bg-theme-surface rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: '100%' }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                                                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fase 2: Analyzing */}
                                    <div className="relative">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 relative">
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                    ${progress.step === 'analyzing' 
                                                        ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                        : ['processing', 'generating', 'completed'].includes(progress.step)
                                                        ? 'bg-primary-500/10 border border-primary-500/30'
                                                        : 'bg-theme-surface border border-theme-default'
                                                    }
                                                `}>
                                                    {progress.step === 'analyzing' ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                                        >
                                                            <Brain className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                        </motion.div>
                                                    ) : ['processing', 'generating', 'completed'].includes(progress.step) ? (
                                                        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                    ) : (
                                                        <Brain className="w-5 h-5 text-theme-muted" />
                                                    )}
                                                </div>
                                                {!['idle', 'uploading', 'analyzing'].includes(progress.step) && (
                                                    <div className="absolute left-5 top-10 w-0.5 h-full bg-primary-500/30" />
                                                )}
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-sm font-medium text-theme-primary">Analisi Strutturale</p>
                                                    {progress.step === 'analyzing' && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">In corso...</span>
                                                    )}
                                                    {['processing', 'generating', 'completed'].includes(progress.step) && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Completato</span>
                                                    )}
                                                </div>
                                                {progress.blueprint?.mainTopics && progress.blueprint.mainTopics.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {progress.blueprint.mainTopics.slice(0, 3).map((topic, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20 text-xs text-primary-700 dark:text-primary-300"
                                                            >
                                                                {topic}
                                                            </span>
                                                        ))}
                                                        {progress.blueprint.mainTopics.length > 3 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-theme-surface text-xs text-theme-muted">
                                                                +{progress.blueprint.mainTopics.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fase 3: Processing */}
                                    <div className="relative">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 relative">
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                    ${progress.step === 'processing' 
                                                        ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                        : ['generating', 'completed'].includes(progress.step)
                                                        ? 'bg-primary-500/10 border border-primary-500/30'
                                                        : 'bg-theme-surface border border-theme-default'
                                                    }
                                                `}>
                                                    {progress.step === 'processing' ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                        >
                                                            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                        </motion.div>
                                                    ) : ['generating', 'completed'].includes(progress.step) ? (
                                                        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                    ) : (
                                                        <FileText className="w-5 h-5 text-theme-muted" />
                                                    )}
                                                </div>
                                                {!['idle', 'uploading', 'analyzing', 'processing'].includes(progress.step) && (
                                                    <div className="absolute left-5 top-10 w-0.5 h-full bg-primary-500/30" />
                                                )}
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-sm font-medium text-theme-primary">Elaborazione Contenuto</p>
                                                    {progress.step === 'processing' && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">In corso...</span>
                                                    )}
                                                    {['generating', 'completed'].includes(progress.step) && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Completato</span>
                                                    )}
                                                </div>
                                                {progress.totalChunks && (
                                                    <p className="text-xs text-theme-muted mt-1">
                                                        {progress.currentChunk || 0} / {progress.totalChunks} sezioni elaborate
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fase 4: Generating */}
                                    <div className="relative">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                    ${progress.step === 'generating' 
                                                        ? 'bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20' 
                                                        : progress.step === 'completed'
                                                        ? 'bg-primary-500/10 border border-primary-500/30'
                                                        : 'bg-theme-surface border border-theme-default'
                                                    }
                                                `}>
                                                    {progress.step === 'generating' ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                                        >
                                                            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                        </motion.div>
                                                    ) : progress.step === 'completed' ? (
                                                        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                                    ) : (
                                                        <Zap className="w-5 h-5 text-theme-muted" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-sm font-medium text-theme-primary">Generazione Flashcard</p>
                                                    {progress.step === 'generating' && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">In corso...</span>
                                                    )}
                                                    {progress.step === 'completed' && (
                                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Completato</span>
                                                    )}
                                                </div>
                                                {progress.progress !== undefined && (
                                                    <div className="space-y-1.5 mt-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-theme-secondary">Progresso</span>
                                                            <span className="text-primary-700 dark:text-primary-300 font-medium">{progress.progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress.progress}%` }}
                                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {progress.generatedCount !== undefined && (
                                                    <p className="text-xs text-theme-muted mt-2">
                                                        {progress.generatedCount} flashcard generate
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme-subtle">
                                    {progress.generatedCount !== undefined && (
                                        <div className="p-4 rounded-xl bg-theme-surface border border-theme-default backdrop-blur-xl">
                                            <p className="text-xs text-theme-muted mb-1">Flashcard generate</p>
                                            <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{progress.generatedCount}</p>
                                        </div>
                                    )}
                                    {progress.totalChunks && (
                                        <div className="p-4 rounded-xl bg-theme-surface border border-theme-default backdrop-blur-xl">
                                            <p className="text-xs text-theme-muted mb-1">Sezioni elaborate</p>
                                            <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                                                {progress.currentChunk || 0} / {progress.totalChunks}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Real-time Logs */}
                                {logs.length > 0 && (
                                    <div className="p-4 rounded-xl bg-theme-surface border border-theme-default backdrop-blur-xl max-h-48 overflow-y-auto custom-scrollbar">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                            <p className="text-xs font-semibold text-theme-secondary">Log Analisi AI</p>
                                        </div>
                                        <div className="space-y-2">
                                            <AnimatePresence>
                                                {logs.map((log) => {
                                                    const LogIcon = log.icon || FileText;
                                                    return (
                                                        <motion.div
                                                            key={log.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 10 }}
                                                            className="flex items-start gap-2 text-xs"
                                                        >
                                                            <LogIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                                                log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                                                log.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                                log.type === 'analysis' ? 'text-primary-600 dark:text-primary-400' :
                                                                'text-theme-muted'
                                                            }`} />
                                                            <p className={`flex-1 ${
                                                                log.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                                                                log.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                                                                log.type === 'analysis' ? 'text-primary-700 dark:text-primary-300' :
                                                                'text-theme-secondary'
                                                            }`}>
                                                                {log.message}
                                                            </p>
                                                            <span className="text-theme-muted text-[10px]">
                                                                {new Date(log.timestamp).toLocaleTimeString('it-IT', { 
                                                                    hour: '2-digit', 
                                                                    minute: '2-digit',
                                                                    second: '2-digit'
                                                                })}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                            <div ref={logsEndRef} />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Completed State */}
                        {isCompleted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center gap-4 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-xl"
                                >
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-semibold text-theme-primary mb-1">
                                        Generazione completata!
                                    </h3>
                                    <p className="text-sm text-theme-muted">
                                        {progress.generatedCount || 0} flashcard generate con successo
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                                >
                                    Chiudi
                                </button>
                            </motion.div>
                        )}

                        {/* Error State */}
                        {progress.step === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-4 text-center"
                            >
                                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 backdrop-blur-xl">
                                    <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-theme-primary mb-1">Errore</h3>
                                    <p className="text-sm text-theme-muted">{error || 'Si è verificato un errore'}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setProgress({ step: 'idle' });
                                        setError(null);
                                        setLogs([]);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface/80 border border-theme-default text-theme-primary text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                    Riprova
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MagicGenerateModal;
