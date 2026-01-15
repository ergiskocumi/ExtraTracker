import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Upload, Lightbulb } from 'lucide-react';

interface DashboardEmptyStateProps {
    onCreateDeck: () => void;
    onMagicGenerate?: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({ 
    onCreateDeck,
    onMagicGenerate,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center"
    >
        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 flex items-center justify-center mb-6"
        >
            <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 text-primary-400" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Crea il tuo primo mazzo
        </h2>
        <p className="text-white/60 text-sm sm:text-base mb-8 sm:mb-10 max-w-md">
            Inizia organizzando il tuo materiale di studio. Crea mazzi di flashcard per memorizzare meglio le informazioni importanti.
        </p>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-md">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCreateDeck}
                className="flex-1 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl 
                           bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold 
                           shadow-xl shadow-primary-500/30 text-sm sm:text-base 
                           touch-manipulation min-h-[44px] sm:min-h-[48px]
                           flex items-center justify-center gap-2"
            >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Crea mazzo</span>
            </motion.button>

            {onMagicGenerate && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onMagicGenerate}
                    className="flex-1 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl 
                               bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold 
                               shadow-xl shadow-amber-500/30 text-sm sm:text-base 
                               touch-manipulation min-h-[44px] sm:min-h-[48px]
                               flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Magic AI</span>
                </motion.button>
            )}
        </div>

        {/* Tips */}
        <div className="mt-10 sm:mt-12 w-full max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                    <BookOpen className="w-6 h-6 text-primary-400 mb-2 mx-auto" />
                    <h3 className="text-sm font-semibold text-white mb-1">Crea manualmente</h3>
                    <p className="text-xs text-white/50">
                        Aggiungi carte una per una per un controllo totale
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                    <Upload className="w-6 h-6 text-amber-400 mb-2 mx-auto" />
                    <h3 className="text-sm font-semibold text-white mb-1">Carica PDF</h3>
                    <p className="text-xs text-white/50">
                        Silvi AI genera automaticamente le flashcard
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                    <Lightbulb className="w-6 h-6 text-blue-400 mb-2 mx-auto" />
                    <h3 className="text-sm font-semibold text-white mb-1">Organizza</h3>
                    <p className="text-xs text-white/50">
                        Usa cartelle e tag per organizzare i tuoi mazzi
                    </p>
                </motion.div>
            </div>
        </div>
    </motion.div>
);
