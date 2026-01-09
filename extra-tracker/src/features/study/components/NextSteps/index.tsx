import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import type { Deck } from '../../services/studyService';
import { StepCard } from './StepCard';

interface NextStep {
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    priority: 'high' | 'medium' | 'low';
    icon: React.ElementType;
    color: string;
    deckId?: string;
    actionType: 'study' | 'magic-generate' | 'create-deck' | 'enrich-deck';
}

interface NextStepsProps {
    steps: NextStep[];
    decks: Deck[];
    onStudy: (deckId: string) => void;
    onFilterChange: (filter: 'due') => void;
    onMagicGenerate: (deck: Deck) => void;
    onCreateDeck: () => void;
}

export const NextSteps: React.FC<NextStepsProps> = ({
    steps,
    decks,
    onStudy,
    onFilterChange,
    onMagicGenerate,
    onCreateDeck,
}) => {
    if (steps.length === 0) return null;

    const handleStepAction = (step: NextStep) => {
        if (step.actionType === 'study' && step.deckId) {
            onFilterChange('due');
            onStudy(step.deckId);
        } else if (step.actionType === 'magic-generate' && step.deckId) {
            const deck = decks.find(d => d.id === step.deckId);
            if (deck) {
                onMagicGenerate(deck);
            }
        } else if (step.actionType === 'create-deck') {
            onCreateDeck();
        } else if (step.actionType === 'enrich-deck' && step.deckId) {
            const deck = decks.find(d => d.id === step.deckId);
            if (deck) {
                onMagicGenerate(deck);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10"
        >
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-violet-400" />
                Prossimi Passi
            </h2>
            
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <StepCard
                        key={step.id}
                        step={step}
                        index={index}
                        onAction={() => handleStepAction(step)}
                    />
                ))}
            </div>
        </motion.div>
    );
};
