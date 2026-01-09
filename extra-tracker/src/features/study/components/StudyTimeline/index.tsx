import React from 'react';
import { motion } from 'framer-motion';
import { BarChart2 } from 'lucide-react';
import { TimelineDay } from './TimelineDay';

interface WeeklyDay {
    dayName: string;
    date: Date;
    dueCards: number;
    newCards: number;
    completedCards: number;
    isToday: boolean;
}

interface StudyTimelineProps {
    weeklyPlan: WeeklyDay[];
    onFilterChange: (filter: 'due') => void;
}

export const StudyTimeline: React.FC<StudyTimelineProps> = ({
    weeklyPlan,
    onFilterChange,
}) => {
    if (weeklyPlan.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
        >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-violet-400" />
                    Piano di Studio
                </h2>
                <button 
                    onClick={() => onFilterChange('due')}
                    className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors"
                >
                    Modifica piano
                </button>
            </div>
            
            <div className="relative h-40 sm:h-48 bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                {/* Timeline background */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-white/10 rounded-full" />
                
                {/* Giorni della settimana */}
                <div className="flex justify-between text-xs text-white/50 px-4 mb-2">
                    {weeklyPlan.map((day, index) => (
                        <span 
                            key={index}
                            className={`text-center ${day.isToday ? 'text-violet-400 font-bold' : ''}`}
                        >
                            {day.dayName}
                        </span>
                    ))}
                </div>
                
                {/* Eventi sulla timeline */}
                <div className="absolute top-1/2 left-4 right-4 transform -translate-y-1/2 flex justify-between">
                    {weeklyPlan.map((day, index) => (
                        <TimelineDay key={index} day={day} index={index} />
                    ))}
                </div>
                
                {/* Indicatori legenda */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center sm:justify-between gap-3 sm:gap-4 text-xs">
                    <div className="text-amber-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Da ripassare</span>
                    </div>
                    <div className="text-violet-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <span>Nuove carte</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Completate</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
