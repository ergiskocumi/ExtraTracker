import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type ViewType = 'exams' | 'decks';

interface ExamDeckToggleProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const ExamDeckToggle: React.FC<ExamDeckToggleProps> = ({
    currentView,
    onViewChange,
    className = '',
}) => {
    const views: { key: ViewType; icon: React.ElementType; label: string }[] = [
        { key: 'exams', icon: BookOpen, label: 'Esami' },
        { key: 'decks', icon: Layers, label: 'Mazzi' },
    ];

    return (
        <div className={`inline-flex p-1 rounded-xl bg-theme-surface border border-theme-default backdrop-blur-xl ${className}`}>
            {views.map((view) => (
                <motion.button
                    key={view.key}
                    onClick={() => onViewChange(view.key)}
                    className={`
                        relative px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        flex items-center gap-2
                        ${currentView === view.key
                            ? 'text-theme-primary'
                            : 'text-theme-muted hover:text-theme-secondary'
                        }
                    `}
                    whileTap={{ scale: 0.95 }}
                    aria-label={view.label}
                >
                    {currentView === view.key && (
                        <motion.span
                            layoutId="examDeckBubble"
                            className="absolute inset-0 bg-primary-500/20 rounded-lg"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <view.icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{view.label}</span>
                </motion.button>
            ))}
        </div>
    );
};
