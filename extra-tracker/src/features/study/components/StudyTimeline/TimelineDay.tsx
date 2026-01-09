import React from 'react';
import { motion } from 'framer-motion';

interface TimelineDayProps {
    day: {
        dayName: string;
        date: Date;
        dueCards: number;
        newCards: number;
        completedCards: number;
        isToday: boolean;
    };
    index: number;
}

export const TimelineDay: React.FC<TimelineDayProps> = ({ day, index }) => {
    const totalCards = day.dueCards + day.newCards + day.completedCards;

    return (
        <div 
            className="flex flex-col items-center relative"
            style={{ width: `${100 / 7}%` }}
        >
            {/* Stack di cerchi per mostrare le diverse categorie */}
            <div className="relative">
                {day.dueCards > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="absolute -top-1/2 left-1/2 transform -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-400"
                        style={{ zIndex: 3 }}
                    >
                        <span className="text-xs font-bold text-white">{day.dueCards}</span>
                    </motion.div>
                )}
                {day.newCards > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.05 }}
                        className={`absolute -top-1/2 left-1/2 transform -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30 border-2 border-violet-400 ${day.dueCards > 0 ? '-mt-2' : ''}`}
                        style={{ zIndex: 2 }}
                    >
                        <span className="text-xs font-bold text-white">{day.newCards}</span>
                    </motion.div>
                )}
                {day.completedCards > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.1 }}
                        className={`absolute -top-1/2 left-1/2 transform -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-400 ${day.dueCards > 0 || day.newCards > 0 ? '-mt-4' : ''}`}
                        style={{ zIndex: 1 }}
                    >
                        <span className="text-xs font-bold text-white">{day.completedCards}</span>
                    </motion.div>
                )}
                {totalCards === 0 && (
                    <div className="absolute -top-1/2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-white/10 border border-white/20" />
                )}
            </div>
            
            {/* Indicatore giorno corrente */}
            {day.isToday && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-violet-400 rounded-full" />
            )}
        </div>
    );
};
