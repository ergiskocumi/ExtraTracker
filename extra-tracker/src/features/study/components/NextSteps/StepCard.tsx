import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface Step {
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    priority: 'high' | 'medium' | 'low';
    icon: React.ElementType;
    color: string;
}

interface StepCardProps {
    step: Step;
    index: number;
    onAction: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({ step, index, onAction }) => {
    const StepIcon = step.icon;
    const colorClasses = {
        amber: {
            bg: 'bg-amber-500/10 border-amber-500/30',
            icon: 'text-amber-400',
            button: 'bg-amber-500 hover:bg-amber-600',
            badge: 'bg-amber-500/20 text-amber-400',
        },
        violet: {
            bg: 'bg-violet-500/10 border-violet-500/30',
            icon: 'text-violet-400',
            button: 'bg-violet-500 hover:bg-violet-600',
            badge: 'bg-violet-500/20 text-violet-400',
        },
        blue: {
            bg: 'bg-blue-500/10 border-blue-500/30',
            icon: 'text-blue-400',
            button: 'bg-blue-500 hover:bg-blue-600',
            badge: 'bg-blue-500/20 text-blue-400',
        },
    };
    const colors = colorClasses[step.color as keyof typeof colorClasses] || colorClasses.violet;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border ${colors.bg} hover:shadow-lg transition-all`}
        >
            {/* Numero passo */}
            <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colors.badge} flex items-center justify-center font-bold text-sm sm:text-base`}>
                {index + 1}
            </div>

            {/* Icona */}
            <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
                <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.icon}`} />
            </div>

            {/* Contenuto */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                        {step.title}
                    </h3>
                    {step.priority === 'high' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                            Urgente
                        </span>
                    )}
                </div>
                <p className="text-xs sm:text-sm text-white/60 mb-2">
                    {step.description}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Tempo stimato: {step.estimatedTime}</span>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onAction}
                        className={`px-4 py-2 rounded-lg sm:rounded-xl ${colors.button} text-white text-xs sm:text-sm font-medium shadow-lg transition-all touch-manipulation min-h-[36px] sm:min-h-[40px]`}
                    >
                        Inizia
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
