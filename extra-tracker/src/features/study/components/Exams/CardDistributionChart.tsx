/**
 * CARD DISTRIBUTION CHART - Grafico distribuzione carte per stato
 * 
 * Mostra:
 * - Barra segmentata con colori diversi per ogni stato
 * - Legenda con conteggi
 * - Percentuali
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Sparkles,
    BookOpen,
    GraduationCap,
    Trophy,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface CardDistribution {
    new: number;
    learning: number;
    review: number;
    mastered: number;
}

interface CardDistributionChartProps {
    distribution: CardDistribution;
    totalCards: number;
    className?: string;
}

interface StatusSegment {
    key: keyof CardDistribution;
    label: string;
    count: number;
    percent: number;
    color: string;
    bgColor: string;
    bgLight: string;
    borderColor: string;
    icon: React.ElementType;
    description: string;
}

// ============================================
// COMPONENT
// ============================================

export const CardDistributionChart: React.FC<CardDistributionChartProps> = ({
    distribution,
    totalCards,
    className = '',
}) => {
    const segments = useMemo<StatusSegment[]>(() => {
        if (totalCards === 0) return [];

        const configs = [
            {
                key: 'new' as const,
                label: 'Nuove',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500',
                bgLight: 'bg-blue-500/20',
                borderColor: 'border-blue-500/40',
                icon: Sparkles,
                description: 'Carte mai studiate',
            },
            {
                key: 'learning' as const,
                label: 'In Apprendimento',
                color: 'text-amber-400',
                bgColor: 'bg-amber-500',
                bgLight: 'bg-amber-500/20',
                borderColor: 'border-amber-500/40',
                icon: BookOpen,
                description: 'Carte in fase di apprendimento',
            },
            {
                key: 'review' as const,
                label: 'Da Ripassare',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500',
                bgLight: 'bg-orange-500/20',
                borderColor: 'border-orange-500/40',
                icon: GraduationCap,
                description: 'Carte programmate per il ripasso',
            },
            {
                key: 'mastered' as const,
                label: 'Padroneggiate',
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-500',
                bgLight: 'bg-emerald-500/20',
                borderColor: 'border-emerald-500/40',
                icon: Trophy,
                description: 'Carte consolidate',
            },
        ];

        return configs.map(config => ({
            ...config,
            count: distribution[config.key],
            percent: totalCards > 0 ? Math.round((distribution[config.key] / totalCards) * 100) : 0,
        }));
    }, [distribution, totalCards]);

    // Filtra solo i segmenti con carte
    const activeSegments = segments.filter(s => s.count > 0);

    if (totalCards === 0) {
        return (
            <div className={`p-6 rounded-2xl bg-theme-card border border-theme-subtle text-center ${className}`}>
                <div className="w-16 h-16 rounded-xl bg-theme-surface border border-theme-default flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-theme-muted" />
                </div>
                <p className="text-theme-secondary text-sm">Nessuna carta presente</p>
                <p className="text-theme-muted text-xs mt-1">Aggiungi carte per vedere la distribuzione</p>
            </div>
        );
    }

    return (
        <div className={`p-5 sm:p-6 rounded-2xl bg-theme-card border border-theme-subtle ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-lg font-bold text-theme-primary">Distribuzione Carte</h3>
                    <p className="text-sm text-theme-secondary mt-0.5">{totalCards} carte totali</p>
                </div>
            </div>

            {/* Barra Segmentata */}
            <div className="h-4 bg-theme-surface rounded-full overflow-hidden flex mb-6">
                {activeSegments.map((segment, index) => (
                    <motion.div
                        key={segment.key}
                        initial={{ width: 0 }}
                        animate={{ width: `${segment.percent}%` }}
                        transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                        className={`h-full ${segment.bgColor} relative group`}
                        style={{ minWidth: segment.percent > 0 ? '4px' : '0' }}
                    >
                        {/* Tooltip su hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="px-3 py-2 rounded-lg bg-slate-900 border border-white/20 shadow-xl whitespace-nowrap">
                                <p className="text-xs font-semibold text-white">{segment.label}</p>
                                <p className="text-xs text-white/60">{segment.count} carte ({segment.percent}%)</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-2 gap-3">
                {segments.map((segment, index) => (
                    <motion.div
                        key={segment.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                            flex items-center gap-3 p-3 rounded-xl border transition-all
                            ${segment.count > 0 
                                ? `${segment.bgLight} ${segment.borderColor}` 
                                : 'bg-theme-surface border-theme-subtle opacity-50'
                            }
                        `}
                    >
                        <div className={`
                            p-2 rounded-lg ${segment.bgLight}
                        `}>
                            <segment.icon className={`w-4 h-4 ${segment.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-theme-primary">{segment.count}</span>
                                {segment.percent > 0 && (
                                    <span className="text-xs text-theme-muted">({segment.percent}%)</span>
                                )}
                            </div>
                            <p className="text-xs text-theme-secondary truncate">{segment.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default CardDistributionChart;
