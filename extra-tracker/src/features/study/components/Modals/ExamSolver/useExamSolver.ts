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
import type { 
    ExamSolverStats, 
    Step, 
    ProgressStep, 
    FlashcardWithId 
} from './ExamSolverModal.types';

// Re-export types for convenience
export type { Step, ProgressStep, FlashcardWithId };

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
    progressCurrent: number;
    progressTotal: number;
    currentQuestion: string;
    stats: ExamSolverStats | null;
    createdDeckId: string;
    
    // Generated flashcards (per editing manuale)
    generatedFlashcards: FlashcardWithId[];
    
    // Source file URL per visualizzazione PDF
    sourceFileUrl: string | null;
    
    // Actions
    extractQuestions: () => Promise<void>;
    generateAnswers: () => Promise<void>;
    handleNextFromPreview: () => void;
    handleEditCard: (cardId: string, newAnswer: string) => void;
    handleRegenerateCard: (cardId: string, question: string) => Promise<void>;
    handleSaveReview: () => void;
    
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
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
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
            setProgressCurrent(0);
            setProgressTotal(0);
            setCurrentQuestion('');
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
            setProgressTotal(questionsToProcess.length);
            setProgressCurrent(0);

            // Usa fetch con streaming SSE invece di studyService.generateExamAnswers
            const formData = new FormData();
            formData.append('sourceFile', sourceFile);
            formData.append('selectedQuestions', JSON.stringify(questionsToProcess));
            
            if (deckMode === 'existing' && selectedDeckId) {
                formData.append('deckId', selectedDeckId);
            }
            if (deckMode === 'new') {
                if (deckTitle.trim()) {
                    formData.append('title', deckTitle.trim());
                }
                if (selectedGoalId) {
                    formData.append('goalId', selectedGoalId);
                }
            }

            const response = await fetch('/api/study/exam-solver/generate-answers', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error?.message || 
                    errorData.message || 
                    `Errore ${response.status}: generazione risposte fallita`
                );
            }

            // Leggi la risposta come stream SSE
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (!reader) {
                throw new Error('Impossibile leggere la risposta dal server');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // Gli eventi SSE sono separati da \n\n
                const events = buffer.split('\n\n');
                buffer = events.pop() || ''; // Mantieni l'ultimo evento incompleto

                for (const event of events) {
                    if (!event.trim()) continue;
                    
                    let eventType = 'message';
                    let eventData = '';

                    // Parse evento SSE
                    const lines = event.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            eventData = line.substring(6).trim();
                        }
                    }

                    if (eventData) {
                        try {
                            const data = JSON.parse(eventData);
                            
                            if (data.type === 'progress' || eventType === 'progress') {
                                setProgressCurrent(data.current);
                                setProgressTotal(data.total);
                                setCurrentQuestion(data.question || '');
                                setProgressMessage(`Domanda ${data.current}/${data.total}: ${data.question || ''}`);
                            } else if (data.type === 'complete' || eventType === 'complete') {
                                setProgressStep('completed');
                                setProgressMessage('Generazione completata!');
                                setStats(data.stats);
                                setCreatedDeckId(data.deck?.id || '');
                                setGeneratedFlashcards(data.flashcards || []);

                                // Vai allo step review invece di completed
                                setCurrentStep('review');
                            } else if (data.type === 'error' || eventType === 'error') {
                                throw new Error(data.message || 'Errore durante la generazione');
                            }
                        } catch (parseErr) {
                            console.error('Error parsing SSE data:', parseErr, 'Raw data:', eventData);
                        }
                    }
                }
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
    // REVIEW ACTIONS
    // ============================================

    const handleEditCard = useCallback((cardId: string, newAnswer: string) => {
        // Aggiorna la flashcard locale
        setGeneratedFlashcards(prev => 
            prev.map(card => 
                card.id === cardId 
                    ? { ...card, back: newAnswer }
                    : card
            )
        );
    }, []);

    const handleRegenerateCard = useCallback(async (cardId: string, question: string) => {
        if (!sourceFile || !createdDeckId) {
            throw new Error('File o deck non disponibili');
        }

        // Rigenera la risposta per una singola domanda
        const formData = new FormData();
        formData.append('sourceFile', sourceFile);
        formData.append('selectedQuestions', JSON.stringify([question]));
        formData.append('deckId', createdDeckId);

        const response = await fetch('/api/study/exam-solver/generate-answers', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                errorData.message || 
                'Errore nella rigenerazione'
            );
        }

        // Leggi la risposta come stream SSE (semplificato per una singola domanda)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (!reader) {
            throw new Error('Impossibile leggere la risposta dal server');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const event of events) {
                if (!event.trim()) continue;
                
                const lines = event.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6).trim();
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === 'complete' && data.flashcards && data.flashcards.length > 0) {
                                const newFlashcard = data.flashcards[0];
                                // Aggiorna la flashcard con tutti i campi inclusi confidence e sourceSnippet
                                setGeneratedFlashcards(prev => 
                                    prev.map(card => 
                                        card.id === cardId 
                                            ? { 
                                                ...card, 
                                                back: newFlashcard.back, 
                                                found: newFlashcard.found,
                                                confidence: newFlashcard.confidence ?? card.confidence ?? 0,
                                                sourceSnippet: newFlashcard.sourceSnippet ?? card.sourceSnippet,
                                            }
                                            : card
                                    )
                                );
                                // Aggiorna anche nel deck
                                if (newFlashcard.back) {
                                    await studyService.updateCardAnswer(createdDeckId, cardId, newFlashcard.back);
                                }
                                return;
                            }
                        } catch (parseErr) {
                            console.error('Error parsing regenerate response:', parseErr);
                        }
                    }
                }
            }
        }
    }, [sourceFile, createdDeckId]);

    const handleSaveReview = useCallback(() => {
        if (!createdDeckId || !stats) {
            emitToast.error('Dati mancanti per il salvataggio');
            return;
        }

        // Vai allo step completed e chiama onSuccess
        setCurrentStep('completed');
        setProgressStep('completed');
        onSuccess(createdDeckId, stats);
    }, [createdDeckId, stats, onSuccess]);

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

    const canGoBack = currentStep !== 'upload' && currentStep !== 'progress' && currentStep !== 'review';

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
        progressCurrent,
        progressTotal,
        currentQuestion,
        stats,
        createdDeckId,
        generatedFlashcards,
        
    // Actions
    extractQuestions,
    generateAnswers,
    handleNextFromPreview,
    handleEditCard,
    handleRegenerateCard,
    handleSaveReview,
        
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
