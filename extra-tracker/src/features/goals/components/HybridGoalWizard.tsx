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
import { FiEdit3, FiX } from 'react-icons/fi';
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
    <div className="flex items-center gap-2">
        <button
            onClick={() => onModeChange('ai')}
            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${mode === 'ai' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }
            `}
        >
            <span className="text-base">✨</span>
            <span>Magic AI</span>
        </button>
        <button
            onClick={() => onModeChange('manual')}
            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${mode === 'manual' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }
            `}
        >
            <FiEdit3 className="w-4 h-4" />
            <span>Manuale</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, rgba(30, 30, 50, 0.98) 0%, rgba(20, 20, 35, 0.98) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Header with Mode Toggle */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <h1 className="flex items-center gap-2 text-lg font-bold text-white">
                        <span className="text-xl">🎯</span>
                        Nuovo Obiettivo
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <ModeToggle mode={mode} onModeChange={setMode} />
                        <button
                            onClick={onClose}
                            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
