import { useState } from 'react';
import { useGoals } from '../../context/GoalsContext';
import { GOAL_CATEGORIES } from './types';
import type { GoalCategory, GoalType, CreateGoalDTO } from './types';

interface GoalWizardProps {
    onClose: () => void;
}

// Step del wizard
type WizardStep = 'category' | 'type' | 'details' | 'confirm';

// Icona X per chiudere
const CloseIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// Icona freccia indietro
const ArrowLeftIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

export const GoalWizard = ({ onClose }: GoalWizardProps) => {
    const { addGoal } = useGoals();
    
    // Stato del wizard
    const [step, setStep] = useState<WizardStep>('category');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dati del form
    const [category, setCategory] = useState<GoalCategory | null>(null);
    const [type, setType] = useState<GoalType | null>(null);
    const [title, setTitle] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('');
    const [frequency, setFrequency] = useState('');
    const [deadline, setDeadline] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date.toISOString().split('T')[0];
    });
    const [description, setDescription] = useState('');

    // Template suggeriti per categoria
    const TEMPLATES: Record<GoalCategory, { title: string; unit: string; targetValue?: number; frequency?: number }[]> = {
        finance: [
            { title: 'Risparmiare per emergenze', unit: '€', targetValue: 1000 },
            { title: 'Fondo vacanze', unit: '€', targetValue: 500 },
            { title: 'Investimenti mensili', unit: '€', targetValue: 200 },
        ],
        health: [
            { title: 'Andare in palestra', unit: 'sessioni', frequency: 3 },
            { title: 'Camminare 10.000 passi', unit: 'giorni', frequency: 5 },
            { title: 'Perdere peso', unit: 'kg', targetValue: 5 },
        ],
        learning: [
            { title: 'Leggere libri', unit: 'libri', targetValue: 12 },
            { title: 'Studiare ogni giorno', unit: 'ore', frequency: 1 },
            { title: 'Completare corso online', unit: 'lezioni', targetValue: 30 },
        ],
        career: [
            { title: 'Certificazione professionale', unit: 'esami', targetValue: 1 },
            { title: 'Networking settimanale', unit: 'contatti', frequency: 2 },
            { title: 'Portfolio progetti', unit: 'progetti', targetValue: 5 },
        ],
        personal: [
            { title: 'Meditare ogni giorno', unit: 'minuti', frequency: 10 },
            { title: 'Hobby creativo', unit: 'ore', frequency: 2 },
            { title: 'Viaggi da fare', unit: 'viaggi', targetValue: 4 },
        ],
    };

    // Applica un template
    const applyTemplate = (template: typeof TEMPLATES[GoalCategory][0]) => {
        setTitle(template.title);
        setUnit(template.unit);
        if (template.targetValue) {
            setType('target');
            setTargetValue(String(template.targetValue));
        }
        if (template.frequency) {
            setType('habit');
            setFrequency(String(template.frequency));
        }
        setStep('details');
    };

    // Naviga tra gli step
    const goBack = () => {
        if (step === 'type') setStep('category');
        else if (step === 'details') setStep('type');
        else if (step === 'confirm') setStep('details');
    };

    const goNext = () => {
        if (step === 'category' && category) setStep('type');
        else if (step === 'type' && type) setStep('details');
        else if (step === 'details' && isDetailsValid()) setStep('confirm');
    };

    // Validazione dettagli
    const isDetailsValid = () => {
        if (!title || !unit || !deadline) return false;
        if (type === 'target' && !targetValue) return false;
        if (type === 'habit' && !frequency) return false;
        return true;
    };

    // Submit finale
    const handleSubmit = async () => {
        if (!category || !type) return;

        setIsSubmitting(true);

        const goalData: CreateGoalDTO = {
            title,
            category,
            type,
            unit,
            deadline,
            description: description || undefined,
            ...(type === 'target' && { targetValue: Number(targetValue) }),
            ...(type === 'habit' && { frequency: Number(frequency) }),
        };

        try {
            await addGoal(goalData);
            onClose();
        } catch (err) {
            alert('Errore nella creazione dell\'obiettivo');
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg overflow-hidden bg-dark-400 rounded-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {step !== 'category' && (
                            <button
                                onClick={goBack}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeftIcon size={18} />
                            </button>
                        )}
                        <h3 className="text-lg font-semibold text-white">
                            {step === 'category' && '🎯 Cosa vuoi migliorare?'}
                            {step === 'type' && '📊 Che tipo di obiettivo?'}
                            {step === 'details' && '✏️ Definisci i dettagli'}
                            {step === 'confirm' && '✅ Conferma'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                    >
                        <CloseIcon size={18} />
                    </button>
                </div>

                {/* Contenuto */}
                <div className="p-5">
                    {/* STEP 1: Selezione Categoria */}
                    {step === 'category' && (
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(GOAL_CATEGORIES) as GoalCategory[]).map((cat) => {
                                const catInfo = GOAL_CATEGORIES[cat];
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setCategory(cat);
                                            setStep('type');
                                        }}
                                        className={`p-4 text-left rounded-xl border transition-all ${
                                            category === cat
                                                ? 'border-primary-500 bg-primary-500/20'
                                                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="text-2xl">{catInfo.emoji}</span>
                                        <div className="mt-2 font-medium text-white">{catInfo.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* STEP 2: Selezione Tipo */}
                    {step === 'type' && category && (
                        <div className="space-y-4">
                            {/* Opzioni tipo */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setType('target')}
                                    className={`p-4 text-left rounded-xl border transition-all ${
                                        type === 'target'
                                            ? 'border-primary-500 bg-primary-500/20'
                                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-2xl">🎯</span>
                                    <div className="mt-2 font-medium text-white">Obiettivo Target</div>
                                    <div className="mt-1 text-sm text-white/50">
                                        Raggiungere un valore specifico
                                    </div>
                                </button>
                                <button
                                    onClick={() => setType('habit')}
                                    className={`p-4 text-left rounded-xl border transition-all ${
                                        type === 'habit'
                                            ? 'border-primary-500 bg-primary-500/20'
                                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-2xl">🔄</span>
                                    <div className="mt-2 font-medium text-white">Abitudine</div>
                                    <div className="mt-1 text-sm text-white/50">
                                        Ripetere con costanza
                                    </div>
                                </button>
                            </div>

                            {/* Template suggeriti */}
                            <div className="pt-4 mt-4 border-t border-white/10">
                                <div className="mb-3 text-sm font-medium text-white/60">
                                    💡 Oppure scegli un template:
                                </div>
                                <div className="space-y-2">
                                    {TEMPLATES[category].map((template, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => applyTemplate(template)}
                                            className="w-full p-3 text-left transition-colors rounded-lg bg-white/5 hover:bg-white/10"
                                        >
                                            <span className="text-white">{template.title}</span>
                                            <span className="ml-2 text-sm text-white/50">
                                                {template.targetValue
                                                    ? `(${template.targetValue} ${template.unit})`
                                                    : `(${template.frequency}x/settimana)`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bottone continua */}
                            {type && (
                                <button onClick={goNext} className="w-full mt-4 btn-primary">
                                    Continua
                                </button>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Dettagli */}
                    {step === 'details' && (
                        <div className="space-y-4">
                            {/* Titolo */}
                            <div>
                                <label className="block mb-1 text-sm text-white/60">Titolo obiettivo</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Es: Risparmiare per le vacanze"
                                    className="w-full input"
                                />
                            </div>

                            {/* Target Value (solo per target) */}
                            {type === 'target' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-sm text-white/60">Valore da raggiungere</label>
                                        <input
                                            type="number"
                                            value={targetValue}
                                            onChange={(e) => setTargetValue(e.target.value)}
                                            placeholder="Es: 1000"
                                            className="w-full input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm text-white/60">Unità di misura</label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="Es: €, ore, km"
                                            className="w-full input"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Frequency (solo per habit) */}
                            {type === 'habit' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-sm text-white/60">Frequenza settimanale</label>
                                        <input
                                            type="number"
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            placeholder="Es: 3"
                                            min="1"
                                            max="7"
                                            className="w-full input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm text-white/60">Unità di misura</label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="Es: sessioni, ore"
                                            className="w-full input"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Deadline */}
                            <div>
                                <label className="block mb-1 text-sm text-white/60">Scadenza</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full input"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {/* Descrizione (opzionale) */}
                            <div>
                                <label className="block mb-1 text-sm text-white/60">Descrizione (opzionale)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Perché questo obiettivo è importante per te?"
                                    rows={2}
                                    className="w-full input"
                                />
                            </div>

                            {/* Bottone continua */}
                            <button
                                onClick={goNext}
                                disabled={!isDetailsValid()}
                                className="w-full mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continua
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Conferma */}
                    {step === 'confirm' && category && type && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">{GOAL_CATEGORIES[category].emoji}</span>
                                    <span className="text-lg font-semibold text-white">{title}</span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Categoria:</span>
                                        <span className="text-white">{GOAL_CATEGORIES[category].label}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Tipo:</span>
                                        <span className="text-white">{type === 'target' ? 'Target' : 'Abitudine'}</span>
                                    </div>
                                    {type === 'target' && (
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Obiettivo:</span>
                                            <span className="text-white">{targetValue} {unit}</span>
                                        </div>
                                    )}
                                    {type === 'habit' && (
                                        <div className="flex justify-between">
                                            <span className="text-white/60">Frequenza:</span>
                                            <span className="text-white">{frequency}x / settimana</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Scadenza:</span>
                                        <span className="text-white">
                                            {new Date(deadline).toLocaleDateString('it-IT', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    {description && (
                                        <div className="pt-2 mt-2 border-t border-white/10">
                                            <span className="text-white/60">Note: </span>
                                            <span className="text-white">{description}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full btn-primary disabled:opacity-50"
                            >
                                {isSubmitting ? 'Salvataggio...' : '🚀 Crea Obiettivo'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center gap-2 p-4 border-t border-white/10">
                    {(['category', 'type', 'details', 'confirm'] as WizardStep[]).map((s, idx) => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-colors ${
                                step === s
                                    ? 'bg-primary-500'
                                    : idx < ['category', 'type', 'details', 'confirm'].indexOf(step)
                                    ? 'bg-primary-500/50'
                                    : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
