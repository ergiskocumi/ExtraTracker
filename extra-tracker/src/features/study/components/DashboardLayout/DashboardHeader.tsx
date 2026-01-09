import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder } from 'lucide-react';

interface DashboardHeaderProps {
    onCreateDeck: () => void;
    selectedFolderName?: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onCreateDeck, selectedFolderName }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
                <p className="text-[10px] sm:text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                    Learning & Study
                </p>
                <AnimatePresence mode="wait">
                    {selectedFolderName ? (
                        <motion.h1
                            key="folder-name"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center gap-2 sm:gap-3"
                        >
                            <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                            {selectedFolderName}
                        </motion.h1>
                    ) : (
                        <motion.h1
                            key="default-title"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white"
                        >
                            Flashcards
                        </motion.h1>
                    )}
                </AnimatePresence>
                <p className="text-white/50 mt-1 text-xs sm:text-sm md:text-base">
                    {selectedFolderName ? 'Mazzi in questa cartella' : 'Gestisci i tuoi mazzi e migliora la memoria'}
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
