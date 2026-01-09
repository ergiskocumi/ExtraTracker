import React from 'react';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Clock, CheckCircle, TrendingUp, Target, Eye, Zap } from 'lucide-react';

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
                hover:shadow-lg hover:shadow-black/10
                transition-all duration-300 ease-out
                min-h-[80px]
            `}
        >
            {/* Animated background gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                
                <div className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">
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
    retentionRate = 85,
    streakDays = 12,
    weeklyGoal = 50,
    completedToday = 8
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
            label: 'Completati',
            value: masteredDecks,
            icon: CheckCircle,
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            iconClass: 'text-emerald-400',
            valueClass: 'text-emerald-400',
            description: 'Mazzi completamente padroneggiati'
        }
    ];

    // Additional performance stats
    const performanceStats: StatItem[] = [
        {
            label: 'Retent. Media',
            value: `${retentionRate}%`,
            icon: Target,
            color: 'rose',
            bgClass: 'bg-rose-500/10 border-rose-500/20',
            iconClass: 'text-rose-400',
            valueClass: 'text-rose-400',
            description: 'Percentuale media di ricordo'
        },
        {
            label: 'Serie Giorni',
            value: streakDays,
            icon: Fire,
            color: 'orange',
            bgClass: 'bg-orange-500/10 border-orange-500/20',
            iconClass: 'text-orange-400',
            valueClass: 'text-orange-400',
            description: 'Giorni consecutivi di studio'
        },
        {
            label: 'Oggi',
            value: completedToday,
            icon: Eye,
            color: 'teal',
            bgClass: 'bg-teal-500/10 border-teal-500/20',
            iconClass: 'text-teal-400',
            valueClass: 'text-teal-400',
            description: 'Carte completate oggi'
        },
        {
            label: 'Progresso Sett.',
            value: `${Math.round((completedToday / weeklyGoal) * 100)}%`,
            icon: TrendingUp,
            color: 'indigo',
            bgClass: 'bg-indigo-500/10 border-indigo-500/20',
            iconClass: 'text-indigo-400',
            valueClass: 'text-indigo-400',
            description: `Obiettivo settimanale: ${weeklyGoal} carte`
        }
    ];

    const allStats = [...baseStats, ...performanceStats];

    return (
        <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
            {/* Base Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                {baseStats.map((stat, index) => (
                    <StatCard key={stat.label} stat={stat} index={index} />
                ))}
            </div>

            {/* Performance Stats Grid - Hidden on mobile unless needed */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {performanceStats.map((stat, index) => (
                    <StatCard key={stat.label} stat={stat} index={index + baseStats.length} />
                ))}
            </div>

            {/* Mobile-friendly summary section */}
            <div className="mt-4 sm:hidden">
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Rapporto Generale</span>
                        <span className="text-emerald-400 font-semibold">
                            {Math.round((masteredDecks / Math.max(totalDecks, 1)) * 100)}% completato
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((masteredDecks / Math.max(totalDecks, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for fire icon (since it's not in lucide-react)
const Fire = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.39-1 1.73V7h1c1.1 0 2 .9 2 2v1h1c1.1 0 2 .9 2 2v1c0 2.21-1.79 4-4 4H12c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h1v-1h-1c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h1V4c0-.55.45-1 1-1z"/>
    </svg>
);
