/**
 * DECK STATS PANEL - Pannello statistiche laterale per il mazzo
 * 
 * Mostra:
 * - Statistiche di studio dettagliate
 * - Prossime scadenze
 * - Consigli studio
 * - Quick actions secondarie
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Brain,
    TrendingUp,
    Calendar,
    Clock,
    Zap,
    Sparkles,
    AlertCircle,
    CheckCircle,
    Target,
    RotateCcw,
    Download,
    Share2,
    Settings,
} from 'lucide-react';
import type { Deck, Card } from '../../services/studyService';

// ============================================
// TYPES
// ============================================

interface DeckStatsPanelProps {
    deck: Deck;
    onResetProgress?: () => void;
    onExport?: () => void;
    onShare?: () => void;
    onSettings?: () => void;
}

interface StudyTip {
    type: 'info' | 'warning' | 'success' | 'tip';
    icon: React.ElementType;
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

// ============================================
// COMPONENT
// ============================================

export const DeckStatsPanel: React.FC<DeckStatsPanelProps> = ({
    deck,
    onResetProgress,
    onExport,
    onShare,
    onSettings,
}) => {
    const cards = deck.cards || [];
    
    // Calcola statistiche avanzate
    const stats = useMemo(() => {
        const total = cards.length;
        if (total === 0) return null;

        const newCards = cards.filter(c => c.status === 'new').length;
        const learning = cards.filter(c => c.status === 'learning').length;
        const review = cards.filter(c => c.status === 'review').length;
        const mastered = cards.filter(c => c.status === 'mastered').length;
        
        // Calcola intervalli medi
        const cardsWithInterval = cards.filter(c => c.interval > 0);
        const avgInterval = cardsWithInterval.length > 0 
            ? Math.round(cardsWithInterval.reduce((sum, c) => sum + c.interval, 0) / cardsWithInterval.length)
            : 0;

        // Calcola fattore di facilità medio
        const avgEasiness = cards.length > 0
            ? (cards.reduce((sum, c) => sum + c.easinessFactor, 0) / cards.length).toFixed(2)
            : '2.50';

        // Stima tempo di studio (media 30s per carta)
        const estimatedStudyTime = Math.round(total * 0.5); // in minuti

        return {
            total,
            newCards,
            learning,
            review,
            mastered,
            avgInterval,
            avgEasiness,
            estimatedStudyTime,
            dueCount: deck.dueCount || 0,
        };
    }, [cards, deck.dueCount]);

    // Genera consigli di studio
    const tips = useMemo<StudyTip[]>(() => {
        if (!stats) return [];

        const tipsList: StudyTip[] = [];

        // Consiglio basato su carte da ripassare
        if (stats.dueCount > 20) {
            tipsList.push({
                type: 'warning',
                icon: AlertCircle,
                title: 'Molte carte in scadenza',
                message: `Hai ${stats.dueCount} carte da ripassare. Ti consigliamo di fare una sessione ora.`,
                action: {
                    label: 'Inizia Studio',
                    onClick: () => {}, // Sarà gestito dal parent
                },
            });
        } else if (stats.dueCount > 0) {
            tipsList.push({
                type: 'tip',
                icon: Zap,
                title: 'Carte in scadenza',
                message: `Hai ${stats.dueCount} carte pronte per il ripasso.`,
            });
        }

        // Consiglio basato su nuove carte
        if (stats.newCards > stats.mastered) {
            tipsList.push({
                type: 'info',
                icon: Brain,
                title: 'Tante nuove carte',
                message: 'Stai aggiungendo più carte di quante ne stai padroneggiando. Considera di studiare più spesso.',
            });
        }

        // Consiglio di successo
        if (stats.mastered > stats.total * 0.7) {
            tipsList.push({
                type: 'success',
                icon: CheckCircle,
                title: 'Ottimo progresso!',
                message: `Hai padroneggiato il ${Math.round((stats.mastered / stats.total) * 100)}% delle carte.`,
            });
        }

        return tipsList;
    }, [stats]);

    if (!stats) {
        return (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/60 text-sm">Aggiungi carte per vedere le statistiche</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Study Tips */}
            {tips.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Consigli
                    </h3>
                    
                    {tips.map((tip, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                                p-4 rounded-xl border
                                ${tip.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : ''}
                                ${tip.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                                ${tip.type === 'info' ? 'bg-blue-500/10 border-blue-500/30' : ''}
                                ${tip.type === 'tip' ? 'bg-primary-500/10 border-primary-500/30' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`
                                    p-2 rounded-lg flex-shrink-0
                                    ${tip.type === 'warning' ? 'bg-orange-500/20' : ''}
                                    ${tip.type === 'success' ? 'bg-emerald-500/20' : ''}
                                    ${tip.type === 'info' ? 'bg-blue-500/20' : ''}
                                    ${tip.type === 'tip' ? 'bg-primary-500/20' : ''}
                                `}>
                                    <tip.icon className={`
                                        w-4 h-4
                                        ${tip.type === 'warning' ? 'text-orange-400' : ''}
                                        ${tip.type === 'success' ? 'text-emerald-400' : ''}
                                        ${tip.type === 'info' ? 'text-blue-400' : ''}
                                        ${tip.type === 'tip' ? 'text-primary-400' : ''}
                                    `} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`
                                        text-sm font-semibold mb-1
                                        ${tip.type === 'warning' ? 'text-orange-400' : ''}
                                        ${tip.type === 'success' ? 'text-emerald-400' : ''}
                                        ${tip.type === 'info' ? 'text-blue-400' : ''}
                                        ${tip.type === 'tip' ? 'text-primary-400' : ''}
                                    `}>
                                        {tip.title}
                                    </h4>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        {tip.message}
                                    </p>
                                    {tip.action && (
                                        <button
                                            onClick={tip.action.onClick}
                                            className="mt-2 text-xs font-medium text-white hover:text-primary-400 transition-colors"
                                        >
                                            {tip.action.label} →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Advanced Stats */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Statistiche Avanzate
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Intervallo medio
                        </span>
                        <span className="text-sm font-medium text-white">
                            {stats.avgInterval} giorni
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Facilità media
                        </span>
                        <span className="text-sm font-medium text-white">
                            {stats.avgEasiness}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Tempo stimato
                        </span>
                        <span className="text-sm font-medium text-white">
                            ~{stats.estimatedStudyTime} min
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">
                    Azioni
                </h3>
                
                {onSettings && (
                    <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onSettings}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
                    >
                        <Settings className="w-4 h-4 text-white/60" />
                        <span className="text-sm text-white/80">Impostazioni mazzo</span>
                    </motion.button>
                )}
                
                {onExport && (
                    <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onExport}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
                    >
                        <Download className="w-4 h-4 text-white/60" />
                        <span className="text-sm text-white/80">Esporta carte</span>
                    </motion.button>
                )}
                
                {onShare && (
                    <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onShare}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left"
                    >
                        <Share2 className="w-4 h-4 text-white/60" />
                        <span className="text-sm text-white/80">Condividi mazzo</span>
                    </motion.button>
                )}
                
                {onResetProgress && (
                    <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onResetProgress}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
                    >
                        <RotateCcw className="w-4 h-4 text-white/60 group-hover:text-orange-400 transition-colors" />
                        <span className="text-sm text-white/80 group-hover:text-orange-400 transition-colors">Reset progresso</span>
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default DeckStatsPanel;
