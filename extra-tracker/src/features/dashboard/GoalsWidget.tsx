import React from 'react';
import { motion } from 'framer-motion';
import { FiTarget, FiArrowRight, FiCheckCircle, FiTrendingUp, FiClock, FiPlus } from 'react-icons/fi';
import { useGoals } from '../goals/context/GoalsContext';
import { GOAL_CATEGORIES } from '../goals/types';
import { Link } from 'react-router-dom';
import type { GoalWithProgress } from '../goals/types';

export const GoalsWidget = () => {
    const { goals, stats, loading } = useGoals();

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6"
            >
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
                </div>
            </motion.div>
        );
    }

    // Prendi i top 4 obiettivi più urgenti o con più progresso
    const topGoals = [...goals]
        .filter(g => g.status !== 'completed')
        .sort((a, b) => {
            // Priorità per deadline vicine
            const daysA = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const daysB = Math.ceil((new Date(b.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysA <= 7 && daysB > 7) return -1;
            if (daysB <= 7 && daysA > 7) return 1;
            return b.percentage - a.percentage;
        })
        .slice(0, 3);

    const completionRate = stats.totalGoals > 0 
        ? Math.round((stats.completedGoals / stats.totalGoals) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
        >
            {/* Header con gradiente */}
            <div className="relative p-5 pb-4 bg-gradient-to-br from-primary-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                            <FiTarget className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">I Tuoi Obiettivi</h3>
                            <p className="text-xs text-white/50">Traccia i progressi</p>
                        </div>
                    </div>
                    <Link
                        to="/goals"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-sm text-white/70 hover:text-white"
                    >
                        Vedi tutti
                        <FiArrowRight size={14} />
                    </Link>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-white/[0.05]">
                        <div className="flex items-center gap-2 mb-1">
                            <FiTrendingUp className="text-primary-400" size={14} />
                            <span className="text-xs text-white/50">Attivi</span>
                        </div>
                        <p className="text-xl font-bold text-white">{stats.activeGoals}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.05]">
                        <div className="flex items-center gap-2 mb-1">
                            <FiCheckCircle className="text-emerald-400" size={14} />
                            <span className="text-xs text-white/50">Completati</span>
                        </div>
                        <p className="text-xl font-bold text-white">{stats.completedGoals}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.05]">
                        <div className="flex items-center gap-2 mb-1">
                            <FiClock className="text-amber-400" size={14} />
                            <span className="text-xs text-white/50">Check-in</span>
                        </div>
                        <p className="text-xl font-bold text-white">{stats.totalCheckIns}</p>
                    </div>
                </div>
            </div>

            {/* Goals List */}
            <div className="p-5 pt-4">
                {topGoals.length === 0 ? (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] flex items-center justify-center mb-3">
                            <FiTarget className="text-white/30" size={24} />
                        </div>
                        <p className="text-sm text-white/50 mb-3">Nessun obiettivo attivo</p>
                        <Link 
                            to="/goals" 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 transition-colors text-sm font-medium text-white"
                        >
                            <FiPlus size={16} />
                            Crea obiettivo
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {topGoals.map((goal, index) => (
                            <GoalMiniCard key={goal.id} goal={goal} index={index} />
                        ))}
                    </div>
                )}

                {/* Completion Rate */}
                {stats.totalGoals > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white/50">Tasso completamento</span>
                            <span className="text-sm font-semibold text-white">{completionRate}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${completionRate}%` }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Mini Card per singolo obiettivo
const GoalMiniCard = ({ goal, index }: { goal: GoalWithProgress; index: number }) => {
    const category = GOAL_CATEGORIES[goal.category];
    const daysRemaining = Math.ceil(
        (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    const isExpired = daysRemaining < 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
        >
            <Link
                to={`/goals/${goal.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
            >
                {/* Category Icon */}
                <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${category.bgColor}`}
                >
                    {React.createElement(category.icon, { className: `w-5 h-5 ${category.color}` })}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{goal.title}</p>
                        <span className="text-sm font-bold text-primary-400 flex-shrink-0">
                            {goal.percentage}%
                        </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-1.5">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                                width: `${goal.percentage}%`,
                                backgroundColor: category.color
                            }}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs">
                        {goal.type === 'target' && goal.targetValue && (
                            <span className="text-white/50">
                                {goal.totalProgress} / {goal.targetValue} {goal.unit}
                            </span>
                        )}
                        {goal.type === 'habit' && (
                            <span className="text-white/50">
                                {goal.totalProgress} sessioni
                            </span>
                        )}
                        <span className={`
                            ${isExpired ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white/40'}
                        `}>
                            {isExpired 
                                ? 'Scaduto' 
                                : daysRemaining === 0 
                                    ? 'Oggi' 
                                    : `${daysRemaining}g rimanenti`
                            }
                        </span>
                    </div>
                </div>

                {/* Arrow */}
                <FiArrowRight className="text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all flex-shrink-0" size={16} />
            </Link>
        </motion.div>
    );
};
