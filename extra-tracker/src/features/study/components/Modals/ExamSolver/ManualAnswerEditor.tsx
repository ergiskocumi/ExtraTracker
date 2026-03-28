/**
 * ✏️ MANUAL ANSWER EDITOR - Componente per editing manuale delle risposte non trovate
 * 
 * Permette all'utente di inserire manualmente le risposte per flashcard
 * che non sono state trovate nel materiale di studio.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Search, Check, Loader2, AlertCircle } from 'lucide-react';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';
import type { ManualAnswerEditorProps, FlashcardWithId } from './ExamSolverModal.types';
import { classList, examSolverButtonClass, examSolverFieldClass } from '../../utils/studyButtonClasses';

// Re-export for convenience
export type { ManualAnswerEditorProps, FlashcardWithId };

// ============================================
// COMPONENT
// ============================================

export const ManualAnswerEditor: React.FC<ManualAnswerEditorProps> = ({
    flashcards,
    deckId,
    onSave,
}) => {
    // Filtra solo le flashcard non trovate
    const notFoundFlashcards = flashcards.filter(card => !card.found);
    
    // State per ogni input
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [savingStates, setSavingStates] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
    const [_autoSaveTimers, _setAutoSaveTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
    const autoSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Inizializza answers con i valori esistenti
    useEffect(() => {
        const initialAnswers: Record<string, string> = {};
        notFoundFlashcards.forEach(card => {
            // Se la risposta non è il placeholder, usa quella esistente
            if (card.back && !card.back.includes('⚠️')) {
                initialAnswers[card.id] = card.back;
            } else {
                initialAnswers[card.id] = '';
            }
        });
        setAnswers(initialAnswers);
    }, [notFoundFlashcards]);

    // Cleanup timers
    useEffect(() => {
        return () => {
            Object.values(autoSaveTimersRef.current).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
        };
    }, []);

    // Validazione risposta
    const validateAnswer = useCallback((answer: string): { valid: boolean; error?: string } => {
        const trimmed = answer.trim();
        if (trimmed.length < 10) {
            return { valid: false, error: 'La risposta deve contenere almeno 10 caratteri' };
        }
        if (trimmed.length > 1000) {
            return { valid: false, error: 'La risposta non può superare 1000 caratteri' };
        }
        return { valid: true };
    }, []);

    // Salva singola risposta
    const saveAnswer = useCallback(async (cardId: string, answer: string) => {
        const validation = validateAnswer(answer);
        if (!validation.valid) {
            emitToast.warning(validation.error || 'Risposta non valida');
            return;
        }

        setSavingStates(prev => ({ ...prev, [cardId]: 'saving' }));

        try {
            await studyService.updateCardAnswer(deckId, cardId, answer.trim());
            setSavingStates(prev => ({ ...prev, [cardId]: 'saved' }));
            emitToast.success('Risposta salvata', { duration: 2000 });
            
            if (onSave) {
                onSave();
            }

            // Reset stato "saved" dopo 3 secondi
            setTimeout(() => {
                setSavingStates(prev => {
                    const newState = { ...prev };
                    if (newState[cardId] === 'saved') {
                        newState[cardId] = 'idle';
                    }
                    return newState;
                });
            }, 3000);
        } catch (err: any) {
            setSavingStates(prev => ({ ...prev, [cardId]: 'idle' }));
            emitToast.error(err.message || 'Errore nel salvataggio della risposta');
        }
    }, [deckId, validateAnswer, onSave]);

    // Auto-save dopo 2 secondi di inattività
    const handleAnswerChange = useCallback((cardId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [cardId]: value }));

        // Cancella timer precedente
        if (autoSaveTimersRef.current[cardId]) {
            clearTimeout(autoSaveTimersRef.current[cardId]);
        }

        // Valida prima di impostare auto-save
        const validation = validateAnswer(value);
        if (!validation.valid) {
            return;
        }

        // Imposta nuovo timer per auto-save
        autoSaveTimersRef.current[cardId] = setTimeout(() => {
            saveAnswer(cardId, value);
        }, 2000);
    }, [validateAnswer, saveAnswer]);

    // Salva tutte le risposte
    const saveAll = useCallback(async () => {
        const cardsToSave = notFoundFlashcards.filter(card => {
            const answer = answers[card.id] || '';
            return validateAnswer(answer).valid;
        });

        if (cardsToSave.length === 0) {
            emitToast.warning('Nessuna risposta valida da salvare');
            return;
        }

        // Salva tutte in parallelo
        const savePromises = cardsToSave.map(card => 
            saveAnswer(card.id, answers[card.id])
        );

        try {
            await Promise.all(savePromises);
            emitToast.success(`${cardsToSave.length} risposte salvate`, { duration: 3000 });
        } catch (err) {
            // Errori già gestiti in saveAnswer
        }
    }, [notFoundFlashcards, answers, validateAnswer, saveAnswer]);

    // Conta risposte completate
    const completedCount = notFoundFlashcards.filter(card => {
        const answer = answers[card.id] || '';
        return validateAnswer(answer).valid;
    }).length;

    if (notFoundFlashcards.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-semibold text-amber-300">
                        Risposte mancanti ({notFoundFlashcards.length})
                    </h4>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-theme-secondary">
                        {completedCount} di {notFoundFlashcards.length} completate
                    </span>
                    {completedCount > 0 && (
                        <button
                            onClick={saveAll}
                            className={examSolverButtonClass(
                                'successSoft',
                                'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5'
                            )}
                        >
                            <Save className="w-3.5 h-3.5" />
                            Salva tutte
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {notFoundFlashcards.map((card, idx) => {
                    const answer = answers[card.id] || '';
                    const validation = validateAnswer(answer);
                    const savingState = savingStates[card.id] || 'idle';
                    const isSaved = savingState === 'saved';
                    const isSaving = savingState === 'saving';

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-4 rounded-xl bg-theme-surface border border-theme-default space-y-3"
                        >
                            {/* Domanda (read-only) */}
                            <div>
                                <label className="block text-xs font-medium text-theme-secondary mb-1.5">
                                    Domanda {idx + 1}
                                </label>
                                <p className="text-sm text-theme-primary leading-relaxed bg-theme-elevated p-3 rounded-lg border border-theme-default">
                                    {card.front}
                                </p>
                            </div>

                            {/* Input risposta */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-medium text-theme-secondary">
                                        Risposta <span className="text-red-400">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {answer.length > 0 && (
                                            <span className={`text-xs ${
                                                validation.valid ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                {answer.length} / 1000 caratteri
                                            </span>
                                        )}
                                        {isSaved && (
                                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                Salvato
                                            </span>
                                        )}
                                        {isSaving && (
                                            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={answer}
                                    onChange={(e) => handleAnswerChange(card.id, e.target.value)}
                                    placeholder="Inserisci la risposta manualmente..."
                                    rows={4}
                                    maxLength={1000}
                                    className={classList(
                                        examSolverFieldClass('textarea', 'w-full px-4 py-3 rounded-xl resize-none'),
                                        !validation.valid && answer.length > 0 && 'border-amber-500/55'
                                    )}
                                />
                                {!validation.valid && answer.length > 0 && (
                                    <p className="text-xs text-amber-400 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validation.error}
                                    </p>
                                )}
                            </div>

                            {/* Azioni */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => saveAnswer(card.id, answer)}
                                    disabled={!validation.valid || isSaving}
                                    className={examSolverButtonClass(
                                        'warningSoft',
                                        'px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5'
                                    )}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Salvataggio...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            Salva
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(card.front)}`;
                                        window.open(searchUrl, '_blank');
                                    }}
                                    className={examSolverButtonClass(
                                        'infoSoft',
                                        'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5'
                                    )}
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    Cerca su Google
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default ManualAnswerEditor;
