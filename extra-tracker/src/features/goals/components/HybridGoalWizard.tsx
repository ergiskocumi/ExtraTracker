/**
 * 🔀 Hybrid Goal Wizard - The Orchestrator
 * =========================================
 * 
 * Componente che gestisce il "bivio" tra le due modalità di creazione obiettivi:
 * - ✨ Magic AI (Default): Wizard intent-based con AI
 * - 📝 Manuale: Wizard tradizionale a step
 * 
 * L'utente può passare fluidamente da una modalità all'altra.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiEdit3, FiX } from 'react-icons/fi';
import { GoalWizardAIEmbedded } from '../GoalWizardAI';
import { ManualWizardContent } from './ManualWizardContent';

// =========================================
// TYPES
// =========================================

interface HybridGoalWizardProps {
    onClose: () => void;
}

type WizardMode = 'ai' | 'manual';

// =========================================
// MODE TOGGLE COMPONENT
// =========================================

interface ModeToggleProps {
    mode: WizardMode;
    onModeChange: (mode: WizardMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => (
    <div className="flex items-center p-1 rounded-xl bg-dark-700/80 border border-dark-600">
        <button
            onClick={() => onModeChange('ai')}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${mode === 'ai' 
                    ? 'bg-gradient-to-r from-primary-500/20 to-purple-500/20 text-primary-400 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                }
            `}
        >
            <FiZap className={`w-4 h-4 ${mode === 'ai' ? 'text-primary-400' : ''}`} />
            <span>✨ Magic AI</span>
        </button>
        <button
            onClick={() => onModeChange('manual')}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${mode === 'manual' 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-300'
                }
            `}
        >
            <FiEdit3 className={`w-4 h-4 ${mode === 'manual' ? 'text-white' : ''}`} />
            <span>📝 Manuale</span>
        </button>
    </div>
);

// =========================================
// MAIN COMPONENT
// =========================================

export const HybridGoalWizard: React.FC<HybridGoalWizardProps> = ({ onClose }) => {
    const [mode, setMode] = useState<WizardMode>('ai');

    const handleSwitchToManual = () => setMode('manual');
    const handleSwitchToAI = () => setMode('ai');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden"
            >
                {/* Header with Mode Toggle */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                    <h1 className="text-lg font-semibold text-white">
                        {mode === 'ai' ? '🧞 Nuovo Obiettivo' : '📝 Nuovo Obiettivo'}
                    </h1>
                    
                    <div className="flex items-center gap-3">
                        <ModeToggle mode={mode} onModeChange={setMode} />
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content - Conditional Rendering */}
                <AnimatePresence mode="wait">
                    {mode === 'ai' ? (
                        <motion.div
                            key="ai-wizard"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <GoalWizardAIEmbedded 
                                onClose={onClose} 
                                onSwitchToManual={handleSwitchToManual}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="manual-wizard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ManualWizardContent 
                                onClose={onClose}
                                onSwitchToAI={handleSwitchToAI}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default HybridGoalWizard;
