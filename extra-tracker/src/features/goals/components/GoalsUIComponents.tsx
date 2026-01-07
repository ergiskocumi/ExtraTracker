/**
 * 🎯 Goals UI Components
 * 
 * Componenti presentazionali per la pagina Goals.
 * Separati dal componente principale per pulizia e riusabilità.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GOAL_CATEGORIES } from '../types';
import type { GoalWithProgress } from '../types';
import type { GoalsFilters, MotivationalMessage, StatusFilter, SortOption } from '../hooks/useGoalsManager';
import { 
    FiTarget, 
    FiPlus, 
    FiSearch, 
    FiFilter, 
    FiTrendingUp,
    FiCalendar,
    FiCheckCircle,
    FiActivity,
    FiArrowRight,
    FiFlag,
    FiZap,
    FiCheck,
    FiStar,
    FiCpu,
    FiCheckSquare,
    FiSquare,
    FiTrash2
} from 'react-icons/fi';

// ============================================================================
// HELPER: Category Icon
// ============================================================================
export const getCategoryIcon = (category: string): React.ReactElement => {
    const categoryData = GOAL_CATEGORIES[category as keyof typeof GOAL_CATEGORIES];
    if (categoryData) {
        const IconComponent = categoryData.icon;
        return <IconComponent className="w-5 h-5" />;
    }
    return <FiTarget className="w-5 h-5" />;
};

// ============================================================================
// RADIAL PROGRESS
// ============================================================================
interface RadialProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ 
    value, 
    size = 140, 
    strokeWidth = 12 
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    const getScoreColor = (score: number) => {
        if (score >= 80) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' };
        if (score >= 50) return { stroke: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' };
        if (score >= 30) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' };
        return { stroke: '#6b7280', glow: 'rgba(107, 114, 128, 0.3)' };
    };

    const colors = getScoreColor(value);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                    className="text-3xl font-bold text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    {value}%
                </motion.span>
            </div>
        </div>
    );
};

// ============================================================================
// SMART HERO SECTION
// ============================================================================
interface SmartHeroSectionProps {
    dailyScore: number;
    suggestedGoal: GoalWithProgress | null;
    motivationalMessage: MotivationalMessage;
    habitsDoneToday: number;
    habitsTotal: number;
    checkingInGoals: Set<string>;
    checkedInGoals: Set<string>;
    onQuickCheckIn: (e: React.MouseEvent, goalId: string) => void;
    onCreateGoal: () => void;
}

export const SmartHeroSection: React.FC<SmartHeroSectionProps> = ({
    dailyScore,
    suggestedGoal,
    motivationalMessage,
    habitsDoneToday,
    habitsTotal,
    checkingInGoals,
    checkedInGoals,
    onQuickCheckIn,
    onCreateGoal,
}) => (
    <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mb-10 overflow-hidden"
    >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-blue-500/20 blur-xl" />
        <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600">
                    <FiCpu className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Focus del Giorno</h2>
                    <p className="text-sm text-white/50">Il tuo piano d'azione intelligente</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Column 1: Radial Progress */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center justify-center p-6 border bg-white/[0.05] backdrop-blur-sm rounded-3xl border-white/[0.1] card"
                >
                    <RadialProgress value={dailyScore} />
                    <div className="mt-4 text-center">
                        <p className="text-lg font-semibold text-white">Produttività Oggi</p>
                        <p className="text-sm text-white/50">
                            {habitsTotal > 0 
                                ? `${habitsDoneToday}/${habitsTotal} abitudini completate`
                                : 'Nessuna abitudine attiva'
                            }
                        </p>
                    </div>
                </motion.div>

                {/* Column 2: Suggested Goal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative p-6 overflow-hidden border bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-2xl border-primary-500/30"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-500/20 blur-3xl" />
                    
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <FiStar className="w-4 h-4 text-primary-400" />
                            <span className="text-xs font-semibold tracking-wider uppercase text-primary-400">
                                Obiettivo Consigliato
                            </span>
                        </div>

                        {suggestedGoal ? (
                            <>
                                <h3 className="mb-2 text-xl font-bold text-white line-clamp-2">
                                    {suggestedGoal.title}
                                </h3>
                                
                                {(suggestedGoal.streak ?? 0) > 0 && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <FiZap className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm font-medium text-orange-400">
                                            Mantieni il tuo streak di {suggestedGoal.streak} giorni!
                                        </span>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="flex justify-between mb-1 text-xs text-white/60">
                                        <span>Progresso</span>
                                        <span>{suggestedGoal.percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${suggestedGoal.percentage}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500"
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(e) => onQuickCheckIn(e, suggestedGoal.id)}
                                    disabled={checkingInGoals.has(suggestedGoal.id)}
                                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                                        checkedInGoals.has(suggestedGoal.id)
                                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                                            : checkingInGoals.has(suggestedGoal.id)
                                            ? 'bg-primary-500/50 cursor-wait'
                                            : 'bg-gradient-to-r from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40'
                                    }`}
                                >
                                    {checkingInGoals.has(suggestedGoal.id) ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 rounded-full border-white/50 border-t-transparent"
                                            />
                                            Registrando...
                                        </>
                                    ) : checkedInGoals.has(suggestedGoal.id) ? (
                                        <>
                                            <FiCheck className="w-5 h-5" />
                                            Fatto!
                                        </>
                                    ) : (
                                        <>
                                            <FiZap className="w-5 h-5" />
                                            Quick Check-in
                                        </>
                                    )}
                                </motion.button>
                            </>
                        ) : (
                            <div className="py-6 text-center">
                                <FiTarget className="w-12 h-12 mx-auto mb-3 text-white/20" />
                                <p className="text-white/50">Tutti gli obiettivi completati!</p>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onCreateGoal}
                                    className="px-4 py-2 mt-4 text-sm font-medium rounded-lg text-primary-400 bg-primary-500/10"
                                >
                                    Crea nuovo obiettivo
                                </motion.button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Column 3: Motivational Quote */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="relative flex flex-col justify-center p-6 border bg-white/[0.05] backdrop-blur-sm rounded-3xl border-white/[0.1] card"
                >
                    <div className="absolute text-6xl font-serif top-4 left-4 text-white/5">"</div>
                    <div className="absolute text-6xl font-serif bottom-4 right-4 text-white/5">"</div>
                    
                    <div className="relative text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6, type: "spring" }}
                            className="mb-4 text-5xl"
                        >
                            {motivationalMessage.emoji}
                        </motion.div>
                        <p className="text-lg italic leading-relaxed text-white/80">
                            {motivationalMessage.message}
                        </p>
                        <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            motivationalMessage.type === 'success' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : motivationalMessage.type === 'start'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                            {motivationalMessage.type === 'success' && '🏆 Eccellente'}
                            {motivationalMessage.type === 'start' && '🎯 Inizia Ora'}
                            {motivationalMessage.type === 'progress' && '📈 In Progresso'}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    </motion.div>
);

// ============================================================================
// STATS CARDS
// ============================================================================
interface StatsCardsProps {
    stats: {
        totalGoals: number;
        activeGoals: number;
        completedGoals: number;
        totalCheckIns: number;
    };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    const statItems = [
        { label: 'Total Goals', value: stats.totalGoals, icon: FiTarget, color: 'blue' },
        { label: 'Active', value: stats.activeGoals, icon: FiActivity, color: 'purple' },
        { label: 'Completed', value: stats.completedGoals, icon: FiCheckCircle, color: 'green' },
        { label: 'Check-ins', value: stats.totalCheckIns, icon: FiTrendingUp, color: 'orange' },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
            {statItems.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl border border-white/12 rounded-3xl p-6 hover:border-white/20 transition-all group card"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mb-2 text-sm font-medium text-white/60 uppercase tracking-wide">{stat.label}</p>
                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-${stat.color}-500/15 text-${stat.color}-400 group-hover:scale-110 transition-transform shadow-lg shadow-${stat.color}-500/10`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-${stat.color}-500 via-${stat.color}-400 to-${stat.color}-600 rounded-b-3xl`} />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================================================
// FILTERS SECTION
// ============================================================================
interface FiltersSectionProps {
    filters: GoalsFilters;
    setSearchQuery: (query: string) => void;
    setFilterCategory: (category: string) => void;
    setFilterStatus: (status: StatusFilter) => void;
    setSortBy: (sort: SortOption) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    filteredCount: number;
    totalCount: number;
}

export const FiltersSection: React.FC<FiltersSectionProps> = ({
    filters,
    setSearchQuery,
    setFilterCategory,
    setFilterStatus,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    filteredCount,
    totalCount,
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded-3xl p-6 card"
    >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative md:col-span-5">
                <FiSearch className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-white/40" />
                <input
                    type="text"
                    placeholder="Search goals..."
                    value={filters.searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3 pl-12 pr-4 text-white transition-all border bg-white/[0.06] border-white/[0.12] rounded-xl placeholder-white/40 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 backdrop-blur-sm"
                />
            </div>

            <div className="relative md:col-span-3">
                <FiFilter className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-white/40" />
                <select
                    value={filters.category}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full py-3 pl-12 pr-4 text-white transition-all border appearance-none cursor-pointer bg-white/5 border-white/10 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                    <option value="all">All Categories</option>
                    {Object.entries(GOAL_CATEGORIES).map(([key, data]) => (
                        <option key={key} value={key}>{data.label}</option>
                    ))}
                </select>
            </div>

            <div className="md:col-span-2">
                <select
                    value={filters.status}
                    onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                    className="w-full px-4 py-3 text-white transition-all border appearance-none cursor-pointer bg-white/[0.06] border-white/[0.12] rounded-xl focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 backdrop-blur-sm"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <div className="md:col-span-2">
                <select
                    value={filters.sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-4 py-3 text-white transition-all border appearance-none cursor-pointer bg-white/[0.06] border-white/[0.12] rounded-xl focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 backdrop-blur-sm"
                >
                    <option value="percentage">Progress</option>
                    <option value="deadline">Deadline</option>
                    <option value="recent">Recent</option>
                </select>
            </div>
        </div>

        {hasActiveFilters && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 mt-4 border-t border-white/10"
            >
                <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                        Showing <span className="font-semibold text-primary-400">{filteredCount}</span> of {totalCount} goals
                    </span>
                    <button
                        onClick={clearFilters}
                        className="font-medium transition-colors text-primary-400 hover:text-primary-300"
                    >
                        Clear Filters
                    </button>
                </div>
            </motion.div>
        )}
    </motion.div>
);

// ============================================================================
// GOAL CARD
// ============================================================================
interface GoalCardProps {
    goal: GoalWithProgress;
    index: number;
    isCheckingIn: boolean;
    justCheckedIn: boolean;
    isPulsing: boolean;
    onQuickCheckIn: (e: React.MouseEvent, goalId: string) => void;
    getDaysRemaining: (deadline: string) => number;
    getProgressColor: (percentage: number) => string;
    canQuickCheckIn: boolean;
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onRequestDeleteGoal: (id: string) => void;
    isDeletingGoal: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = React.memo(({
    goal,
    index,
    isCheckingIn,
    justCheckedIn,
    isPulsing,
    onQuickCheckIn,
    getDaysRemaining,
    getProgressColor,
    canQuickCheckIn,
    isSelectionMode,
    isSelected,
    onToggleSelect,
    onRequestDeleteGoal,
    isDeletingGoal,
}) => {
    const category = GOAL_CATEGORIES[goal.category];
    const daysRemaining = getDaysRemaining(goal.deadline);
    const isExpired = daysRemaining < 0;
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    const isCompleted = goal.status === 'completed';
    const streak = goal.streak || 0;
    const hasStreak = streak > 0;
    const hotStreak = streak >= 3;

    const selectionClass = isSelectionMode
        ? isSelected
            ? 'border-primary-500/50 ring-2 ring-primary-500/20 bg-primary-500/5'
            : 'border-white/10 opacity-70'
        : justCheckedIn
            ? 'border-green-500/50 ring-2 ring-green-500/20'
            : 'border-white/10 hover:border-white/20';

    const cardContent = (
        <div className={`relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl border rounded-3xl p-6 transition-all h-full ${selectionClass} card`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {isSelectionMode && (
                        <div className={`flex items-center justify-center w-6 h-6 rounded-md border ${
                            isSelected
                                ? 'border-primary-400 bg-primary-500/15 text-primary-300'
                                : 'border-white/20 text-white/40'
                        }`}>
                            {isSelected ? <FiCheckSquare className="w-4 h-4" /> : <FiSquare className="w-4 h-4" />}
                        </div>
                    )}
                    <div className={`p-3 rounded-xl ${category.color} bg-white/[0.08] shadow-lg shadow-primary-500/5`}>
                        {getCategoryIcon(goal.category)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="min-w-0 text-lg font-semibold text-white transition-colors group-hover:text-primary-400 truncate">
                                {goal.title}
                            </h3>
                            {hasStreak && (
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        hotStreak 
                                            ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400' 
                                            : 'bg-white/10 border border-white/10 text-white/60'
                                    }`}
                                >
                                    <FiZap className={`w-3 h-3 ${hotStreak ? 'text-orange-400' : 'text-white/50'}`} />
                                    {streak}
                                </motion.div>
                            )}
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${category.color} bg-white/5`}>
                            {category.label}
                        </span>
                    </div>
                </div>
                {(!isSelectionMode || isCompleted) && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        {!isSelectionMode && (
                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        if (!isDeletingGoal) {
                                            onRequestDeleteGoal(goal.id);
                                        }
                                    }}
                                    disabled={isDeletingGoal}
                                    className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:pointer-events-none sm:group-hover:pointer-events-auto hover:bg-red-500/25"
                                    aria-label="Elimina obiettivo"
                                >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                    ELIMINA
                                </button>
                                <FiArrowRight className="w-5 h-5 shrink-0 transition-all text-white/40 group-hover:text-primary-400 group-hover:translate-x-1" />
                            </div>
                        )}
                        {isCompleted && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                <FiCheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-xs font-medium text-green-400">Completed</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Description */}
            {goal.description && (
                <p className="mb-4 text-sm text-white/60 line-clamp-2">
                    {goal.description}
                </p>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-semibold text-white/80">Progresso</span>
                    <span className="text-sm font-bold text-white">{goal.percentage.toFixed(0)}%</span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.08] shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.percentage}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${getProgressColor(goal.percentage)} rounded-full shadow-sm`}
                        style={{ boxShadow: '0 0 8px rgba(124, 58, 237, 0.3)' }}
                    />
                </div>
            </div>

            {/* Stats Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 text-sm">
                    <FiCalendar className="w-4 h-4 text-white/40" />
                    <span className={`${isExpired ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-white/60'}`}>
                        {isExpired 
                            ? `Expired ${Math.abs(daysRemaining)} days ago`
                            : `${daysRemaining} days left`
                        }
                    </span>
                </div>

                {goal.type === 'target' && goal.targetValue && (
                    <div className="text-sm text-white/60">
                        <span className="font-semibold text-white">{goal.currentValue}</span>
                        <span className="mx-1">/</span>
                        <span>{goal.targetValue}</span>
                        {goal.unit && <span className="ml-1">{goal.unit}</span>}
                    </div>
                )}

                {goal.type === 'habit' && (
                    <div className="flex items-center gap-1.5">
                        <FiActivity className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-medium text-white">
                            {streak} day streak
                        </span>
                    </div>
                )}

                {goal.milestones && goal.milestones.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                        <FiFlag className="w-3.5 h-3.5 text-primary-400" />
                        <span className="text-xs font-medium text-primary-400">
                            {goal.completedMilestones || 0}/{goal.milestones.length}
                        </span>
                    </div>
                )}
            </div>

        </div>
    );

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="relative group"
        >
            {isSelectionMode ? (
                <button
                    type="button"
                    onClick={() => onToggleSelect(goal.id)}
                    className="w-full text-left"
                >
                    {cardContent}
                </button>
            ) : (
                <Link to={`/goals/${goal.id}`}>
                    {cardContent}
                </Link>
            )}

            {/* Quick Check-in Button */}
            {!isSelectionMode && !isCompleted && canQuickCheckIn && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => onQuickCheckIn(e, goal.id)}
                    disabled={isCheckingIn}
                    className={`absolute -bottom-3 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all z-10 ring-2 ring-white/10 ${
                        justCheckedIn
                            ? 'bg-green-500 shadow-green-500/40 ring-green-500/30'
                            : isCheckingIn
                            ? 'bg-primary-500/50 cursor-wait ring-primary-500/20'
                            : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/40 hover:shadow-primary-500/60 ring-primary-500/20'
                    }`}
                    title="Quick Check-in"
                >
                    {isPulsing && (
                        <span className="absolute inset-0 rounded-full bg-primary-400/40 animate-ping pointer-events-none" />
                    )}
                    {isCheckingIn ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 rounded-full border-white/50 border-t-transparent"
                        />
                    ) : justCheckedIn ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                            <FiCheck className="w-6 h-6 text-white" />
                        </motion.div>
                    ) : (
                        <FiPlus className="w-6 h-6 text-white" />
                    )}
                </motion.button>
            )}
        </motion.div>
    );
});

// ============================================================================
// GOALS LIST
// ============================================================================
interface GoalsListProps {
    goals: GoalWithProgress[];
    allGoalsEmpty: boolean;
    checkingInGoals: Set<string>;
    checkedInGoals: Set<string>;
    pulsingGoals: Set<string>;
    onQuickCheckIn: (e: React.MouseEvent, goalId: string) => void;
    onCreateGoal: () => void;
    getDaysRemaining: (deadline: string) => number;
    getProgressColor: (percentage: number) => string;
    canQuickCheckIn: (goal: GoalWithProgress) => boolean;
    isSelectionMode: boolean;
    isSelected: (id: string) => boolean;
    onToggleSelect: (id: string) => void;
    onRequestDeleteGoal: (id: string) => void;
    isDeletingGoal: boolean;
}

export const GoalsList: React.FC<GoalsListProps> = ({
    goals,
    allGoalsEmpty,
    checkingInGoals,
    checkedInGoals,
    pulsingGoals,
    onQuickCheckIn,
    onCreateGoal,
    getDaysRemaining,
    getProgressColor,
    canQuickCheckIn,
    isSelectionMode,
    isSelected,
    onToggleSelect,
    onRequestDeleteGoal,
    isDeletingGoal,
}) => (
    <AnimatePresence mode="popLayout">
        {goals.length === 0 ? (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-20 text-center"
            >
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-white/5">
                    <FiTarget className="w-10 h-10 text-white/40" />
                </div>
                <h3 className="mb-2 text-2xl font-semibold text-white">
                    {allGoalsEmpty ? 'No goals yet' : 'No goals found'}
                </h3>
                <p className="mb-6 text-white/60">
                    {allGoalsEmpty 
                        ? 'Create your first goal to start tracking progress' 
                        : 'Try adjusting your filters'}
                </p>
                {allGoalsEmpty && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onCreateGoal}
                        className="px-6 py-3 font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl"
                    >
                        Create Your First Goal
                    </motion.button>
                )}
            </motion.div>
        ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {goals.map((goal, index) => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        index={index}
                        isCheckingIn={checkingInGoals.has(goal.id)}
                        justCheckedIn={checkedInGoals.has(goal.id)}
                        isPulsing={pulsingGoals.has(goal.id)}
                        onQuickCheckIn={onQuickCheckIn}
                        getDaysRemaining={getDaysRemaining}
                        getProgressColor={getProgressColor}
                        canQuickCheckIn={canQuickCheckIn(goal)}
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected(goal.id)}
                        onToggleSelect={onToggleSelect}
                        onRequestDeleteGoal={onRequestDeleteGoal}
                        isDeletingGoal={isDeletingGoal}
                    />
                ))}
            </div>
        )}
    </AnimatePresence>
);
