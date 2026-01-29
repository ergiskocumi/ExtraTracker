/**
 * 🎓 TUTORIAL CONTEXT - Sistema di tutorial guidato interattivo
 * 
 * Features:
 * - Tutorial step-by-step con animazioni fluide
 * - Highlighting degli elementi con overlay
 * - Tooltip informativi con descrizioni
 * - Navigazione tra gli step
 * - Salvataggio progresso in localStorage
 * - Supporto per tutorial multipli (Dashboard, Study, ecc.)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface TutorialStep {
    id: string;
    target: string; // Selector CSS o ref
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    offset?: { x: number; y: number };
    action?: () => void; // Azione da eseguire prima di mostrare lo step
    waitForElement?: boolean; // Aspetta che l'elemento sia visibile
    highlightPadding?: number;
}

export interface TutorialConfig {
    id: string;
    name: string;
    steps: TutorialStep[];
    autoStart?: boolean;
    skipable?: boolean;
}

interface TutorialState {
    currentTutorial: string | null;
    currentStep: number;
    isActive: boolean;
    isPaused: boolean;
}

interface TutorialContextValue {
    // State
    state: TutorialState;
    currentConfig: TutorialConfig | null;
    
    // Actions
    startTutorial: (tutorialId: string) => void;
    nextStep: () => void;
    previousStep: () => void;
    skipTutorial: () => void;
    completeTutorial: () => void;
    pauseTutorial: () => void;
    resumeTutorial: () => void;
    
    // Utils
    isTutorialCompleted: (tutorialId: string) => boolean;
    registerTutorial: (config: TutorialConfig) => void;
}

// ============================================
// CONTEXT
// ============================================

const TutorialContext = createContext<TutorialContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface TutorialProviderProps {
    children: React.ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
    const [state, setState] = useState<TutorialState>({
        currentTutorial: null,
        currentStep: 0,
        isActive: false,
        isPaused: false,
    });
    
    const [tutorials, setTutorials] = useState<Map<string, TutorialConfig>>(new Map());
    const [currentConfig, setCurrentConfig] = useState<TutorialConfig | null>(null);
    const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());

    // Carica tutorial completati da localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('tutorial-completed');
            if (saved) {
                const completed = JSON.parse(saved) as string[];
                const completedSet = new Set(completed);
                setCompletedTutorials(completedSet);
                console.log('📚 Tutorial completati caricati:', Array.from(completedSet));
            } else {
                console.log('📚 Nessun tutorial completato trovato in localStorage');
            }
        } catch (err) {
            console.error('Errore caricamento tutorial completati:', err);
        }
    }, []);

    // Salva tutorial completati in localStorage
    const saveCompletedTutorials = useCallback((completed: Set<string>) => {
        try {
            localStorage.setItem('tutorial-completed', JSON.stringify(Array.from(completed)));
        } catch (err) {
            console.error('Errore salvataggio tutorial completati:', err);
        }
    }, []);

    // Avvia un tutorial
    const startTutorial = useCallback((tutorialId: string) => {
        // Controlla se è già completato
        if (completedTutorials.has(tutorialId)) {
            console.log(`Tutorial ${tutorialId} già completato`);
            return;
        }

        // Cerca il tutorial nella Map
        setTutorials((prev) => {
            const config = prev.get(tutorialId);
            if (!config) {
                console.warn(`Tutorial ${tutorialId} non trovato nella Map`);
                return prev;
            }

            // Avvia il tutorial
            setState({
                currentTutorial: tutorialId,
                currentStep: 0,
                isActive: true,
                isPaused: false,
            });
            setCurrentConfig(config);
            
            return prev;
        });
    }, [completedTutorials]);

    // Helper per controllare se un tutorial è completato (controlla direttamente localStorage)
    const isTutorialCompletedInStorage = useCallback((tutorialId: string): boolean => {
        try {
            const saved = localStorage.getItem('tutorial-completed');
            if (saved) {
                const completed = JSON.parse(saved) as string[];
                return completed.includes(tutorialId);
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    // Registra un nuovo tutorial
    const registerTutorial = useCallback((config: TutorialConfig) => {
        const isCompleted = isTutorialCompletedInStorage(config.id);
        console.log(`📝 Registrazione tutorial: ${config.id}`, { 
            autoStart: config.autoStart, 
            completed: isCompleted,
            completedInState: completedTutorials.has(config.id)
        });
        
        setTutorials((prev) => {
            const next = new Map(prev);
            next.set(config.id, config);
            return next;
        });

        // Auto-start se configurato e non completato
        if (config.autoStart && !isCompleted) {
            console.log(`⏳ Auto-start tutorial ${config.id} tra 1.5 secondi...`);
            // Usa un timeout più lungo per assicurarsi che il rendering sia completo
            setTimeout(() => {
                // Verifica ancora che non sia completato (controlla direttamente localStorage)
                const stillNotCompleted = !isTutorialCompletedInStorage(config.id);
                if (stillNotCompleted) {
                    setTutorials((currentTutorials) => {
                        const currentConfig = currentTutorials.get(config.id);
                        if (currentConfig) {
                            console.log(`🚀 Avvio tutorial ${config.id}`);
                            setState({
                                currentTutorial: config.id,
                                currentStep: 0,
                                isActive: true,
                                isPaused: false,
                            });
                            setCurrentConfig(currentConfig);
                        } else {
                            console.warn(`⚠️ Tutorial ${config.id} non trovato nella Map`);
                        }
                        return currentTutorials;
                    });
                } else {
                    console.log(`⚠️ Tutorial ${config.id} completato nel frattempo`);
                }
            }, 1500); // Delay aumentato per permettere il rendering completo
        } else if (config.autoStart && isCompleted) {
            console.log(`⏭️ Tutorial ${config.id} già completato, skip auto-start`);
        }
    }, [completedTutorials, isTutorialCompletedInStorage]);

    // Prossimo step
    const nextStep = useCallback(() => {
        setState((prev) => {
            if (!prev.currentTutorial || !currentConfig) return prev;
            
            const nextStepIndex = prev.currentStep + 1;
            
            // Se siamo all'ultimo step, completa il tutorial
            if (nextStepIndex >= currentConfig.steps.length) {
                completeTutorial();
                return prev;
            }
            
            return {
                ...prev,
                currentStep: nextStepIndex,
            };
        });
    }, [currentConfig]);

    // Step precedente
    const previousStep = useCallback(() => {
        setState((prev) => {
            if (!prev.currentTutorial) return prev;
            
            const prevStepIndex = Math.max(0, prev.currentStep - 1);
            
            return {
                ...prev,
                currentStep: prevStepIndex,
            };
        });
    }, []);

    // Salta il tutorial
    const skipTutorial = useCallback(() => {
        setState({
            currentTutorial: null,
            currentStep: 0,
            isActive: false,
            isPaused: false,
        });
        setCurrentConfig(null);
    }, []);

    // Completa il tutorial
    const completeTutorial = useCallback(() => {
        setState((prev) => {
            if (!prev.currentTutorial) return prev;
            
            const newCompleted = new Set(completedTutorials);
            newCompleted.add(prev.currentTutorial);
            setCompletedTutorials(newCompleted);
            saveCompletedTutorials(newCompleted);
            
            return {
                currentTutorial: null,
                currentStep: 0,
                isActive: false,
                isPaused: false,
            };
        });
        setCurrentConfig(null);
    }, [completedTutorials, saveCompletedTutorials]);

    // Pausa il tutorial
    const pauseTutorial = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isPaused: true,
        }));
    }, []);

    // Riprendi il tutorial
    const resumeTutorial = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isPaused: false,
        }));
    }, []);

    // Verifica se un tutorial è completato
    const isTutorialCompleted = useCallback((tutorialId: string) => {
        return completedTutorials.has(tutorialId);
    }, [completedTutorials]);

    const value: TutorialContextValue = {
        state,
        currentConfig,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        completeTutorial,
        pauseTutorial,
        resumeTutorial,
        isTutorialCompleted,
        registerTutorial,
    };

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};

// ============================================
// HOOK
// ============================================

export const useTutorial = (): TutorialContextValue => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial deve essere usato dentro TutorialProvider');
    }
    return context;
};
