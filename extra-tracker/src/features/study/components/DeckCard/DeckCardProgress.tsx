import React from 'react';
import { motion } from 'framer-motion';

interface DeckCardProgressProps {
    masteryPercent: number;
}

export const DeckCardProgress: React.FC<DeckCardProgressProps> = ({ masteryPercent }) => {
    return (
        <div className="mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2 text-xs sm:text-sm">
                <span className="text-theme-muted">Padronanza</span>
                <span className={`font-bold ${
                    masteryPercent === 100 ? 'text-emerald-400' : 'text-theme-secondary'
                }`}>
                    {masteryPercent}%
                </span>
            </div>
            <div className="h-1.5 sm:h-2 bg-theme-surface rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${masteryPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                        masteryPercent === 100 
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                            : 'bg-gradient-to-r from-violet-400 to-violet-500'
                    }`}
                />
            </div>
        </div>
    );
};
