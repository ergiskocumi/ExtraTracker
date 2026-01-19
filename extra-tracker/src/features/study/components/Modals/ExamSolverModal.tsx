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
    Trash2,
    Edit3,
    Search,
    CheckSquare,
    Square,
    Check
} from 'lucide-react';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import goalsService from '../../../goals/services/goalsService';
import type { Goal } from '../../../goals/types';
import { DualDropzone, type DropzoneConfig } from './ExamSolver/DualDropzone';
import { QuestionsPreview } from './ExamSolver/QuestionsPreview';

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

type Step = 'upload' | 'preview' | 'config' | 'progress' | 'completed';

type ProgressStep = 'idle' | 'extracting' | 'analyzing' | 'generating' | 'completed' | 'error';

interface GeneratedFlashcard {
    front: string;
    back: string;
    found: boolean;
    manualEdit?: string; // Risposta editata manualmente (Livello 2)
}

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
    const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
    const [generatedFlashcards, setGeneratedFlashcards] = useState<GeneratedFlashcard[]>([]);
    const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
    const [manualAnswer, setManualAnswer] = useState<string>('');
    const [deckMode, setDeckMode] = useState<'new' | 'existing'>('new');
    const [deckTitle, setDeckTitle] = useState('');
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    // Goal selection per nuovo mazzo
    const [goals, setGoals] = useState<Goal[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [isLoadingGoals, setIsLoadingGoals] = useState(false);
    const [progressStep, setProgressStep] = useState<ProgressStep>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [stats, setStats] = useState<ExamSolverStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [createdDeckId, setCreatedDeckId] = useState<string>('');

    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset quando si apre il modal
    useEffect(() => {
        if (isOpen) {
            setCurrentStep('upload');
            setQuestionsFile(null);
            setSourceFile(null);
            setExtractedQuestions([]);
            setSelectedQuestions(new Set());
            setGeneratedFlashcards([]);
            setEditingAnswerIndex(null);
            setManualAnswer('');
            // Se c'è un deckId pre-selezionato, usa quello
            if (preselectedDeckId && existingDecks.some(d => d.id === preselectedDeckId)) {
                setDeckMode('existing');
                setSelectedDeckId(preselectedDeckId);
            } else {
                setDeckMode('new');
                setDeckTitle('');
                setSelectedDeckId('');
            }
            setGoals([]);
            setSelectedGoalId(goalId || ''); // Usa goalId prop se disponibile
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
    }, [isOpen, preselectedDeckId, existingDecks, goalId]);

    // Carica goals quando si sceglie "Crea nuovo mazzo"
    useEffect(() => {
        if (isOpen && deckMode === 'new' && goals.length === 0) {
            loadGoals();
        }
    }, [isOpen, deckMode]);

    const loadGoals = async () => {
        try {
            setIsLoadingGoals(true);
            const allGoals = await goalsService.getAll();
            // Filtra solo goal attivi
            const activeGoals = allGoals.filter(g => g.status === 'active');
            setGoals(activeGoals);
            
            // Auto-seleziona se c'è solo un goal o se goalId prop è disponibile
            if (goalId && activeGoals.some(g => g.id === goalId)) {
                setSelectedGoalId(goalId);
            } else if (activeGoals.length === 1) {
                setSelectedGoalId(activeGoals[0].id);
            }
        } catch (err) {
            console.error('Failed to load goals:', err);
            emitToast.error('Errore nel caricamento degli esami');
        } finally {
            setIsLoadingGoals(false);
        }
    };

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

    // Dropzone configurations
    const questionsConfig: DropzoneConfig = {
        id: 'questions',
        label: "📝 Domande d'Esame",
        icon: FileQuestion,
        acceptedTypes: ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        acceptedExtensions: ['.pdf', '.txt', '.docx'],
        file: questionsFile,
        onFileSelect: setQuestionsFile,
        onFileRemove: () => setQuestionsFile(null),
    };

    const sourceConfig: DropzoneConfig = {
        id: 'source',
        label: '📚 Materiale di Studio',
        icon: BookOpen,
        acceptedTypes: ['application/pdf'],
        acceptedExtensions: ['.pdf'],
        file: sourceFile,
        onFileSelect: setSourceFile,
        onFileRemove: () => setSourceFile(null),
    };

    const handleNextFromUpload = useCallback(async () => {
        if (!questionsFile || !sourceFile) return;

        try {
            setProgressStep('extracting');
            setProgressMessage('Estrazione domande...');
            setError(null);
            startTimeRef.current = Date.now();

            // Estrai domande (Livello 1)
            const result = await studyService.extractExamQuestions(questionsFile);
            
            setExtractedQuestions(result.questions);
            // Seleziona tutte le domande di default
            setSelectedQuestions(new Set(result.questions.map((_, idx) => idx)));
            
            setProgressStep('idle');
            setCurrentStep('preview');
        } catch (err: any) {
            setProgressStep('error');
            setError(err.message || 'Errore durante l\'estrazione delle domande');
            emitToast.error(err.message || 'Errore durante l\'estrazione delle domande');
        }
    }, [questionsFile, sourceFile]);

    const handleNextFromPreview = useCallback(() => {
        if (selectedQuestions.size === 0) {
            setError('Seleziona almeno una domanda');
            return;
        }
        setCurrentStep('config');
    }, [selectedQuestions]);

    const handleGenerate = useCallback(async () => {
        if (!sourceFile) return;

        // Validazione configurazione
        if (deckMode === 'new') {
            if (!deckTitle.trim()) {
                setError('Inserisci un titolo per il nuovo mazzo');
                return;
            }
            if (!selectedGoalId) {
                setError('Seleziona un esame/obiettivo per il nuovo mazzo');
                return;
            }
        }
        if (deckMode === 'existing' && !selectedDeckId) {
            setError('Seleziona un mazzo esistente');
            return;
        }

        // Prepara domande selezionate
        const questionsToProcess = Array.from(selectedQuestions)
            .map(idx => extractedQuestions[idx])
            .filter(Boolean);

        if (questionsToProcess.length === 0) {
            setError('Seleziona almeno una domanda');
            return;
        }

        setCurrentStep('progress');
        setProgressStep('analyzing');
        setProgressMessage('Analisi materiale...');
        setError(null);
        startTimeRef.current = Date.now();

        try {
            setProgressStep('generating');
            setProgressMessage('Generazione risposte...');

            // Usa la nuova API con domande selezionate (Livello 1)
            const result = await studyService.generateExamAnswers(
                sourceFile,
                questionsToProcess,
                {
                    deckId: deckMode === 'existing' ? selectedDeckId : undefined,
                    title: deckMode === 'new' ? deckTitle.trim() : undefined,
                    goalId: deckMode === 'new' ? selectedGoalId : undefined,
                }
            );

            // Salva le flashcard generate per editing manuale (Livello 2)
            // Nota: Il backend non restituisce le flashcard, quindi le ricostruiamo dalle stats
            // In un'implementazione completa, il backend dovrebbe restituire le flashcard
            setGeneratedFlashcards([]); // Reset per ora, sarà popolato se il backend le restituisce

            setProgressStep('completed');
            setProgressMessage('Completato!');
            setStats(result.stats);
            setCreatedDeckId(result.deck.id);

            // Non auto-close, mostra editing manuale se ci sono risposte non trovate (Livello 2)
            if (result.stats.answersNotFound > 0) {
                // Mostra opzione per editing manuale
            } else {
                setTimeout(() => {
                    onSuccess(result.deck.id, result.stats);
                }, 2000);
            }
        } catch (err: any) {
            setProgressStep('error');
            setError(err.message || 'Errore durante la generazione delle risposte');
            emitToast.error(err.message || 'Errore durante la generazione delle risposte');
        }
    }, [sourceFile, deckMode, deckTitle, selectedDeckId, goalId, selectedQuestions, extractedQuestions, generatedFlashcards, onSuccess]);


    // ============================================
    // STEP INDICATOR COMPONENT
    // ============================================
    const getStepNumber = (step: Step): number => {
        switch (step) {
            case 'upload': return 1;
            case 'preview': return 2;
            case 'config': return 3;
            case 'progress':
            case 'completed': return 4;
            default: return 1;
        }
    };

    const StepIndicator: React.FC = () => {
        const currentStepNumber = getStepNumber(currentStep);
        const steps = [
            { number: 1, label: 'Upload', key: 'upload' },
            { number: 2, label: 'Anteprima', key: 'preview' },
            { number: 3, label: 'Configura', key: 'config' },
            { number: 4, label: 'Genera', key: 'progress' },
        ];

        return (
            <div className="px-6 py-4 border-b border-white/5 bg-zinc-950/60">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = step.number < currentStepNumber;
                        const isActive = step.number === currentStepNumber;
                        const isFuture = step.number > currentStepNumber;

                        return (
                            <div key={step.key} className="flex items-center flex-1">
                                {/* Step Circle */}
                                <div className="flex flex-col items-center flex-1">
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            scale: isActive ? 1.1 : 1,
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={`
                                            relative w-8 h-8 rounded-full flex items-center justify-center
                                            transition-all duration-300
                                            ${isCompleted
                                                ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                                : isActive
                                                ? 'bg-amber-500/20 border-2 border-amber-500'
                                                : 'bg-zinc-800/60 border-2 border-white/10'
                                            }
                                        `}
                                    >
                                        {isCompleted ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                            >
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            </motion.div>
                                        ) : isActive ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                className="w-3 h-3 rounded-full bg-amber-500"
                                            />
                                        ) : (
                                            <div className="w-3 h-3 rounded-full bg-white/20" />
                                        )}
                                    </motion.div>
                                    <motion.span
                                        initial={false}
                                        animate={{
                                            color: isActive ? 'rgb(251 191 36)' : isCompleted ? 'rgb(34 197 94)' : 'rgb(255 255 255 / 0.4)',
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className="text-xs font-medium mt-2 whitespace-nowrap"
                                    >
                                        {step.label}
                                    </motion.span>
                                </div>

                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className="flex-1 mx-2 h-0.5 relative">
                                        <div className="absolute inset-0 bg-zinc-800/60 rounded-full" />
                                        <motion.div
                                            initial={{ scaleX: 0 }}
                                            animate={{
                                                scaleX: isCompleted ? 1 : 0,
                                            }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                            className="absolute inset-0 bg-emerald-500 rounded-full origin-left"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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

                    {/* Step Indicator */}
                    <StepIndicator />

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-zinc-950/40 max-h-[80vh] overflow-y-auto">
                        {/* STEP 1: UPLOAD */}
                        {currentStep === 'upload' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <DualDropzone
                                    questionsConfig={questionsConfig}
                                    sourceConfig={sourceConfig}
                                    error={error}
                                    onError={setError}
                                />

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

                        {/* STEP 2: PREVIEW DOMANDE (Livello 1) */}
                        {currentStep === 'preview' && (
                            <QuestionsPreview
                                questions={extractedQuestions}
                                selectedIndices={selectedQuestions}
                                onSelectionChange={setSelectedQuestions}
                                onBack={() => setCurrentStep('upload')}
                                onNext={handleNextFromPreview}
                                error={error}
                            />
                        )}

                        {/* STEP 3: CONFIGURAZIONE */}
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

                                    {/* Input titolo e goal (nuovo mazzo) */}
                                    {deckMode === 'new' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-4"
                                        >
                                            <div className="space-y-2">
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
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-white/80">
                                                    Esame / Obiettivo <span className="text-red-400">*</span>
                                                </label>
                                                {isLoadingGoals ? (
                                                    <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                                                        <span className="text-sm text-white/60">Caricamento esami...</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={selectedGoalId}
                                                        onChange={(e) => setSelectedGoalId(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                    >
                                                        <option value="">Seleziona un esame...</option>
                                                        {goals.map((goal) => (
                                                            <option key={goal.id} value={goal.id}>
                                                                {goal.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {goals.length === 0 && !isLoadingGoals && (
                                                    <p className="text-xs text-white/50">
                                                        Nessun esame attivo trovato. Crea un esame dalla dashboard.
                                                    </p>
                                                )}
                                            </div>
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
                                        onClick={() => setCurrentStep('preview')}
                                        className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white font-medium transition-colors"
                                    >
                                        Indietro
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={
                                            (deckMode === 'new' && (!deckTitle.trim() || !selectedGoalId)) ||
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

                                        {/* Livello 2: Editing manuale per risposte non trovate */}
                                        {stats.answersNotFound > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                                            >
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertCircle className="w-5 h-5 text-amber-400" />
                                                    <h4 className="text-sm font-semibold text-amber-300">
                                                        {stats.answersNotFound} risposta{stats.answersNotFound > 1 ? 'e' : ''} non trovata{stats.answersNotFound > 1 ? 'e' : ''}
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-white/60 mb-3">
                                                    Puoi inserire manualmente le risposte o cercarle su Google.
                                                </p>
                                                <div className="space-y-2">
                                                    {Array.from({ length: Math.min(stats.answersNotFound, 3) }).map((_, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder={`Inserisci risposta manuale ${idx + 1}...`}
                                                                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/10 text-white text-sm placeholder-white/30 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const question = extractedQuestions[Array.from(selectedQuestions)[idx] || 0] || '';
                                                                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(question)}`;
                                                                    window.open(searchUrl, '_blank');
                                                                }}
                                                                className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium transition-colors flex items-center gap-1.5"
                                                            >
                                                                <Search className="w-4 h-4" />
                                                                Cerca
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {stats.answersNotFound > 3 && (
                                                        <p className="text-xs text-white/40 text-center">
                                                            ... e altre {stats.answersNotFound - 3} risposte
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    if (createdDeckId) {
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
