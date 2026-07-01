import React from 'react';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Clock, CheckCircle} from 'lucide-react';

interface StatItem {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    bgClass: string;
    iconClass: string;
    valueClass: string;
    description?: string;
}

interface HeroStatsProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    masteredDecks: number;
    retentionRate?: number;
    streakDays?: number;
    weeklyGoal?: number;
    completedToday?: number;
}

const StatCard: React.FC<{
    stat: StatItem;
    index: number;
}> = ({ stat, index }) => {
    const Icon = stat.icon;

    return (
        <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
                delay: index * 0.05,
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            whileHover={{ 
                y: -5, 
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            className={`
                relative overflow-hidden group
                p-4 rounded-2xl border backdrop-blur-sm
                ${stat.bgClass}
                hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]
                transition-colors duration-200 ease-out
                min-h-[80px] active:scale-[0.98]
            `}
        >
            {/* Animated background gradient */}
            <div className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgClass.replace('border', '').replace('bg-', 'from-').replace('/10', '/5')} opacity-50`} />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${stat.iconClass} drop-shadow-sm`} />
                    {stat.description && (
                        <div className="tooltip tooltip-top" data-tip={stat.description}>
                            <div className="w-2 h-2 bg-current rounded-full opacity-60"></div>
                        </div>
                    )}
                </div>
                
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.valueClass} mb-1 leading-tight`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                
                <div className="text-xs font-medium tracking-wide sm:text-sm text-theme-muted">
                    {stat.label}
                </div>
            </div>

            {/* Subtle bottom border accent */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${stat.iconClass.replace('text-', 'text-')}`} />
        </motion.div>
    );
};

export const HeroStats: React.FC<HeroStatsProps> = ({ 
    totalDecks, 
    totalCards, 
    dueCards, 
    masteredDecks,
}) => {
    // Enhanced stats configuration with better mobile optimization
    const baseStats: StatItem[] = [
        {
            label: 'Mazzi Totali',
            value: totalDecks,
            icon: Layers,
            color: 'violet',
            bgClass: 'bg-violet-500/10 border-violet-500/20',
            iconClass: 'text-violet-400',
            valueClass: 'text-violet-400',
            description: 'Numero totale di mazzi creati'
        },
        {
            label: 'Carte Totali',
            value: totalCards,
            icon: BookOpen,
            color: 'blue',
            bgClass: 'bg-blue-500/10 border-blue-500/20',
            iconClass: 'text-blue-400',
            valueClass: 'text-blue-400',
            description: 'Numero totale di carte memorizzate'
        },
        {
            label: 'Da Ripassare',
            value: dueCards,
            icon: Clock,
            color: 'amber',
            bgClass: 'bg-amber-500/10 border-amber-500/20',
            iconClass: 'text-amber-400',
            valueClass: 'text-amber-400',
            description: 'Carte pronte per il ripasso'
        },
        {
            label: 'Esami Completati',
            value: masteredDecks,
            icon: CheckCircle,
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            iconClass: 'text-emerald-400',
            valueClass: 'text-emerald-400',
            description: 'Numero di esami completati (superati o non superati)'
        }
    ];

    // Render delle statistiche in html delle varie Card
    return (
        <div className="w-full max-w-6xl px-2 mx-auto sm:px-4">
            {/* Base Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                {baseStats.map((stat, index) => (
                    <StatCard key={stat.label} stat={stat} index={index} />
                ))}
            </div>

            {/* Mobile-friendly summary section */}
            <div className="mt-4 sm:hidden">
                <div className="p-3 border border-theme-default bg-theme-surface rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-theme-secondary">Rapporto Generale</span>
                        <span className="font-semibold text-emerald-400">
                            {Math.round((masteredDecks / Math.max(totalDecks, 1)) * 100)}% completato
                        </span>
                    </div>
                    <div className="w-full h-2 mt-2 rounded-full" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                        <div
                            className="h-2 transition-all duration-500 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${Math.min((masteredDecks / Math.max(totalDecks, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};