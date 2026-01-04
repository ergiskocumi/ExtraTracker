/**
 * 🧞 AI Smart Goal Wizard
 * =======================
 * 
 * Wizard "Intent-Based" per la creazione di obiettivi.
 * L'utente esprime un desiderio e l'AI genera un Piano d'Azione Completo (Blueprint).
 * 
 * Flusso UX:
 * 1. Scelta Categoria (Griglia icone)
 * 2. L'Intento (Magic Input) + Slider Intensità
 * 3. The Blueprint (Review + Edit)
 * 4. Accetta Sfida (Salva nel DB)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from './context/GoalsContext';
import { GOAL_CATEGORIES } from './types';
import type { GoalCategory, AIGoalPlanResponse, AIMilestone, CreateGoalDTO } from './types';
import {
    FiX,
    FiArrowLeft,
    FiCheck,
    FiStar,
    FiChevronDown,
    FiTrash2,
    FiEdit3,
    FiExternalLink,
    FiCalendar,
    FiTarget,
    FiBook,
    FiCheckCircle,
    FiLoader,
    FiZap,
} from 'react-icons/fi';
import goalsService from './services/goalsService';

// =========================================
// TYPES
// =========================================

interface GoalWizardAIProps {
    onClose: () => void;
}

type WizardStep = 'category' | 'intent' | 'blueprint' | 'saving';
type Intensity = 'relax' | 'normal' | 'hardcore';

// =========================================
// LOADING MESSAGES
// =========================================

const LOADING_MESSAGES = [
    '🧠 Analizzo il tuo obiettivo...',
    '📊 Calcolo le milestone ottimali...',
    '📅 Definisco le scadenze strategiche...',
    '📚 Cerco le migliori risorse...',
    '✨ Creo il tuo piano personalizzato...',
    '🎯 Quasi fatto, perfeziono i dettagli...',
];

// =========================================
// INTENSITY CONFIG
// =========================================

const INTENSITY_OPTIONS: { value: Intensity; label: string; emoji: string; description: string }[] = [
    { value: 'relax', label: 'Relax', emoji: '🐢', description: 'Ritmo tranquillo, più tempo' },
    { value: 'normal', label: 'Normale', emoji: '🚶', description: 'Equilibrio perfetto' },
    { value: 'hardcore', label: 'Hardcore', emoji: '🔥', description: 'Sfida intensa!' },
];

// =========================================
// SUB-COMPONENTS
// =========================================

/** Animated Loading State */
const LoadingState: React.FC<{ messageIndex: number }> = ({ messageIndex }) => (
    <motion.div
        className="flex flex-col items-center justify-center py-16 space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        {/* Animated Brain Icon */}
        <motion.div
            className="relative"
            animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
            }}
            transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600">
                <FiStar className="w-10 h-10 text-white" />
            </div>
            {/* Pulsing ring */}
            <motion.div
                className="absolute inset-0 border-2 rounded-full border-primary-400"
                animate={{ 
                    scale: [1, 1.5, 2],
                    opacity: [0.6, 0.3, 0]
                }}
                transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
        </motion.div>

        {/* Loading Message */}
        <AnimatePresence mode="wait">
            <motion.p
                key={messageIndex}
                className="text-lg font-medium text-center text-gray-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                {LOADING_MESSAGES[messageIndex]}
            </motion.p>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary-400"
                    animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2
                    }}
                />
            ))}
        </div>
    </motion.div>
);

/** Milestone Accordion Item */
interface MilestoneItemProps {
    milestone: AIMilestone;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onUpdate: (updates: Partial<AIMilestone>) => void;
}

const MilestoneItem: React.FC<MilestoneItemProps> = ({
    milestone,
    index,
    isExpanded,
    onToggle,
    onDelete,
    onUpdate,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(milestone.title);

    const handleSaveTitle = () => {
        if (editTitle.trim()) {
            onUpdate({ title: editTitle.trim() });
        }
        setIsEditing(false);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return 'Data non valida';
        }
    };

    return (
        <motion.div
            layout
            className="overflow-hidden border bg-dark-700/50 rounded-xl border-dark-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
        >
            {/* Header - Always visible */}
            <div
                className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-dark-600/30"
                onClick={onToggle}
            >
                <div className="flex items-center flex-1 min-w-0 space-x-3">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-semibold rounded-full bg-primary-500/20 text-primary-400">
                        {index + 1}
                    </div>
                    
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-3 py-1 text-white border rounded-lg bg-dark-800 border-dark-500 focus:outline-none focus:border-primary-500"
                            autoFocus
                        />
                    ) : (
                        <span className="font-medium text-white truncate">{milestone.title}</span>
                    )}
                </div>

                <div className="flex items-center flex-shrink-0 space-x-3">
                    <span className="flex items-center space-x-1 text-xs text-gray-400">
                        <FiCalendar className="w-3 h-3" />
                        <span>{formatDate(milestone.deadline)}</span>
                    </span>
                    
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <FiChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-dark-600"
                    >
                        <div className="p-4 space-y-4">
                            {/* Reasoning */}
                            {milestone.reasoning && (
                                <div className="space-y-2">
                                    <h4 className="flex items-center space-x-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                        <FiTarget className="w-3 h-3" />
                                        <span>Perché farlo</span>
                                    </h4>
                                    <p className="text-sm leading-relaxed text-gray-300">
                                        {milestone.reasoning}
                                    </p>
                                </div>
                            )}

                            {/* Action Steps */}
                            {milestone.actionSteps && milestone.actionSteps.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="flex items-center space-x-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                        <FiCheckCircle className="w-3 h-3" />
                                        <span>Azioni concrete</span>
                                    </h4>
                                    <ul className="space-y-1">
                                        {milestone.actionSteps.map((step, i) => (
                                            <li 
                                                key={i}
                                                className="flex items-start space-x-2 text-sm text-gray-300"
                                            >
                                                <span className="text-primary-400 mt-0.5">•</span>
                                                <span>{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Resources */}
                            {milestone.resources && milestone.resources.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="flex items-center space-x-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                        <FiBook className="w-3 h-3" />
                                        <span>Risorse consigliate</span>
                                    </h4>
                                    <ul className="space-y-1">
                                        {milestone.resources.map((resource, i) => (
                                            <li 
                                                key={i}
                                                className="flex items-center space-x-2 text-sm transition-colors text-primary-400 hover:text-primary-300"
                                            >
                                                <FiExternalLink className="flex-shrink-0 w-3 h-3" />
                                                <span>{resource}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end pt-2 space-x-2 border-t border-dark-600">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
                                >
                                    <FiEdit3 className="w-3 h-3" />
                                    <span>Modifica</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <FiTrash2 className="w-3 h-3" />
                                    <span>Elimina</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// =========================================
// TYPES FOR EMBEDDED VERSION
// =========================================

interface GoalWizardAIEmbeddedProps {
    onClose: () => void;
    onSwitchToManual?: () => void;
}

// =========================================
// EMBEDDED COMPONENT (Without modal wrapper)
// =========================================

export const GoalWizardAIEmbedded: React.FC<GoalWizardAIEmbeddedProps> = ({ onClose, onSwitchToManual }) => {
    const { addGoal } = useGoals();

    // Step navigation
    const [step, setStep] = useState<WizardStep>('category');
    
    // Step 1: Category
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
    
    // Step 2: Intent
    const [userQuery, setUserQuery] = useState('');
    const [intensity, setIntensity] = useState<Intensity>('normal');
    
    // Step 3: Blueprint
    const [plan, setPlan] = useState<AIGoalPlanResponse | null>(null);
    const [expandedMilestone, setExpandedMilestone] = useState<number | null>(0);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editable fields
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    // =========================================
    // HANDLERS
    // =========================================

    const handleCategorySelect = (category: GoalCategory) => {
        setSelectedCategory(category);
        setTimeout(() => setStep('intent'), 300);
    };

    const handleGeneratePlan = async () => {
        if (!selectedCategory || !userQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setLoadingMessageIndex(0);

        const messageInterval = setInterval(() => {
            setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        try {
            const result = await goalsService.generateAIGoalPlan(
                selectedCategory,
                userQuery.trim(),
                intensity
            );

            setPlan(result);
            setEditedTitle(result.title);
            setEditedDescription(result.description);
            setStep('blueprint');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore nella generazione del piano');
        } finally {
            clearInterval(messageInterval);
            setIsLoading(false);
        }
    };

    const handleDeleteMilestone = (index: number) => {
        if (!plan || plan.milestones.length <= 1) return;
        
        setPlan({
            ...plan,
            milestones: plan.milestones.filter((_, i) => i !== index),
        });
        
        if (expandedMilestone === index) {
            setExpandedMilestone(null);
        } else if (expandedMilestone !== null && expandedMilestone > index) {
            setExpandedMilestone(expandedMilestone - 1);
        }
    };

    const handleUpdateMilestone = (index: number, updates: Partial<AIMilestone>) => {
        if (!plan) return;

        setPlan({
            ...plan,
            milestones: plan.milestones.map((m, i) => 
                i === index ? { ...m, ...updates } : m
            ),
        });
    };

    const handleAcceptChallenge = async () => {
        if (!plan || !selectedCategory) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const goalData: CreateGoalDTO = {
                title: editedTitle || plan.title,
                description: editedDescription || plan.description,
                category: selectedCategory,
                type: plan.type,
                targetValue: plan.targetValue || undefined,
                unit: plan.unit || undefined,
                frequency: plan.frequency || undefined,
                deadline: plan.deadline,
                milestones: plan.milestones.map((m) => ({
                    title: m.title,
                    weight: m.weight,
                    deadline: m.deadline,
                    reasoning: m.reasoning,
                    actionSteps: m.actionSteps,
                    resources: m.resources,
                })),
            };

            await addGoal(goalData);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'intent') setStep('category');
        else if (step === 'blueprint') setStep('intent');
    };

    // =========================================
    // RENDER STEPS
    // =========================================

    const renderCategoryStep = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">
                    🎯 Scegli la categoria
                </h2>
                <p className="text-gray-400">
                    In quale area vuoi migliorare?
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.entries(GOAL_CATEGORIES) as [GoalCategory, typeof GOAL_CATEGORIES[GoalCategory]][]).map(([key, cat]) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === key;

                    return (
                        <motion.button
                            key={key}
                            onClick={() => handleCategorySelect(key)}
                            className={`
                                flex flex-col items-center justify-center p-4 rounded-xl
                                border-2 transition-all duration-200
                                ${isSelected 
                                    ? `${cat.bgColor} border-current ${cat.color}` 
                                    : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                                }
                            `}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Icon className={`w-8 h-8 mb-2 ${isSelected ? cat.color : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {cat.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Link to Manual Mode */}
            {onSwitchToManual && (
                <div className="pt-4 text-center border-t border-dark-700">
                    <button
                        onClick={onSwitchToManual}
                        className="text-sm text-gray-500 transition-colors hover:text-primary-400"
                    >
                        Preferisci inserire i dettagli a mano? <span className="underline">Passa alla modalità Manuale</span>
                    </button>
                </div>
            )}
        </motion.div>
    );

    const renderIntentStep = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">
                    ✨ Esprimi il tuo desiderio
                </h2>
                <p className="text-gray-400">
                    Descrivi cosa vuoi raggiungere. L'AI creerà un piano strategico per te.
                </p>
            </div>

            {/* Magic Input */}
            <div className="space-y-2">
                <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Es: Voglio imparare a suonare la chitarra, partendo da zero, fino a poter suonare le mie canzoni preferite..."
                    className="w-full h-32 p-4 text-white placeholder-gray-500 border resize-none bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    maxLength={500}
                />
                <div className="flex justify-end">
                    <span className="text-xs text-gray-500">{userQuery.length}/500</span>
                </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                    Intensità del piano
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {INTENSITY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setIntensity(option.value)}
                            className={`
                                flex flex-col items-center p-3 rounded-xl border-2 transition-all
                                ${intensity === option.value
                                    ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                    : 'bg-dark-700/50 border-dark-600 text-gray-400 hover:border-dark-500'
                                }
                            `}
                        >
                            <span className="mb-1 text-2xl">{option.emoji}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                            <span className="mt-1 text-xs text-center opacity-70">
                                {option.description}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                >
                    {error}
                </motion.div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGeneratePlan}
                disabled={!userQuery.trim() || userQuery.length < 10 || isLoading}
                className="flex items-center justify-center w-full py-4 space-x-2 font-semibold text-white transition-all bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl hover:from-primary-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FiZap className="w-5 h-5" />
                <span>Genera Piano Strategico ✨</span>
            </button>

            {/* Link to Manual Mode */}
            {onSwitchToManual && (
                <div className="pt-2 text-center">
                    <button
                        onClick={onSwitchToManual}
                        className="text-sm text-gray-500 transition-colors hover:text-primary-400"
                    >
                        Preferisci inserire i dettagli a mano? <span className="underline">Passa alla modalità Manuale</span>
                    </button>
                </div>
            )}
        </motion.div>
    );

    const renderBlueprintStep = () => {
        if (!plan) return null;

        const CategoryIcon = selectedCategory ? GOAL_CATEGORIES[selectedCategory].icon : FiTarget;

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center space-x-2 text-primary-400">
                        <FiStar className="w-5 h-5" />
                        <span className="text-sm font-medium">Piano generato dall'AI</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        🎯 Il tuo Blueprint
                    </h2>
                </div>

                {/* Editable Title & Description */}
                <div className="p-4 space-y-4 border bg-dark-700/50 rounded-xl border-dark-600">
                    <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${selectedCategory ? GOAL_CATEGORIES[selectedCategory].bgColor : 'bg-dark-600'}`}>
                            <CategoryIcon className={`w-5 h-5 ${selectedCategory ? GOAL_CATEGORIES[selectedCategory].color : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full pb-1 text-lg font-semibold text-white bg-transparent border-b border-dark-600 focus:outline-none focus:border-primary-500"
                                placeholder="Titolo obiettivo"
                            />
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full text-sm text-gray-400 bg-transparent border-none resize-none focus:outline-none"
                                placeholder="Descrizione"
                                rows={2}
                            />
                        </div>
                    </div>
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-600">
                        <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                            Tipo: {plan.type}
                        </span>
                        <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                            Deadline: {new Date(plan.deadline).toLocaleDateString('it-IT')}
                        </span>
                        {plan.targetValue && (
                            <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                                Target: {plan.targetValue} {plan.unit}
                            </span>
                        )}
                    </div>
                </div>

                {/* Timeline / Milestones */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                            📋 Timeline ({plan.milestones.length} milestone)
                        </h3>
                        {plan.milestones.length > 1 && (
                            <button
                                onClick={() => setExpandedMilestone(expandedMilestone === null ? 0 : null)}
                                className="text-xs text-primary-400 hover:text-primary-300"
                            >
                                {expandedMilestone === null ? 'Espandi tutto' : 'Comprimi tutto'}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                        <AnimatePresence>
                            {plan.milestones.map((milestone, index) => (
                                <MilestoneItem
                                    key={`${milestone.title}-${index}`}
                                    milestone={milestone}
                                    index={index}
                                    isExpanded={expandedMilestone === index}
                                    onToggle={() => setExpandedMilestone(
                                        expandedMilestone === index ? null : index
                                    )}
                                    onDelete={() => handleDeleteMilestone(index)}
                                    onUpdate={(updates) => handleUpdateMilestone(index, updates)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Accept Button */}
                <button
                    onClick={handleAcceptChallenge}
                    disabled={isSubmitting || !editedTitle.trim()}
                    className="flex items-center justify-center w-full py-4 space-x-2 font-semibold text-white transition-all bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <FiLoader className="w-5 h-5 animate-spin" />
                            <span>Salvataggio...</span>
                        </>
                    ) : (
                        <>
                            <FiCheck className="w-5 h-5" />
                            <span>Accetta Sfida 🚀</span>
                        </>
                    )}
                </button>
            </motion.div>
        );
    };

    // =========================================
    // MAIN RENDER (Embedded - no modal wrapper)
    // =========================================

    return (
        <>
            {/* Progress Steps */}
            <div className="px-6 py-3 border-b border-dark-700">
                <div className="flex items-center justify-between">
                    {['Categoria', 'Intento', 'Blueprint'].map((label, index) => {
                        const stepKeys: WizardStep[] = ['category', 'intent', 'blueprint'];
                        const currentIndex = stepKeys.indexOf(step);
                        const isActive = index === currentIndex;
                        const isCompleted = index < currentIndex;

                        return (
                            <div key={label} className="flex items-center">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                    ${isCompleted 
                                        ? 'bg-green-500 text-white' 
                                        : isActive 
                                            ? 'bg-primary-500 text-white' 
                                            : 'bg-dark-600 text-gray-500'
                                    }
                                `}>
                                    {isCompleted ? <FiCheck className="w-4 h-4" /> : index + 1}
                                </div>
                                <span className={`ml-2 text-sm hidden sm:block ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                    {label}
                                </span>
                                {index < 2 && (
                                    <div className={`w-12 sm:w-20 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-dark-600'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Back Button (floating) */}
            {step !== 'category' && (
                <button
                    onClick={handleBack}
                    disabled={isLoading}
                    className="absolute p-2 text-gray-400 transition-colors rounded-lg left-4 top-20 hover:text-white hover:bg-dark-700 disabled:opacity-50"
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
            )}

            {/* Content */}
            <div className="p-6 max-h-[65vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <LoadingState key="loading" messageIndex={loadingMessageIndex} />
                    ) : step === 'category' ? (
                        renderCategoryStep()
                    ) : step === 'intent' ? (
                        renderIntentStep()
                    ) : step === 'blueprint' ? (
                        renderBlueprintStep()
                    ) : null}
                </AnimatePresence>
            </div>
        </>
    );
};

// =========================================
// MAIN COMPONENT (With modal wrapper - standalone use)
// =========================================

export const GoalWizardAI: React.FC<GoalWizardAIProps> = ({ onClose }) => {
    const { addGoal } = useGoals();

    // Step navigation
    const [step, setStep] = useState<WizardStep>('category');
    
    // Step 1: Category
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
    
    // Step 2: Intent
    const [userQuery, setUserQuery] = useState('');
    const [intensity, setIntensity] = useState<Intensity>('normal');
    
    // Step 3: Blueprint
    const [plan, setPlan] = useState<AIGoalPlanResponse | null>(null);
    const [expandedMilestone, setExpandedMilestone] = useState<number | null>(0);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editable fields
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    // =========================================
    // HANDLERS
    // =========================================

    const handleCategorySelect = (category: GoalCategory) => {
        setSelectedCategory(category);
        setTimeout(() => setStep('intent'), 300);
    };

    const handleGeneratePlan = async () => {
        if (!selectedCategory || !userQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setLoadingMessageIndex(0);

        // Cycle through loading messages
        const messageInterval = setInterval(() => {
            setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        try {
            const result = await goalsService.generateAIGoalPlan(
                selectedCategory,
                userQuery.trim(),
                intensity
            );

            setPlan(result);
            setEditedTitle(result.title);
            setEditedDescription(result.description);
            setStep('blueprint');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore nella generazione del piano');
        } finally {
            clearInterval(messageInterval);
            setIsLoading(false);
        }
    };

    const handleDeleteMilestone = (index: number) => {
        if (!plan || plan.milestones.length <= 1) return;
        
        setPlan({
            ...plan,
            milestones: plan.milestones.filter((_, i) => i !== index),
        });
        
        // Reset expanded if deleted
        if (expandedMilestone === index) {
            setExpandedMilestone(null);
        } else if (expandedMilestone !== null && expandedMilestone > index) {
            setExpandedMilestone(expandedMilestone - 1);
        }
    };

    const handleUpdateMilestone = (index: number, updates: Partial<AIMilestone>) => {
        if (!plan) return;

        setPlan({
            ...plan,
            milestones: plan.milestones.map((m, i) => 
                i === index ? { ...m, ...updates } : m
            ),
        });
    };

    const handleAcceptChallenge = async () => {
        if (!plan || !selectedCategory) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const goalData: CreateGoalDTO = {
                title: editedTitle || plan.title,
                description: editedDescription || plan.description,
                category: selectedCategory,
                type: plan.type,
                targetValue: plan.targetValue || undefined,
                unit: plan.unit || undefined,
                frequency: plan.frequency || undefined,
                deadline: plan.deadline,
                milestones: plan.milestones.map((m) => ({
                    title: m.title,
                    weight: m.weight,
                    deadline: m.deadline,
                    reasoning: m.reasoning,
                    actionSteps: m.actionSteps,
                    resources: m.resources,
                })),
            };

            await addGoal(goalData);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'intent') setStep('category');
        else if (step === 'blueprint') setStep('intent');
    };

    // =========================================
    // RENDER STEPS
    // =========================================

    const renderCategoryStep = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">
                    🎯 Scegli la categoria
                </h2>
                <p className="text-gray-400">
                    In quale area vuoi migliorare?
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.entries(GOAL_CATEGORIES) as [GoalCategory, typeof GOAL_CATEGORIES[GoalCategory]][]).map(([key, cat]) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === key;

                    return (
                        <motion.button
                            key={key}
                            onClick={() => handleCategorySelect(key)}
                            className={`
                                flex flex-col items-center justify-center p-4 rounded-xl
                                border-2 transition-all duration-200
                                ${isSelected 
                                    ? `${cat.bgColor} border-current ${cat.color}` 
                                    : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                                }
                            `}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Icon className={`w-8 h-8 mb-2 ${isSelected ? cat.color : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {cat.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );

    const renderIntentStep = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">
                    ✨ Esprimi il tuo desiderio
                </h2>
                <p className="text-gray-400">
                    Descrivi cosa vuoi raggiungere. L'AI creerà un piano strategico per te.
                </p>
            </div>

            {/* Magic Input */}
            <div className="space-y-2">
                <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Es: Voglio imparare a suonare la chitarra, partendo da zero, fino a poter suonare le mie canzoni preferite..."
                    className="w-full h-32 p-4 text-white placeholder-gray-500 border resize-none bg-dark-700/50 border-dark-600 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    maxLength={500}
                />
                <div className="flex justify-end">
                    <span className="text-xs text-gray-500">{userQuery.length}/500</span>
                </div>
            </div>

            {/* Intensity Slider */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                    Intensità del piano
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {INTENSITY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setIntensity(option.value)}
                            className={`
                                flex flex-col items-center p-3 rounded-xl border-2 transition-all
                                ${intensity === option.value
                                    ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                    : 'bg-dark-700/50 border-dark-600 text-gray-400 hover:border-dark-500'
                                }
                            `}
                        >
                            <span className="mb-1 text-2xl">{option.emoji}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                            <span className="mt-1 text-xs text-center opacity-70">
                                {option.description}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                >
                    {error}
                </motion.div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGeneratePlan}
                disabled={!userQuery.trim() || userQuery.length < 10 || isLoading}
                className="flex items-center justify-center w-full py-4 space-x-2 font-semibold text-white transition-all bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl hover:from-primary-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FiZap className="w-5 h-5" />
                <span>Genera Piano Strategico ✨</span>
            </button>
        </motion.div>
    );

    const renderBlueprintStep = () => {
        if (!plan) return null;

        const CategoryIcon = selectedCategory ? GOAL_CATEGORIES[selectedCategory].icon : FiTarget;

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center space-x-2 text-primary-400">
                        <FiStar className="w-5 h-5" />
                        <span className="text-sm font-medium">Piano generato dall'AI</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        🎯 Il tuo Blueprint
                    </h2>
                </div>

                {/* Editable Title & Description */}
                <div className="p-4 space-y-4 border bg-dark-700/50 rounded-xl border-dark-600">
                    <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${selectedCategory ? GOAL_CATEGORIES[selectedCategory].bgColor : 'bg-dark-600'}`}>
                            <CategoryIcon className={`w-5 h-5 ${selectedCategory ? GOAL_CATEGORIES[selectedCategory].color : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full pb-1 text-lg font-semibold text-white bg-transparent border-b border-dark-600 focus:outline-none focus:border-primary-500"
                                placeholder="Titolo obiettivo"
                            />
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full text-sm text-gray-400 bg-transparent border-none resize-none focus:outline-none"
                                placeholder="Descrizione"
                                rows={2}
                            />
                        </div>
                    </div>
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-600">
                        <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                            Tipo: {plan.type}
                        </span>
                        <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                            Deadline: {new Date(plan.deadline).toLocaleDateString('it-IT')}
                        </span>
                        {plan.targetValue && (
                            <span className="px-2 py-1 text-xs text-gray-400 rounded bg-dark-600">
                                Target: {plan.targetValue} {plan.unit}
                            </span>
                        )}
                    </div>
                </div>

                {/* Timeline / Milestones */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                            📋 Timeline ({plan.milestones.length} milestone)
                        </h3>
                        {plan.milestones.length > 1 && (
                            <button
                                onClick={() => setExpandedMilestone(expandedMilestone === null ? 0 : null)}
                                className="text-xs text-primary-400 hover:text-primary-300"
                            >
                                {expandedMilestone === null ? 'Espandi tutto' : 'Comprimi tutto'}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                        <AnimatePresence>
                            {plan.milestones.map((milestone, index) => (
                                <MilestoneItem
                                    key={`${milestone.title}-${index}`}
                                    milestone={milestone}
                                    index={index}
                                    isExpanded={expandedMilestone === index}
                                    onToggle={() => setExpandedMilestone(
                                        expandedMilestone === index ? null : index
                                    )}
                                    onDelete={() => handleDeleteMilestone(index)}
                                    onUpdate={(updates) => handleUpdateMilestone(index, updates)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Accept Button */}
                <button
                    onClick={handleAcceptChallenge}
                    disabled={isSubmitting || !editedTitle.trim()}
                    className="flex items-center justify-center w-full py-4 space-x-2 font-semibold text-white transition-all bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <FiLoader className="w-5 h-5 animate-spin" />
                            <span>Salvataggio...</span>
                        </>
                    ) : (
                        <>
                            <FiCheck className="w-5 h-5" />
                            <span>Accetta Sfida 🚀</span>
                        </>
                    )}
                </button>
            </motion.div>
        );
    };

    // =========================================
    // MAIN RENDER
    // =========================================

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl overflow-hidden border shadow-2xl bg-dark-800 rounded-2xl border-dark-700"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                    <div className="flex items-center space-x-3">
                        {step !== 'category' && (
                            <button
                                onClick={handleBack}
                                disabled={isLoading}
                                className="p-2 text-gray-400 transition-colors rounded-lg hover:text-white hover:bg-dark-700 disabled:opacity-50"
                            >
                                <FiArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h1 className="flex items-center space-x-2 text-lg font-semibold text-white">
                            <FiZap className="w-5 h-5 text-primary-400" />
                            <span>AI Goal Wizard</span>
                        </h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 transition-colors rounded-lg hover:text-white hover:bg-dark-700"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-3 border-b border-dark-700">
                    <div className="flex items-center justify-between">
                        {['Categoria', 'Intento', 'Blueprint'].map((label, index) => {
                            const stepKeys: WizardStep[] = ['category', 'intent', 'blueprint'];
                            const currentIndex = stepKeys.indexOf(step);
                            const isActive = index === currentIndex;
                            const isCompleted = index < currentIndex;

                            return (
                                <div key={label} className="flex items-center">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                        ${isCompleted 
                                            ? 'bg-green-500 text-white' 
                                            : isActive 
                                                ? 'bg-primary-500 text-white' 
                                                : 'bg-dark-600 text-gray-500'
                                        }
                                    `}>
                                        {isCompleted ? <FiCheck className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <span className={`ml-2 text-sm hidden sm:block ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                        {label}
                                    </span>
                                    {index < 2 && (
                                        <div className={`w-12 sm:w-20 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-dark-600'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <LoadingState key="loading" messageIndex={loadingMessageIndex} />
                        ) : step === 'category' ? (
                            renderCategoryStep()
                        ) : step === 'intent' ? (
                            renderIntentStep()
                        ) : step === 'blueprint' ? (
                            renderBlueprintStep()
                        ) : null}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default GoalWizardAI;
