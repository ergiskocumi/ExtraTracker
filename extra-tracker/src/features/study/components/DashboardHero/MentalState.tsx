import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Moon, Activity, Target, Sparkles, TrendingUp } from 'lucide-react';

export type MentalState = 'fresco' | 'attivo' | 'stanco' | 'esaurito';

export interface MentalStateData {
    percentage: number;
    state: MentalState;
    message: string;
    color: 'emerald' | 'blue' | 'amber' | 'rose';
    suggestion: string;
    studyHours?: number;
}

export const MentalStateIndicator: React.FC<{ mentalState: MentalStateData }> = ({ mentalState }) => {
    // Messaggi motivanti per ogni stato
    const motivationalMessages = {
        fresco: [
            '✨ Sei al top! Questo è il momento perfetto per imparare',
            '🚀 Energia al massimo! Sfrutta questo momento d\'oro',
            '💪 Pronto per conquistare nuove conoscenze!',
            '🌟 Il tuo cervello è una macchina perfetta, mettila in moto!',
            '🎯 Concentrazione al 100% - è il momento di brillare!'
        ],
        attivo: [
            '⚡ Buon ritmo! Continua così e vedrai i risultati',
            '🔥 Stai andando forte! Mantieni questa energia',
            '📈 La costanza è la chiave del successo',
            '💎 Ogni sessione ti avvicina ai tuoi obiettivi',
            '🎓 Stai costruendo la tua conoscenza, passo dopo passo'
        ],
        stanco: [
            '🌙 Hai fatto tanto! Una pausa ti farà bene',
            '☕ Prenditi un momento per ricaricare le energie',
            '🧘 Il riposo è parte dell\'apprendimento',
            '💤 Una pausa ora ti renderà più produttivo dopo',
            '🌿 Ascolta il tuo corpo, meriti una pausa'
        ],
        esaurito: [
            '🛌 Hai dato il massimo! Ora è tempo di riposare',
            '🌅 Il riposo è essenziale per apprendere meglio',
            '💙 Prenditi cura di te, domani sarà un nuovo giorno',
            '🌸 Il recupero è parte del processo di crescita',
            '🌟 Domani tornerai più forte e concentrato'
        ]
    };

    // Seleziona un messaggio motivante casuale basato sullo stato
    const getMotivationalMessage = () => {
        const messages = motivationalMessages[mentalState.state] || [];
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex] || mentalState.suggestion;
    };

    const mentalStates = {
        fresco: {
            label: 'Fresco',
            icon: Brain,
            emoji: '✨',
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/30',
            iconClass: 'text-emerald-400',
            gradientFrom: 'from-emerald-500',
            gradientTo: 'to-teal-500',
            glowClass: 'bg-emerald-500/20',
            glowHoverClass: 'bg-emerald-500/30',
            glowSmallClass: 'bg-emerald-400/10',
            glowSmallHoverClass: 'bg-emerald-400/20',
            borderGlowClass: 'border-emerald-500/30',
            shadowClass: 'hover:shadow-emerald-500/20',
            accentClass: 'via-emerald-500',
            description: mentalState.message || 'Stato mentale perfetto per l\'apprendimento'
        },
        attivo: {
            label: 'Attivo',
            icon: Target,
            emoji: '⚡',
            color: 'blue',
            bgClass: 'bg-blue-500/10 border-blue-500/30',
            iconClass: 'text-blue-400',
            gradientFrom: 'from-blue-500',
            gradientTo: 'to-cyan-500',
            glowClass: 'bg-blue-500/20',
            glowHoverClass: 'bg-blue-500/30',
            glowSmallClass: 'bg-blue-400/10',
            glowSmallHoverClass: 'bg-blue-400/20',
            borderGlowClass: 'border-blue-500/30',
            shadowClass: 'hover:shadow-blue-500/20',
            accentClass: 'via-blue-500',
            description: mentalState.message || 'Buona concentrazione, ottimo per sessioni intense'
        },
        stanco: {
            label: 'Stanco',
            icon: Moon,
            emoji: '🌙',
            color: 'amber',
            bgClass: 'bg-amber-500/10 border-amber-500/30',
            iconClass: 'text-amber-400',
            gradientFrom: 'from-amber-500',
            gradientTo: 'to-orange-500',
            glowClass: 'bg-amber-500/20',
            glowHoverClass: 'bg-amber-500/30',
            glowSmallClass: 'bg-amber-400/10',
            glowSmallHoverClass: 'bg-amber-400/20',
            borderGlowClass: 'border-amber-500/30',
            shadowClass: 'hover:shadow-amber-500/20',
            accentClass: 'via-amber-500',
            description: mentalState.message || 'Considera una sessione più leggera'
        },
        esaurito: {
            label: 'Esaurito',
            icon: Activity,
            emoji: '🛌',
            color: 'rose',
            bgClass: 'bg-rose-500/10 border-rose-500/30',
            iconClass: 'text-rose-400',
            gradientFrom: 'from-rose-500',
            gradientTo: 'to-red-500',
            glowClass: 'bg-rose-500/20',
            glowHoverClass: 'bg-rose-500/30',
            glowSmallClass: 'bg-rose-400/10',
            glowSmallHoverClass: 'bg-rose-400/20',
            borderGlowClass: 'border-rose-500/30',
            shadowClass: 'hover:shadow-rose-500/20',
            accentClass: 'via-rose-500',
            description: mentalState.message || 'Hai bisogno di riposo'
        }
    };

    const state = mentalStates[mentalState.state];
    
    if (!state) {
        // Fallback se lo stato non è valido
        return null;
    }
    
    const Icon = state.icon;
    const motivationalMessage = getMotivationalMessage();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`
                relative overflow-hidden
                p-5 sm:p-6 rounded-xl sm:rounded-2xl border
                ${state.bgClass}
                transition-all duration-300
                w-full
            `}
        >
            {/* Simple gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${state.gradientFrom}/5 ${state.gradientTo}/5 opacity-50`} />
            
            <div className="relative z-10 space-y-4">
                {/* Top: Icon + State + Progress */}
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Icon + State */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 sm:p-3 rounded-lg ${state.bgClass.replace('border', 'bg').replace('/10', '/15')} flex-shrink-0`}>
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${state.iconClass}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-lg sm:text-xl">{state.emoji}</span>
                                <div className={`text-lg sm:text-xl font-bold ${state.iconClass} truncate`}>
                                    {state.label}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`text-xs sm:text-sm font-semibold ${state.iconClass}`}>
                                    {mentalState.percentage}%
                                </div>
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${mentalState.percentage}%` }}
                                        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                                        className={`h-full bg-gradient-to-r ${state.gradientFrom} ${state.gradientTo} rounded-full`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Study hours */}
                    {mentalState.studyHours !== undefined && mentalState.studyHours > 0 && (
                        <div className={`px-2.5 py-1.5 rounded-lg ${state.bgClass.replace('border', 'bg').replace('/10', '/15')} border ${state.borderGlowClass} flex-shrink-0`}>
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className={`w-3 h-3 ${state.iconClass}`} />
                                <span className={`text-xs font-bold ${state.iconClass}`}>
                                    {mentalState.studyHours}h
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom: Motivational Message */}
                <div className={`flex items-start gap-2.5 pt-3 border-t ${state.borderGlowClass}`}>
                    <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${state.iconClass} flex-shrink-0 mt-0.5`} />
                    <div className={`text-sm sm:text-base font-medium ${state.iconClass} leading-relaxed`}>
                        {motivationalMessage}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
