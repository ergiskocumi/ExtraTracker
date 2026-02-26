/**
 * 🎯 USE EXAM SOLVER - Custom hook per gestire tutta la logica di ExamSolverModal
 * 
 * Separa completamente la logica di business dalla presentazione.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';
import { getCsrfHeader } from '../../../../../shared/services/apiClient';
import examService from '../../../services/examService';
import type { Exam } from '../../../types/exam';
import type { 
    ExamSolverStats, 
    Step, 
    ProgressStep, 
    FlashcardWithId 
} from './ExamSolverModal.types';
import {
    clearExamSolverCache,
    EXAM_SOLVER_CACHE_TTL_MS,
    loadExamSolverCache,
    parseExamSolverEvent,
    parseSseJsonPayload,
    parseSseMessageBlock,
    saveExamSolverCache,
    splitSseBuffer,
    type ExamSolverCache,
} from './utils';

// Re-export types for convenience
export type { Step, ProgressStep, FlashcardWithId };

export interface UseExamSolverProps {
    isOpen: boolean;
    existingDecks: Array<{ id: string; title: string }>;
    examId?: string;
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
    selectedExamId: string;
    setSelectedExamId: (id: string) => void;
    exams: Exam[];
    isLoadingExams: boolean;
    
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
    cachedSession: ExamSolverCache | null;
    restoreFromCache: (cache: ExamSolverCache) => void;
    resetToDefault: () => void;
}

// ============================================
// HOOK
// ============================================

export const useExamSolver = ({
    isOpen,
    existingDecks,
    examId,
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
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [isLoadingExams, setIsLoadingExams] = useState(false);

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
    const [cachedSession, setCachedSession] = useState<ExamSolverCache | null>(null);

    // Refs
    const startTimeRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const getErrorMessage = (err: unknown, fallback: string): string => {
        if (err instanceof Error && err.message.trim()) {
            return err.message;
        }
        return fallback;
    };

    const readApiErrorMessage = (payload: unknown, fallback: string): string => {
        if (!payload || typeof payload !== 'object') {
            return fallback;
        }
        const record = payload as Record<string, unknown>;
        const error = record.error;
        if (error && typeof error === 'object') {
            const message = (error as Record<string, unknown>).message;
            if (typeof message === 'string' && message.trim()) {
                return message;
            }
        }
        if (typeof record.message === 'string' && record.message.trim()) {
            return record.message;
        }
        return fallback;
    };

    const releaseObjectUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setSourceFileUrl(null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            releaseObjectUrl();
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            releaseObjectUrl();
        };
    }, [isOpen, releaseObjectUrl]);

    // ============================================
    // LOCALSTORAGE CACHE
    // ============================================

    // Save cache
    const saveCache = useCallback(() => {
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
                selectedExamId,
                generatedFlashcards: currentStep === 'review' ? generatedFlashcards : undefined,
                createdDeckId: createdDeckId || undefined,
            };
            saveExamSolverCache(cache);
        } catch (err: unknown) {
            console.error('Errore salvataggio cache:', err);
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
        selectedExamId,
        generatedFlashcards,
        createdDeckId,
    ]);

    // Load cache
    const loadCache = useCallback((): ExamSolverCache | null => {
        return loadExamSolverCache(localStorage, Date.now(), EXAM_SOLVER_CACHE_TTL_MS);
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        try {
            clearExamSolverCache();
        } catch (err: unknown) {
            console.error('Errore rimozione cache:', err);
        }
    }, []);

    // ============================================
    // RESET LOGIC
    // ============================================

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

        setExams([]);
        setSelectedExamId(examId || '');
        setProgressStep('idle');
        setProgressMessage('');
        setProgressCurrent(0);
        setProgressTotal(0);
        setCurrentQuestion('');
        setStats(null);
        setError(null);
        setCreatedDeckId('');
        setGeneratedFlashcards([]);
        releaseObjectUrl();
        startTimeRef.current = null;
        setShowRestorePrompt(false);
        setCachedSession(null);
    }, [preselectedDeckId, existingDecks, examId, releaseObjectUrl]);

    // Restore from cache
    const restoreFromCache = useCallback((cache: ExamSolverCache) => {
        setCurrentStep(cache.step);
        setExtractedQuestions(cache.extractedQuestions || []);
        setSelectedQuestions(new Set(cache.selectedQuestions || []));
        setDeckMode(cache.deckMode || 'new');
        setDeckTitle(cache.deckTitle || '');
        setSelectedDeckId(cache.selectedDeckId || '');
        setSelectedExamId(cache.selectedExamId || examId || '');

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
    }, [examId]);

    useEffect(() => {
        if (!isOpen) return;
        const cached = loadCache();
        if (cached && cached.step !== 'upload') {
            setCachedSession(cached);
            setShowRestorePrompt(true);
            return;
        }
        resetToDefault();
    }, [isOpen, loadCache, resetToDefault]);

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
        selectedExamId,
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
    // LOAD EXAMS
    // ============================================

    const loadExams = useCallback(async () => {
        try {
            setIsLoadingExams(true);
            const allExams = await examService.getAll();
            const activeExams = allExams.filter(e => e.status === 'active');
            setExams(activeExams);
            
            if (examId && activeExams.some(e => e.id === examId)) {
                setSelectedExamId(examId);
            } else if (activeExams.length === 1) {
                setSelectedExamId(activeExams[0].id);
            }
        } catch (err: unknown) {
            console.error('Failed to load exams:', err);
            emitToast.error('Errore nel caricamento degli esami');
        } finally {
            setIsLoadingExams(false);
        }
    }, [examId]);

    useEffect(() => {
        if (isOpen && deckMode === 'new' && exams.length === 0) {
            loadExams();
        }
    }, [isOpen, deckMode, exams.length, loadExams]);

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
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Errore durante l'estrazione delle domande");
            setProgressStep('error');
            setError(message);
            emitToast.error(message);
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

        if (deckMode === 'new') {
            if (!deckTitle.trim()) {
                setError('Inserisci un titolo per il nuovo mazzo');
                return;
            }
        }
        if (deckMode === 'existing' && !selectedDeckId) {
            setError('Seleziona un mazzo esistente');
            return;
        }

        const questionsToProcess = Array.from(selectedQuestions)
            .map((idx) => extractedQuestions[idx])
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

        const MAX_RETRIES = 3;
        let retryCount = 0;
        let hasSwitchedToReview = false;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
                        if (selectedExamId) {
                            formData.append('examId', selectedExamId);
                        }
                    }

                    abortControllerRef.current = new AbortController();

                    const csrfHeader = await getCsrfHeader();
                    const response = await fetch('/api/study/exam-solver/generate-answers', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                        headers: csrfHeader,
                        signal: abortControllerRef.current.signal,
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new Error(
                            readApiErrorMessage(
                                errorData,
                                `Errore ${response.status}: generazione risposte fallita`
                            )
                        );
                    }

                    return response;
                } catch (err: unknown) {
                    if (err instanceof Error && err.name === 'AbortError') {
                        throw err;
                    }

                    retryCount += 1;
                    if (retryCount >= MAX_RETRIES) {
                        throw err;
                    }

                    const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
                    console.warn(`SSE fetch fallito (tentativo ${retryCount}/${MAX_RETRIES}), retry in ${delay}ms...`);

                    setProgressMessage(`Errore connessione, nuovo tentativo in ${delay / 1000}s...`);
                    await sleep(delay);
                }
            }

            throw new Error('Max tentativi raggiunto');
        };

        try {
            const response = await fetchWithRetry();
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
                const { events, rest } = splitSseBuffer(buffer);
                buffer = rest;

                for (const rawEvent of events) {
                    const parsedMessage = parseSseMessageBlock(rawEvent);
                    if (!parsedMessage) continue;

                    const payload = parseSseJsonPayload(parsedMessage.dataRaw);
                    if (payload === null) {
                        console.error('Error parsing SSE data. Raw data:', parsedMessage.dataRaw);
                        continue;
                    }

                    const streamEvent = parseExamSolverEvent(parsedMessage.eventType, payload);
                    if (!streamEvent) continue;

                    if (streamEvent.kind === 'progress') {
                        setProgressCurrent(streamEvent.current);
                        setProgressTotal(streamEvent.total);
                        setCurrentQuestion(streamEvent.question);
                        setProgressMessage(
                            `Domanda ${streamEvent.current}/${streamEvent.total}: ${streamEvent.question}`
                        );
                        continue;
                    }

                    if (streamEvent.kind === 'flashcard') {
                        setGeneratedFlashcards((prev) => [...prev, streamEvent.flashcard]);
                        if (!hasSwitchedToReview) {
                            hasSwitchedToReview = true;
                            setTimeout(() => {
                                setCurrentStep('review');
                                setProgressStep('completed');
                            }, 100);
                        }
                        continue;
                    }

                    if (streamEvent.kind === 'complete') {
                        setProgressStep('completed');
                        setProgressMessage('Generazione completata!');
                        if (streamEvent.stats) {
                            setStats(streamEvent.stats);
                        }
                        setCreatedDeckId(streamEvent.deckId);
                        setGeneratedFlashcards(streamEvent.flashcards);

                        releaseObjectUrl();
                        if (streamEvent.deckPdfUrl) {
                            const pdfUrl = streamEvent.deckPdfUrl.startsWith('http')
                                ? streamEvent.deckPdfUrl
                                : `/api${streamEvent.deckPdfUrl.startsWith('/') ? '' : '/'}${streamEvent.deckPdfUrl}`;
                            setSourceFileUrl(pdfUrl);
                        } else {
                            const objectUrl = URL.createObjectURL(sourceFile);
                            objectUrlRef.current = objectUrl;
                            setSourceFileUrl(objectUrl);
                        }

                        setTimeout(() => {
                            setCurrentStep('review');
                        }, 100);
                        continue;
                    }

                    if (streamEvent.kind === 'error') {
                        throw new Error(streamEvent.message);
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                setProgressStep('idle');
                setCurrentStep('config');
                emitToast.info('Generazione annullata');
                return;
            }

            const message = getErrorMessage(err, 'Errore durante la generazione delle risposte');
            setProgressStep('error');
            setError(message);
            emitToast.error(message);
        } finally {
            abortControllerRef.current = null;
        }
    }, [
        sourceFile,
        deckMode,
        deckTitle,
        selectedDeckId,
        selectedExamId,
        selectedQuestions,
        extractedQuestions,
        releaseObjectUrl,
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

        const formData = new FormData();
        formData.append('sourceFile', sourceFile);
        formData.append('selectedQuestions', JSON.stringify([question]));
        formData.append('deckId', createdDeckId);

        const csrfHeader = await getCsrfHeader();
        const response = await fetch('/api/study/exam-solver/generate-answers', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: csrfHeader,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(readApiErrorMessage(errorData, 'Errore nella rigenerazione'));
        }

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
            const { events, rest } = splitSseBuffer(buffer);
            buffer = rest;

            for (const rawEvent of events) {
                const parsedMessage = parseSseMessageBlock(rawEvent);
                if (!parsedMessage) continue;

                const payload = parseSseJsonPayload(parsedMessage.dataRaw);
                if (payload === null) {
                    console.error('Error parsing regenerate response:', parsedMessage.dataRaw);
                    continue;
                }

                const streamEvent = parseExamSolverEvent(parsedMessage.eventType, payload);
                if (!streamEvent) continue;

                if (streamEvent.kind === 'complete' && streamEvent.flashcards.length > 0) {
                    const newFlashcard = streamEvent.flashcards[0];
                    setGeneratedFlashcards((prev) =>
                        prev.map((card) =>
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
                    if (newFlashcard.back) {
                        await studyService.updateCardAnswer(createdDeckId, cardId, newFlashcard.back);
                    }
                    return;
                }

                if (streamEvent.kind === 'error') {
                    throw new Error(streamEvent.message);
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
                    return deckTitle.trim().length > 0;
                }
                return selectedDeckId.length > 0;
            default:
                return false;
        }
    }, [currentStep, questionsFile, sourceFile, selectedQuestions, deckMode, deckTitle, selectedDeckId]);

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
        selectedExamId,
        setSelectedExamId,
        exams,
        isLoadingExams,
        
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
