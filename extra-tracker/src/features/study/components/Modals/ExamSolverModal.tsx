/**
 * 🎯 EXAM SOLVER MODAL - Risolve esami estraendo domande e generando risposte
 * 
 * Design in stile macOS con glassmorphism, seguendo MagicGenerateModal
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileQuestion, 
    BookOpen, 
    X, 
    Upload, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles,
    Loader2,
    Plus,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

// ============================================
// TYPES
// ============================================

export interface ExamSolverStats {
    questionsExtracted: number;
    answersFound: number;
    answersNotFound: number;
    totalFlashcards: number;
    processingTimeMs: number;
}

interface ExamSolverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (deckId: string, stats: ExamSolverStats) => void;
    existingDecks?: Array<{ id: string; title: string }>;
    goalId?: string; // ID goal per nuovo deck (opzionale)
    preselectedDeckId?: string; // ID deck pre-selezionato (opzionale)
}

type Step = 'upload' | 'config' | 'progress' | 'completed';

type ProgressStep = 'idle' | 'extracting' | 'analyzing' | 'generating' | 'completed' | 'error';

// ============================================
// COMPONENT
// ============================================

export const ExamSolverModal: React.FC<ExamSolverModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    existingDecks = [],
    goalId,
    preselectedDeckId,
}) => {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [questionsFile, setQuestionsFile] = useState<File | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [isDraggingQuestions, setIsDraggingQuestions] = useState(false);
    const [isDraggingSource, setIsDraggingSource] = useState(false);
    const [deckMode, setDeckMode] = useState<'new' | 'existing'>('new');
    const [deckTitle, setDeckTitle] = useState('');
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    const [progressStep, setProgressStep] = useState<ProgressStep>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [stats, setStats] = useState<ExamSolverStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [createdDeckId, setCreatedDeckId] = useState<string>('');

    const questionsInputRef = useRef<HTMLInputElement>(null);
    const sourceInputRef = useRef<HTMLInputElement>(null);
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset quando si apre il modal
    useEffect(() => {
        if (isOpen) {
            setCurrentStep('upload');
            setQuestionsFile(null);
            setSourceFile(null);
            // Se c'è un deckId pre-selezionato, usa quello
            if (preselectedDeckId && existingDecks.some(d => d.id === preselectedDeckId)) {
                setDeckMode('existing');
                setSelectedDeckId(preselectedDeckId);
            } else {
                setDeckMode('new');
                setDeckTitle('');
                setSelectedDeckId('');
            }
            setProgressStep('idle');
            setProgressMessage('');
            setStats(null);
            setError(null);
            setCreatedDeckId('');
            startTimeRef.current = null;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isOpen, preselectedDeckId, existingDecks]);

    // Timer per il tempo trascorso
    useEffect(() => {
        if (['extracting', 'analyzing', 'generating'].includes(progressStep)) {
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
            }
            timerRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    // Timer visibile nel progress step
                }
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [progressStep]);

    const handleClose = useCallback(() => {
        if (['extracting', 'analyzing', 'generating'].includes(progressStep)) {
            return; // Non chiudere durante l'elaborazione
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        startTimeRef.current = null;
        onClose();
    }, [progressStep, onClose]);

    // File handlers per domande
    const handleQuestionsFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const validExtensions = ['.pdf', '.txt', '.docx'];
            const isValid = validTypes.includes(file.type) || 
                          validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
            
            if (isValid) {
                setQuestionsFile(file);
                setError(null);
            } else {
                setError('File domande deve essere PDF, TXT o DOCX');
            }
        }
        if (questionsInputRef.current) {
            questionsInputRef.current.value = '';
        }
    }, []);

    const handleQuestionsDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingQuestions(true);
    }, []);

    const handleQuestionsDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingQuestions(false);
    }, []);

    const handleQuestionsDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleQuestionsDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingQuestions(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const validExtensions = ['.pdf', '.txt', '.docx'];
            const isValid = validTypes.includes(file.type) || 
                          validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
            
            if (isValid) {
                setQuestionsFile(file);
                setError(null);
            } else {
                setError('File domande deve essere PDF, TXT o DOCX');
            }
        }
    }, []);

    // File handlers per materiale
    const handleSourceFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSourceFile(file);
            setError(null);
        } else {
            setError('File materiale deve essere un PDF');
        }
        if (sourceInputRef.current) {
            sourceInputRef.current.value = '';
        }
    }, []);

    const handleSourceDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingSource(true);
    }, []);

    const handleSourceDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingSource(false);
    }, []);

    const handleSourceDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleSourceDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingSource(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSourceFile(file);
            setError(null);
        } else {
            setError('File materiale deve essere un PDF');
        }
    }, []);

    const handleNextFromUpload = useCallback(() => {
        if (questionsFile && sourceFile) {
            setCurrentStep('config');
        }
    }, [questionsFile, sourceFile]);

    const handleGenerate = useCallback(async () => {
        if (!questionsFile || !sourceFile) return;

        // Validazione configurazione
        if (deckMode === 'new' && !deckTitle.trim()) {
            setError('Inserisci un titolo per il nuovo mazzo');
            return;
        }
        if (deckMode === 'existing' && !selectedDeckId) {
            setError('Seleziona un mazzo esistente');
            return;
        }

        setCurrentStep('progress');
        setProgressStep('extracting');
        setProgressMessage('Estrazione domande...');
        setError(null);
        startTimeRef.current = Date.now();

        try {
            const formData = new FormData();
            formData.append('questionsFile', questionsFile);
            formData.append('sourceFile', sourceFile);
            
            if (deckMode === 'existing') {
                formData.append('deckId', selectedDeckId);
            } else {
                formData.append('title', deckTitle.trim());
                if (goalId) {
                    formData.append('goalId', goalId);
                }
            }

            setProgressStep('analyzing');
            setProgressMessage('Analisi materiale...');

            const result = await studyService.examSolver(formData);

            setProgressStep('generating');
            setProgressMessage('Generazione risposte...');

            // Il backend processa tutto, quindi quando arriva la risposta è completato
            setProgressStep('completed');
            setProgressMessage('Completato!');
            setStats(result.stats);
            setCreatedDeckId(result.deck.id);

            // Auto-close dopo 3 secondi o chiama onSuccess
            setTimeout(() => {
                onSuccess(result.deck.id, result.stats);
            }, 1000);
        } catch (err: any) {
            setProgressStep('error');
            setError(err.message || 'Errore durante la risoluzione dell\'esame');
            emitToast.error(err.message || 'Errore durante la risoluzione dell\'esame');
        }
    }, [questionsFile, sourceFile, deckMode, deckTitle, selectedDeckId, onSuccess]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

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
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-black/85"
                    style={{ WebkitBackdropFilter: 'blur(30px)' }}
                />

                {/* Modal Window */}
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
                    className="relative w-full max-w-2xl bg-zinc-950/98 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden"
                    style={{
                        WebkitBackdropFilter: 'blur(50px)',
                        backdropFilter: 'blur(50px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/80">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Exam Solver</h2>
                                <p className="text-xs text-white/60">Estrai domande e genera risposte</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={['extracting', 'analyzing', 'generating'].includes(progressStep)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-zinc-950/40 max-h-[80vh] overflow-y-auto">
                        {/* STEP 1: UPLOAD */}
                        {currentStep === 'upload' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Dropzone Domande */}
                                    <div
                                        onDragEnter={!questionsFile ? handleQuestionsDragEnter : undefined}
                                        onDragLeave={!questionsFile ? handleQuestionsDragLeave : undefined}
                                        onDragOver={!questionsFile ? handleQuestionsDragOver : undefined}
                                        onDrop={!questionsFile ? handleQuestionsDrop : undefined}
                                        onClick={() => !questionsFile && questionsInputRef.current?.click()}
                                        className={`
                                            relative h-48 rounded-2xl border-2 border-dashed transition-all duration-300
                                            flex flex-col items-center justify-center gap-4 cursor-pointer
                                            ${questionsFile
                                                ? 'border-emerald-400/40 bg-emerald-500/10'
                                                : isDraggingQuestions
                                                    ? 'border-blue-400/40 bg-blue-500/10'
                                                    : 'border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/60'
                                            }
                                        `}
                                    >
                                        <input
                                            ref={questionsInputRef}
                                            type="file"
                                            accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={handleQuestionsFileSelect}
                                            className="hidden"
                                        />
                                        {questionsFile ? (
                                            <>
                                                <FileQuestion className="w-10 h-10 text-emerald-400" />
                                                <div className="text-center px-4">
                                                    <p className="text-sm font-medium text-white truncate max-w-[200px]">
                                                        {questionsFile.name}
                                                    </p>
                                                    <p className="text-xs text-white/60 mt-1">
                                                        {formatFileSize(questionsFile.size)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setQuestionsFile(null);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Rimuovi
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <FileQuestion className="w-10 h-10 text-white/40" />
                                                <div className="text-center px-4">
                                                    <p className="text-sm font-medium text-white/80">
                                                        📝 Domande d&apos;Esame
                                                    </p>
                                                    <p className="text-xs text-white/50 mt-1">
                                                        PDF, TXT, DOCX
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Dropzone Materiale */}
                                    <div
                                        onDragEnter={!sourceFile ? handleSourceDragEnter : undefined}
                                        onDragLeave={!sourceFile ? handleSourceDragLeave : undefined}
                                        onDragOver={!sourceFile ? handleSourceDragOver : undefined}
                                        onDrop={!sourceFile ? handleSourceDrop : undefined}
                                        onClick={() => !sourceFile && sourceInputRef.current?.click()}
                                        className={`
                                            relative h-48 rounded-2xl border-2 border-dashed transition-all duration-300
                                            flex flex-col items-center justify-center gap-4 cursor-pointer
                                            ${sourceFile
                                                ? 'border-emerald-400/40 bg-emerald-500/10'
                                                : isDraggingSource
                                                    ? 'border-blue-400/40 bg-blue-500/10'
                                                    : 'border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/60'
                                            }
                                        `}
                                    >
                                        <input
                                            ref={sourceInputRef}
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={handleSourceFileSelect}
                                            className="hidden"
                                        />
                                        {sourceFile ? (
                                            <>
                                                <BookOpen className="w-10 h-10 text-emerald-400" />
                                                <div className="text-center px-4">
                                                    <p className="text-sm font-medium text-white truncate max-w-[200px]">
                                                        {sourceFile.name}
                                                    </p>
                                                    <p className="text-xs text-white/60 mt-1">
                                                        {formatFileSize(sourceFile.size)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSourceFile(null);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Rimuovi
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <BookOpen className="w-10 h-10 text-white/40" />
                                                <div className="text-center px-4">
                                                    <p className="text-sm font-medium text-white/80">
                                                        📚 Materiale di Studio
                                                    </p>
                                                    <p className="text-xs text-white/50 mt-1">
                                                        PDF
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <p className="text-sm text-red-400">{error}</p>
                                    </motion.div>
                                )}

                                {questionsFile && sourceFile && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={handleNextFromUpload}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-2"
                                    >
                                        Avanti
                                        <ChevronRight className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 2: CONFIGURAZIONE */}
                        {currentStep === 'config' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Configurazione Mazzo</h3>

                                    {/* Radio buttons */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                                            <input
                                                type="radio"
                                                name="deckMode"
                                                value="new"
                                                checked={deckMode === 'new'}
                                                onChange={(e) => setDeckMode(e.target.value as 'new')}
                                                className="w-4 h-4 text-amber-500"
                                            />
                                            <Plus className="w-5 h-5 text-white/60" />
                                            <span className="text-white font-medium">Crea nuovo mazzo</span>
                                        </label>

                                        {existingDecks.length > 0 && (
                                            <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="deckMode"
                                                    value="existing"
                                                    checked={deckMode === 'existing'}
                                                    onChange={(e) => setDeckMode(e.target.value as 'existing')}
                                                    className="w-4 h-4 text-amber-500"
                                                />
                                                <FileText className="w-5 h-5 text-white/60" />
                                                <span className="text-white font-medium">Aggiungi a mazzo esistente</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Input titolo (nuovo mazzo) */}
                                    {deckMode === 'new' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-2"
                                        >
                                            <label className="block text-sm font-medium text-white/80">
                                                Titolo del mazzo
                                            </label>
                                            <input
                                                type="text"
                                                value={deckTitle}
                                                onChange={(e) => setDeckTitle(e.target.value)}
                                                placeholder="Es: Esame Matematica - Domande e Risposte"
                                                className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            />
                                        </motion.div>
                                    )}

                                    {/* Dropdown mazzi esistenti */}
                                    {deckMode === 'existing' && existingDecks.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-2"
                                        >
                                            <label className="block text-sm font-medium text-white/80">
                                                Seleziona mazzo
                                            </label>
                                            <select
                                                value={selectedDeckId}
                                                onChange={(e) => setSelectedDeckId(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            >
                                                <option value="">Seleziona un mazzo...</option>
                                                {existingDecks.map((deck) => (
                                                    <option key={deck.id} value={deck.id}>
                                                        {deck.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </motion.div>
                                    )}
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <p className="text-sm text-red-400">{error}</p>
                                    </motion.div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setCurrentStep('upload')}
                                        className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white font-medium transition-colors"
                                    >
                                        Indietro
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={
                                            (deckMode === 'new' && !deckTitle.trim()) ||
                                            (deckMode === 'existing' && !selectedDeckId)
                                        }
                                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        Genera Flashcard
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: PROGRESS */}
                        {currentStep === 'progress' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">
                                            {progressStep === 'extracting' && 'Estrazione domande...'}
                                            {progressStep === 'analyzing' && 'Analisi materiale...'}
                                            {progressStep === 'generating' && 'Generazione risposte...'}
                                            {progressStep === 'completed' && 'Completato!'}
                                        </h3>
                                        {progressMessage && (
                                            <p className="text-sm text-white/50">{progressMessage}</p>
                                        )}
                                    </div>
                                    {progressStep !== 'completed' && progressStep !== 'error' && (
                                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                                    )}
                                </div>

                                {/* Progress bar */}
                                {progressStep !== 'completed' && progressStep !== 'error' && (
                                    <div className="space-y-2">
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: progressStep === 'extracting' ? '33%' :
                                                           progressStep === 'analyzing' ? '66%' :
                                                           progressStep === 'generating' ? '100%' : '0%'
                                                }}
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Completed State */}
                                {progressStep === 'completed' && stats && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4"
                                    >
                                        <div className="flex flex-col items-center gap-4 text-center py-4">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                                className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl"
                                            >
                                                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                            </motion.div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white mb-1">
                                                    Generazione completata!
                                                </h3>
                                                <p className="text-sm text-white/60">
                                                    {stats.totalFlashcards} flashcard generate
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                                                <p className="text-xs text-white/50 mb-1">Domande estratte</p>
                                                <p className="text-2xl font-bold text-primary-300">{stats.questionsExtracted}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                                                <p className="text-xs text-white/50 mb-1">Risposte trovate</p>
                                                <p className="text-2xl font-bold text-emerald-300">{stats.answersFound}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                                                <p className="text-xs text-white/50 mb-1">Non trovate</p>
                                                <p className="text-2xl font-bold text-amber-300">{stats.answersNotFound}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                                                <p className="text-xs text-white/50 mb-1">Tempo</p>
                                                <p className="text-2xl font-bold text-primary-300">
                                                    {(stats.processingTimeMs / 1000).toFixed(1)}s
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    if (createdDeckId) {
                                                        // Naviga al deck (dovrebbe essere gestito dal parent)
                                                        onSuccess(createdDeckId, stats);
                                                        handleClose();
                                                    }
                                                }}
                                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
                                            >
                                                Vai al Mazzo
                                            </button>
                                            <button
                                                onClick={handleClose}
                                                className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white font-medium transition-colors"
                                            >
                                                Chiudi
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Error State */}
                                {progressStep === 'error' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center gap-4 text-center py-4"
                                    >
                                        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-xl">
                                            <AlertCircle className="w-12 h-12 text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-1">Errore</h3>
                                            <p className="text-sm text-white/60">{error || 'Si è verificato un errore'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentStep('config');
                                                setProgressStep('idle');
                                                setError(null);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white text-sm font-medium transition-colors"
                                        >
                                            Riprova
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ExamSolverModal;
