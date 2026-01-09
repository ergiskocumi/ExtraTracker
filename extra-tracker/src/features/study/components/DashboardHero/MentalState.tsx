import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock } from 'lucide-react';

export interface MentalState {
    percentage: number;
    state: 'fresco' | 'attivo' | 'stanco' | 'esaurito';
    message: string;
    color: 'emerald' | 'blue' | 'amber' | 'rose';
    suggestion: string;
}

interface MentalStateProps {
    mentalState: MentalState;
}

export const MentalStateIndicator: React.FC<MentalStateProps> = ({ mentalState }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                    Stato Mentale
                </h3>
                <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-full ${
                    mentalState.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                    mentalState.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                    mentalState.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                }`}>
                    {mentalState.percentage}%
                </span>
            </div>
            
            {/* Barra di progresso */}
            <div className="mb-3">
                <div className="h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${mentalState.percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                            mentalState.color === 'emerald' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                            mentalState.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                            mentalState.color === 'amber' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                            'bg-gradient-to-r from-rose-400 to-rose-500'
                        }`}
                    />
                </div>
            </div>
            
            {/* Messaggio e suggerimento */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`text-sm sm:text-base font-medium ${
                        mentalState.color === 'emerald' ? 'text-emerald-300' :
                        mentalState.color === 'blue' ? 'text-blue-300' :
                        mentalState.color === 'amber' ? 'text-amber-300' :
                        'text-rose-300'
                    }`}>
                        {mentalState.message}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{mentalState.suggestion}</span>
                </div>
            </div>
        </motion.div>
    );
};
