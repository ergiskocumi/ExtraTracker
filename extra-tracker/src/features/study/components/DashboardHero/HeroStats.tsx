import React from 'react';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Clock, CheckCircle } from 'lucide-react';

interface HeroStatsProps {
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    masteredDecks: number;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ totalDecks, totalCards, dueCards, masteredDecks }) => {
    const stats = [
        {
            label: 'Mazzi',
            value: totalDecks,
            icon: Layers,
            color: 'violet',
            bgClass: 'bg-violet-500/10 border-violet-500/20',
            iconClass: 'text-violet-400',
            valueClass: 'text-violet-400',
        },
        {
            label: 'Carte',
            value: totalCards,
            icon: BookOpen,
            color: 'blue',
            bgClass: 'bg-blue-500/10 border-blue-500/20',
            iconClass: 'text-blue-400',
            valueClass: 'text-blue-400',
        },
        {
            label: 'Da Ripassare',
            value: dueCards,
            icon: Clock,
            color: 'amber',
            bgClass: 'bg-amber-500/10 border-amber-500/20',
            iconClass: 'text-amber-400',
            valueClass: 'text-amber-400',
        },
        {
            label: 'Completati',
            value: masteredDecks,
            icon: CheckCircle,
            color: 'emerald',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            iconClass: 'text-emerald-400',
            valueClass: 'text-emerald-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${stat.bgClass}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconClass}`} />
                        </div>
                        <div className={`text-2xl sm:text-3xl font-bold ${stat.valueClass} mb-1`}>
                            {stat.value}
                        </div>
                        <div className="text-xs sm:text-sm text-white/60">{stat.label}</div>
                    </motion.div>
                );
            })}
        </div>
    );
};