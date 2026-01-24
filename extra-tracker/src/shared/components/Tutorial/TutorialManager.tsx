/**
 * 🎓 TUTORIAL MANAGER - Componente che gestisce il rendering del tutorial
 * 
 * Questo componente va inserito nell'AppLayout per gestire
 * il rendering del tutorial overlay quando attivo.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTutorial } from '../../context/TutorialContext';
import { TutorialOverlay } from './TutorialOverlay';

export const TutorialManager: React.FC = () => {
    const { state, currentConfig } = useTutorial();

    if (!state.isActive || !currentConfig || state.isPaused) {
        return null;
    }

    const currentStep = currentConfig.steps[state.currentStep];
    if (!currentStep) {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            <TutorialOverlay
                key={`${currentStep.id}-${state.currentStep}`}
                step={currentStep}
                stepIndex={state.currentStep}
                totalSteps={currentConfig.steps.length}
            />
        </AnimatePresence>
    );
};
