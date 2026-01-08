/**
 * 🪄 MAGIC GENERATE MODAL - AI-Powered PDF to Flashcards
 * * Feature "Killer" che trasforma PDF in Flashcards usando OpenAI.
 * * Features:
 * - Drag & Drop area premium
 * - Progress animation multi-step
 * - Feedback visivo coinvolgente
 * - Gestione errori graceful
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiUploadCloud, 
    FiFile, 
    FiX, 
    FiCheck, 
    FiAlertCircle,
    FiZap,
    FiBookOpen,
    FiCpu
} from 'react-icons/fi';
import { studyService } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { useSSE, type SSEPayload } from '../../../hooks/useSSE';
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery';

interface MagicGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void;
}

type DocumentBlueprint = {
    documentType: 'textbook' | 'slide_deck' | 'research_paper' | 'exam_text' | 'notes' | 'other';
    globalContext: string;
    mainTopics: string[];
    densityScore: number;
};

type ProgressStep = 'idle' | 'analyzing' | 'blueprint' | 'chunking' | 'generating' | 'completed' | 'error';

type ProgressStats = {
    currentChunk: number;
    totalChunks: number;
    currentTopic: string;
    generatedSoFar: number;
};

type ProgressState = {
    step: ProgressStep;
    blueprint?: DocumentBlueprint;
    stats?: ProgressStats;
};

type ProgressPayload = {
    step?: ProgressStep;
    blueprint?: DocumentBlueprint;
    totalChunks?: number;
    currentChunk?: number;
    currentTopic?: string | null;
    generatedSoFar?: number;
    totalCards?: number;
};

const stepConfig: Record<ProgressStep, { icon: React.ElementType; label: string; labelMobile: string; color: string }> = {
    idle: { icon: FiUploadCloud, label: 'Trascina il PDF qui', labelMobile: 'Tocca per caricare', color: 'text-zinc-400' },
    analyzing: { icon: FiCpu, label: 'Analisi strutturale in corso...', labelMobile: 'Analisi in corso...', color: 'text-violet-400' },
    blueprint: { icon: FiBookOpen, label: 'Blueprint pronto', labelMobile: 'Blueprint pronto', color: 'text-indigo-400' },
    chunking: { icon: FiCpu, label: 'Suddivisione del documento...', labelMobile: 'Preparazione...', color: 'text-violet-400' },
    generating: { icon: FiZap, label: 'Generazione flashcard...', labelMobile: 'Generazione...', color: 'text-amber-400' },
    completed: { icon: FiCheck, label: 'Completato!', labelMobile: 'Completato!', color: 'text-amber-400' },
    error: { icon: FiAlertCircle, label: 'Errore', labelMobile: 'Errore', color: 'text-red-400' },
};

export const MagicGenerateModal: React.FC<MagicGenerateModalProps> = ({
    isOpen,
    onClose,
    deckId,
    deckTitle,
    onSuccess,
}) => {
    // State
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<ProgressState>({ step: 'idle' });
    const [error, setError] = useState<string | null>(null);
    const [generatedCount, setGeneratedCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const completionHandledRef = useRef(false);

    const progressStep = progress.step;
    const progressStats = progress.stats;
    const progressBlueprint = progress.blueprint;

    const sseListeners = useMemo(() => ([
        {
            event: 'pdf-progress',
            handler: (payload: SSEPayload<ProgressPayload>) => {
                const data = payload?.data;
                if (!data || typeof data !== 'object') return;

                const update = data as ProgressPayload;
                const step = update.step;
                if (!step) return;

                switch (step) {
                    case 'analyzing':
                        setProgress((prev) => ({
                            ...prev,
                            step: 'analyzing',
                        }));
                        break;
                    case 'blueprint':
                        setProgress((prev) => ({
                            ...prev,
                            step: 'blueprint',
                            blueprint: update.blueprint,
                        }));
                        break;
                    case 'chunking': {
                        const totalChunks = Number.isFinite(Number(update.totalChunks))
                            ? Number(update.totalChunks)
                            : 0;
                        setProgress((prev) => ({
                            ...prev,
                            step: 'chunking',
                            stats: {
                                currentChunk: 0,
                                totalChunks: totalChunks || prev.stats?.totalChunks || 0,
                                currentTopic: '',
                                generatedSoFar: prev.stats?.generatedSoFar || 0,
                            },
                        }));
                        break;
                    }
                    case 'generating': {
                        const currentChunk = Number.isFinite(Number(update.currentChunk))
                            ? Number(update.currentChunk)
                            : 0;
                        const totalChunks = Number.isFinite(Number(update.totalChunks))
                            ? Number(update.totalChunks)
                            : 0;
                        const generatedSoFar = Number.isFinite(Number(update.generatedSoFar))
                            ? Number(update.generatedSoFar)
                            : 0;
                        const currentTopic = typeof update.currentTopic === 'string'
                            ? update.currentTopic
                            : '';

                        setProgress((prev) => ({
                            ...prev,
                            step: 'generating',
                            stats: {
                                currentChunk: currentChunk || prev.stats?.currentChunk || 0,
                                totalChunks: totalChunks || prev.stats?.totalChunks || 0,
                                currentTopic: currentTopic || prev.stats?.currentTopic || '',
                                generatedSoFar: generatedSoFar || prev.stats?.generatedSoFar || 0,
                            },
                        }));
                        break;
                    }
                    case 'completed': {
                        setProgress((prev) => {
                            const totalCards = Number.isFinite(Number(update.totalCards))
                                ? Number(update.totalCards)
                                : prev.stats?.generatedSoFar || 0;
                            setGeneratedCount(totalCards);
                            return {
                                ...prev,
                                step: 'completed',
                            };
                        });
                        break;
                    }
                    default:
                        break;
                }
            },
        },
    ]), []);

    const { error: sseError } = useSSE('/api/sse/stream', sseListeners);

    // Reset state quando si chiude
    const handleClose = useCallback(() => {
        if (isSubmitting || ['analyzing', 'blueprint', 'chunking', 'generating'].includes(progressStep)) {
            return; // Non permettere chiusura durante il processo
        }
        setFile(null);
        setProgress({ step: 'idle' });
        setError(null);
        setGeneratedCount(0);
        setIsSubmitting(false);
        completionHandledRef.current = false;
        onClose();
    }, [isSubmitting, progressStep, onClose]);

    useEffect(() => {
        if (!sseError || !isSubmitting) return;
        setError('Connessione realtime interrotta. Riprova.');
        setProgress((prev) => ({ ...prev, step: 'error' }));
    }, [sseError, isSubmitting]);

    useEffect(() => {
        if (progressStep !== 'completed' || completionHandledRef.current) return;

        completionHandledRef.current = true;
        emitToast.success(`✨ Generate ${generatedCount} flashcard!`, {
            title: 'Magic Generate',
            duration: 5000,
        });

        setTimeout(() => {
            onSuccess(generatedCount);
            handleClose();
        }, 2000);
    }, [progressStep, generatedCount, handleClose, onSuccess]);

    // Blocca lo scroll del body quando il modale è aperto
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            
            return () => {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Drag handlers
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

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
            setError(null);
        } else {
            setError('Solo file PDF sono accettati');
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile?.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else if (selectedFile) {
            setError('Solo file PDF sono accettati');
        }
    }, []);

    // 🪄 Main generation function
    const handleGenerate = useCallback(async () => {
        if (!file || !deckId) return;

        setError(null);
        setGeneratedCount(0);
        setProgress({ step: 'idle' });
        setIsSubmitting(true);
        completionHandledRef.current = false;

        try {
            const result = await studyService.generateFromPDF(deckId, file);
            setGeneratedCount(result.generatedCount || 0);
            setIsSubmitting(false);
        } catch (err: any) {
            setProgress((prev) => ({ ...prev, step: 'error' }));
            setError(err.message || 'Errore nella generazione. Riprova.');
            emitToast.error(err.message || 'Generazione fallita');
            setIsSubmitting(false);
        }
    }, [file, deckId, onSuccess, handleClose]);

    const currentStepConfig = stepConfig[progressStep];
    const StepIcon = currentStepConfig.icon;
    const isProcessing = isSubmitting || ['analyzing', 'blueprint', 'chunking', 'generating'].includes(progressStep);
    const isDesktop = useIsDesktop();

    const documentTypeConfig = useMemo(() => ({
        textbook: { label: 'Libro di Testo', badge: 'bg-white/8 text-zinc-200 border-white/15' },
        slide_deck: { label: 'Slide', badge: 'bg-white/8 text-zinc-200 border-white/15' },
        research_paper: { label: 'Paper', badge: 'bg-white/8 text-zinc-200 border-white/15' },
        exam_text: { label: 'Testo d\'Esame', badge: 'bg-white/8 text-zinc-200 border-white/15' },
        notes: { label: 'Appunti', badge: 'bg-white/8 text-zinc-200 border-white/15' },
        other: { label: 'Documento', badge: 'bg-white/8 text-zinc-200 border-white/15' },
    }), []);

    const blueprintConfig = progressBlueprint
        ? documentTypeConfig[progressBlueprint.documentType] || documentTypeConfig.other
        : documentTypeConfig.other;

    const densityScore = progressBlueprint?.densityScore ?? 0;
    const densityPercent = Math.round(Math.min(Math.max(densityScore, 0), 1) * 100);
    const progressPercent = progressStats?.totalChunks
        ? Math.min(100, Math.round((progressStats.currentChunk / progressStats.totalChunks) * 100))
        : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    // FIX: bg-black/60 per backdrop scuro ed elegante (evita effetto "milky" bianco)
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl md:p-4"
                    onClick={handleClose}
                    style={{ 
                        WebkitBackdropFilter: 'blur(20px)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    <motion.div
                        initial={isDesktop ? { 
                            opacity: 0, 
                            scale: 0.95,
                            y: 0
                        } : { 
                            opacity: 0, 
                            y: '100%',
                            scale: 1
                        }}
                        animate={isDesktop ? { 
                            opacity: 1, 
                            scale: 1,
                            y: 0
                        } : { 
                            opacity: 1, 
                            y: 0,
                            scale: 1
                        }}
                        exit={isDesktop ? { 
                            opacity: 0, 
                            scale: 0.95,
                            y: 0
                        } : { 
                            opacity: 0, 
                            y: '100%',
                            scale: 1
                        }}
                        transition={{ 
                            duration: isDesktop ? 0.2 : 0.3, 
                            ease: isDesktop ? 'easeOut' : [0.16, 1, 0.3, 1]
                        }}
                        // FIX: Modale alleggerito da zinc-950 a zinc-900/80 per effetto glass
                        className={`
                            fixed inset-0 w-full h-full bg-zinc-900/80 overflow-y-auto overscroll-contain
                            md:relative md:inset-auto md:w-full md:max-w-2xl md:h-auto md:max-h-[90vh] md:overflow-y-auto md:rounded-3xl md:border md:border-white/10 md:shadow-2xl
                        `}
                        onClick={e => e.stopPropagation()}
                        onTouchMove={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {/* Header - Alleggerito bg */}
                        <div className="sticky top-0 z-10 px-4 py-4 md:px-6 md:py-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/90 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                                    <FiZap className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Magic Generate</h2>
                                    <p className="text-xs text-zinc-400 hidden md:block">{deckTitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiX className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-6 pb-6 md:pb-6">
                            {/* Drop Zone */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                                    className={`
                                    relative w-full h-40 md:h-56 rounded-2xl md:rounded-3xl border border-dashed transition-all duration-300 cursor-pointer
                                    flex flex-col items-center justify-center gap-3 md:gap-4
                                    ${isDragging 
                                        ? 'border-violet-500/50 bg-violet-500/10' 
                                        : file 
                                            ? 'border-amber-400/40 bg-white/10'
                                            : 'border-zinc-600/50 bg-white/5 hover:border-zinc-500/60 hover:bg-white/8'
                                    }
                                    ${isProcessing ? 'cursor-default' : ''}
                                `}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={isProcessing}
                                />

                                {/* Step Icon */}
                                <motion.div
                                    key={progressStep}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className={`p-3 md:p-4 rounded-2xl bg-white/8 border border-white/10 ${
                                        isProcessing ? 'animate-pulse' : ''
                                    }`}
                                >
                                    {isProcessing ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <StepIcon className={`w-8 h-8 md:w-10 md:h-10 ${currentStepConfig.color}`} />
                                        </motion.div>
                                    ) : (
                                        <StepIcon className={`w-8 h-8 md:w-10 md:h-10 ${currentStepConfig.color}`} />
                                    )}
                                </motion.div>

                                {/* Label */}
                                <motion.div
                                    key={`label-${progressStep}`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="text-center px-4"
                                >
                                    <p className={`text-sm md:text-base font-medium ${currentStepConfig.color}`}>
                                        {progressStep === 'completed' 
                                            ? `✨ Generate ${generatedCount} flashcard!`
                                            : (
                                                <>
                                                    <span className="md:hidden">{currentStepConfig.labelMobile}</span>
                                                    <span className="hidden md:inline">{currentStepConfig.label}</span>
                                                </>
                                            )
                                        }
                                    </p>
                                    
                                    {progressStep === 'idle' && !file && (
                                        <>
                                            <p className="text-xs text-zinc-400 mt-1 md:hidden">
                                                Tocca per selezionare un file
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1 hidden md:block">
                                                oppure clicca per selezionare
                                            </p>
                                        </>
                                    )}
                                    
                                    {file && progressStep === 'idle' && (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 max-w-full">
                                            <FiFile className="w-4 h-4 text-violet-400 shrink-0" />
                                            <span className="text-xs text-zinc-300 truncate flex-1">
                                                {file.name}
                                            </span>
                                            <span className="text-xs text-zinc-500 shrink-0">
                                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Progress Section */}
                            {progressStep !== 'idle' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="mt-4 space-y-3"
                                >
                                    {/* Progress Bar */}
                                    {(progressStep === 'generating' || progressStep === 'chunking') && (
                                        <div className="p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                                                <span>Progresso</span>
                                                <span>
                                                    {progressStats?.currentChunk || 0}/{progressStats?.totalChunks || 0}
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progressPercent}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                                />
                                            </div>
                                            {progressStep === 'generating' && progressStats?.currentTopic && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="mt-3 text-sm text-zinc-300"
                                                >
                                                    Analisi in corso: {progressStats.currentTopic}...
                                                </motion.p>
                                            )}
                                            {progressStep === 'generating' && (
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {progressStats?.generatedSoFar || 0} flashcard create
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Blueprint Grid */}
                                    {progressBlueprint && progressStep !== 'error' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Main Blueprint Card */}
                                            <div className="md:col-span-2 p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full border ${blueprintConfig.badge}`}>
                                                        {blueprintConfig.label}
                                                    </span>
                                                    <span className="text-xs text-zinc-400">
                                                        Densità {densityPercent}%
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-300 leading-relaxed">
                                                    {progressBlueprint.globalContext}
                                                </p>
                                            </div>

                                            {/* Topics Card */}
                                            {progressBlueprint.mainTopics?.length > 0 && (
                                                <div className="p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                                    <p className="text-xs text-zinc-400 mb-2 font-medium">Argomenti principali</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {progressBlueprint.mainTopics.map((topic) => (
                                                            <span
                                                                key={topic}
                                                                className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-zinc-200 border border-white/10"
                                                            >
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Status Messages */}
                                    {progressStep === 'analyzing' && (
                                        <div className="p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                            <p className="text-sm text-zinc-300">
                                                Analisi strutturale del documento in corso...
                                            </p>
                                        </div>
                                    )}

                                    {progressStep === 'chunking' && !progressStats?.currentChunk && (
                                        <div className="p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                            <p className="text-sm text-zinc-300">
                                                Preparazione {progressStats?.totalChunks || 0} sezioni per la generazione...
                                            </p>
                                        </div>
                                    )}

                                    {progressStep === 'completed' && (
                                        <div className="flex items-center gap-3 p-4 rounded-2xl md:rounded-3xl bg-amber-400/10 border border-amber-400/20">
                                            <FiCheck className="w-5 h-5 text-amber-400 shrink-0" />
                                            <div>
                                                <p className="text-sm text-amber-300 font-medium">Completato!</p>
                                                <p className="text-xs text-amber-300/70 mt-0.5">
                                                    {generatedCount} flashcard create
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-4 p-4 rounded-2xl md:rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                                >
                                    <FiAlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </motion.div>
                            )}

                            {/* Info */}
                            <div className="mt-4 p-4 rounded-2xl md:rounded-3xl bg-white/8 border border-white/10">
                                <div className="flex items-start gap-3">
                                    <FiBookOpen className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-zinc-400 space-y-1.5">
    <p><strong className="text-zinc-200">Come funziona:</strong></p>
    <p>1. Carica il tuo materiale (Slide, Manuali, Appunti).</p>
    <p>2. L'AI identifica la struttura e il contesto globale.</p>
    <p>3. Genera flashcard mirate, divise per argomenti logici.</p>
    <p className="text-zinc-600 mt-2 flex items-center gap-1">
        <FiCpu className="w-3 h-3" /> 
        Motore neurale attivo • Max 10MB
    </p>
</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-6">
                                <button
                                    onClick={handleClose}
                                    disabled={isProcessing}
                                    className="w-full md:w-auto px-4 py-3 rounded-xl bg-white/8 text-zinc-200 hover:bg-white/12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                >
                                    Annulla
                                </button>
                                <motion.button
                                    whileHover={{ scale: file && !isProcessing ? 1.01 : 1 }}
                                    whileTap={{ scale: file && !isProcessing ? 0.99 : 1 }}
                                    onClick={handleGenerate}
                                    disabled={!file || isProcessing || progressStep === 'completed'}
                                    className={`
                                        w-full md:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                                        ${file && !isProcessing && progressStep !== 'completed'
                                            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'
                                            : 'bg-white/8 text-zinc-400 cursor-not-allowed border border-white/10'
                                        }
                                    `}
                                >
                                    {isProcessing ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                            >
                                                <FiCpu className="w-5 h-5" />
                                            </motion.div>
                                            Elaborazione...
                                        </>
                                    ) : progressStep === 'completed' ? (
                                        <>
                                            <FiCheck className="w-5 h-5" />
                                            Completato!
                                        </>
                                    ) : (
                                        <>
                                            <FiZap className="w-5 h-5" />
                                            Genera Flashcard
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MagicGenerateModal;