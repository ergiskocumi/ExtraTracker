import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Brain,
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Target,
    BookOpen,
    Lightbulb,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { studyService } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { useSSE } from './useSSE';
import { useFlashcardGeneration } from '../context/FlashcardGenerationContext';
import { parseMagicProgressEvent } from '../components/Modals/magicGenerateEvents';

// ============================================================
// Types
// ============================================================

export type AnalysisStep =
    | 'idle'
    | 'uploading'
    | 'analyzing'
    | 'processing'
    | 'generating'
    | 'completed'
    | 'error';

export type LogEntry = {
    id: string;
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'analysis';
    icon?: React.ElementType;
};

export type ProgressData = {
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

export type PipelinePhase = {
    key: 'uploading' | 'analyzing' | 'processing' | 'generating';
    label: string;
    description: string;
    icon: React.ElementType;
    accent: string;
};

// ============================================================
// Constants
// ============================================================

let logIdCounter = 0;

export const PIPELINE_PHASES: PipelinePhase[] = [
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
        icon: FileText,
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

export const stepOrder: Record<AnalysisStep, number> = {
    idle: 0,
    uploading: 1,
    analyzing: 2,
    processing: 3,
    generating: 4,
    completed: 5,
    error: 0,
};

export const stepLabel: Record<AnalysisStep, string> = {
    idle: 'Pronto alla generazione',
    uploading: 'Upload documento',
    analyzing: 'Analisi strutturale',
    processing: 'Preparazione contenuto',
    generating: 'Generazione flashcard',
    completed: 'Operazione completata',
    error: 'Operazione interrotta',
};

// ============================================================
// Hook
// ============================================================

interface UseMagicGenerateOptions {
    isOpen: boolean;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void | Promise<void>;
    onClose: () => void;
}

export interface UseMagicGenerateReturn {
    // State
    file: File | null;
    isDragging: boolean;
    progress: ProgressData;
    error: string | null;
    logs: LogEntry[];
    logsEndRef: React.RefObject<HTMLDivElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;

    // Derived
    isProcessing: boolean;
    isCompleted: boolean;
    elapsedSeconds: number;
    currentStepPosition: number;
    cardsPerMinute: number | null;
    pipelineProgress: number;
    estimatedAutoCards: number;
    estimatedDuration: string;

    // Handlers
    handleClose: () => void;
    handleDismissToBackground: () => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveFile: (e: React.MouseEvent) => void;
    handleChangeFile: (e: React.MouseEvent) => void;
    handleDragEnter: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleSubmit: () => Promise<void>;
    handleRetry: () => void;
    getPhaseState: (phaseIndex: number) => 'done' | 'active' | 'pending';
    formatTime: (seconds: number) => string;
}

export function useMagicGenerate({
    isOpen,
    deckId,
    deckTitle,
    onSuccess,
    onClose,
}: UseMagicGenerateOptions): UseMagicGenerateReturn {
    const {
        activeJob,
        startJob,
        updateJob,
        completeJob,
        failJob,
        dismissToBackground,
    } = useFlashcardGeneration();

    // Local state
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState<ProgressData>({ step: 'idle' });
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const logsEndRef = useRef<HTMLDivElement | null>(null);
    const completionHandledRef = useRef(false);

    // Check if we have an active job for this deck
    const isProcessingCurrentDeck =
        activeJob?.deckId === deckId &&
        activeJob?.step !== 'completed' &&
        activeJob?.step !== 'error';

    // Funzione per aggiungere log
    const addLogMemo = useCallback(
        (message: string, type: LogEntry['type'] = 'info', icon?: React.ElementType) => {
            setLogs((prev) => [
                ...prev,
                {
                    id: `log-${++logIdCounter}`,
                    timestamp: Date.now(),
                    message,
                    type,
                    icon,
                },
            ]);
        },
        []
    );

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Sync with active job from context
    useEffect(() => {
        if (activeJob && activeJob.deckId === deckId) {
            setCurrentJobId(activeJob.id);

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
                handler: (payload: { data?: unknown }) => {
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
                                addLogMemo(
                                    `Documento diviso in ${event.totalChunks} sezioni`,
                                    'info',
                                    BookOpen
                                );
                            }
                            return;
                        }

                        case 'concepts': {
                            setProgress((prev) => ({
                                ...prev,
                                concepts:
                                    event.concepts.length > 0 ? event.concepts : prev.concepts,
                            }));
                            if (event.concepts.length > 0) {
                                updateJob(currentJobId, { concepts: event.concepts });
                            }
                            if (event.message) {
                                addLogMemo(event.message, 'analysis', Lightbulb);
                            }
                            if (event.concepts.length > 0) {
                                addLogMemo(
                                    `Estratti ${event.concepts.length} concetti chiave`,
                                    'success',
                                    Target
                                );
                            }
                            return;
                        }

                        case 'generating': {
                            setProgress((prev) => {
                                const totalChunks = event.totalChunks || prev.totalChunks || 0;
                                const currentTopic = event.currentTopic || prev.currentTopic;
                                const progressPct = totalChunks
                                    ? Math.round((event.currentChunk / totalChunks) * 100)
                                    : 0;

                                if (event.currentTopic && event.currentTopic !== prev.currentTopic) {
                                    addLogMemo(`Elaborando: ${event.currentTopic}`, 'info', TrendingUp);
                                }
                                if (event.generatedSoFar > 0 && event.generatedSoFar % 5 === 0) {
                                    addLogMemo(
                                        `${event.generatedSoFar} flashcard generate finora`,
                                        'success',
                                        Zap
                                    );
                                }

                                updateJob(currentJobId, {
                                    step: 'generating',
                                    message: event.message || 'Generazione delle flashcard...',
                                    currentChunk: event.currentChunk,
                                    totalChunks,
                                    generatedCount: event.generatedSoFar,
                                    currentTopic,
                                    progress: progressPct,
                                });

                                return {
                                    ...prev,
                                    step: 'generating',
                                    message: event.message || 'Generazione delle flashcard...',
                                    currentChunk: event.currentChunk,
                                    totalChunks,
                                    generatedCount: event.generatedSoFar,
                                    currentTopic,
                                    progress: progressPct,
                                };
                            });
                            return;
                        }

                        case 'completed': {
                            if (completionHandledRef.current) {
                                return;
                            }
                            completionHandledRef.current = true;

                            const totalCards = event.totalCards || 0;
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
                                Promise.resolve(onSuccess(totalCards)).finally(() => {
                                    onClose();
                                });
                            }, 1200);
                        }
                    }
                },
            },
        ];
    }, [currentJobId, addLogMemo, updateJob, completeJob, onSuccess, onClose]);

    useSSE('/api/sse/stream', sseListeners);

    // ---- Handlers ----

    const handleClose = useCallback(() => {
        const isProcessing = ['uploading', 'analyzing', 'processing', 'generating'].includes(
            progress.step
        );

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

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
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
        },
        [progress.step]
    );

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

            await studyService.generateFromPDF(deckId, file, { maxCards: estimatedAutoCards });
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

    const handleRetry = useCallback(() => {
        setProgress({ step: 'idle' });
        setError(null);
        setLogs([]);
    }, []);

    // ---- Derived values ----

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const isProcessing = ['uploading', 'analyzing', 'processing', 'generating'].includes(
        progress.step
    );
    const isCompleted = progress.step === 'completed';
    const elapsedSeconds = progress.elapsedTime ?? activeJob?.elapsedTime ?? 0;
    const currentStepPosition = stepOrder[progress.step];
    const cardsPerMinute =
        elapsedSeconds > 20 && (progress.generatedCount || 0) > 0
            ? Math.round(((progress.generatedCount || 0) / elapsedSeconds) * 60)
            : null;

    const pipelineProgress = useMemo(() => {
        if (progress.step === 'completed') return 100;
        if (typeof progress.progress === 'number')
            return Math.max(0, Math.min(100, progress.progress));
        if (progress.step === 'generating' && progress.totalChunks && progress.totalChunks > 0) {
            return Math.max(
                65,
                Math.min(
                    98,
                    Math.round(((progress.currentChunk || 0) / progress.totalChunks) * 100)
                )
            );
        }
        if (progress.step === 'uploading') return 12;
        if (progress.step === 'analyzing') return 32;
        if (progress.step === 'processing') return 55;
        if (progress.step === 'generating') return 78;
        return 0;
    }, [progress.step, progress.progress, progress.totalChunks, progress.currentChunk]);

    const getPhaseState = useCallback(
        (phaseIndex: number): 'done' | 'active' | 'pending' => {
            if (progress.step === 'completed') return 'done';
            if (progress.step === 'error') return 'pending';

            const currentPhaseIndex = Math.max(
                0,
                Math.min(PIPELINE_PHASES.length - 1, currentStepPosition - 1)
            );
            if (!isProcessing) return 'pending';
            if (phaseIndex < currentPhaseIndex) return 'done';
            if (phaseIndex === currentPhaseIndex) return 'active';
            return 'pending';
        },
        [progress.step, currentStepPosition, isProcessing]
    );

    return {
        // State
        file,
        isDragging,
        progress,
        error,
        logs,
        logsEndRef,
        fileInputRef,

        // Derived
        isProcessing,
        isCompleted,
        elapsedSeconds,
        currentStepPosition,
        cardsPerMinute,
        pipelineProgress,
        estimatedAutoCards,
        estimatedDuration,

        // Handlers
        handleClose,
        handleDismissToBackground,
        handleFileSelect,
        handleRemoveFile,
        handleChangeFile,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleSubmit,
        handleRetry,
        getPhaseState,
        formatTime,
    };
}
