import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
    onCreateDeck: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onCreateDeck }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
                <p className="text-[10px] sm:text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                    Learning & Study
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    Flashcards
                </h1>
                <p className="text-white/50 mt-1 text-xs sm:text-sm md:text-base">
                    Gestisci i tuoi mazzi e migliora la memoria
                </p>
            </div>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onCreateDeck}
                className="flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold shadow-xl shadow-violet-500/30 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-[48px]"
            >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Nuovo Mazzo</span>
            </motion.button>
        </div>
    );
};
