/**
 * 🎯 SmartMilestoneCard - Mission Control Milestone Component
 * 
 * Card espandibile premium per visualizzare milestone AI-powered con:
 * - Progress tracking basato su Action Steps
 * - Reasoning box con insight AI
 * - Checklist interattiva
 * - Resource cards cliccabili
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiChevronDown,
    FiCheckCircle,
    FiClock,
    FiExternalLink,
    FiBook,
    FiCalendar,
    FiZap,
    FiAward,
    FiCheck,
} from 'react-icons/fi';
import { HiLightBulb } from 'react-icons/hi';
import type { Milestone } from '../types';

// =========================================
// TYPES
// =========================================

interface SmartMilestoneCardProps {
    milestone: Milestone;
    index: number;
    isCurrentMilestone: boolean;
    isDisabled: boolean;
    onToggleComplete: (id: string) => void;
    onActionStepToggle?: (milestoneId: string, stepIndex: number, completed: boolean) => void;
    isToggling?: boolean;
}

interface ActionStepState {
    [stepIndex: number]: boolean;
}

// =========================================
// HELPER FUNCTIONS
// =========================================

const formatDeadline = (deadline: string | null | undefined): string => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    return date.toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
};

const getDaysUntil = (deadline: string | null | undefined): number | null => {
    if (!deadline) return null;
    const now = new Date();
    const target = new Date(deadline);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

const getDeadlineStatus = (days: number | null): { color: string; label: string; icon: React.ReactNode } => {
    if (days === null) return { color: 'text-white/50', label: 'No deadline', icon: <FiCalendar /> };
    if (days < 0) return { color: 'text-red-400', label: `${Math.abs(days)}d overdue`, icon: <FiClock /> };
    if (days === 0) return { color: 'text-orange-400', label: 'Due today', icon: <FiZap /> };
    if (days <= 3) return { color: 'text-yellow-400', label: `${days}d left`, icon: <FiClock /> };
    if (days <= 7) return { color: 'text-blue-400', label: `${days}d left`, icon: <FiCalendar /> };
    return { color: 'text-white/60', label: `${days}d left`, icon: <FiCalendar /> };
};

// =========================================
// SUB-COMPONENTS
// =========================================

// Circular Progress Ring
const CircularProgress: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({ 
    progress, 
    size = 44, 
    strokeWidth = 4 
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500"
                />
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
            </div>
        </div>
    );
};

// Insight Box (AI Reasoning)
const InsightBox: React.FC<{ reasoning: string }> = ({ reasoning }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20"
    >
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
                <HiLightBulb className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                    Why This Matters
                </p>
                <p className="text-sm text-white/70 italic leading-relaxed">
                    "{reasoning}"
                </p>
            </div>
        </div>
    </motion.div>
);

// Action Step Checkbox
const ActionStepItem: React.FC<{
    step: string;
    isChecked: boolean;
    onToggle: () => void;
    disabled: boolean;
}> = ({ step, isChecked, onToggle, disabled }) => (
    <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`
            w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left
            ${isChecked 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
    >
        <div className={`
            flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
            ${isChecked 
                ? 'bg-green-500 border-green-500' 
                : 'border-white/30 hover:border-primary-400'
            }
        `}>
            {isChecked && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    <FiCheck className="w-3 h-3 text-white" />
                </motion.div>
            )}
        </div>
        <span className={`text-sm flex-1 ${isChecked ? 'text-white/50 line-through' : 'text-white/80'}`}>
            {step}
        </span>
    </motion.button>
);

// Resource Card
const ResourceCard: React.FC<{ resource: string }> = ({ resource }) => {
    // Detect if it's a URL
    const isUrl = resource.startsWith('http') || resource.includes('.com') || resource.includes('.org');
    const Icon = isUrl ? FiExternalLink : FiBook;
    
    const handleClick = () => {
        if (isUrl) {
            window.open(resource, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <motion.button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left group"
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm text-white/70 group-hover:text-white flex-1 truncate">
                {resource}
            </span>
            {isUrl && (
                <FiExternalLink className="w-4 h-4 text-white/30 group-hover:text-primary-400 transition-colors" />
            )}
        </motion.button>
    );
};

// =========================================
// MAIN COMPONENT
// =========================================

export const SmartMilestoneCard: React.FC<SmartMilestoneCardProps> = ({
    milestone,
    index,
    isCurrentMilestone,
    isDisabled,
    onToggleComplete,
    onActionStepToggle,
    isToggling = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(isCurrentMilestone);
    const [actionStepStates, setActionStepStates] = useState<ActionStepState>(() => {
        // Initialize all steps as unchecked unless milestone is completed
        const initial: ActionStepState = {};
        milestone.actionSteps?.forEach((_, idx) => {
            initial[idx] = milestone.isCompleted;
        });
        return initial;
    });

    // Calculate progress based on action steps
    const { completedSteps, totalSteps, progress } = useMemo(() => {
        const total = milestone.actionSteps?.length || 0;
        const completed = Object.values(actionStepStates).filter(Boolean).length;
        return {
            completedSteps: completed,
            totalSteps: total,
            progress: total > 0 ? (completed / total) * 100 : (milestone.isCompleted ? 100 : 0)
        };
    }, [actionStepStates, milestone.actionSteps, milestone.isCompleted]);

    // Deadline info
    const daysUntil = getDaysUntil(milestone.deadline);
    const deadlineStatus = getDeadlineStatus(daysUntil);

    // Handle action step toggle
    const handleActionStepToggle = (stepIndex: number) => {
        if (isDisabled) return;
        
        setActionStepStates(prev => {
            const newState = { ...prev, [stepIndex]: !prev[stepIndex] };
            
            // Check if all steps are completed
            const allCompleted = Object.values(newState).every(Boolean);
            if (allCompleted && !milestone.isCompleted && milestone.actionSteps?.length) {
                // Optionally auto-complete milestone or show prompt
                // For now, just update locally
            }
            
            // Notify parent if handler provided
            onActionStepToggle?.(milestone.id, stepIndex, newState[stepIndex]);
            
            return newState;
        });
    };

    // Handle milestone completion
    const handleComplete = () => {
        if (!isDisabled && !isToggling) {
            onToggleComplete(milestone.id);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
                rounded-2xl border overflow-hidden transition-all
                ${milestone.isCompleted 
                    ? 'bg-green-500/5 border-green-500/20' 
                    : isCurrentMilestone
                        ? 'bg-gradient-to-br from-primary-500/10 to-purple-500/5 border-primary-500/30 shadow-lg shadow-primary-500/10'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }
                ${isDisabled && !milestone.isCompleted ? 'opacity-50' : ''}
            `}
        >
            {/* Header - Always Visible */}
            <div 
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {/* Progress Ring or Checkbox */}
                    <div className="flex-shrink-0">
                        {milestone.isCompleted ? (
                            <motion.div 
                                className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <FiAward className="w-5 h-5 text-white" />
                            </motion.div>
                        ) : totalSteps > 0 ? (
                            <CircularProgress progress={progress} />
                        ) : (
                            <div className="w-11 h-11 rounded-full border-2 border-white/20 flex items-center justify-center">
                                <span className="text-lg font-bold text-white/40">{index + 1}</span>
                            </div>
                        )}
                    </div>

                    {/* Title & Meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold truncate ${
                                milestone.isCompleted ? 'text-white/60 line-through' : 'text-white'
                            }`}>
                                {milestone.title}
                            </h4>
                            {isCurrentMilestone && !milestone.isCompleted && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded-full">
                                    Current
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            {/* Deadline */}
                            <div className={`flex items-center gap-1.5 ${deadlineStatus.color}`}>
                                {deadlineStatus.icon}
                                <span>{milestone.deadline ? formatDeadline(milestone.deadline) : 'No deadline'}</span>
                            </div>
                            {/* Steps Progress */}
                            {totalSteps > 0 && (
                                <>
                                    <span className="text-white/20">•</span>
                                    <span className="text-white/50">
                                        {completedSteps}/{totalSteps} steps
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Expand/Collapse */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-2 rounded-lg bg-white/5 text-white/40"
                    >
                        <FiChevronDown className="w-5 h-5" />
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
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                            {/* AI Reasoning */}
                            {milestone.reasoning && (
                                <InsightBox reasoning={milestone.reasoning} />
                            )}

                            {/* Action Steps Checklist */}
                            {milestone.actionSteps && milestone.actionSteps.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FiCheckCircle className="w-4 h-4 text-primary-400" />
                                        <h5 className="text-sm font-semibold text-white/80">Action Plan</h5>
                                        <span className="text-xs text-white/40 ml-auto">
                                            {completedSteps}/{totalSteps} completed
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {milestone.actionSteps.map((step, idx) => (
                                            <ActionStepItem
                                                key={idx}
                                                step={step}
                                                isChecked={actionStepStates[idx] || false}
                                                onToggle={() => handleActionStepToggle(idx)}
                                                disabled={isDisabled || milestone.isCompleted}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resources */}
                            {milestone.resources && milestone.resources.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FiBook className="w-4 h-4 text-cyan-400" />
                                        <h5 className="text-sm font-semibold text-white/80">Resources & Materials</h5>
                                    </div>
                                    <div className="grid gap-2">
                                        {milestone.resources.map((resource, idx) => (
                                            <ResourceCard key={idx} resource={resource} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Complete Button */}
                            {!milestone.isCompleted && (
                                <motion.button
                                    type="button"
                                    onClick={handleComplete}
                                    disabled={isDisabled || isToggling}
                                    className={`
                                        w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all
                                        flex items-center justify-center gap-2
                                        ${progress >= 100 
                                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25' 
                                            : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                                        }
                                        ${(isDisabled || isToggling) ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                    whileHover={!isDisabled && !isToggling ? { scale: 1.01 } : {}}
                                    whileTap={!isDisabled && !isToggling ? { scale: 0.99 } : {}}
                                >
                                    {isToggling ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                            className="w-5 h-5 border-2 rounded-full border-white/50 border-t-transparent"
                                        />
                                    ) : (
                                        <>
                                            <FiCheckCircle className="w-5 h-5" />
                                            <span>{progress >= 100 ? 'Mark Complete!' : 'Mark as Complete'}</span>
                                        </>
                                    )}
                                </motion.button>
                            )}

                            {/* Completed State */}
                            {milestone.isCompleted && milestone.completedAt && (
                                <div className="flex items-center justify-center gap-2 py-3 text-green-400">
                                    <FiAward className="w-5 h-5" />
                                    <span className="text-sm font-medium">
                                        Completed on {new Date(milestone.completedAt).toLocaleDateString('it-IT', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SmartMilestoneCard;
