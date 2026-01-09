import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Moon, Activity, Target } from 'lucide-react';

export type MentalState = 'fresco' | 'attivo' | 'stanco' | 'esaurito';

export interface MentalStateData {
    percentage: number;
    state: MentalState;
    message: string;
    color: 'emerald' | 'blue' | 'amber' | 'rose';
    suggestion: string;
}

export const MentalStateIndicator: React.FC<{ mentalState: MentalStateData }> = ({ mentalState }) => {
    const mentalStates = {
        fresco: {
            label: 'Fresco',
            icon: Brain,
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            iconClass: 'text-emerald-400',
            description: mentalState.message || 'Stato mentale perfetto per l\'apprendimento'
        },
        attivo: {
            label: 'Attivo',
            icon: Target,
            color: 'blue',
            bgClass: 'bg-blue-500/10 border-blue-500/20',
            iconClass: 'text-blue-400',
            description: mentalState.message || 'Buona concentrazione, ottimo per sessioni intense'
        },
        stanco: {
            label: 'Stanco',
            icon: Moon,
            color: 'amber',
            bgClass: 'bg-amber-500/10 border-amber-500/20',
            iconClass: 'text-amber-400',
            description: mentalState.message || 'Considera una sessione più leggera'
        },
        esaurito: {
            label: 'Esaurito',
            icon: Activity,
            color: 'rose',
            bgClass: 'bg-rose-500/10 border-rose-500/20',
            iconClass: 'text-rose-400',
            description: mentalState.message || 'Hai bisogno di riposo'
        }
    };

    const state = mentalStates[mentalState.state];
    
    if (!state) {
        // Fallback se lo stato non è valido
        return null;
    }
    
    const Icon = state.icon;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`
                relative overflow-hidden group
                p-4 rounded-2xl border backdrop-blur-sm
                ${state.bgClass}
                hover:shadow-lg hover:shadow-black/10
                transition-all duration-300 ease-out
                min-h-[80px]
                w-full max-w-sm mx-auto
            `}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${state.bgClass.replace('border', '').replace('bg-', 'from-').replace('/10', '/5')} opacity-50`} />
            </div>

            <div className="relative z-10 text-center">
                <div className="flex items-center justify-center mb-2">
                    <Icon className={`w-5 h-5 ${state.iconClass} drop-shadow-sm`} />
                </div>
                
                <div className={`text-lg font-bold ${state.iconClass} mb-1`}>
                    {state.label}
                </div>
                
                <div className="text-xs text-white/70 font-medium tracking-wide">
                    {state.description}
                </div>
            </div>

            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${state.iconClass.replace('text-', 'text-')}`} />
        </motion.div>
    );
};
