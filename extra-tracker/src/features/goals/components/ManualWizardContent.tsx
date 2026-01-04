/**
 * 📝 Manual Wizard Content (Embedded version)
 * ==========================================
 * 
 * Versione embedded del wizard manuale senza modal wrapper.
 * Estratto dal GoalWizard originale per l'uso nell'HybridGoalWizard.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from '../context/GoalsContext';
import { GOAL_CATEGORIES, GOAL_TYPES } from '../types';
import type { GoalCategory, GoalType, CreateGoalDTO, CreateMilestoneDTO } from '../types';
import {
    FiArrowRight,
    FiArrowLeft,
    FiCheck,
    FiTarget,
    FiRefreshCw,
    FiCalendar,
    FiPlus,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';

// =========================================
// TYPES
// =========================================

interface ManualWizardContentProps {
    onClose: () => void;
    onSwitchToAI?: () => void;
}

type WizardStep = 'category' | 'type' | 'details' | 'milestones' | 'confirm';

// Template per categoria con più opzioni
interface GoalTemplate {
    title: string;
    type: GoalType;
    target?: number;
    unit?: string;
    description?: string;
    suggestedMilestones?: string[];
}

// =========================================
// MAIN COMPONENT
// =========================================

export const ManualWizardContent: React.FC<ManualWizardContentProps> = ({ onClose, onSwitchToAI }) => {
    const { addGoal } = useGoals();
    
    const [step, setStep] = useState<WizardStep>('category');
    const [category, setCategory] = useState<GoalCategory | null>(null);
    const [type, setType] = useState<GoalType | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('');
    const [frequency, setFrequency] = useState('1');
    const [deadline, setDeadline] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date.toISOString().split('T')[0];
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Milestones state
    const [milestones, setMilestones] = useState<CreateMilestoneDTO[]>([]);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

    // Error state
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Auto-advance function
    const autoAdvance = useCallback((nextStep: WizardStep, delay: number = 400) => {
        setTimeout(() => setStep(nextStep), delay);
    }, []);

    // Milestone handlers
    const addMilestone = () => {
        const trimmedTitle = newMilestoneTitle.trim();
        if (!trimmedTitle) return;
        if (milestones.length >= 20) return;
        
        setMilestones([...milestones, { title: trimmedTitle, weight: 1 }]);
        setNewMilestoneTitle('');
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const handleMilestoneKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMilestone();
        }
    };

    // Extended templates per categoria
    const getTemplates = (cat: GoalCategory): GoalTemplate[] => {
        const templates: Record<GoalCategory, GoalTemplate[]> = {
            finance: [
                { title: 'Risparmiare per le vacanze', type: 'target', target: 3000, unit: '€' },
                { title: 'Fondo di emergenza', type: 'target', target: 10000, unit: '€' },
                { title: 'Investire regolarmente', type: 'habit' },
            ],
            health: [
                { title: 'Workout quotidiano', type: 'habit' },
                { title: 'Perdere peso', type: 'target', target: 10, unit: 'kg' },
                { title: 'Correre 100km', type: 'target', target: 100, unit: 'km' },
            ],
            learning: [
                { title: 'Leggere 12 libri', type: 'target', target: 12, unit: 'libri' },
                { title: 'Studio quotidiano', type: 'habit' },
                { title: 'Completare corso online', type: 'project', target: 100, unit: '%' },
            ],
            career: [
                { title: 'Ottenere promozione', type: 'milestone' },
                { title: 'Networking settimanale', type: 'habit' },
                { title: 'Side project', type: 'project' },
            ],
            personal: [
                { title: 'Meditazione quotidiana', type: 'habit' },
                { title: 'Nuovo hobby', type: 'milestone' },
                { title: 'Viaggiare di più', type: 'target', target: 5, unit: 'viaggi' },
            ],
            relationships: [
                { title: 'Chiamare famiglia settimanalmente', type: 'habit' },
                { title: 'Date night settimanale', type: 'habit' },
                { title: 'Nuove amicizie', type: 'target', target: 5, unit: 'amici' },
            ],
            creativity: [
                { title: 'Creare ogni giorno', type: 'habit' },
                { title: 'Completare opera artistica', type: 'project' },
                { title: 'Portfolio creativo', type: 'target', target: 20, unit: 'opere' },
            ],
            mindfulness: [
                { title: 'Meditazione mattutina', type: 'habit' },
                { title: 'Ore di meditazione', type: 'target', target: 100, unit: 'ore' },
                { title: 'Yoga quotidiano', type: 'habit' },
            ],
        };
        return templates[cat] || [];
    };

    // Validate form before submit
    const validateForm = (): string | null => {
        if (!category) return 'Seleziona una categoria';
        if (!type) return 'Seleziona un tipo di obiettivo';
        if (!title.trim()) return 'Inserisci un titolo';
        if (!deadline) return 'Seleziona una scadenza';
        
        if ((type === 'target' || type === 'challenge') && !targetValue) {
            return 'Inserisci un valore target';
        }
        
        if ((type === 'target' || type === 'challenge') && Number(targetValue) <= 0) {
            return 'Il valore target deve essere maggiore di 0';
        }

        if ((type === 'target' || type === 'challenge') && !unit.trim()) {
            return 'Specifica un\'unità di misura per questo obiettivo';
        }
        
        if (type === 'habit' && (!frequency || Number(frequency) < 1)) {
            return 'Seleziona una frequenza valida';
        }
        
        return null;
    };

    // Submit
    const handleSubmit = async () => {
        setSubmitError(null);
        
        const validationError = validateForm();
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        const goalData: CreateGoalDTO = {
            title: title.trim(),
            category: category!,
            type: type!,
            deadline,
            description: description.trim() || undefined,
            ...(milestones.length > 0 && { milestones }),
            ...((type === 'target' || type === 'challenge') && targetValue && {
                targetValue: Number(targetValue),
                unit: unit.trim() || undefined,
            }),
            ...(type === 'habit' && frequency && {
                frequency: Number(frequency),
            }),
        };

        setIsSubmitting(true);
        try {
            await addGoal(goalData);
            onClose();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Errore nella creazione dell\'obiettivo. Verifica di essere autenticato.';
            setSubmitError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Navigation
    const goNext = () => {
        setSubmitError(null);
        if (step === 'category' && category) setStep('type');
        else if (step === 'type' && type) setStep('details');
        else if (step === 'details' && title) setStep('milestones');
        else if (step === 'milestones') setStep('confirm');
    };

    const goBack = () => {
        setSubmitError(null);
        if (step === 'type') setStep('category');
        else if (step === 'details') setStep('type');
        else if (step === 'milestones') setStep('details');
        else if (step === 'confirm') setStep('milestones');
    };

    const applyTemplate = (template: GoalTemplate) => {
        setTitle(template.title);
        setType(template.type);
        if (template.description) setDescription(template.description);
        if (template.target) setTargetValue(String(template.target));
        if (template.unit) setUnit(template.unit);
        if (template.suggestedMilestones) {
            setMilestones(template.suggestedMilestones.map(title => ({ title, weight: 1 })));
        }
        autoAdvance('details', 300);
    };

    const stepIndex = ['category', 'type', 'details', 'milestones', 'confirm'].indexOf(step);

    // =========================================
    // RENDER
    // =========================================

    return (
        <>
            {/* Progress indicator */}
            <div className="px-6 py-3 border-b border-dark-700">
                <div className="flex items-center justify-center gap-2">
                    {['category', 'type', 'details', 'milestones', 'confirm'].map((s, idx) => (
                        <motion.div
                            key={s}
                            initial={false}
                            animate={{
                                width: stepIndex === idx ? 24 : 8,
                                backgroundColor: stepIndex >= idx ? 'rgb(99, 102, 241)' : 'rgba(255,255,255,0.1)'
                            }}
                            className="h-2 transition-all duration-300 rounded-full"
                        />
                    ))}
                </div>
                <p className="mt-2 text-xs text-center text-gray-500">
                    {step === 'category' && 'Scegli una categoria'}
                    {step === 'type' && 'Seleziona il tipo di obiettivo'}
                    {step === 'details' && 'Inserisci i dettagli'}
                    {step === 'milestones' && 'Aggiungi milestone (opzionale)'}
                    {step === 'confirm' && 'Conferma e crea'}
                </p>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Category */}
                    {step === 'category' && (
                        <motion.div
                            key="category"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {Object.entries(GOAL_CATEGORIES).map(([key, data]) => {
                                    const IconComponent = data.icon;
                                    return (
                                        <motion.button
                                            key={key}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setCategory(key as GoalCategory);
                                                autoAdvance('type');
                                            }}
                                            className={`relative p-4 rounded-xl transition-all text-center ${
                                                category === key
                                                    ? `${data.bgColor} ring-2 ring-primary-500/50`
                                                    : 'bg-dark-700/50 hover:bg-dark-700 border border-dark-600'
                                            }`}
                                        >
                                            <div className={`mx-auto mb-2 w-12 h-12 rounded-xl flex items-center justify-center ${
                                                category === key 
                                                    ? `${data.bgColor} ${data.color}` 
                                                    : 'bg-dark-600 text-gray-400'
                                            }`}>
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <span className={`text-sm font-medium ${category === key ? 'text-white' : 'text-gray-300'}`}>
                                                {data.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Link to AI Mode */}
                            {onSwitchToAI && (
                                <div className="pt-4 text-center border-t border-dark-700">
                                    <button
                                        onClick={onSwitchToAI}
                                        className="text-sm text-gray-500 transition-colors hover:text-primary-400"
                                    >
                                        <FiZap className="inline w-4 h-4 mr-1" />
                                        Vuoi che l'AI crei un piano per te? <span className="underline">Prova Magic AI</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: Type */}
                    {step === 'type' && category && (
                        <motion.div
                            key="type"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            {/* Quick Templates */}
                            <div className="mb-4">
                                <p className="mb-2 text-xs text-gray-500">Suggerimenti veloci:</p>
                                <div className="flex flex-wrap gap-2">
                                    {getTemplates(category).slice(0, 3).map((template, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => applyTemplate(template)}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-dark-700 text-gray-300 hover:bg-dark-600 transition-colors"
                                        >
                                            {template.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(GOAL_TYPES).map(([key, data]) => {
                                    const IconComponent = data.icon;
                                    return (
                                        <motion.button
                                            key={key}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => {
                                                setType(key as GoalType);
                                                autoAdvance('details');
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                                                type === key
                                                    ? 'bg-primary-500/20 ring-2 ring-primary-500/50'
                                                    : 'bg-dark-700/50 hover:bg-dark-700 border border-dark-600'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r ${data.color}`}>
                                                <IconComponent className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-medium text-white">{data.label}</span>
                                                <p className="text-xs text-gray-400 mt-0.5">{data.description}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Details */}
                    {step === 'details' && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            {/* Title */}
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-300">
                                    Titolo obiettivo *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Es: Risparmiare per le vacanze"
                                    className="w-full px-4 py-3 text-white placeholder-gray-500 border bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                    maxLength={100}
                                />
                            </div>

                            {/* Target Value (for target/challenge types) */}
                            {(type === 'target' || type === 'challenge') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-300">
                                            Valore target *
                                        </label>
                                        <input
                                            type="number"
                                            value={targetValue}
                                            onChange={(e) => setTargetValue(e.target.value)}
                                            placeholder="100"
                                            className="w-full px-4 py-3 text-white placeholder-gray-500 border bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-300">
                                            Unità *
                                        </label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="€, km, ore..."
                                            className="w-full px-4 py-3 text-white placeholder-gray-500 border bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Frequency (for habit type) */}
                            {type === 'habit' && (
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-300">
                                        Frequenza settimanale *
                                    </label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        className="w-full px-4 py-3 text-white border bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                            <option key={n} value={n}>{n}x a settimana</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Deadline */}
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-300">
                                    Scadenza *
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full px-4 py-3 text-white border bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-300">
                                    Descrizione (opzionale)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Aggiungi una descrizione..."
                                    rows={2}
                                    className="w-full px-4 py-3 text-white placeholder-gray-500 border resize-none bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
                                    maxLength={500}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Milestones */}
                    {step === 'milestones' && (
                        <motion.div
                            key="milestones"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <p className="text-sm text-gray-400">
                                Aggiungi dei sotto-obiettivi per tracciare meglio i progressi.
                            </p>

                            {/* Add Milestone Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMilestoneTitle}
                                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                    onKeyDown={handleMilestoneKeyDown}
                                    placeholder="Nuova milestone..."
                                    className="flex-1 px-4 py-2.5 bg-dark-700/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                                />
                                <button
                                    onClick={addMilestone}
                                    disabled={!newMilestoneTitle.trim() || milestones.length >= 20}
                                    className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FiPlus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Milestones List */}
                            <div className="space-y-2 overflow-y-auto max-h-48">
                                {milestones.map((m, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 p-3 border bg-dark-700/50 border-dark-600 rounded-xl"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 text-xs font-semibold text-gray-400 rounded-full bg-dark-600">
                                            {idx + 1}
                                        </div>
                                        <span className="flex-1 text-sm text-gray-300">{m.title}</span>
                                        <button
                                            onClick={() => removeMilestone(idx)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {milestones.length === 0 && (
                                <p className="py-4 text-sm text-center text-gray-500">
                                    Nessuna milestone ancora. Puoi saltare questo step.
                                </p>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5: Confirm */}
                    {step === 'confirm' && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="p-4 space-y-3 border bg-dark-700/50 border-dark-600 rounded-xl">
                                {/* Category & Type */}
                                <div className="flex items-center gap-3">
                                    {category && (
                                        <span className={`px-2 py-1 text-xs rounded-lg ${GOAL_CATEGORIES[category].bgColor} ${GOAL_CATEGORIES[category].color}`}>
                                            {GOAL_CATEGORIES[category].label}
                                        </span>
                                    )}
                                    {type && (
                                        <span className="px-2 py-1 text-xs text-gray-300 rounded-lg bg-dark-600">
                                            {GOAL_TYPES[type].label}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-semibold text-white">{title}</h3>
                                
                                {/* Description */}
                                {description && (
                                    <p className="text-sm text-gray-400">{description}</p>
                                )}

                                {/* Details */}
                                <div className="flex flex-wrap gap-3 pt-2 border-t border-dark-600">
                                    {(type === 'target' || type === 'challenge') && targetValue && (
                                        <div className="flex items-center gap-1 text-sm text-gray-300">
                                            <FiTarget className="w-4 h-4 text-primary-400" />
                                            <span>{targetValue} {unit}</span>
                                        </div>
                                    )}
                                    {type === 'habit' && (
                                        <div className="flex items-center gap-1 text-sm text-gray-300">
                                            <FiRefreshCw className="w-4 h-4 text-green-400" />
                                            <span>{frequency}x/settimana</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-sm text-gray-300">
                                        <FiCalendar className="w-4 h-4 text-blue-400" />
                                        <span>{new Date(deadline).toLocaleDateString('it-IT')}</span>
                                    </div>
                                </div>

                                {/* Milestones */}
                                {milestones.length > 0 && (
                                    <div className="pt-2 border-t border-dark-600">
                                        <p className="mb-2 text-xs text-gray-500">
                                            {milestones.length} milestone
                                        </p>
                                        <div className="space-y-1">
                                            {milestones.map((m, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                                                    <div className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-dark-600">
                                                        {idx + 1}
                                                    </div>
                                                    <span>{m.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-dark-700">
                {/* Error message */}
                <AnimatePresence>
                    {submitError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-2 mb-3 border rounded-lg bg-red-500/10 border-red-500/20"
                        >
                            <p className="text-sm text-center text-red-400">{submitError}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div className="flex items-center justify-between">
                    {step !== 'category' ? (
                        <button
                            onClick={goBack}
                            className="flex items-center gap-2 px-4 py-2 text-gray-400 transition-colors hover:text-white"
                        >
                            <FiArrowLeft className="w-4 h-4" />
                            Indietro
                        </button>
                    ) : (
                        <div />
                    )}

                    {step === 'confirm' ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white"
                                    />
                                    Creazione...
                                </span>
                            ) : (
                                <>
                                    <FiCheck className="w-4 h-4" />
                                    Crea Obiettivo
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={goNext}
                            disabled={
                                (step === 'category' && !category) ||
                                (step === 'type' && !type) ||
                                (step === 'details' && !title)
                            }
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Avanti
                            <FiArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default ManualWizardContent;
