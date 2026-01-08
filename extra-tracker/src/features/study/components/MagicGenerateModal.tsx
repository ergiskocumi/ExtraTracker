/**
 * 🪄 MAGIC GENERATE MODAL - AI-Powered PDF to Flashcards
 * 
 * Feature "Killer" che trasforma PDF in Flashcards usando OpenAI.
 * 
 * Features:
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

const stepConfig: Record<ProgressStep, { icon: React.ElementType; label: string; color: string }> = {
    idle: { icon: FiUploadCloud, label: 'Trascina il PDF qui', color: 'text-white/50' },
    analyzing: { icon: FiCpu, label: 'Analisi strutturale in corso...', color: 'text-purple-400' },
    blueprint: { icon: FiBookOpen, label: 'Blueprint pronto', color: 'text-cyan-400' },
    chunking: { icon: FiCpu, label: 'Suddivisione del documento...', color: 'text-blue-400' },
    generating: { icon: FiZap, label: 'Generazione flashcard...', color: 'text-amber-400' },
    completed: { icon: FiCheck, label: 'Completato!', color: 'text-emerald-400' },
    error: { icon: FiAlertCircle, label: 'Errore', color: 'text-red-400' },
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

    const documentTypeConfig = useMemo(() => ({
        textbook: { label: 'Libro di Testo', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
        slide_deck: { label: 'Slide', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
        research_paper: { label: 'Paper', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
        exam_text: { label: 'Testo d\'Esame', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
        notes: { label: 'Appunti', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
        other: { label: 'Documento', badge: 'bg-white/10 text-white/60 border-white/20' },
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-3xl border border-white/[0.1] overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.98) 100%)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 100px rgba(139, 92, 246, 0.1)'
                        }}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-amber-500/20 border border-primary-500/30">
                                    <FiZap className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Magic Generate</h2>
                                    <p className="text-xs text-white/50">{deckTitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Drop Zone */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => !isProcessing && fileInputRef.current?.click()}
                                className={`
                                    relative w-full h-56 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
                                    flex flex-col items-center justify-center gap-4
                                    ${isDragging 
                                        ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' 
                                        : file 
                                            ? 'border-emerald-500/50 bg-emerald-500/5'
                                            : 'border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.05]'
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

                                {/* Step Animation */}
                                <motion.div
                                    key={progressStep}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className={`p-4 rounded-2xl ${
                                        progressStep === 'completed' 
                                            ? 'bg-emerald-500/20' 
                                            : progressStep === 'error'
                                                ? 'bg-red-500/20'
                                                : 'bg-white/[0.08]'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <StepIcon className={`w-10 h-10 ${currentStepConfig.color}`} />
                                        </motion.div>
                                    ) : (
                                        <StepIcon className={`w-10 h-10 ${currentStepConfig.color}`} />
                                    )}
                                </motion.div>

                                {/* Label */}
                                <motion.div
                                    key={`label-${progressStep}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-center"
                                >
                                    <p className={`text-sm font-medium ${currentStepConfig.color}`}>
                                        {progressStep === 'completed' 
                                            ? `✨ Generate ${generatedCount} flashcard!`
                                            : currentStepConfig.label
                                        }
                                    </p>
                                    
                                    {progressStep === 'idle' && !file && (
                                        <p className="text-xs text-white/40 mt-1">
                                            oppure clicca per selezionare
                                        </p>
                                    )}
                                    
                                    {file && progressStep === 'idle' && (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
                                            <FiFile className="w-4 h-4 text-primary-400" />
                                            <span className="text-xs text-white/70 truncate max-w-[200px]">
                                                {file.name}
                                            </span>
                                            <span className="text-xs text-white/40">
                                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                            </span>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Progress Steps Indicator */}
                                {isProcessing && (
                                    <div className="flex items-center gap-2 mt-2">
                                        {['analyzing', 'blueprint', 'chunking', 'generating'].map((s, idx) => (
                                            <motion.div
                                                key={s}
                                                initial={{ scale: 0 }}
                                                animate={{ 
                                                    scale: 1,
                                                    backgroundColor: ['analyzing', 'blueprint', 'chunking', 'generating'].indexOf(progressStep) >= idx 
                                                        ? 'rgb(139, 92, 246)' 
                                                        : 'rgba(255,255,255,0.2)'
                                                }}
                                                className="w-2 h-2 rounded-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Glass Cockpit */}
                            {progressStep !== 'idle' && (
                                <div className="mt-4 space-y-3">
                                    {progressStep === 'analyzing' && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                className="p-2 rounded-lg bg-white/[0.08]"
                                            >
                                                <FiCpu className="w-4 h-4 text-purple-300" />
                                            </motion.div>
                                            <p className="text-sm text-white/70">
                                                L&apos;Architetto AI sta analizzando la struttura...
                                            </p>
                                        </div>
                                    )}

                                    {progressBlueprint && progressStep !== 'error' && (
                                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[11px] px-2 py-1 rounded-full border ${blueprintConfig.badge}`}>
                                                    {blueprintConfig.label}
                                                </span>
                                                <span className="text-xs text-white/50">
                                                    Densità {densityPercent}%
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-white/80">
                                                {progressBlueprint.globalContext}
                                            </p>
                                            {progressBlueprint.mainTopics?.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {progressBlueprint.mainTopics.map((topic) => (
                                                        <span
                                                            key={topic}
                                                            className="text-[11px] px-2 py-1 rounded-full bg-white/[0.08] text-white/70"
                                                        >
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-400/80"
                                                    style={{ width: `${densityPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {progressStep === 'chunking' && (
                                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <p className="text-sm text-white/70">
                                                Sto preparando {progressStats?.totalChunks || 0} sezioni per la generazione.
                                            </p>
                                        </div>
                                    )}

                                    {progressStep === 'generating' && (
                                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <div className="flex items-center justify-between text-xs text-white/50">
                                                <span>Progresso</span>
                                                <span>
                                                    {progressStats?.currentChunk || 0}/{progressStats?.totalChunks || 0}
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progressPercent}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-amber-500"
                                                />
                                            </div>
                                            <motion.p
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-3 text-sm text-white/70"
                                            >
                                                Analisi in corso: {progressStats?.currentTopic || '...' }...
                                            </motion.p>
                                            <p className="mt-1 text-xs text-white/50">
                                                {progressStats?.generatedSoFar || 0} flashcard create
                                            </p>
                                        </div>
                                    )}

                                    {progressStep === 'completed' && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <FiCheck className="w-5 h-5 text-emerald-400" />
                                            <div>
                                                <p className="text-sm text-emerald-100">Completato!</p>
                                                <p className="text-xs text-emerald-200/80">
                                                    {generatedCount} flashcard create
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2"
                                >
                                    <FiAlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </motion.div>
                            )}

                            {/* Info */}
                            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="flex items-start gap-3">
                                    <FiBookOpen className="w-5 h-5 text-primary-400 mt-0.5" />
                                    <div className="text-xs text-white/50 space-y-1">
                                        <p><strong className="text-white/70">Come funziona:</strong></p>
                                        <p>1. Carica un PDF (appunti, slide, libro)</p>
                                        <p>2. L'AI analizza il contenuto</p>
                                        <p>3. Vengono generate 10-15 flashcard di qualità</p>
                                        <p className="text-white/40 mt-2">Max 10MB • Solo PDF testuali (no scansioni)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 mt-6">
                                <button
                                    onClick={handleClose}
                                    disabled={isProcessing}
                                    className="px-4 py-3 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Annulla
                                </button>
                                <motion.button
                                    whileHover={{ scale: file && !isProcessing ? 1.02 : 1 }}
                                    whileTap={{ scale: file && !isProcessing ? 0.98 : 1 }}
                                    onClick={handleGenerate}
                                    disabled={!file || isProcessing || progressStep === 'completed'}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                                        ${file && !isProcessing && progressStep !== 'completed'
                                            ? 'bg-gradient-to-r from-primary-500 via-purple-500 to-amber-500 text-white shadow-lg shadow-primary-500/25'
                                            : 'bg-white/[0.08] text-white/40 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isProcessing ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
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
