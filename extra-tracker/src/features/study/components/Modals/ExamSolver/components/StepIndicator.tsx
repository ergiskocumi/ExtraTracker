/**
 * 📍 STEP INDICATOR - Indicatore visuale degli step del processo
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Step } from '../ExamSolverModal.types';

// ============================================
// TYPES
// ============================================

export interface StepIndicatorProps {
    currentStep: Step;
}

// ============================================
// HELPER
// ============================================

const getStepNumber = (step: Step): number => {
    switch (step) {
        case 'upload': return 1;
        case 'preview': return 2;
        case 'config': return 3;
        case 'progress': return 4;
        case 'review': return 5;
        case 'completed': return 5;
        default: return 1;
    }
};

// ============================================
// COMPONENT
// ============================================

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
    const currentStepNumber = getStepNumber(currentStep);
    const steps = [
        { number: 1, label: 'Upload', key: 'upload' },
        { number: 2, label: 'Anteprima', key: 'preview' },
        { number: 3, label: 'Configura', key: 'config' },
        { number: 4, label: 'Genera', key: 'progress' },
        { number: 5, label: 'Rivedi', key: 'review' },
    ];

    return (
        <div className="px-6 py-4 border-b border-theme-default bg-theme-surface">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = step.number < currentStepNumber;
                    const isActive = step.number === currentStepNumber;

                    return (
                        <div key={step.key} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center flex-1">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: isActive ? 1.1 : 1,
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className={`
                                        relative w-8 h-8 rounded-full flex items-center justify-center
                                        transition-all duration-300
                                        ${isCompleted
                                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                            : isActive
                                            ? 'bg-amber-500/20 border-2 border-amber-500'
                                            : 'bg-theme-surface border-2 border-theme-default'
                                        }
                                    `}
                                >
                                    {isCompleted ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        >
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        </motion.div>
                                    ) : isActive ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                            className="w-3 h-3 rounded-full bg-amber-500"
                                        />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                                    )}
                                </motion.div>
                                <span
                                    className={`text-xs font-medium mt-2 whitespace-nowrap transition-colors ${
                                        isActive ? 'text-amber-600 dark:text-amber-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-theme-muted'
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-2 h-0.5 relative">
                                    <div className="absolute inset-0 rounded-full bg-[var(--border-subtle)]" />
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{
                                            scaleX: isCompleted ? 1 : 0,
                                        }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="absolute inset-0 bg-emerald-500 rounded-full origin-left"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
