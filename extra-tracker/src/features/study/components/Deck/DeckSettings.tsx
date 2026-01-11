/**
 * ⚙️ DECK SETTINGS - Impostazioni Algoritmo e AI
 * 
 * Permette all'utente di configurare l'algoritmo di spaced repetition
 * e le preferenze per la generazione AI delle flashcard.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FiSave,
    FiInfo,
    FiZap,
    FiCpu,
} from 'react-icons/fi';
import { studyService, type Deck, type DeckSettings } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

interface DeckSettingsProps {
    deck: Deck;
    onUpdate: (deck: Deck) => void;
}

export const DeckSettings: React.FC<DeckSettingsProps> = ({ deck, onUpdate }) => {
    const [settings, setSettings] = useState<DeckSettings>({
        algorithm: 'sm2',
        aiSettings: {
            style: 'comprehensive',
            difficulty: 'medium',
            questionTypes: ['definition', 'concept', 'relationship'],
        },
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Carica impostazioni esistenti se disponibili
        const deckAny = deck as any;
        const currentSettings = {
            algorithm: deckAny.algorithm || 'sm2',
            aiSettings: deckAny.aiSettings || {
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
    }, [deck.id]); // Ricarica solo se cambia il deck ID

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await studyService.updateDeckSettings(deck.id, settings);
            onUpdate(updated);
            emitToast.success('Impostazioni salvate', { title: 'Ok' });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nel salvataggio');
        } finally {
            setSaving(false);
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

    return (
        <div className="space-y-6">
            {/* Algoritmo */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiZap className="w-5 h-5" />
                    Algoritmo di Spaced Repetition
                </h3>
                <div className="space-y-3">
                    {(['sm2', 'fsrs', 'leitner', 'anki'] as const).map((algo) => (
                        <label
                            key={algo}
                            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                settings.algorithm === algo
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                name="algorithm"
                                value={algo}
                                checked={settings.algorithm === algo}
                                onChange={() => setSettings({ ...settings, algorithm: algo })}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-white mb-1 uppercase">
                                    {algo.toUpperCase()}
                                </div>
                                <div className="text-sm text-white/60">
                                    {algorithmDescriptions[algo]}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Impostazioni AI */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiCpu className="w-5 h-5" />
                    Impostazioni Generazione AI
                </h3>

                {/* Stile */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-white/80 mb-2">
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
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    <label className="block text-sm font-medium text-white/80 mb-2">
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
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="easy">Facile - Domande semplici e dirette</option>
                        <option value="medium">Media - Difficoltà bilanciata</option>
                        <option value="hard">Difficile - Domande complesse</option>
                        <option value="mixed">Misto - Mix di difficoltà</option>
                    </select>
                </div>

                {/* Tipi di Domande */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
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
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
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
                                    className="rounded"
                                />
                                <span className="text-sm text-white/80">{type.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
                <FiInfo className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
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
                className="w-full px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {saving ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvataggio...</span>
                    </>
                ) : (
                    <>
                        <FiSave className="w-5 h-5" />
                        <span>Salva Impostazioni</span>
                    </>
                )}
            </motion.button>
        </div>
    );
};
