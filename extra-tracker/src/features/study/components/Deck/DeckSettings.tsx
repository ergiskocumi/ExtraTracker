/**
 * ⚙️ DECK SETTINGS - Impostazioni Algoritmo e AI
 * 
 * Permette all'utente di configurare l'algoritmo di spaced repetition
 * e le preferenze per la generazione AI delle flashcard.
 * Inoltre permette di cambiare l'esame associato al mazzo.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FiSave,
    FiInfo,
    FiZap,
    FiCpu,
    FiBookOpen,
} from 'react-icons/fi';
import { studyService, type Deck, type DeckSettings as DeckSettingsConfig } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import examService from '../../services/examService';
import type { Exam } from '../../types/exam';
import { AlgorithmInfoModal } from './AlgorithmInfoModal';

interface DeckSettingsProps {
    deck: Deck;
    onUpdate: (deck: Deck) => void;
}

export const DeckSettings: React.FC<DeckSettingsProps> = ({ deck, onUpdate }) => {
    const [settings, setSettings] = useState<DeckSettingsConfig>({
        algorithm: 'sm2',
        aiSettings: {
            style: 'comprehensive',
            difficulty: 'medium',
            questionTypes: ['definition', 'concept', 'relationship'],
        },
    });
    const [saving, setSaving] = useState(false);
    const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

    // Stato per la gestione dell'esame associato
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(deck.examId || null);
    const [loadingExams, setLoadingExams] = useState(false);
    const [savingExam, setSavingExam] = useState(false);

    // Carica gli esami disponibili
    const loadExams = useCallback(async () => {
        try {
            setLoadingExams(true);
            const allExams = await examService.getAll();
            const activeExams = allExams.filter(e => e.status === 'active');
            setExams(activeExams);
        } catch (err: any) {
            console.error('Errore nel caricamento degli esami:', err);
            emitToast.error('Errore nel caricamento degli esami');
        } finally {
            setLoadingExams(false);
        }
    }, []);

    useEffect(() => {
        // Carica impostazioni esistenti se disponibili
        const currentSettings: DeckSettingsConfig = {
            algorithm: deck.algorithm || 'sm2',
            aiSettings: deck.aiSettings || {
                style: 'comprehensive',
                difficulty: 'medium',
                questionTypes: ['definition', 'concept', 'relationship'],
            },
        };
        
        // Aggiorna solo se sono diverse per evitare loop
        if (
            settings.algorithm !== currentSettings.algorithm ||
            JSON.stringify(settings.aiSettings) !== JSON.stringify(currentSettings.aiSettings)
        ) {
            setSettings(currentSettings);
        }
        
        // Aggiorna l'esame selezionato quando cambia il deck
        setSelectedExamId(deck.examId || null);
        
        // Carica gli esami disponibili
        loadExams();
    }, [deck.id, deck.examId, deck.algorithm, deck.aiSettings, loadExams]);

    const handleSave = async () => {
        try {
            setSaving(true);
            console.log('[DeckSettings] Salvataggio impostazioni:', settings);
            
            // Validazione
            if (!settings.aiSettings?.questionTypes || settings.aiSettings.questionTypes.length === 0) {
                emitToast.error('Seleziona almeno un tipo di domanda');
                setSaving(false);
                return;
            }
            
            const updated = await studyService.updateDeckSettings(deck.id, settings);
            console.log('[DeckSettings] Risposta:', updated);
            
            // Verifica che le impostazioni siano state salvate
            if (updated && updated.id) {
                onUpdate(updated);
                emitToast.success('Impostazioni salvate con successo!', { 
                    title: 'Salvato',
                    duration: 3000 
                });
            } else {
                throw new Error('Risposta server non valida');
            }
        } catch (err: any) {
            console.error('[DeckSettings] Errore salvataggio:', err);
            emitToast.error(err.message || 'Errore nel salvataggio delle impostazioni', {
                title: 'Errore',
                duration: 5000
            });
        } finally {
            setSaving(false);
        }
    };

    /**
     * Gestisce il cambio di esame associato al mazzo
     * 
     * Quando l'utente cambia l'esame, il mazzo viene spostato
     * dal vecchio esame al nuovo, aggiornando il examId.
     */
    const handleExamChange = async () => {
        if (!selectedExamId || selectedExamId.trim() === '') {
            emitToast.error('Seleziona un esame valido');
            return;
        }

        // Se l'esame selezionato è lo stesso di quello corrente, non fare nulla
        if (selectedExamId === deck.examId) {
            emitToast.info('L\'esame selezionato è già quello corrente');
            return;
        }

        try {
            setSavingExam(true);
            const updated = await studyService.updateDeckOrganization(deck.id, {
                examId: selectedExamId,
            });
            onUpdate(updated);
            emitToast.success('Esame associato aggiornato', { 
                title: 'Il mazzo è stato spostato al nuovo esame' 
            });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiornamento dell\'esame');
            // Ripristina il valore precedente in caso di errore
            setSelectedExamId(deck.examId || null);
        } finally {
            setSavingExam(false);
        }
    };

    const algorithmDescriptions = {
        sm2: 'Algoritmo classico SuperMemo 2. Semplice, efficace e testato. Consigliato per la maggior parte degli utenti.',
        fsrs: 'Free Spaced Repetition Scheduler. Moderno e adattivo, più preciso di SM-2. Ideale per studio intensivo.',
        leitner: 'Sistema a box di Leitner. Classico e intuitivo. Le carte si muovono tra box in base alle performance.',
        anki: 'Algoritmo derivato da SM-2 con modifiche. Più conservativo per nuove carte. Simile ad Anki.',
    };

    const styleDescriptions = {
        comprehensive: 'Bilanciato tra teoria e pratica. Ideale per la maggior parte dei casi.',
        conceptual: 'Focus su concetti e principi. Perfetto per materie teoriche.',
        factual: 'Focus su fatti e definizioni. Ideale per memorizzazione di informazioni specifiche.',
        application: 'Focus su applicazioni pratiche. Perfetto per materie pratiche.',
    };

    // Trova l'esame corrente per mostrarlo
    const currentExam = exams.find(e => e.id === deck.examId);

    return (
        <div className="space-y-6">
            {/* Sezione Esame Associato */}
            <div className="rounded-2xl border border-theme-default bg-theme-card p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <FiBookOpen className="w-5 h-5 text-theme-secondary" />
                    Esame Associato
                </h3>
                <p className="text-sm text-theme-secondary mb-4">
                    Cambia l'esame a cui è associato questo mazzo. Il mazzo verrà spostato dal vecchio esame al nuovo.
                </p>

                {loadingExams ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-theme-default border-t-primary-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-theme-primary mb-2">
                                Seleziona Esame
                            </label>
                            <select
                                value={selectedExamId || ''}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                disabled={savingExam}
                                className="w-full px-4 py-2.5 rounded-xl bg-theme-surface border border-theme-default text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {exams.length === 0 ? (
                                    <option value="">Nessun esame disponibile</option>
                                ) : (
                                    exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.title}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {currentExam && (
                            <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-3">
                                <p className="text-sm text-primary-700 dark:text-primary-300">
                                    <span className="font-semibold">Esame corrente:</span> {currentExam.title}
                                </p>
                            </div>
                        )}

                        {selectedExamId && selectedExamId !== deck.examId && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExamChange}
                                disabled={savingExam || !selectedExamId}
                                className="keep-light-text w-full px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {savingExam ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Aggiornamento...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="w-4 h-4" />
                                        <span>Cambia Esame</span>
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            {/* Algoritmo */}
            <div className="rounded-2xl border border-theme-default bg-theme-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                        <FiZap className="w-5 h-5 text-theme-secondary" />
                        Algoritmo di Spaced Repetition
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowAlgorithmInfo(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
                    >
                        <FiInfo className="w-4 h-4" />
                        <span>Scopri di più</span>
                    </button>
                </div>
                <div className="space-y-3">
                    {(['sm2', 'fsrs', 'leitner', 'anki'] as const).map((algo) => (
                        <label
                            key={algo}
                            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                settings.algorithm === algo
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-theme-default bg-theme-surface hover:bg-theme-card'
                            }`}
                        >
                            <input
                                type="radio"
                                name="algorithm"
                                value={algo}
                                checked={settings.algorithm === algo}
                                onChange={() => setSettings({ ...settings, algorithm: algo })}
                                className="mt-1 accent-primary-500"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-theme-primary mb-1 uppercase">
                                    {algo.toUpperCase()}
                                </div>
                                <div className="text-sm text-theme-secondary">
                                    {algorithmDescriptions[algo]}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Impostazioni AI */}
            <div className="rounded-2xl border border-theme-default bg-theme-card p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <FiCpu className="w-5 h-5 text-theme-secondary" />
                    Impostazioni Generazione AI
                </h3>

                {/* Stile */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                        Stile delle Domande
                    </label>
                    <select
                        value={settings.aiSettings?.style || 'comprehensive'}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                aiSettings: {
                                    ...settings.aiSettings!,
                                    style: e.target.value as any,
                                },
                            })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-theme-surface border border-theme-default text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500/50"
                    >
                        {Object.entries(styleDescriptions).map(([value, desc]) => (
                            <option key={value} value={value}>
                                {value.charAt(0).toUpperCase() + value.slice(1)} - {desc}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Difficoltà */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                        Difficoltà
                    </label>
                    <select
                        value={settings.aiSettings?.difficulty || 'medium'}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                aiSettings: {
                                    ...settings.aiSettings!,
                                    difficulty: e.target.value as any,
                                },
                            })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-theme-surface border border-theme-default text-theme-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500/50"
                    >
                        <option value="easy">Facile - Domande semplici e dirette</option>
                        <option value="medium">Media - Difficoltà bilanciata</option>
                        <option value="hard">Difficile - Domande complesse</option>
                        <option value="mixed">Misto - Mix di difficoltà</option>
                    </select>
                </div>

                {/* Tipi di Domande */}
                <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                        Tipi di Domande
                    </label>
                    <div className="space-y-2">
                        {[
                            { value: 'definition', label: 'Definizioni' },
                            { value: 'concept', label: 'Concetti' },
                            { value: 'relationship', label: 'Relazioni' },
                            { value: 'application', label: 'Applicazioni' },
                            { value: 'comparison', label: 'Confronti' },
                        ].map((type) => (
                            <label
                                key={type.value}
                                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-theme-surface cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={settings.aiSettings?.questionTypes?.includes(type.value) || false}
                                    onChange={(e) => {
                                        const current = settings.aiSettings?.questionTypes || [];
                                        const updated = e.target.checked
                                            ? [...current, type.value]
                                            : current.filter((t) => t !== type.value);
                                        setSettings({
                                            ...settings,
                                            aiSettings: {
                                                ...settings.aiSettings!,
                                                questionTypes: updated,
                                            },
                                        });
                                    }}
                                    className="rounded accent-primary-500"
                                />
                                <span className="text-sm text-theme-primary">{type.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-4 flex items-start gap-3">
                <FiInfo className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-primary-700 dark:text-primary-300">
                    <p className="font-semibold mb-1">Nota</p>
                    <p>
                        Le impostazioni AI si applicano solo alle nuove flashcard generate da PDF.
                        Le carte esistenti non vengono modificate.
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="keep-light-text w-full px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {saving ? (
                    <>
                        <div className="w-4 h-4 border-2 border-theme-default border-t-primary-500 rounded-full animate-spin" />
                        <span>Salvataggio...</span>
                    </>
                ) : (
                    <>
                        <FiSave className="w-5 h-5" />
                        <span>Salva Impostazioni</span>
                    </>
                )}
            </motion.button>

            {/* Algorithm Info Modal */}
            <AlgorithmInfoModal
                isOpen={showAlgorithmInfo}
                onClose={() => setShowAlgorithmInfo(false)}
            />
        </div>
    );
};
