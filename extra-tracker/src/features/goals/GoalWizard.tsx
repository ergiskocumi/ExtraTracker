import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from '../../context/GoalsContext';
import { GOAL_CATEGORIES } from './types';
import type { GoalCategory, GoalType, CreateGoalDTO } from './types';
import {
    FiX,
    FiArrowRight,
    FiArrowLeft,
    FiCheck,
    FiDollarSign,
    FiHeart,
    FiBook,
    FiBriefcase,
    FiUser,
    FiTarget,
    FiRefreshCw,
    FiCalendar
} from 'react-icons/fi';

interface GoalWizardProps {
    onClose: () => void;
}

type WizardStep = 'category' | 'type' | 'details' | 'confirm';

export const GoalWizard = ({ onClose }: GoalWizardProps) => {
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

    // Category icons
    const getCategoryIcon = (cat: string): React.ReactElement => {
        const icons: Record<string, React.ReactElement> = {
            finance: <FiDollarSign className="w-8 h-8" />,
            health: <FiHeart className="w-8 h-8" />,
            learning: <FiBook className="w-8 h-8" />,
            career: <FiBriefcase className="w-8 h-8" />,
            personal: <FiUser className="w-8 h-8" />,
        };
        return icons[cat] || <FiTarget className="w-8 h-8" />;
    };

    // Templates per categoria
    const getTemplates = (cat: GoalCategory) => {
        const templates: Record<GoalCategory, Array<{title: string; type: GoalType; target?: number; unit?: string}>> = {
            finance: [
                { title: 'Save for vacation', type: 'target', target: 5000, unit: '€' },
                { title: 'Build emergency fund', type: 'target', target: 10000, unit: '€' },
                { title: 'Investment portfolio', type: 'target', target: 20000, unit: '€' },
            ],
            health: [
                { title: 'Daily workout', type: 'habit' },
                { title: 'Lose weight', type: 'target', target: 10, unit: 'kg' },
                { title: 'Run distance', type: 'target', target: 100, unit: 'km' },
            ],
            learning: [
                { title: 'Read books', type: 'target', target: 12, unit: 'books' },
                { title: 'Daily study', type: 'habit' },
                { title: 'Complete course', type: 'target', target: 100, unit: '%' },
            ],
            career: [
                { title: 'Get certification', type: 'target', target: 100, unit: '%' },
                { title: 'Daily skill practice', type: 'habit' },
                { title: 'Network connections', type: 'target', target: 50, unit: 'contacts' },
            ],
            personal: [
                { title: 'Daily meditation', type: 'habit' },
                { title: 'Learn new skill', type: 'target', target: 100, unit: 'hours' },
                { title: 'Hobby project', type: 'target', target: 100, unit: '%' },
            ],
        };
        return templates[cat] || [];
    };

    // Submit
    const handleSubmit = async () => {
        if (!category || !type) return;

        const goalData: CreateGoalDTO = {
            title,
            category,
            type,
            deadline,
            description: description || undefined,
            ...(type === 'target' && {
                targetValue: Number(targetValue),
                unit: unit || undefined,
            }),
            ...(type === 'habit' && {
                frequency: Number(frequency),
            }),
        };

        setIsSubmitting(true);
        try {
            await addGoal(goalData);
            onClose();
        } catch (error) {
            alert('Error creating goal');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Navigation
    const goNext = () => {
        if (step === 'category' && category) setStep('type');
        else if (step === 'type' && type) setStep('details');
        else if (step === 'details' && title) setStep('confirm');
    };

    const goBack = () => {
        if (step === 'type') setStep('category');
        else if (step === 'details') setStep('type');
        else if (step === 'confirm') setStep('details');
    };

    const applyTemplate = (template: any) => {
        setTitle(template.title);
        setType(template.type);
        if (template.target) setTargetValue(String(template.target));
        if (template.unit) setUnit(template.unit);
        if (template.type === 'target') {
            setStep('details');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white/[0.1] to-white/[0.05] backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Create New Goal</h2>
                            <p className="text-sm text-white/60 mt-1">
                                {step === 'category' && 'Choose a category for your goal'}
                                {step === 'type' && 'Select the type of goal'}
                                {step === 'details' && 'Fill in the details'}
                                {step === 'confirm' && 'Review and confirm'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <FiX className="w-6 h-6 text-white/60" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mt-6">
                        {['category', 'type', 'details', 'confirm'].map((s, idx) => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`flex-1 h-1 rounded-full transition-all ${
                                    ['category', 'type', 'details', 'confirm'].indexOf(step) >= idx
                                        ? 'bg-primary-500'
                                        : 'bg-white/10'
                                }`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: Category */}
                        {step === 'category' && (
                            <motion.div
                                key="category"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(GOAL_CATEGORIES).map(([key, data]) => (
                                        <motion.button
                                            key={key}
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setCategory(key as GoalCategory);
                                                setTimeout(goNext, 300);
                                            }}
                                            className={`p-6 rounded-2xl border-2 transition-all text-left ${
                                                category === key
                                                    ? 'border-primary-500 bg-primary-500/10'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${data.color} bg-white/5`}>
                                                    {getCategoryIcon(key)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-1">
                                                        {data.label}
                                                    </h3>
                                                    <p className="text-sm text-white/60">
                                                        {key === 'finance' && 'Savings, investments, and financial goals'}
                                                        {key === 'health' && 'Fitness, wellness, and health targets'}
                                                        {key === 'learning' && 'Education, skills, and knowledge'}
                                                        {key === 'career' && 'Professional growth and development'}
                                                        {key === 'personal' && 'Personal development and hobbies'}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Type */}
                        {step === 'type' && category && (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setType('target')}
                                        className={`p-6 rounded-2xl border-2 transition-all text-left ${
                                            type === 'target'
                                                ? 'border-primary-500 bg-primary-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                                <FiTarget className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white mb-1">
                                                    Target Goal
                                                </h3>
                                                <p className="text-sm text-white/60">
                                                    Reach a specific measurable target value
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setType('habit')}
                                        className={`p-6 rounded-2xl border-2 transition-all text-left ${
                                            type === 'habit'
                                                ? 'border-primary-500 bg-primary-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                                                <FiRefreshCw className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white mb-1">
                                                    Habit Goal
                                                </h3>
                                                <p className="text-sm text-white/60">
                                                    Build consistency with recurring activities
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>
                                </div>

                                {/* Quick Templates */}
                                {type && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="overflow-hidden"
                                    >
                                        <h4 className="text-sm font-medium text-white/80 mb-3">Quick Start Templates</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {getTemplates(category)
                                                .filter(t => t.type === type)
                                                .map((template, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => applyTemplate(template)}
                                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary-500/50 hover:bg-white/10 transition-all text-left"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-white font-medium">{template.title}</span>
                                                            <FiArrowRight className="w-4 h-4 text-white/40" />
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 3: Details */}
                        {step === 'details' && type && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Goal Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="e.g., Save $5000 for vacation"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                        rows={3}
                                        placeholder="Add more details about your goal..."
                                    />
                                </div>

                                {type === 'target' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">
                                                Target Value <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={targetValue}
                                                onChange={(e) => setTargetValue(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                                placeholder="1000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">
                                                Unit
                                            </label>
                                            <input
                                                type="text"
                                                value={unit}
                                                onChange={(e) => setUnit(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                                placeholder="€, kg, hours..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {type === 'habit' && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Target Frequency (times per day)
                                        </label>
                                        <input
                                            type="number"
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder="1"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Deadline <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                                        <input
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: Confirm */}
                        {step === 'confirm' && (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-lg font-bold text-white mb-4">Review Your Goal</h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-white/5">
                                                {category && getCategoryIcon(category)}
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60">Category</p>
                                                <p className="text-white font-medium">
                                                    {category && GOAL_CATEGORIES[category].label}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm text-white/60 mb-1">Title</p>
                                            <p className="text-lg text-white font-semibold">{title}</p>
                                        </div>

                                        {description && (
                                            <div>
                                                <p className="text-sm text-white/60 mb-1">Description</p>
                                                <p className="text-white">{description}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-white/60 mb-1">Type</p>
                                                <p className="text-white font-medium capitalize">{type}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60 mb-1">Deadline</p>
                                                <p className="text-white font-medium">
                                                    {new Date(deadline).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric' 
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        {type === 'target' && targetValue && (
                                            <div>
                                                <p className="text-sm text-white/60 mb-1">Target</p>
                                                <p className="text-white font-medium">
                                                    {targetValue} {unit}
                                                </p>
                                            </div>
                                        )}

                                        {type === 'habit' && (
                                            <div>
                                                <p className="text-sm text-white/60 mb-1">Frequency</p>
                                                <p className="text-white font-medium">{frequency}x per day</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white/5 backdrop-blur-xl border-t border-white/10 px-8 py-6">
                    <div className="flex items-center justify-between">
                        {step !== 'category' ? (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={goBack}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
                            >
                                <FiArrowLeft className="w-5 h-5" />
                                Back
                            </motion.button>
                        ) : (
                            <div />
                        )}

                        {step === 'confirm' ? (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : (
                                    <>
                                        <FiCheck className="w-5 h-5" />
                                        Create Goal
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={goNext}
                                disabled={
                                    (step === 'category' && !category) ||
                                    (step === 'type' && !type) ||
                                    (step === 'details' && !title)
                                }
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                                <FiArrowRight className="w-5 h-5" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
