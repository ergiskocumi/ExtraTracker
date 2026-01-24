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

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from './context/GoalsContext';
import { GOAL_CATEGORIES } from './types';
import type { GoalCategory, AIGoalPlanResponse, AIMilestone, CreateGoalDTO, ActionStep } from './types';
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

const WIZARD_STEP_KEYS: WizardStep[] = ['category', 'intent', 'blueprint'];
const WIZARD_STEP_LABELS = ['Categoria', 'Intento', 'Blueprint'] as const;

const formatMilestoneDate = (dateStr: string) => {
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
    onToggle: (index: number) => void;
    onDelete: (index: number) => void;
    onUpdate: (index: number, updates: Partial<AIMilestone>) => void;
}

const MilestoneItem = React.memo<MilestoneItemProps>(({
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
            onUpdate(index, { title: editTitle.trim() });
        }
        setIsEditing(false);
    };

    return (
        <motion.div
            layout
            className="overflow-hidden border bg-white/[0.03] rounded-xl border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
        >
            {/* Header - Always visible */}
            <div
                className="flex items-center justify-between p-4 transition-all cursor-pointer hover:bg-white/[0.05]"
                onClick={() => onToggle(index)}
            >
                <div className="flex items-center flex-1 min-w-0 space-x-3">
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-semibold border rounded-lg bg-primary-500/20 text-primary-400 border-primary-500/30">
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
                            className="flex-1 px-3 py-2 text-white border rounded-lg bg-white/[0.03] border-white/10 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            autoFocus
                        />
                    ) : (
                        <span className="font-medium text-white truncate">{milestone.title}</span>
                    )}
                </div>

                <div className="flex items-center flex-shrink-0 space-x-3">
                    <div className="flex items-center px-2 py-1 space-x-1 text-xs text-white/60 rounded-md bg-white/[0.05]">
                        <FiCalendar className="w-3 h-3" />
                        <span>{formatMilestoneDate(milestone.deadline)}</span>
                    </div>
                    
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <FiChevronDown className="w-4 h-4 text-white/40" />
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
                        className="border-t border-white/10"
                    >
                        <div className="p-4 space-y-4">
                            {/* Reasoning */}
                            {milestone.reasoning && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center space-x-2 text-sm font-semibold tracking-wide uppercase text-primary-400">
                                        <FiTarget className="w-4 h-4" />
                                        <span>Strategic Reasoning</span>
                                    </h4>
                                    <blockquote className="pl-4 text-sm italic border-l-2 text-zinc-400 border-primary-500">
                                        {milestone.reasoning}
                                    </blockquote>
                                </div>
                            )}

                            {/* Action Steps */}
                            {milestone.actionSteps && milestone.actionSteps.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="flex items-center space-x-2 text-sm font-semibold text-primary-400">
                                        <FiCheckCircle className="w-3 h-3" />
                                        <span>Action Steps</span>
                                    </h4>
                                    <div className="space-y-1">
                                        {milestone.actionSteps.map((step, i) => (
                                            <div key={i} className="flex items-start space-x-2 text-sm">
                                                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400 mt-2"></span>
                                                <span className="text-white/70">{step.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resources */}
                            {milestone.resources && milestone.resources.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="flex items-center space-x-2 text-sm font-semibold text-primary-400">
                                        <FiBook className="w-3 h-3" />
                                        <span>Resources</span>
                                    </h4>
                                    <div className="space-y-1">
                                        {milestone.resources.map((resource, i) => (
                                            <div key={i} className="flex items-center space-x-2 text-sm transition-colors text-primary-400 hover:text-primary-300">
                                                <FiExternalLink className="flex-shrink-0 w-3 h-3" />
                                                <span>{resource}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end pt-3 space-x-2 border-t border-white/10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    className="flex items-center px-3 py-1.5 space-x-1 text-xs transition-all rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05]"
                                >
                                    <FiEdit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(index);
                                    }}
                                    className="flex items-center px-3 py-1.5 space-x-1 text-xs transition-all rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <FiTrash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

// =========================================
// HELPERS
// =========================================

const normalizeActionSteps = (steps: Array<string | Partial<ActionStep>> | undefined): ActionStep[] => {
    if (!steps) return [];

    return steps
        .map((step) => {
            if (typeof step === 'string') {
                return { title: step, isCompleted: false };
            }

            return {
                title: typeof step.title === 'string' ? step.title : '',
                isCompleted: Boolean(step.isCompleted),
            };
        })
        .filter((step) => step.title.trim().length > 0);
};

const buildGoalPayload = (
    plan: AIGoalPlanResponse,
    category: GoalCategory,
    title: string,
    description: string
): CreateGoalDTO => ({
    title: title || plan.title,
    description: description || plan.description,
    category,
    type: plan.type,
    targetValue: plan.targetValue || undefined,
    unit: plan.unit || undefined,
    frequency: plan.frequency || undefined,
    deadline: plan.deadline,
    milestones: plan.milestones.map((milestone) => ({
        title: milestone.title,
        weight: milestone.weight,
        deadline: milestone.deadline,
        reasoning: milestone.reasoning,
        actionSteps: normalizeActionSteps(milestone.actionSteps),
        resources: milestone.resources,
    })),
});

// =========================================
// SHARED UI
// =========================================

const ProgressSteps: React.FC<{ step: WizardStep }> = ({ step }) => {
    const currentIndex = WIZARD_STEP_KEYS.indexOf(step);

    return (
        <div className="px-6 py-3 border-b border-dark-700">
            <div className="flex items-center justify-between">
                {WIZARD_STEP_LABELS.map((label, index) => {
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
                            {index < WIZARD_STEP_LABELS.length - 1 && (
                                <div className={`w-12 sm:w-20 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-dark-600'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// =========================================
// TYPES FOR EMBEDDED VERSION
// =========================================

interface GoalWizardAIEmbeddedProps {
    onClose: () => void;
    onSwitchToManual?: () => void;
}

interface GoalWizardFlowProps extends GoalWizardAIEmbeddedProps {
    variant: 'embedded' | 'modal';
}

// =========================================
// SHARED FLOW
// =========================================

const GoalWizardAIFlow: React.FC<GoalWizardFlowProps> = ({ onClose, onSwitchToManual, variant }) => {
    const { addGoal } = useGoals();

    // Step navigation
    const [step, setStep] = useState<WizardStep>('category');
    
    // Step 1: Category
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
    
    // Step 2: Intent
    const [intentText, setIntentText] = useState('');
    const [intensity, setIntensity] = useState<Intensity>('normal');
    
    // Step 3: Blueprint
    const [plan, setPlan] = useState<AIGoalPlanResponse | null>(null);
    const [expandedMilestoneIndex, setExpandedMilestoneIndex] = useState<number | null>(0);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editable fields
    const [goalTitle, setGoalTitle] = useState('');
    const [goalDescription, setGoalDescription] = useState('');

    const contentHeightClass = variant === 'embedded' ? 'max-h-[65vh]' : 'max-h-[70vh]';

    // =========================================
    // HANDLERS
    // =========================================

    const handleCategorySelect = (category: GoalCategory) => {
        setSelectedCategory(category);
        setTimeout(() => setStep('intent'), 300);
    };

    const handleGeneratePlan = async () => {
        if (!selectedCategory || !intentText.trim()) return;

        setIsLoading(true);
        setErrorMessage(null);
        setLoadingMessageIndex(0);

        const messageInterval = setInterval(() => {
            setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        try {
            const result = await goalsService.generateAIGoalPlan(
                selectedCategory,
                intentText.trim(),
                intensity
            );

            setPlan(result);
            setGoalTitle(result.title);
            setGoalDescription(result.description);
            setStep('blueprint');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Errore nella generazione del piano');
        } finally {
            clearInterval(messageInterval);
            setIsLoading(false);
        }
    };

    const handleDeleteMilestone = useCallback((index: number) => {
        if (!plan || plan.milestones.length <= 1) return;
        
        setPlan({
            ...plan,
            milestones: plan.milestones.filter((_, i) => i !== index),
        });
        
        setExpandedMilestoneIndex((currentIndex) => {
            if (currentIndex === null) return currentIndex;
            if (currentIndex === index) return null;
            if (currentIndex > index) return currentIndex - 1;
            return currentIndex;
        });
    }, [plan]);

    const handleUpdateMilestone = useCallback((index: number, updates: Partial<AIMilestone>) => {
        if (!plan) return;

        setPlan({
            ...plan,
            milestones: plan.milestones.map((milestone, milestoneIndex) => 
                milestoneIndex === index ? { ...milestone, ...updates } : milestone
            ),
        });
    }, [plan]);

    const handleToggleMilestone = useCallback((index: number) => {
        setExpandedMilestoneIndex((currentIndex) => (currentIndex === index ? null : index));
    }, []);

    const handleToggleAllMilestones = useCallback(() => {
        setExpandedMilestoneIndex((currentIndex) => (currentIndex === null ? 0 : null));
    }, []);

    const handleAcceptChallenge = async () => {
        if (!plan || !selectedCategory) return;

        setIsSaving(true);
        setErrorMessage(null);

        try {
            const goalData = buildGoalPayload(plan, selectedCategory, goalTitle, goalDescription);

            await addGoal(goalData);
            onClose();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Errore nel salvataggio');
            setIsSaving(false);
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
                <p className="text-white/60">
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
                                border transition-all duration-200
                                ${isSelected 
                                    ? 'bg-primary-500/20 border-primary-500 shadow-lg shadow-primary-500/20' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }
                            `}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Icon className={`w-7 h-7 mb-2 ${isSelected ? 'text-primary-400' : 'text-white/60'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                {cat.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Link to Manual Mode */}
            {onSwitchToManual && (
                <div className="pt-4 text-center border-t border-white/10">
                    <button
                        onClick={onSwitchToManual}
                        className="text-sm transition-colors text-white/50 hover:text-primary-400"
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
                <p className="text-white/60">
                    Descrivi cosa vuoi raggiungere. L'AI creerà un piano strategico per te.
                </p>
            </div>

            {/* Magic Input */}
            <div className="relative">
                <textarea
                    value={intentText}
                    onChange={(e) => setIntentText(e.target.value)}
                    placeholder="Es: Voglio imparare a suonare la chitarra, partendo da zero, fino a poter suonare le mie canzoni preferite..."
                    className="w-full p-4 text-base leading-relaxed text-white transition-all duration-200 border resize-none h-28 placeholder-white/40 bg-white/5 border-white/10 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white/10"
                    maxLength={500}
                />
                <div className="absolute bottom-3 right-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded bg-black/30 ${
                        intentText.length > 450 ? 'text-orange-400' : 
                        intentText.length > 400 ? 'text-yellow-400' : 
                        'text-white/50'
                    }`}>
                        {intentText.length}/500
                    </span>
                </div>
            </div>

            {/* Intensity Cards */}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <span>⚡</span> Intensità del piano
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {INTENSITY_OPTIONS.map((option) => {
                        const isSelected = intensity === option.value;
                        
                        return (
                            <button
                                key={option.value}
                                onClick={() => setIntensity(option.value)}
                                className={`
                                    relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200
                                    ${isSelected
                                        ? 'bg-primary-500/20 border-primary-500 shadow-lg shadow-primary-500/20'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }
                                `}
                            >
                                <div className={`mb-2 text-2xl ${isSelected ? 'scale-110' : ''} transition-transform`}>
                                    {option.emoji}
                                </div>
                                <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                    {option.label}
                                </span>
                                <span className={`text-xs text-center leading-tight mt-1 ${isSelected ? 'text-white/70' : 'text-white/50'}`}>
                                    {option.description}
                                </span>
                                {isSelected && (
                                    <div className="absolute w-2 h-2 rounded-full top-2 right-2 bg-primary-400" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                >
                    {errorMessage}
                </motion.div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGeneratePlan}
                disabled={!intentText.trim() || intentText.length < 10 || isLoading}
                className="flex items-center justify-center w-full py-3 space-x-2 font-semibold text-white transition-all border-2 shadow-lg rounded-xl bg-primary-600 border-primary-500 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-primary-500/25"
            >
                <FiZap className="w-5 h-5" />
                <span>Genera Piano Strategico ✨</span>
            </button>

            {/* Link to Manual Mode */}
            {onSwitchToManual && (
                <div className="pt-2 text-center border-t border-white/10">
                    <button
                        onClick={onSwitchToManual}
                        className="text-sm transition-colors text-white/50 hover:text-primary-400"
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
                                value={goalTitle}
                                onChange={(e) => setGoalTitle(e.target.value)}
                                className="w-full pb-1 text-lg font-semibold text-white bg-transparent border-b border-dark-600 focus:outline-none focus:border-primary-500"
                                placeholder="Titolo obiettivo"
                            />
                            <textarea
                                value={goalDescription}
                                onChange={(e) => setGoalDescription(e.target.value)}
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
                                onClick={handleToggleAllMilestones}
                                className="text-xs text-primary-400 hover:text-primary-300"
                            >
                                {expandedMilestoneIndex === null ? 'Espandi tutto' : 'Comprimi tutto'}
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
                                    isExpanded={expandedMilestoneIndex === index}
                                    onToggle={handleToggleMilestone}
                                    onDelete={handleDeleteMilestone}
                                    onUpdate={handleUpdateMilestone}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Error */}
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/30"
                    >
                        {errorMessage}
                    </motion.div>
                )}

                {/* Accept Button */}
                <button
                    onClick={handleAcceptChallenge}
                    disabled={isSaving || !goalTitle.trim()}
                    className="flex items-center justify-center w-full py-4 space-x-2 font-semibold text-white transition-all bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
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
        <>
            {variant === 'modal' && (
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
            )}

            <ProgressSteps step={step} />

            {/* Back Button (floating) */}
            {variant === 'embedded' && step !== 'category' && (
                <button
                    onClick={handleBack}
                    disabled={isLoading}
                    className="absolute p-2 text-gray-400 transition-colors rounded-lg left-4 top-20 hover:text-white hover:bg-dark-700 disabled:opacity-50"
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
            )}

            {/* Content */}
            <div className={`p-6 ${contentHeightClass} overflow-y-auto`}>
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
// EMBEDDED COMPONENT (Without modal wrapper)
// =========================================

export const GoalWizardAIEmbedded: React.FC<GoalWizardAIEmbeddedProps> = ({ onClose, onSwitchToManual }) => (
    <GoalWizardAIFlow variant="embedded" onClose={onClose} onSwitchToManual={onSwitchToManual} />
);

// =========================================
// MAIN COMPONENT (With modal wrapper - standalone use)
// =========================================

export const GoalWizardAI: React.FC<GoalWizardAIProps> = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl overflow-hidden border shadow-2xl bg-dark-800 rounded-2xl border-dark-700"
        >
            <GoalWizardAIFlow variant="modal" onClose={onClose} />
        </motion.div>
    </div>
);

export default GoalWizardAI;
