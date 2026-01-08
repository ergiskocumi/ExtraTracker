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

import { useState, useCallback, useRef } from 'react';
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

interface MagicGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void;
}

// Stati del processo di generazione
type GenerationStep = 'idle' | 'uploading' | 'reading' | 'analyzing' | 'generating' | 'success' | 'error';

const stepConfig: Record<GenerationStep, { icon: React.ElementType; label: string; color: string }> = {
    idle: { icon: FiUploadCloud, label: 'Trascina il PDF qui', color: 'text-white/50' },
    uploading: { icon: FiUploadCloud, label: 'Caricamento in corso...', color: 'text-blue-400' },
    reading: { icon: FiFile, label: 'Sto leggendo il PDF...', color: 'text-cyan-400' },
    analyzing: { icon: FiCpu, label: 'Analizzando i contenuti...', color: 'text-purple-400' },
    generating: { icon: FiZap, label: 'Genero le flashcard con AI...', color: 'text-amber-400' },
    success: { icon: FiCheck, label: 'Completato!', color: 'text-emerald-400' },
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
    const [step, setStep] = useState<GenerationStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [generatedCount, setGeneratedCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state quando si chiude
    const handleClose = useCallback(() => {
        if (step === 'uploading' || step === 'reading' || step === 'analyzing' || step === 'generating') {
            return; // Non permettere chiusura durante il processo
        }
        setFile(null);
        setStep('idle');
        setError(null);
        setGeneratedCount(0);
        onClose();
    }, [step, onClose]);

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
        
        // Simuliamo i passaggi con timing realistico
        // Per PDF grandi, il processo può richiedere 30-60 secondi, quindi aumentiamo i timeout
        const simulateSteps = async () => {
            setStep('uploading');
            await new Promise(r => setTimeout(r, 1000));
            
            setStep('reading');
            await new Promise(r => setTimeout(r, 2000));
            
            setStep('analyzing');
            // Per PDF grandi, l'analisi può richiedere più tempo
            // Il timeout qui è più lungo per dare tempo al backend
            await new Promise(r => setTimeout(r, 3000));
            
            setStep('generating');
            // Rimuoviamo il timeout fisso qui - il backend gestirà il tempo reale
            // Continuiamo a mostrare "generating" finché non arriva la risposta
        };

        try {
            // Avvia animazione steps in parallelo con la chiamata API
            simulateSteps();
            
            const result = await studyService.generateFromPDF(deckId, file);
            
            setStep('success');
            setGeneratedCount(result.generatedCount);
            
            // Messaggio migliorato con info sui chunk se disponibili
            const chunkInfo = (result as any).totalChunks 
                ? ` da ${(result as any).totalChunks} sezioni` 
                : '';
            
            emitToast.success(`✨ Generate ${result.generatedCount} flashcard${chunkInfo}!`, {
                title: 'Magic Generate',
                duration: 5000,
            });

            // Callback dopo un po' per mostrare il successo
            setTimeout(() => {
                onSuccess(result.generatedCount);
                handleClose();
            }, 2000);

        } catch (err: any) {
            setStep('error');
            setError(err.message || 'Errore nella generazione. Riprova.');
            emitToast.error(err.message || 'Generazione fallita');
        }
    }, [file, deckId, onSuccess, handleClose]);

    const currentStepConfig = stepConfig[step];
    const StepIcon = currentStepConfig.icon;
    const isProcessing = ['uploading', 'reading', 'analyzing', 'generating'].includes(step);

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
                                    key={step}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className={`p-4 rounded-2xl ${
                                        step === 'success' 
                                            ? 'bg-emerald-500/20' 
                                            : step === 'error'
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
                                    key={`label-${step}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-center"
                                >
                                    <p className={`text-sm font-medium ${currentStepConfig.color}`}>
                                        {step === 'success' 
                                            ? `✨ Generate ${generatedCount} flashcard!`
                                            : currentStepConfig.label
                                        }
                                    </p>
                                    
                                    {step === 'idle' && !file && (
                                        <p className="text-xs text-white/40 mt-1">
                                            oppure clicca per selezionare
                                        </p>
                                    )}
                                    
                                    {file && step === 'idle' && (
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
                                        {['uploading', 'reading', 'analyzing', 'generating'].map((s, idx) => (
                                            <motion.div
                                                key={s}
                                                initial={{ scale: 0 }}
                                                animate={{ 
                                                    scale: 1,
                                                    backgroundColor: ['uploading', 'reading', 'analyzing', 'generating'].indexOf(step) >= idx 
                                                        ? 'rgb(139, 92, 246)' 
                                                        : 'rgba(255,255,255,0.2)'
                                                }}
                                                className="w-2 h-2 rounded-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

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
                                    disabled={!file || isProcessing || step === 'success'}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
                                        ${file && !isProcessing && step !== 'success'
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
                                    ) : step === 'success' ? (
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
