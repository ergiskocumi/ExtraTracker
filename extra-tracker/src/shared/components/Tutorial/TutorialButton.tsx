/**
 * 🎓 TUTORIAL BUTTON - Pulsante per avviare manualmente un tutorial
 * 
 * Componente opzionale che può essere aggiunto in qualsiasi pagina
 * per permettere all'utente di riavviare un tutorial.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Sparkles } from 'lucide-react';
import { useTutorial } from '../../context/TutorialContext';

interface TutorialButtonProps {
    tutorialId: string;
    label?: string;
    variant?: 'default' | 'floating' | 'minimal';
    className?: string;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({
    tutorialId,
    label = 'Inizia Tour',
    variant = 'default',
    className = '',
}) => {
    const { startTutorial, isTutorialCompleted: _isTutorialCompleted, state } = useTutorial();
    const isActive = state.currentTutorial === tutorialId;

    const handleClick = () => {
        if (!isActive) {
            startTutorial(tutorialId);
        }
    };

    if (variant === 'floating') {
        return (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClick}
                disabled={isActive}
                className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-violet-600 hover:from-primary-600 hover:to-violet-700 text-white font-medium shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <Sparkles className="w-5 h-5" />
                <span>{label}</span>
            </motion.button>
        );
    }

    if (variant === 'minimal') {
        return (
            <button
                onClick={handleClick}
                disabled={isActive}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <PlayCircle className="w-4 h-4" />
                <span>{label}</span>
            </button>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            disabled={isActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-violet-600 hover:from-primary-600 hover:to-violet-700 text-white font-medium shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <Sparkles className="w-5 h-5" />
            <span>{label}</span>
        </motion.button>
    );
};
