/**
 * 🎯 USE EXAM SOLVER - Custom hook per gestire tutta la logica di ExamSolverModal
 * 
 * Separa completamente la logica di business dalla presentazione.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';
import goalsService from '../../../../goals/services/goalsService';
import type { Goal } from '../../../../goals/types';
import type { ExamSolverStats } from '../ExamSolverModal';

// ============================================
// TYPES
// ============================================

export type Step = 'upload' | 'preview' | 'config' | 'progress' | 'completed';
export type ProgressStep = 'idle' | 'extracting' | 'analyzing' | 'generating' | 'completed' | 'error';

export interface FlashcardWithId {
    id: string;
    front: string;
    back: string;
    found: boolean;
}

export interface UseExamSolverProps {
    isOpen: boolean;
    existingDecks: Array<{ id: string; title: string }>;
    goalId?: string;
    preselectedDeckId?: string;
    onSuccess: (deckId: string, stats: ExamSolverStats) => void;
    onClose: () => void;
}

export interface UseExamSolverReturn {
    // Step management
    currentStep: Step;
    goToStep: (step: Step) => void;
    canGoNext: boolean;
    canGoBack: boolean;
    
    // Files
    questionsFile: File | null;
    sourceFile: File | null;
    setQuestionsFile: (file: File | null) => void;
    setSourceFile: (file: File | null) => void;
    
    // Questions
    extractedQuestions: string[];
    selectedQuestions: Set<number>;
    setSelectedQuestions: (indices: Set<number>) => void;
    
    // Deck config
    deckMode: 'new' | 'existing';
    setDeckMode: (mode: 'new' | 'existing') => void;
    deckTitle: string;
    setDeckTitle: (title: string) => void;
    selectedDeckId: string;
    setSelectedDeckId: (id: string) => void;
    selectedGoalId: string;
    setSelectedGoalId: (id: string) => void;
    goals: Goal[];
    isLoadingGoals: boolean;
    
    // Progress
    progressStep: ProgressStep;
    progressMessage: string;
    stats: ExamSolverStats | null;
    createdDeckId: string;
    
    // Generated flashcards (per editing manuale)
    generatedFlashcards: FlashcardWithId[];
    
    // Actions
    extractQuestions: () => Promise<void>;
    generateAnswers: () => Promise<void>;
    handleNextFromPreview: () => void;
    
    // Error
    error: string | null;
    setError: (error: string | null) => void;
    clearError: () => void;
    
    // UI helpers
    isProcessing: boolean;
    canClose: boolean;
    handleClose: () => void;
}

// ============================================
// HOOK
// ============================================

export const useExamSolver = ({
    isOpen,
    existingDecks,
    goalId,
    preselectedDeckId,
    onSuccess,
    onClose,
}: UseExamSolverProps): UseExamSolverReturn => {
    // Step management
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    
    // Files
    const [questionsFile, setQuestionsFile] = useState<File | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    
    // Questions
    const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
    
    // Deck config
    const [deckMode, setDeckMode] = useState<'new' | 'existing'>('new');
    const [deckTitle, setDeckTitle] = useState('');
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    const [goals, setGoals] = useState<Goal[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [isLoadingGoals, setIsLoadingGoals] = useState(false);
    
    // Progress
    const [progressStep, setProgressStep] = useState<ProgressStep>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [stats, setStats] = useState<ExamSolverStats | null>(null);
    const [createdDeckId, setCreatedDeckId] = useState<string>('');
    const [generatedFlashcards, setGeneratedFlashcards] = useState<FlashcardWithId[]>([]);
    
    // Error
    const [error, setError] = useState<string | null>(null);
    
    // Refs
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ============================================
    // RESET LOGIC
    // ============================================

    useEffect(() => {
        if (isOpen) {
            setCurrentStep('upload');
            setQuestionsFile(null);
            setSourceFile(null);
            setExtractedQuestions([]);
            setSelectedQuestions(new Set());
            
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
            setSelectedGoalId(goalId || '');
            setProgressStep('idle');
            setProgressMessage('');
            setStats(null);
            setError(null);
            setCreatedDeckId('');
            setGeneratedFlashcards([]);
            startTimeRef.current = null;
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isOpen, preselectedDeckId, existingDecks, goalId]);

    // ============================================
    // LOAD GOALS
    // ============================================

    const loadGoals = useCallback(async () => {
        try {
            setIsLoadingGoals(true);
            const allGoals = await goalsService.getAll();
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
    }, [goalId]);

    useEffect(() => {
        if (isOpen && deckMode === 'new' && goals.length === 0) {
            loadGoals();
        }
    }, [isOpen, deckMode, goals.length, loadGoals]);

    // ============================================
    // TIMER LOGIC
    // ============================================

    useEffect(() => {
        if (['extracting', 'analyzing', 'generating'].includes(progressStep)) {
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
            }
            timerRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    // Timer visibile nel progress step (se necessario in futuro)
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

    // ============================================
    // ACTIONS
    // ============================================

    const extractQuestions = useCallback(async () => {
        if (!questionsFile || !sourceFile) return;

        try {
            // Passa subito allo step preview per mostrare skeleton
            setCurrentStep('preview');
            setProgressStep('extracting');
            setProgressMessage('Estrazione domande...');
            setError(null);
            startTimeRef.current = Date.now();

            const result = await studyService.extractExamQuestions(questionsFile);
            
            setExtractedQuestions(result.questions);
            // Seleziona tutte le domande di default
            setSelectedQuestions(new Set(result.questions.map((_, idx) => idx)));
            
            setProgressStep('idle');
            setProgressMessage('');
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

    const generateAnswers = useCallback(async () => {
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

            const result = await studyService.generateExamAnswers(
                sourceFile,
                questionsToProcess,
                {
                    deckId: deckMode === 'existing' ? selectedDeckId : undefined,
                    title: deckMode === 'new' ? deckTitle.trim() : undefined,
                    goalId: deckMode === 'new' ? selectedGoalId : undefined,
                }
            );

            setProgressStep('completed');
            setProgressMessage('Completato!');
            setStats(result.stats);
            setCreatedDeckId(result.deck.id);
            
            // Salva le flashcard generate con ID per editing manuale
            setGeneratedFlashcards(result.flashcards || []);

            // Auto-close dopo 2 secondi se non ci sono risposte non trovate
            if (result.stats.answersNotFound === 0) {
                setTimeout(() => {
                    onSuccess(result.deck.id, result.stats);
                }, 2000);
            }
        } catch (err: any) {
            setProgressStep('error');
            setError(err.message || 'Errore durante la generazione delle risposte');
            emitToast.error(err.message || 'Errore durante la generazione delle risposte');
        }
    }, [
        sourceFile,
        deckMode,
        deckTitle,
        selectedDeckId,
        selectedGoalId,
        selectedQuestions,
        extractedQuestions,
        onSuccess,
    ]);

    // ============================================
    // HELPERS
    // ============================================

    const goToStep = useCallback((step: Step) => {
        setCurrentStep(step);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

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

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const canGoNext = useCallback(() => {
        switch (currentStep) {
            case 'upload':
                return questionsFile !== null && sourceFile !== null;
            case 'preview':
                return selectedQuestions.size > 0;
            case 'config':
                if (deckMode === 'new') {
                    return deckTitle.trim().length > 0 && selectedGoalId.length > 0;
                }
                return selectedDeckId.length > 0;
            default:
                return false;
        }
    }, [currentStep, questionsFile, sourceFile, selectedQuestions, deckMode, deckTitle, selectedGoalId, selectedDeckId]);

    const canGoBack = currentStep !== 'upload' && currentStep !== 'progress';

    const isProcessing = ['extracting', 'analyzing', 'generating'].includes(progressStep);

    const canClose = !isProcessing;

    // ============================================
    // RETURN
    // ============================================

    return {
        // Step management
        currentStep,
        goToStep,
        canGoNext: canGoNext(),
        canGoBack,
        
        // Files
        questionsFile,
        sourceFile,
        setQuestionsFile,
        setSourceFile,
        
        // Questions
        extractedQuestions,
        selectedQuestions,
        setSelectedQuestions,
        
        // Deck config
        deckMode,
        setDeckMode,
        deckTitle,
        setDeckTitle,
        selectedDeckId,
        setSelectedDeckId,
        selectedGoalId,
        setSelectedGoalId,
        goals,
        isLoadingGoals,
        
        // Progress
        progressStep,
        progressMessage,
        stats,
        createdDeckId,
        generatedFlashcards,
        
        // Actions
        extractQuestions,
        generateAnswers,
        handleNextFromPreview,
        
        // Error
        error,
        setError,
        clearError,
        
        // UI helpers
        isProcessing,
        canClose,
        handleClose,
    };
};
