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
    Minimize2,
    Clock3,
    Gauge,
    Layers3
} from 'lucide-react';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { useSSE } from '../../../../hooks/useSSE';
import { useFlashcardGeneration } from '../../context/FlashcardGenerationContext';
import { parseMagicProgressEvent } from './magicGenerateEvents';

interface MagicGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void | Promise<void>;
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

type PipelinePhase = {
    key: 'uploading' | 'analyzing' | 'processing' | 'generating';
    label: string;
    description: string;
    icon: React.ElementType;
    accent: string;
};

const PIPELINE_PHASES: PipelinePhase[] = [
    {
        key: 'uploading',
        label: 'Upload',
        description: 'Carico e valido il PDF',
        icon: Upload,
        accent: 'from-sky-500 to-cyan-500',
    },
    {
        key: 'analyzing',
        label: 'Analisi',
        description: 'Capisco struttura e argomenti',
        icon: Brain,
        accent: 'from-violet-500 to-fuchsia-500',
    },
    {
        key: 'processing',
        label: 'Chunking',
        description: 'Divido il materiale in sezioni',
        icon: Layers3,
        accent: 'from-indigo-500 to-blue-500',
    },
    {
        key: 'generating',
        label: 'Generazione',
        description: 'Creo e deduplico le card',
        icon: Zap,
        accent: 'from-amber-500 to-orange-500',
    },
];

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
    const [progress, setProgress] = useState<ProgressData>({ step: 'idle' });
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const completionHandledRef = useRef(false);

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
            setProgress({ step: 'idle' });
            setError(null);
            setLogs([]);
            setCurrentJobId(null);
            completionHandledRef.current = false;
        }
    }, [isOpen, isProcessingCurrentDeck]);

    // SSE listeners per aggiornamenti real-time
    const sseListeners = useMemo(() => {
        if (!currentJobId) return [];
        
        return [
            {
                event: 'pdf-progress',
                handler: (payload) => {
                    const event = parseMagicProgressEvent(payload?.data);
                    if (!event) return;

                    switch (event.step) {
                        case 'analyzing': {
                            const message = event.message || 'Analisi del documento in corso...';
                            setProgress((prev) => ({
                                ...prev,
                                step: 'analyzing',
                                message,
                                estimatedTime: 30,
                                blueprint: event.blueprint ?? prev.blueprint,
                            }));
                            updateJob(currentJobId, {
                                step: 'analyzing',
                                message,
                                blueprint: event.blueprint,
                            });
                            if (event.message) {
                                addLogMemo(event.message, 'analysis', Brain);
                            }
                            if (event.blueprint?.mainTopics?.length) {
                                addLogMemo(
                                    `Trovati ${event.blueprint.mainTopics.length} argomenti principali`,
                                    'success',
                                    Target
                                );
                            }
                            return;
                        }

                        case 'chunking': {
                            const message = event.message || 'Preparazione del contenuto...';
                            setProgress((prev) => ({
                                ...prev,
                                step: 'processing',
                                message,
                                totalChunks: event.totalChunks,
                                estimatedTime: event.totalChunks * 5 + 20,
                            }));
                            updateJob(currentJobId, {
                                step: 'processing',
                                message,
                                totalChunks: event.totalChunks,
                            });
                            if (event.message) {
                                addLogMemo(event.message, 'info', FileText);
                            }
                            if (event.totalChunks > 0) {
                                addLogMemo(`Documento diviso in ${event.totalChunks} sezioni`, 'info', BookOpen);
                            }
                            return;
                        }

                        case 'concepts': {
                            setProgress((prev) => ({
                                ...prev,
                                concepts: event.concepts.length > 0 ? event.concepts : prev.concepts,
                            }));
                            if (event.concepts.length > 0) {
                                updateJob(currentJobId, { concepts: event.concepts });
                            }
                            if (event.message) {
                                addLogMemo(event.message, 'analysis', Lightbulb);
                            }
                            if (event.concepts.length > 0) {
                                addLogMemo(`Estratti ${event.concepts.length} concetti chiave`, 'success', Target);
                            }
                            return;
                        }

                        case 'generating': {
                            const totalChunks = event.totalChunks || progress.totalChunks || 0;
                            const currentTopic = event.currentTopic || progress.currentTopic;
                            const progressPct = totalChunks
                                ? Math.round((event.currentChunk / totalChunks) * 100)
                                : 0;

                            setProgress((prev) => ({
                                ...prev,
                                step: 'generating',
                                message: event.message || 'Generazione delle flashcard...',
                                currentChunk: event.currentChunk,
                                totalChunks,
                                generatedCount: event.generatedSoFar,
                                currentTopic,
                                progress: progressPct,
                            }));
                            updateJob(currentJobId, {
                                step: 'generating',
                                message: event.message || 'Generazione delle flashcard...',
                                currentChunk: event.currentChunk,
                                totalChunks,
                                generatedCount: event.generatedSoFar,
                                currentTopic,
                                progress: progressPct,
                            });
                            if (event.currentTopic && event.currentTopic !== progress.currentTopic) {
                                addLogMemo(`Elaborando: ${event.currentTopic}`, 'info', TrendingUp);
                            }
                            if (event.generatedSoFar > 0 && event.generatedSoFar % 5 === 0) {
                                addLogMemo(`${event.generatedSoFar} flashcard generate finora`, 'success', Zap);
                            }
                            return;
                        }

                        case 'completed': {
                            if (completionHandledRef.current) {
                                return;
                            }
                            completionHandledRef.current = true;

                            const totalCards = event.totalCards || progress.generatedCount || 0;
                            setProgress((prev) => ({
                                ...prev,
                                step: 'completed',
                                progress: 100,
                                generatedCount: totalCards,
                                message: 'Completato!',
                            }));
                            addLogMemo(
                                `Generazione completata! ${totalCards} flashcard create`,
                                'success',
                                CheckCircle2
                            );
                            completeJob(currentJobId, totalCards);
                            setTimeout(() => {
                                Promise.resolve(onSuccess(totalCards))
                                    .finally(() => {
                                        onClose();
                                    });
                            }, 1200);
                        }
                    }
                },
            },
        ];
    }, [currentJobId, progress, addLogMemo, updateJob, completeJob, onSuccess, onClose]);

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

    const estimatedAutoCards = useMemo(() => {
        if (!file) return 0;
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb <= 1.5) return 24;
        if (sizeMb <= 3) return 32;
        if (sizeMb <= 6) return 44;
        if (sizeMb <= 9) return 58;
        return 72;
    }, [file]);

    const estimatedDuration = useMemo(() => {
        if (!file) return '45-100 secondi';
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb <= 1.5) return '35-60 secondi';
        if (sizeMb <= 3) return '50-80 secondi';
        if (sizeMb <= 6) return '70-110 secondi';
        if (sizeMb <= 9) return '90-140 secondi';
        return '120-170 secondi';
    }, [file]);

    const handleSubmit = useCallback(async () => {
        if (!file || progress.step !== 'idle') return;

        let startedJobId: string | null = null;
        try {
            completionHandledRef.current = false;
            const jobId = startJob({
                deckId,
                deckTitle,
                fileName: file.name,
                maxCards: estimatedAutoCards,
            });
            startedJobId = jobId;
            setCurrentJobId(jobId);

            setProgress({ step: 'uploading', message: 'Caricamento del file...', estimatedTime: 10 });
            addLogMemo('Inizio caricamento PDF...', 'info', Upload);

            await studyService.generateFromPDF(deckId, file);
            addLogMemo('File caricato con successo', 'success', CheckCircle2);
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Errore durante la generazione';
            setError(errorMsg);
            setProgress({ step: 'error', message: errorMsg });
            addLogMemo(`Errore: ${errorMsg}`, 'warning', AlertCircle);
            emitToast.error(errorMsg, { title: 'Generazione fallita' });
            
            if (startedJobId) {
                failJob(startedJobId, errorMsg);
            }
        }
    }, [file, deckId, deckTitle, progress.step, startJob, addLogMemo, failJob, estimatedAutoCards]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const stepOrder: Record<AnalysisStep, number> = {
        idle: 0,
        uploading: 1,
        analyzing: 2,
        processing: 3,
        generating: 4,
        completed: 5,
        error: 0,
    };

    const stepLabel: Record<AnalysisStep, string> = {
        idle: 'Pronto alla generazione',
        uploading: 'Upload documento',
        analyzing: 'Analisi strutturale',
        processing: 'Preparazione contenuto',
        generating: 'Generazione flashcard',
        completed: 'Operazione completata',
        error: 'Operazione interrotta',
    };

    const isProcessing = ['uploading', 'analyzing', 'processing', 'generating'].includes(progress.step);
    const isCompleted = progress.step === 'completed';
    const elapsedSeconds = progress.elapsedTime ?? activeJob?.elapsedTime ?? 0;
    const currentStepPosition = stepOrder[progress.step];
    const cardsPerMinute = elapsedSeconds > 20 && (progress.generatedCount || 0) > 0
        ? Math.round(((progress.generatedCount || 0) / elapsedSeconds) * 60)
        : null;

    const pipelineProgress = useMemo(() => {
        if (progress.step === 'completed') return 100;
        if (typeof progress.progress === 'number') return Math.max(0, Math.min(100, progress.progress));
        if (progress.step === 'generating' && progress.totalChunks && progress.totalChunks > 0) {
            return Math.max(
                65,
                Math.min(98, Math.round(((progress.currentChunk || 0) / progress.totalChunks) * 100))
            );
        }
        if (progress.step === 'uploading') return 12;
        if (progress.step === 'analyzing') return 32;
        if (progress.step === 'processing') return 55;
        if (progress.step === 'generating') return 78;
        return 0;
    }, [progress.step, progress.progress, progress.totalChunks, progress.currentChunk]);

    const getPhaseState = useCallback((phaseIndex: number) => {
        if (progress.step === 'completed') return 'done' as const;
        if (progress.step === 'error') return 'pending' as const;

        const currentPhaseIndex = Math.max(0, Math.min(PIPELINE_PHASES.length - 1, currentStepPosition - 1));
        if (!isProcessing) return 'pending' as const;
        if (phaseIndex < currentPhaseIndex) return 'done' as const;
        if (phaseIndex === currentPhaseIndex) return 'active' as const;
        return 'pending' as const;
    }, [progress.step, currentStepPosition, isProcessing]);

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
                    className="relative w-full max-w-5xl bg-theme-elevated rounded-3xl border border-theme-default shadow-theme-lg overflow-hidden"
                    style={{ 
                        WebkitBackdropFilter: 'blur(34px)',
                        backdropFilter: 'blur(34px)',
                    }}
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-primary-500/20 to-cyan-500/10 blur-3xl" />
                        <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-500/20 to-rose-500/10 blur-3xl" />
                    </div>

                    {/* Header */}
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-theme-elevated/90">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary tracking-tight">Silvi AI Generator Lab</h2>
                                <p className="text-xs text-theme-muted uppercase tracking-[0.16em]">Deck: {deckTitle}</p>
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
                    <div className="relative p-5 md:p-7 space-y-6 bg-theme-elevated/40">
                        {/* Background Mode Banner */}
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3"
                            >
                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                <p className="text-sm text-primary-700 dark:text-primary-300 flex-1">
                                    Generazione in corso: puoi minimizzare e continuare ad usare l&apos;app.
                                </p>
                                <button
                                    onClick={handleDismissToBackground}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-700 dark:text-primary-300 transition-colors"
                                >
                                    Minimizza
                                </button>
                            </motion.div>
                        )}

                        {progress.step === 'idle' && (
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
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    <div
                                        onDragEnter={!file ? handleDragEnter : undefined}
                                        onDragLeave={!file ? handleDragLeave : undefined}
                                        onDragOver={!file ? handleDragOver : undefined}
                                        onDrop={!file ? handleDrop : undefined}
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
                                                        onClick={handleChangeFile}
                                                        className="px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface/80 border border-theme-default text-theme-primary text-xs font-medium transition-colors flex items-center gap-1.5"
                                                        type="button"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Sostituisci
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
                                        onClick={handleSubmit}
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
                        )}

                        {/* Processing State */}
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid gap-6 lg:grid-cols-12"
                            >
                                <section className="lg:col-span-8 space-y-4">
                                    <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.15em] text-theme-muted mb-1">Control Center</p>
                                                <h3 className="text-xl font-semibold text-theme-primary tracking-tight">{stepLabel[progress.step]}</h3>
                                                <p className="text-sm text-theme-muted mt-1">{progress.message || 'Elaborazione in corso...'}</p>
                                            </div>
                                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                                <Gauge className="w-4 h-4 text-primary-600 dark:text-primary-300" />
                                                <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{pipelineProgress}%</span>
                                            </div>
                                        </div>

                                        <div className="h-2 rounded-full bg-theme-elevated overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pipelineProgress}%` }}
                                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-amber-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {PIPELINE_PHASES.map((phase, index) => {
                                            const state = getPhaseState(index);
                                            const PhaseIcon = phase.icon;
                                            const isActive = state === 'active';
                                            const isDone = state === 'done';

                                            return (
                                                <div
                                                    key={phase.key}
                                                    className={`rounded-xl border p-3 transition-all ${
                                                        isActive
                                                            ? 'border-primary-500/45 bg-primary-500/10'
                                                            : isDone
                                                                ? 'border-emerald-500/35 bg-emerald-500/10'
                                                                : 'border-theme-default bg-theme-elevated/50'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-1.5 rounded-lg ${
                                                            isDone
                                                                ? 'bg-emerald-500/20'
                                                                : isActive
                                                                    ? `bg-gradient-to-br ${phase.accent} text-white`
                                                                    : 'bg-theme-surface'
                                                        }`}>
                                                            {isDone ? (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <PhaseIcon className="w-4 h-4 text-current" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-theme-primary">{phase.label}</p>
                                                            <p className="text-xs text-theme-muted">{phase.description}</p>
                                                            <p className={`text-[11px] mt-1 font-medium ${
                                                                isDone
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : isActive
                                                                        ? 'text-primary-700 dark:text-primary-300'
                                                                        : 'text-theme-muted'
                                                            }`}>
                                                                {isDone ? 'Completato' : isActive ? 'In esecuzione' : 'In coda'}
                                                            </p>
                                                        </div>
                                                    </div>
                                        </div>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-muted">Event Stream</p>
                                            <span className="text-xs text-theme-muted">{logs.length} eventi</span>
                                        </div>
                                        {logs.length === 0 ? (
                                            <p className="text-xs text-theme-muted">Nessun evento ancora registrato.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                                <AnimatePresence>
                                                    {logs.map((log) => {
                                                        const LogIcon = log.icon || FileText;
                                                        return (
                                                            <motion.div
                                                                key={log.id}
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -8 }}
                                                                className="rounded-lg border border-theme-subtle bg-theme-elevated/80 px-3 py-2"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <LogIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                                                        log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                                                        log.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                                        log.type === 'analysis' ? 'text-primary-600 dark:text-primary-400' :
                                                                        'text-theme-muted'
                                                                    }`} />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs text-theme-secondary leading-relaxed">{log.message}</p>
                                                                        <p className="text-[10px] text-theme-muted mt-1">
                                                                            {new Date(log.timestamp).toLocaleTimeString('it-IT', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                second: '2-digit',
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                                <div ref={logsEndRef} />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <aside className="lg:col-span-4 space-y-4">
                                    <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4 space-y-3">
                                        <p className="text-xs font-semibold text-theme-secondary uppercase tracking-[0.14em]">Telemetria</p>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                                                <p className="text-[11px] text-theme-muted mb-1">Flashcard</p>
                                                <p className="text-2xl font-semibold text-theme-primary">{progress.generatedCount || 0}</p>
                                            </div>
                                            <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                                                <p className="text-[11px] text-theme-muted mb-1">Fase</p>
                                                <p className="text-sm font-semibold text-theme-primary">{currentStepPosition}/5</p>
                                            </div>
                                            <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                                                <p className="text-[11px] text-theme-muted mb-1">Tempo</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock3 className="w-3.5 h-3.5 text-theme-muted" />
                                                    <p className="text-sm font-semibold text-theme-primary">{formatTime(elapsedSeconds)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                                                <p className="text-[11px] text-theme-muted mb-1">Velocità</p>
                                                <p className="text-sm font-semibold text-theme-primary">
                                                    {cardsPerMinute ? `${cardsPerMinute}/min` : '--'}
                                                </p>
                                            </div>
                                        </div>

                                        {progress.totalChunks ? (
                                            <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                                                <p className="text-[11px] text-theme-muted mb-1">Sezioni elaborate</p>
                                                <p className="text-sm font-semibold text-theme-primary">
                                                    {(progress.currentChunk || 0)} / {progress.totalChunks}
                                                </p>
                                            </div>
                                        ) : null}

                                        {progress.currentTopic ? (
                                            <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-3">
                                                <p className="text-[11px] text-primary-700 dark:text-primary-300 mb-1">Topic in lavorazione</p>
                                                <p className="text-sm font-medium text-primary-700 dark:text-primary-200">{progress.currentTopic}</p>
                                            </div>
                                        ) : null}
                                    </div>

                                    {progress.blueprint?.mainTopics && progress.blueprint.mainTopics.length > 0 ? (
                                        <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4">
                                            <p className="text-xs font-semibold text-theme-secondary mb-2">Argomenti individuati</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {progress.blueprint.mainTopics.slice(0, 8).map((topic, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-[11px] text-primary-700 dark:text-primary-300"
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </aside>
                            </motion.div>
                        )}

                        {/* Completed State */}
                        {isCompleted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 md:p-8"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Mission Complete</p>
                                            <h3 className="text-2xl font-semibold text-theme-primary tracking-tight">Flashcard pronte</h3>
                                            <p className="text-sm text-theme-muted mt-1">
                                                Generate <span className="font-semibold text-theme-primary">{progress.generatedCount || 0}</span> nuove card.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-2 rounded-lg bg-theme-elevated border border-theme-subtle">
                                            <p className="text-[10px] text-theme-muted uppercase tracking-[0.12em]">Durata</p>
                                            <p className="text-sm font-semibold text-theme-primary">{formatTime(elapsedSeconds)}</p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                                        >
                                            Chiudi
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Error State */}
                        {progress.step === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-4 text-center"
                            >
                                <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30">
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
