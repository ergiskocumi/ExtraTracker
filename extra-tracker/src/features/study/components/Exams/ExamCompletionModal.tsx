/**
 * 🎓 EXAM COMPLETION MODAL - Sistema di completamento esame intelligente
 * 
 * Gestisce due flussi principali:
 * 1. VICTORY FLOW: Esame superato con confetti e celebrazione
 * 2. RECOVERY FLOW: Esame non superato con piano di recupero intelligente
 * 
 * Design empatico e costruttivo per aiutare l'utente a migliorare.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, AlertCircle, RotateCcw, Sparkles, RefreshCw, X } from 'lucide-react';
import type { Goal, ExamOutcome } from '../../../goals/types';
import { emitToast } from '../../../../shared/components/toast';

// Dynamic import per canvas-confetti (opzionale)
let confetti: any = null;
const loadConfetti = async () => {
    if (confetti) return confetti;
    try {
        const confettiModule = await import('canvas-confetti');
        confetti = confettiModule.default || confettiModule;
        return confetti;
    } catch (e) {
        console.warn('canvas-confetti non installato. Installa con: npm install canvas-confetti @types/canvas-confetti');
        return null;
    }
};

// ============================================
// TYPES
// ============================================

interface ExamCompletionModalProps {
    isOpen: boolean;
    exam: Goal;
    onClose: () => void;
    onComplete: (examId: string, outcome: ExamOutcome, status: 'passed' | 'failed') => Promise<void>;
    onResetCards?: (examId: string, type: 'all' | 'hard-only') => Promise<void>;
    onGenerateAIQuestions?: (examId: string, topics: string[]) => Promise<void>;
}

type CompletionStep = 'outcome' | 'victory-grade' | 'recovery-reason' | 'recovery-actions';

type DifficultyOption = 'concepts' | 'time' | 'anxiety' | 'unexpected';

type GradingSystem = '30' | '100' | 'letter' | 'custom';

interface GradingSystemConfig {
    id: GradingSystem;
    label: string;
    min: number;
    max: number;
    step: number;
    placeholder: string;
    formatValue: (value: number) => string;
}

// ============================================
// COMPONENT
// ============================================

export const ExamCompletionModal: React.FC<ExamCompletionModalProps> = ({
    isOpen,
    exam,
    onClose,
    onComplete,
    onResetCards,
    onGenerateAIQuestions,
}) => {
    const [step, setStep] = useState<CompletionStep>('outcome');
    const [isLoading, setIsLoading] = useState(false);
    const [grade, setGrade] = useState<string>('');
    const [gradingSystem, setGradingSystem] = useState<GradingSystem>('30');
    const [selectedDifficulties, setSelectedDifficulties] = useState<Set<DifficultyOption>>(new Set());
    const [savedDifficulties, setSavedDifficulties] = useState<Set<DifficultyOption>>(new Set()); // Preserva le difficoltà per le azioni di recupero
    const [notes, setNotes] = useState<string>('');
    const [gradeError, setGradeError] = useState<string>('');

    // Configurazioni sistemi di valutazione
    const gradingSystems: GradingSystemConfig[] = [
        {
            id: '30',
            label: 'Voto in trentesimi (0-30)',
            min: 0,
            max: 30,
            step: 0.5,
            placeholder: 'Es. 28',
            formatValue: (v) => `${v}/30`,
        },
        {
            id: '100',
            label: 'Voto in centesimi (0-100)',
            min: 0,
            max: 100,
            step: 1,
            placeholder: 'Es. 85',
            formatValue: (v) => `${v}/100`,
        },
        {
            id: 'letter',
            label: 'Voto in lettere (A-F)',
            min: 0,
            max: 5,
            step: 1,
            placeholder: 'A, B, C, D, F',
            formatValue: (v) => {
                const letters = ['F', 'D', 'C', 'B', 'A', 'A+'];
                return letters[Math.min(Math.round(v), 5)] || 'F';
            },
        },
        {
            id: 'custom',
            label: 'Altro (personalizzato)',
            min: 0,
            max: 1000,
            step: 0.1,
            placeholder: 'Inserisci il voto',
            formatValue: (v) => `${v}`,
        },
    ];

    const currentGradingConfig = gradingSystems.find(g => g.id === gradingSystem) || gradingSystems[0];

    // Reset state quando il modal si apre
    useEffect(() => {
        if (isOpen) {
            setStep('outcome');
            setGrade('');
            setGradingSystem('30');
            setSelectedDifficulties(new Set());
            setSavedDifficulties(new Set());
            setNotes('');
            setGradeError('');
        }
    }, [isOpen]);

    // Soglie di sufficienza per ogni sistema
    const getPassingGrade = (system: GradingSystem): number => {
        switch (system) {
            case '30': return 18; // Sufficiente in trentesimi
            case '100': return 60; // Sufficiente in centesimi
            case 'letter': return 1; // D o superiore (1=D, 2=C, 3=B, 4=A, 5=A+)
            case 'custom': return 0; // Nessuna soglia per custom
            default: return 0;
        }
    };

    // Validazione voto
    const validateGrade = (value: string, checkPassing: boolean = false): string => {
        if (!value.trim()) return ''; // Voto opzionale

        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            return 'Il voto deve essere un numero valido';
        }

        if (gradingSystem === 'letter') {
            const intValue = Math.round(numValue);
            if (intValue < 0 || intValue > 5) {
                return 'Per il sistema a lettere, inserisci un valore da 0 (F) a 5 (A+)';
            }
            // Validazione logica: se checkPassing è true e il voto è insufficiente
            if (checkPassing && intValue < getPassingGrade('letter')) {
                return 'Attenzione: hai selezionato "SUPERATO" ma il voto F (Insufficiente) indica che l\'esame non è stato superato. Vuoi cambiare il risultato?';
            }
        } else {
            if (numValue < currentGradingConfig.min) {
                return `Il voto minimo è ${currentGradingConfig.min}`;
            }
            if (numValue > currentGradingConfig.max) {
                return `Il voto massimo è ${currentGradingConfig.max}`;
            }
            // Validazione logica: se checkPassing è true e il voto è insufficiente
            if (checkPassing) {
                const passingGrade = getPassingGrade(gradingSystem);
                if (numValue < passingGrade) {
                    const passingLabel = gradingSystem === '30' ? '18/30' : gradingSystem === '100' ? '60/100' : `${passingGrade}`;
                    return `Attenzione: hai selezionato "SUPERATO" ma il voto ${numValue} è inferiore alla sufficienza (${passingLabel}). Vuoi cambiare il risultato?`;
                }
            }
        }

        return '';
    };

    const handleGradeChange = (value: string) => {
        setGrade(value);
        // Validazione base (senza controllo sufficienza durante la digitazione)
        const error = validateGrade(value, false);
        setGradeError(error);
    };

    // Confetti per la vittoria
    const triggerConfetti = async () => {
        const confettiFn = await loadConfetti();
        if (!confettiFn) return; // Skip se confetti non è disponibile

        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        };

        const interval: any = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confettiFn({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confettiFn({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);
    };

    const handlePassed = () => {
        setStep('victory-grade');
    };

    const handleFailed = () => {
        setStep('recovery-reason');
    };

    const handleVictoryComplete = async () => {
        // Validazione finale con controllo sufficienza
        if (grade.trim()) {
            const error = validateGrade(grade, true); // true = controlla anche la sufficienza
            if (error) {
                setGradeError(error);
                // Se è un errore di sufficienza, mostra un warning ma permette di continuare
                if (error.includes('Attenzione:')) {
                    const shouldContinue = window.confirm(
                        error + '\n\nVuoi continuare comunque con "SUPERATO"?'
                    );
                    if (!shouldContinue) {
                        return; // L'utente ha scelto di non continuare
                    }
                    // Continua anche se il voto è insufficiente (l'utente ha confermato)
                } else {
                    // Errore di validazione base (min/max) - blocca il submit
                    emitToast.error(error);
                    return;
                }
            }
        }

        setIsLoading(true);
        try {
            const gradeValue = grade.trim() ? parseFloat(grade) : undefined;
            
            const outcome: ExamOutcome = {
                date: new Date().toISOString(),
                grade: gradeValue,
                notes: notes || undefined,
            };

            await triggerConfetti();
            await onComplete(exam.id, outcome, 'passed');
            emitToast.success('Ottimo lavoro! Hai completato questo percorso.');
            onClose();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nel completamento dell\'esame');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoveryComplete = async () => {
        if (selectedDifficulties.size === 0) {
            emitToast.error('Seleziona almeno una difficoltà riscontrata');
            return;
        }

        setIsLoading(true);
        try {
            // Salva le difficoltà originali (chiavi) per le azioni di recupero
            setSavedDifficulties(new Set(selectedDifficulties));

            const difficulties = Array.from(selectedDifficulties).map(d => {
                const map: Record<DifficultyOption, string> = {
                    concepts: 'Concetti difficili',
                    time: 'Mancanza di tempo',
                    anxiety: 'Ansia/Vuoto di memoria',
                    unexpected: 'Domande impreviste',
                };
                return map[d];
            });

            const outcome: ExamOutcome = {
                date: new Date().toISOString(),
                notes: notes || undefined,
                difficulties,
            };

            console.log('[ExamCompletionModal] Salvando esame come failed:', { examId: exam.id, outcome, status: 'failed' });
            await onComplete(exam.id, outcome, 'failed');
            console.log('[ExamCompletionModal] Esame salvato come failed, passando a recovery-actions');
            setStep('recovery-actions');
        } catch (err: any) {
            console.error('[ExamCompletionModal] Errore nel salvataggio:', err);
            emitToast.error(err.message || 'Errore nel salvataggio del risultato');
            setIsLoading(false);
        }
    };

    const handleResetCards = async (type: 'all' | 'hard-only') => {
        if (!onResetCards) {
            console.warn('[ExamCompletionModal] onResetCards non disponibile');
            emitToast.error('Funzionalità di reset non disponibile');
            return;
        }
        setIsLoading(true);
        try {
            console.log('[ExamCompletionModal] Chiamando resetCards:', { examId: exam.id, type });
            await onResetCards(exam.id, type);
            console.log('[ExamCompletionModal] Reset completato con successo');
            emitToast.success(type === 'all' ? 'Tutte le carte sono state resettate' : 'Le carte difficili sono state resettate');
            onClose();
        } catch (err: any) {
            console.error('[ExamCompletionModal] Errore nel reset:', err);
            emitToast.error(err.message || 'Errore nel reset delle carte');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAIQuestions = async () => {
        if (!onGenerateAIQuestions) {
            console.warn('[ExamCompletionModal] onGenerateAIQuestions non disponibile');
            emitToast.error('Funzionalità AI non disponibile');
            return;
        }
        setIsLoading(true);
        try {
            // Usa le difficoltà salvate (chiavi originali) invece di selectedDifficulties
            // che potrebbe essere vuoto se siamo già nello step recovery-actions
            const topics = savedDifficulties.size > 0 
                ? Array.from(savedDifficulties) 
                : Array.from(selectedDifficulties);
            
            if (topics.length === 0) {
                emitToast.warning('Nessuna difficoltà selezionata. Seleziona le difficoltà prima di generare le domande.');
                setIsLoading(false);
                return;
            }

            console.log('[ExamCompletionModal] Chiamando generateAIQuestions:', { examId: exam.id, topics });
            await onGenerateAIQuestions(exam.id, topics);
            console.log('[ExamCompletionModal] Generazione AI completata con successo');
            emitToast.success('Domande AI generate con successo!');
            onClose();
        } catch (err: any) {
            console.error('[ExamCompletionModal] Errore nella generazione AI:', err);
            emitToast.error(err.message || 'Errore nella generazione delle domande');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDifficulty = (difficulty: DifficultyOption) => {
        setSelectedDifficulties(prev => {
            const next = new Set(prev);
            if (next.has(difficulty)) {
                next.delete(difficulty);
            } else {
                next.add(difficulty);
            }
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />

                <motion.div
                    initial={{ scale: 0.95, y: 12, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 12, opacity: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-2xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/30 pointer-events-none" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            {step === 'outcome' && (
                                <div className="p-3 rounded-xl bg-primary-500/20 border border-primary-500/30">
                                    <AlertCircle className="w-6 h-6 text-primary-400" />
                                </div>
                            )}
                            {step === 'victory-grade' && (
                                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                    <Trophy className="w-6 h-6 text-emerald-400" />
                                </div>
                            )}
                            {(step === 'recovery-reason' || step === 'recovery-actions') && (
                                <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
                                    <RotateCcw className="w-6 h-6 text-orange-400" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {step === 'outcome' && 'Com\'è andato l\'esame?'}
                                    {step === 'victory-grade' && 'Ottimo lavoro! 🎉'}
                                    {step === 'recovery-reason' && 'Cosa non ha funzionato?'}
                                    {step === 'recovery-actions' && 'Piano di Recupero'}
                                </h2>
                                <p className="text-sm text-white/60 mt-1">
                                    {step === 'outcome' && exam.title}
                                    {step === 'victory-grade' && 'Hai completato questo percorso'}
                                    {step === 'recovery-reason' && 'Aiutaci a capire per migliorare'}
                                    {step === 'recovery-actions' && 'Scegli come procedere'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            disabled={isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="relative px-6 py-6 max-h-[70vh] overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: Outcome Question */}
                            {step === 'outcome' && (
                                <motion.div
                                    key="outcome"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <p className="text-white/80 mb-6 text-center">
                                        Seleziona il risultato dell'esame
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handlePassed}
                                            className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
                                        >
                                            <div className="p-4 rounded-full bg-emerald-500/20">
                                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                                            </div>
                                            <span className="text-lg font-bold text-white">SUPERATO</span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleFailed}
                                            className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
                                        >
                                            <div className="p-4 rounded-full bg-orange-500/20">
                                                <XCircle className="w-8 h-8 text-orange-400" />
                                            </div>
                                            <span className="text-lg font-bold text-white">NON SUPERATO</span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2A: Victory Flow - Grade */}
                            {step === 'victory-grade' && (
                                <motion.div
                                    key="victory"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center py-4">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', delay: 0.2 }}
                                            className="inline-block p-6 rounded-full bg-emerald-500/20 mb-4"
                                        >
                                            <Trophy className="w-12 h-12 text-emerald-400" />
                                        </motion.div>
                                        <p className="text-white/80 text-lg mb-6">
                                            Ottimo lavoro! Hai completato questo percorso.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Sistema di Valutazione
                                        </label>
                                        <select
                                            value={gradingSystem}
                                            onChange={(e) => {
                                                setGradingSystem(e.target.value as GradingSystem);
                                                setGrade(''); // Reset voto quando cambia sistema
                                                setGradeError('');
                                            }}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-primary-500/50 focus:outline-none transition-all mb-3"
                                        >
                                            {gradingSystems.map((system) => (
                                                <option key={system.id} value={system.id} className="bg-zinc-900">
                                                    {system.label}
                                                </option>
                                            ))}
                                        </select>

                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Voto {gradingSystem === 'letter' ? '(0=F, 1=D, 2=C, 3=B, 4=A, 5=A+)' : `(opzionale, ${currentGradingConfig.min}-${currentGradingConfig.max})`}
                                        </label>
                                        {gradingSystem === 'letter' ? (
                                            <select
                                                value={grade}
                                                onChange={(e) => handleGradeChange(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                                                    gradeError ? 'border-red-500/50' : 'border-white/10'
                                                } text-white focus:border-primary-500/50 focus:outline-none transition-all`}
                                            >
                                                <option value="" className="bg-zinc-900">Seleziona voto</option>
                                                <option value="0" className="bg-zinc-900">F (Insufficiente)</option>
                                                <option value="1" className="bg-zinc-900">D (Sufficiente)</option>
                                                <option value="2" className="bg-zinc-900">C (Discreto)</option>
                                                <option value="3" className="bg-zinc-900">B (Buono)</option>
                                                <option value="4" className="bg-zinc-900">A (Ottimo)</option>
                                                <option value="5" className="bg-zinc-900">A+ (Eccellente)</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="number"
                                                min={currentGradingConfig.min}
                                                max={currentGradingConfig.max}
                                                step={currentGradingConfig.step}
                                                value={grade}
                                                onChange={(e) => handleGradeChange(e.target.value)}
                                                placeholder={currentGradingConfig.placeholder}
                                                className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                                                    gradeError ? 'border-red-500/50' : 'border-white/10'
                                                } text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all`}
                                            />
                                        )}
                                        {gradeError && (
                                            <p className="mt-2 text-sm text-red-400">{gradeError}</p>
                                        )}
                                        {grade && !gradeError && (() => {
                                            const gradeValue = parseFloat(grade);
                                            const passingGrade = getPassingGrade(gradingSystem);
                                            const isPassing = gradingSystem === 'letter' 
                                                ? Math.round(gradeValue) >= passingGrade
                                                : gradeValue >= passingGrade;
                                            
                                            return (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-sm text-white/60">
                                                        Voto formattato: {currentGradingConfig.formatValue(gradeValue)}
                                                    </p>
                                                    {!isPassing && (
                                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                                            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                                            <p className="text-xs text-orange-400">
                                                                Voto insufficiente. La sufficienza è {gradingSystem === '30' ? '18/30' : gradingSystem === '100' ? '60/100' : 'D o superiore'}.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Note (opzionale)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Come ti sei sentito? Cosa hai imparato?"
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleVictoryComplete}
                                        disabled={isLoading}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Salvataggio...' : 'Completa Esame'}
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* STEP 2B: Recovery Flow - Reason */}
                            {step === 'recovery-reason' && (
                                <motion.div
                                    key="recovery-reason"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center py-2">
                                        <p className="text-white/80 mb-6">
                                            Non mollare! Capiamo cosa migliorare per la prossima volta.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-3">
                                            Cosa pensi non abbia funzionato? (seleziona tutte le opzioni rilevanti)
                                        </label>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'concepts' as DifficultyOption, label: 'Concetti difficili' },
                                                { key: 'time' as DifficultyOption, label: 'Mancanza di tempo' },
                                                { key: 'anxiety' as DifficultyOption, label: 'Ansia/Vuoto di memoria' },
                                                { key: 'unexpected' as DifficultyOption, label: 'Domande impreviste' },
                                            ].map(({ key, label }) => (
                                                <motion.button
                                                    key={key}
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => toggleDifficulty(key)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                                        selectedDifficulties.has(key)
                                                            ? 'border-orange-500/50 bg-orange-500/20 text-white'
                                                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                                    }`}
                                                >
                                                    {label}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Note aggiuntive (opzionale)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Racconta la tua esperienza..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleRecoveryComplete}
                                        disabled={isLoading || selectedDifficulties.size === 0}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Salvataggio...' : 'Continua'}
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* STEP 3: Recovery Actions */}
                            {step === 'recovery-actions' && (
                                <motion.div
                                    key="recovery-actions"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="text-center py-2 mb-4">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <AlertCircle className="w-5 h-5 text-orange-400" />
                                            <p className="text-white font-semibold">
                                                Esame segnato come non superato
                                            </p>
                                        </div>
                                        <p className="text-white/80 text-sm mb-3">
                                            Ecco un piano di recupero personalizzato per te:
                                        </p>
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-left">
                                            <p className="text-xs text-blue-300">
                                                💡 <strong>Suggerimento:</strong> Dopo aver scelto un'azione, potrai continuare a studiare con le carte aggiornate. L'esame rimarrà nello stato "Non superato" finché non lo completerai di nuovo come "Superato".
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Reset Mirato */}
                                        {onResetCards && (
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleResetCards('hard-only')}
                                                disabled={isLoading}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-left"
                                            >
                                                <div className="p-2 rounded-lg bg-blue-500/20">
                                                    <RotateCcw className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">Reset Mirato</p>
                                                    <p className="text-sm text-white/60">
                                                        Reset solo delle carte difficili. Mantieni quelle che conosci già.
                                                    </p>
                                                </div>
                                            </motion.button>
                                        )}

                                        {/* Analisi AI */}
                                        {onGenerateAIQuestions && (
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={handleGenerateAIQuestions}
                                                disabled={isLoading}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all text-left"
                                            >
                                                <div className="p-2 rounded-lg bg-purple-500/20">
                                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">Analisi AI</p>
                                                    <p className="text-sm text-white/60">
                                                        Genera 10 nuove domande di approfondimento sugli argomenti difficili.
                                                    </p>
                                                </div>
                                            </motion.button>
                                        )}

                                        {/* Ricomincia */}
                                        {onResetCards && (
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleResetCards('all')}
                                                disabled={isLoading}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-left"
                                            >
                                                <div className="p-2 rounded-lg bg-red-500/20">
                                                    <RefreshCw className="w-5 h-5 text-red-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">Ricomincia</p>
                                                    <p className="text-sm text-white/60">
                                                        Reset di tutte le carte a 0% per ricominciare da capo.
                                                    </p>
                                                </div>
                                            </motion.button>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                        >
                                            Chiudi
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
