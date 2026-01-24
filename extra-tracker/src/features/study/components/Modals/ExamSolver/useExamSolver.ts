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
    handleCancelGeneration: () => void;
    
    // Error
    error: string | null;
    setError: (error: string | null) => void;
    clearError: () => void;
    
    // UI helpers
    isProcessing: boolean;
    canClose: boolean;
    handleClose: () => void;

    // Session restore
    showRestorePrompt: boolean;
    cachedSession: any;
    restoreFromCache: (cache: any) => void;
    resetToDefault: () => void;
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
    const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);

    // Error
    const [error, setError] = useState<string | null>(null);

    // Restore session prompt
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [cachedSession, setCachedSession] = useState<any>(null);

    // Refs
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentStepRef = useRef<Step>(currentStep);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        currentStepRef.current = currentStep;
    }, [currentStep]);

    useEffect(() => {
        if (!isOpen) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [isOpen]);

    // ============================================
    // LOCALSTORAGE CACHE
    // ============================================

    const CACHE_KEY = 'examSolverCache';
    const CACHE_TTL = 60 * 60 * 1000; // 1 ora

    interface ExamSolverCache {
        timestamp: number;
        step: Step;
        questionsFileName?: string;
        questionsFileSize?: number;
        sourceFileName?: string;
        sourceFileSize?: number;
        extractedQuestions: string[];
        selectedQuestions: number[];
        deckMode: 'new' | 'existing';
        deckTitle: string;
        selectedDeckId: string;
        selectedGoalId: string;
        generatedFlashcards?: FlashcardWithId[];
        createdDeckId?: string;
    }

    // Save cache
    const saveCache = useCallback(() => {
        // Non salvare se siamo in upload step o processing
        if (currentStep === 'upload' || progressStep === 'generating' || progressStep === 'analyzing') {
            return;
        }

        try {
            const cache: ExamSolverCache = {
                timestamp: Date.now(),
                step: currentStep,
                questionsFileName: questionsFile?.name,
                questionsFileSize: questionsFile?.size,
                sourceFileName: sourceFile?.name,
                sourceFileSize: sourceFile?.size,
                extractedQuestions,
                selectedQuestions: Array.from(selectedQuestions),
                deckMode,
                deckTitle,
                selectedDeckId,
                selectedGoalId,
                generatedFlashcards: currentStep === 'review' ? generatedFlashcards : undefined,
                createdDeckId: createdDeckId || undefined,
            };

            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            console.log('💾 Exam Solver cache salvato');
        } catch (err) {
            console.error('❌ Errore salvataggio cache:', err);
        }
    }, [
        currentStep,
        progressStep,
        questionsFile,
        sourceFile,
        extractedQuestions,
        selectedQuestions,
        deckMode,
        deckTitle,
        selectedDeckId,
        selectedGoalId,
        generatedFlashcards,
        createdDeckId,
    ]);

    // Load cache
    const loadCache = useCallback((): ExamSolverCache | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data: ExamSolverCache = JSON.parse(cached);
            const age = Date.now() - data.timestamp;

            // Check se cache è scaduto (> 1 ora)
            if (age > CACHE_TTL) {
                console.log('⏰ Cache scaduto, rimuovo');
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            console.log('✅ Cache trovato (età:', Math.floor(age / 1000 / 60), 'min)');
            return data;
        } catch (err) {
            console.error('❌ Errore caricamento cache:', err);
            return null;
        }
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        try {
            localStorage.removeItem(CACHE_KEY);
            console.log('🗑️ Cache rimosso');
        } catch (err) {
            console.error('❌ Errore rimozione cache:', err);
        }
    }, []);

    // ============================================
    // RESET LOGIC
    // ============================================

    useEffect(() => {
        if (isOpen) {
            // Check se c'è una sessione salvata
            const cached = loadCache();

            if (cached && cached.step !== 'upload') {
                // Mostra prompt per ripristinare
                setCachedSession(cached);
                setShowRestorePrompt(true);
            } else {
                // Nessuna cache, reset normale
                resetToDefault();
            }
        }
    }, [isOpen, loadCache]);

    // Reset to default state
    const resetToDefault = useCallback(() => {
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
        setSourceFileUrl(null);
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        startTimeRef.current = null;
        setShowRestorePrompt(false);
        setCachedSession(null);
    }, [preselectedDeckId, existingDecks, goalId]);

    // Restore from cache
    const restoreFromCache = useCallback((cache: ExamSolverCache) => {
        setCurrentStep(cache.step);
        setExtractedQuestions(cache.extractedQuestions || []);
        setSelectedQuestions(new Set(cache.selectedQuestions || []));
        setDeckMode(cache.deckMode || 'new');
        setDeckTitle(cache.deckTitle || '');
        setSelectedDeckId(cache.selectedDeckId || '');
        setSelectedGoalId(cache.selectedGoalId || goalId || '');

        if (cache.generatedFlashcards) {
            setGeneratedFlashcards(cache.generatedFlashcards);
        }
        if (cache.createdDeckId) {
            setCreatedDeckId(cache.createdDeckId);
        }

        setShowRestorePrompt(false);
        setCachedSession(null);

        emitToast.success('Sessione ripristinata!');
        console.log('✅ Sessione ripristinata da cache');
    }, [goalId]);

    // Auto-save after state changes
    useEffect(() => {
        if (isOpen && currentStep !== 'upload') {
            saveCache();
        }
    }, [
        isOpen,
        currentStep,
        extractedQuestions,
        selectedQuestions,
        deckMode,
        deckTitle,
        selectedDeckId,
        selectedGoalId,
        generatedFlashcards,
        saveCache,
    ]);

    // Clear cache on successful completion
    useEffect(() => {
        if (progressStep === 'completed' && createdDeckId) {
            clearCache();
        }
    }, [progressStep, createdDeckId, clearCache]);

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

        // Configurazione retry
        const MAX_RETRIES = 3;
        let retryCount = 0;

        // Helper: sleep per exponential backoff
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Helper: fetch con retry
        const fetchWithRetry = async (): Promise<Response> => {
            while (retryCount < MAX_RETRIES) {
                try {
                    setProgressStep('generating');
                    setProgressMessage(
                        retryCount > 0
                            ? `Generazione risposte (tentativo ${retryCount + 1}/${MAX_RETRIES})...`
                            : 'Generazione risposte...'
                    );
                    setProgressTotal(questionsToProcess.length);
                    setProgressCurrent(0);

                    // Usa fetch con streaming SSE
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

                    // Crea nuovo AbortController per questo fetch
                    abortControllerRef.current = new AbortController();

                    const response = await fetch('/api/study/exam-solver/generate-answers', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                        signal: abortControllerRef.current.signal,
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message ||
                            errorData.message ||
                            `Errore ${response.status}: generazione risposte fallita`
                        );
                    }

                    return response;

                } catch (err: any) {
                    if (err?.name === 'AbortError') {
                        throw err;
                    }
                    retryCount++;
                    const isLastAttempt = retryCount >= MAX_RETRIES;

                    if (isLastAttempt) {
                        throw err; // Fallimento definitivo
                    }

                    // Exponential backoff: 2s, 4s, 8s
                    const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
                    console.warn(`⚠️ SSE fetch fallito (tentativo ${retryCount}/${MAX_RETRIES}), retry in ${delay}ms...`);

                    setProgressMessage(`⚠️ Errore connessione, nuovo tentativo in ${delay / 1000}s...`);
                    await sleep(delay);
                }
            }

            throw new Error('Max tentativi raggiunto');
        };

        try {
            // Usa fetch con retry
            const response = await fetchWithRetry();

            // Leggi la risposta come stream SSE con retry su stream errors
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
                            } else if (data.type === 'flashcard' || eventType === 'flashcard') {
                                // STREAMING: Aggiungi flashcard incrementalmente
                                if (data.flashcard) {
                                    // Aggiungi ID temporaneo se mancante
                                    const flashcardWithId = {
                                        ...data.flashcard,
                                        id: data.flashcard.id || `temp-${Date.now()}-${data.index || Math.random()}`,
                                    };

                                    setGeneratedFlashcards(prev => [...prev, flashcardWithId]);

                                    // Auto-transizione a review quando arriva la prima flashcard
                                    if (currentStepRef.current === 'progress') {
                                        setTimeout(() => {
                                            setCurrentStep('review');
                                            setProgressStep('completed');
                                        }, 100);
                                    }

                                    console.log(`📥 Flashcard streaming: ${data.index || '?'}/${data.total || '?'}`);
                                }
                            } else if (data.type === 'complete' || eventType === 'complete') {
                                setProgressStep('completed');
                                setProgressMessage('Generazione completata!');
                                setStats(data.stats);
                                setCreatedDeckId(data.deck?.id || '');
                                
                                // Assicurati che le flashcards siano un array valido
                                const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
                                console.log('📋 Flashcards ricevute:', flashcards.length, flashcards);
                                
                                // Setta le flashcards PRIMA di cambiare step
                                setGeneratedFlashcards(flashcards);
                                
                                // Estrai sourceFileUrl dal deck (pdfUrl)
                                const deckPdfUrl = data.deck?.pdfUrl;
                                if (objectUrlRef.current) {
                                    URL.revokeObjectURL(objectUrlRef.current);
                                    objectUrlRef.current = null;
                                }
                                if (deckPdfUrl && typeof deckPdfUrl === 'string') {
                                    // Se è un path relativo, aggiungi il prefisso API se necessario
                                    const pdfUrl = deckPdfUrl.startsWith('http') 
                                        ? deckPdfUrl 
                                        : `/api${deckPdfUrl.startsWith('/') ? '' : '/'}${deckPdfUrl}`;
                                    setSourceFileUrl(pdfUrl);
                                } else if (sourceFile) {
                                    // Fallback: crea URL dal sourceFile se disponibile
                                    const objectUrl = URL.createObjectURL(sourceFile);
                                    objectUrlRef.current = objectUrl;
                                    setSourceFileUrl(objectUrl);
                                }
                                
                                // Piccolo delay per assicurarsi che lo stato sia aggiornato
                                setTimeout(() => {
                                    // Vai allo step review invece di completed
                                    setCurrentStep('review');
                                }, 100);
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
            // Se è un abort, non mostrare errore (cancel intenzionale)
            if (err.name === 'AbortError') {
                setProgressStep('idle');
                setCurrentStep('config');
                emitToast.info('Generazione annullata');
                return;
            }

            setProgressStep('error');
            setError(err.message || 'Errore durante la generazione delle risposte');
            emitToast.error(err.message || 'Errore durante la generazione delle risposte');
        } finally {
            // Cleanup AbortController
            abortControllerRef.current = null;
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

    const handleCancelGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            console.log('🚫 Generazione cancellata dall\'utente');
        }
    }, []);

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
        sourceFileUrl,
        
        // Actions
        extractQuestions,
        generateAnswers,
        handleNextFromPreview,
        handleEditCard,
        handleRegenerateCard,
        handleSaveReview,
        handleCancelGeneration,

        // Error
        error,
        setError,
        clearError,

        // UI helpers
        isProcessing,
        canClose,
        handleClose,

        // Session restore
        showRestorePrompt,
        cachedSession,
        restoreFromCache,
        resetToDefault,
    };
};
