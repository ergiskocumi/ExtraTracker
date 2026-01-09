import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import type { Deck } from '../../services/studyService';
import { PriorityDeckCard } from './PriorityDeckCard';

interface TodayPlanProps {
    priorityDecks: Array<{
        deck: Deck;
        priority: 'high' | 'medium' | 'low';
        dueCount: number;
        totalCards: number;
    }>;
    dueCardCount: number;
    onFilterChange: (filter: 'due') => void;
    onStudy: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
}

export const TodayPlan: React.FC<TodayPlanProps> = ({
    priorityDecks,
    dueCardCount,
    onFilterChange,
    onStudy,
    onViewDetail,
}) => {
    if (priorityDecks.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 sm:mt-12 mb-6 sm:mb-8"
        >
            {/* Separator line */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6 sm:mb-8" />
            
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 sm:gap-3">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                    Oggi: Cosa Devo Studiare
                </h2>
                {dueCardCount > 0 && (
                    <button
                        onClick={() => onFilterChange('due')}
                        className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors font-medium"
                    >
                        Mostra tutto ({dueCardCount} carte)
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {priorityDecks.map(({ deck, priority, dueCount, totalCards }, index) => (
                    <PriorityDeckCard
                        key={deck.id}
                        deck={deck}
                        priority={priority}
                        dueCount={dueCount}
                        totalCards={totalCards}
                        index={index}
                        onStudy={onStudy}
                        onViewDetail={onViewDetail}
                    />
                ))}
            </div>
        </motion.div>
    );
};
