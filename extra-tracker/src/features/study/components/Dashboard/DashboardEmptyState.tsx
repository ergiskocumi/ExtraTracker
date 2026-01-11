import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface DashboardEmptyStateProps {
    onCreateDeck: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({ onCreateDeck }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
    >
        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 flex items-center justify-center mb-6"
        >
            <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 text-violet-400" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Crea il tuo primo mazzo
        </h2>
        <p className="text-white/60 text-sm sm:text-base mb-6 sm:mb-8 max-w-md">
            Inizia organizzando il tuo materiale di studio. Crea mazzi di flashcard per memorizzare meglio le informazioni importanti.
        </p>
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateDeck}
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold shadow-xl shadow-violet-500/30 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-[48px]"
        >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
            Crea il primo mazzo
        </motion.button>
    </motion.div>
);
