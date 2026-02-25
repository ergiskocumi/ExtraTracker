/**
 * 🎯 FLASHCARD GENERATION CONTEXT - Gestione asincrona della generazione AI
 * 
 * Questo contesto permette di:
 * 1. Tracciare job di generazione multipli in parallelo
 * 2. Permettere all'utente di chiudere il modal e continuare ad usare l'app
 * 3. Mostrare un indicatore di progresso floating
 * 4. Notificare quando le flashcard sono pronte
 * 5. Permettere di riaprire il modal per vedere i dettagli
 */

import React, { createContext, useContext, useCallback, useReducer, useEffect, useRef } from 'react';
import { emitToast } from '../../../shared/components/toast';

// ==========================================
// TYPES
// ==========================================

export type GenerationStep = 
    | 'uploading' 
    | 'analyzing' 
    | 'processing' 
    | 'generating' 
    | 'completed' 
    | 'error';

export interface GenerationJob {
    id: string;
    deckId: string;
    deckTitle: string;
    step: GenerationStep;
    progress: number;
    generatedCount: number;
    totalChunks: number;
    currentChunk: number;
    message: string;
    elapsedTime: number;
    estimatedTime?: number;
    error?: string;
    blueprint?: {
        documentType?: string;
        mainTopics?: string[];
        densityScore?: number;
    };
    concepts?: string[];
    currentTopic?: string;
    startedAt: number;
    completedAt?: number;
    fileName: string;
    maxCards: number;
}

interface GenerationState {
    jobs: Map<string, GenerationJob>;
    activeJobId: string | null;
    isModalOpen: boolean;
}

type GenerationAction =
    | { type: 'START_JOB'; payload: Omit<GenerationJob, 'elapsedTime' | 'progress'> }
    | { type: 'UPDATE_JOB'; payload: { id: string; updates: Partial<GenerationJob> } }
    | { type: 'COMPLETE_JOB'; payload: { id: string; generatedCount: number } }
    | { type: 'FAIL_JOB'; payload: { id: string; error: string } }
    | { type: 'REMOVE_JOB'; payload: string }
    | { type: 'CLEAR_COMPLETED' }
    | { type: 'SET_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_ACTIVE_JOB'; payload: string | null }
    | { type: 'TICK_ELAPSED'; payload: { id: string; elapsedTime: number } };

interface FlashcardGenerationContextValue {
    // Stato
    jobs: GenerationJob[];
    activeJob: GenerationJob | null;
    hasActiveJobs: boolean;
    hasCompletedJobs: boolean;
    isModalOpen: boolean;
    
    // Azioni
    startJob: (data: {
        deckId: string;
        deckTitle: string;
        fileName: string;
        maxCards: number;
    }) => string;
    updateJob: (id: string, updates: Partial<GenerationJob>) => void;
    completeJob: (id: string, generatedCount: number) => void;
    failJob: (id: string, error: string) => void;
    removeJob: (id: string) => void;
    clearCompleted: () => void;
    openModal: (jobId?: string) => void;
    closeModal: () => void;
    dismissToBackground: () => void;
}

// ==========================================
// REDUCER
// ==========================================

const initialState: GenerationState = {
    jobs: new Map(),
    activeJobId: null,
    isModalOpen: false,
};

const generationReducer = (state: GenerationState, action: GenerationAction): GenerationState => {
    switch (action.type) {
        case 'START_JOB': {
            const newJobs = new Map(state.jobs);
            const job: GenerationJob = {
                ...action.payload,
                elapsedTime: 0,
                progress: 0,
            };
            newJobs.set(job.id, job);
            return {
                ...state,
                jobs: newJobs,
                activeJobId: job.id,
                isModalOpen: true,
            };
        }
        
        case 'UPDATE_JOB': {
            const newJobs = new Map(state.jobs);
            const job = newJobs.get(action.payload.id);
            if (job) {
                newJobs.set(action.payload.id, { ...job, ...action.payload.updates });
            }
            return { ...state, jobs: newJobs };
        }
        
        case 'COMPLETE_JOB': {
            const newJobs = new Map(state.jobs);
            const job = newJobs.get(action.payload.id);
            if (job) {
                newJobs.set(action.payload.id, {
                    ...job,
                    step: 'completed',
                    progress: 100,
                    generatedCount: action.payload.generatedCount,
                    completedAt: Date.now(),
                });
            }
            return { ...state, jobs: newJobs };
        }
        
        case 'FAIL_JOB': {
            const newJobs = new Map(state.jobs);
            const job = newJobs.get(action.payload.id);
            if (job) {
                newJobs.set(action.payload.id, {
                    ...job,
                    step: 'error',
                    error: action.payload.error,
                    completedAt: Date.now(),
                });
            }
            return { ...state, jobs: newJobs };
        }
        
        case 'REMOVE_JOB': {
            const newJobs = new Map(state.jobs);
            newJobs.delete(action.payload);
            return {
                ...state,
                jobs: newJobs,
                activeJobId: state.activeJobId === action.payload ? null : state.activeJobId,
            };
        }
        
        case 'CLEAR_COMPLETED': {
            const newJobs = new Map();
            for (const [id, job] of state.jobs) {
                if (job.step !== 'completed' && job.step !== 'error') {
                    newJobs.set(id, job);
                }
            }
            return { ...state, jobs: newJobs };
        }
        
        case 'SET_MODAL_OPEN':
            return { ...state, isModalOpen: action.payload };
            
        case 'SET_ACTIVE_JOB':
            return { ...state, activeJobId: action.payload };
            
        case 'TICK_ELAPSED': {
            const newJobs = new Map(state.jobs);
            const job = newJobs.get(action.payload.id);
            if (job && job.step !== 'completed' && job.step !== 'error') {
                newJobs.set(action.payload.id, {
                    ...job,
                    elapsedTime: action.payload.elapsedTime,
                });
            }
            return { ...state, jobs: newJobs };
        }
        
        default:
            return state;
    }
};

// ==========================================
// CONTEXT
// ==========================================

const FlashcardGenerationContext = createContext<FlashcardGenerationContextValue | null>(null);

// ID generator semplice
let jobIdCounter = 0;
const generateJobId = () => {
    jobIdCounter += 1;
    return `job-${Date.now()}-${jobIdCounter}`;
};

// ==========================================
// PROVIDER
// ==========================================

export const FlashcardGenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(generationReducer, initialState);
    const timersRef = useRef<Map<string, number>>(new Map());
    const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            intervalsRef.current.forEach(interval => clearInterval(interval));
            intervalsRef.current.clear();
        };
    }, []);

    // ==========================================
    // ACTIONS
    // ==========================================

    const startJob = useCallback((data: {
        deckId: string;
        deckTitle: string;
        fileName: string;
        maxCards: number;
    }): string => {
        const id = generateJobId();
        const now = Date.now();
        
        dispatch({
            type: 'START_JOB',
            payload: {
                id,
                step: 'uploading',
                deckId: data.deckId,
                deckTitle: data.deckTitle,
                fileName: data.fileName,
                maxCards: data.maxCards,
                message: 'Caricamento del file...',
                generatedCount: 0,
                totalChunks: 0,
                currentChunk: 0,
                startedAt: now,
            },
        });

        // Start elapsed time timer
        timersRef.current.set(id, now);
        const interval = setInterval(() => {
            const startTime = timersRef.current.get(id);
            if (startTime) {
                dispatch({
                    type: 'TICK_ELAPSED',
                    payload: { id, elapsedTime: Math.floor((Date.now() - startTime) / 1000) },
                });
            }
        }, 1000);
        intervalsRef.current.set(id, interval);

        return id;
    }, []);

    const updateJob = useCallback((id: string, updates: Partial<GenerationJob>) => {
        dispatch({ type: 'UPDATE_JOB', payload: { id, updates } });
    }, []);

    const completeJob = useCallback((id: string, generatedCount: number) => {
        // Clear timer
        const interval = intervalsRef.current.get(id);
        if (interval) {
            clearInterval(interval);
            intervalsRef.current.delete(id);
        }
        timersRef.current.delete(id);

        dispatch({ type: 'COMPLETE_JOB', payload: { id, generatedCount } });

        // Show notification
        const job = state.jobs.get(id);
        if (job) {
            emitToast.success(
                `✨ ${generatedCount} flashcard generate per "${job.deckTitle}"`,
                {
                    title: 'Generazione completata',
                    duration: 6000,
                    action: {
                        label: 'Vedi',
                        onClick: () => {
                            window.location.href = `/study/deck/${job.deckId}`;
                        },
                    },
                }
            );
        }
    }, [state.jobs]);

    const failJob = useCallback((id: string, error: string) => {
        // Clear timer
        const interval = intervalsRef.current.get(id);
        if (interval) {
            clearInterval(interval);
            intervalsRef.current.delete(id);
        }
        timersRef.current.delete(id);

        dispatch({ type: 'FAIL_JOB', payload: { id, error } });

        // Show notification
        const job = state.jobs.get(id);
        if (job) {
            emitToast.error(
                `❌ Errore nella generazione: ${error}`,
                {
                    title: 'Generazione fallita',
                    duration: 8000,
                }
            );
        }
    }, [state.jobs]);

    const removeJob = useCallback((id: string) => {
        // Clear timer if still running
        const interval = intervalsRef.current.get(id);
        if (interval) {
            clearInterval(interval);
            intervalsRef.current.delete(id);
        }
        timersRef.current.delete(id);

        dispatch({ type: 'REMOVE_JOB', payload: id });
    }, []);

    const clearCompleted = useCallback(() => {
        dispatch({ type: 'CLEAR_COMPLETED' });
    }, []);

    const openModal = useCallback((jobId?: string) => {
        if (jobId) {
            dispatch({ type: 'SET_ACTIVE_JOB', payload: jobId });
        }
        dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    }, []);

    const closeModal = useCallback(() => {
        dispatch({ type: 'SET_MODAL_OPEN', payload: false });
    }, []);

    const dismissToBackground = useCallback(() => {
        dispatch({ type: 'SET_MODAL_OPEN', payload: false });
        // Non fermiamo il job, continua in background
        emitToast.info('La generazione continua in background', {
            duration: 3000,
        });
    }, []);

    // ==========================================
    // DERIVED STATE
    // ==========================================

    const jobsArray = React.useMemo(() => 
        Array.from(state.jobs.values()).sort((a, b) => b.startedAt - a.startedAt),
    [state.jobs]);

    const activeJob = React.useMemo(() => 
        state.activeJobId ? state.jobs.get(state.activeJobId) || null : null,
    [state.activeJobId, state.jobs]);

    const hasActiveJobs = React.useMemo(() => 
        jobsArray.some(job => job.step !== 'completed' && job.step !== 'error'),
    [jobsArray]);

    const hasCompletedJobs = React.useMemo(() => 
        jobsArray.some(job => job.step === 'completed' || job.step === 'error'),
    [jobsArray]);

    const contextValue = React.useMemo<FlashcardGenerationContextValue>(() => ({
        jobs: jobsArray,
        activeJob,
        hasActiveJobs,
        hasCompletedJobs,
        isModalOpen: state.isModalOpen,
        startJob,
        updateJob,
        completeJob,
        failJob,
        removeJob,
        clearCompleted,
        openModal,
        closeModal,
        dismissToBackground,
    }), [
        jobsArray,
        activeJob,
        hasActiveJobs,
        hasCompletedJobs,
        state.isModalOpen,
        startJob,
        updateJob,
        completeJob,
        failJob,
        removeJob,
        clearCompleted,
        openModal,
        closeModal,
        dismissToBackground,
    ]);

    return (
        <FlashcardGenerationContext.Provider value={contextValue}>
            {children}
        </FlashcardGenerationContext.Provider>
    );
};

// ==========================================
// HOOK
// ==========================================

export const useFlashcardGeneration = (): FlashcardGenerationContextValue => {
    const context = useContext(FlashcardGenerationContext);
    if (!context) {
        throw new Error(
            '❌ useFlashcardGeneration deve essere usato dentro un <FlashcardGenerationProvider>\n' +
            'Assicurati di avvolgere la tua app con <FlashcardGenerationProvider> in App.tsx'
        );
    }
    return context;
};

export default FlashcardGenerationContext;
