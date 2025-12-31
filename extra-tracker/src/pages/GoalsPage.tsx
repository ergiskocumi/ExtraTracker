import React, { useState } from 'react';
import { useGoals } from '../context/GoalsContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GOAL_CATEGORIES } from '../features/goals/types';
import { GoalWizard } from '../features/goals/GoalWizard';
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
    FiDollarSign,
    FiHeart,
    FiBook,
    FiBriefcase,
    FiUser,
    FiFlag
} from 'react-icons/fi';

export const GoalsPage = () => {
    const { goals, loading, error, stats } = useGoals();
    const [showWizard, setShowWizard] = useState(false);
    
    // Filtri e ordinamento
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
    const [sortBy, setSortBy] = useState<'percentage' | 'deadline' | 'recent'>('percentage');

    // Logica di filtraggio e ordinamento
    const filteredAndSortedGoals = goals
        .filter(goal => {
            const matchesSearch = searchQuery === '' || 
                goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (goal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            
            const matchesCategory = filterCategory === 'all' || goal.category === filterCategory;
            
            const matchesStatus = filterStatus === 'all' || 
                (filterStatus === 'completed' && goal.status === 'completed') ||
                (filterStatus === 'active' && goal.status !== 'completed');
            
            return matchesSearch && matchesCategory && matchesStatus;
        })
        .sort((a, b) => {
            switch(sortBy) {
                case 'percentage':
                    return b.percentage - a.percentage;
                case 'deadline':
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                case 'recent':
                    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
                default:
                    return 0;
            }
        });

    // Helper per icone categorie
    const getCategoryIcon = (category: string): React.ReactElement => {
        const icons: Record<string, React.ReactElement> = {
            finance: <FiDollarSign className="w-5 h-5" />,
            health: <FiHeart className="w-5 h-5" />,
            learning: <FiBook className="w-5 h-5" />,
            career: <FiBriefcase className="w-5 h-5" />,
            personal: <FiUser className="w-5 h-5" />,
        };
        return icons[category] || <FiTarget className="w-5 h-5" />;
    };

    // Calcola giorni rimanenti
    const getDaysRemaining = (deadline: string) => {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // Determina colore progresso
    const getProgressColor = (percentage: number) => {
        if (percentage >= 75) return 'from-emerald-500 to-green-600';
        if (percentage >= 50) return 'from-blue-500 to-indigo-600';
        if (percentage >= 25) return 'from-yellow-500 to-orange-600';
        return 'from-gray-500 to-slate-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 rounded-full border-primary-500 border-t-transparent"
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md p-6 mx-auto mt-8 text-center border bg-red-500/10 border-red-500/20 rounded-xl">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* HEADER SECTION */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="mb-2 text-4xl font-bold text-white">Goals Dashboard</h1>
                        <p className="text-white/60">Track your objectives and measure progress</p>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-6 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-primary-500/25 hover:shadow-primary-500/40"
                    >
                        <FiPlus className="w-5 h-5" />
                        New Goal
                    </motion.button>
                </div>

                {/* STATISTICS CARDS */}
                <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
                    {[
                        { label: 'Total Goals', value: stats.totalGoals, icon: FiTarget, color: 'blue' },
                        { label: 'Active', value: stats.activeGoals, icon: FiActivity, color: 'purple' },
                        { label: 'Completed', value: stats.completedGoals, icon: FiCheckCircle, color: 'green' },
                        { label: 'Check-ins', value: stats.totalCheckIns, icon: FiTrendingUp, color: 'orange' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-1 text-sm font-medium text-white/60">{stat.label}</p>
                                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600`} />
                        </motion.div>
                    ))}
                </div>

                {/* FILTERS & SEARCH */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        {/* Search */}
                        <div className="relative md:col-span-5">
                            <FiSearch className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search goals..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-3 pl-12 pr-4 text-white transition-all border bg-white/5 border-white/10 rounded-xl placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="relative md:col-span-3">
                            <FiFilter className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-white/40" />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full py-3 pl-12 pr-4 text-white transition-all border appearance-none cursor-pointer bg-white/5 border-white/10 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="all">All Categories</option>
                                {Object.entries(GOAL_CATEGORIES).map(([key, data]) => (
                                    <option key={key} value={key}>{data.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="md:col-span-2">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full px-4 py-3 text-white transition-all border appearance-none cursor-pointer bg-white/5 border-white/10 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="md:col-span-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full px-4 py-3 text-white transition-all border appearance-none cursor-pointer bg-white/5 border-white/10 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="percentage">Progress</option>
                                <option value="deadline">Deadline</option>
                                <option value="recent">Recent</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filters Info */}
                    {(searchQuery || filterCategory !== 'all' || filterStatus !== 'active') && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-4 mt-4 border-t border-white/10"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">
                                    Showing <span className="font-semibold text-primary-400">{filteredAndSortedGoals.length}</span> of {goals.length} goals
                                </span>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterCategory('all');
                                        setFilterStatus('active');
                                    }}
                                    className="font-medium transition-colors text-primary-400 hover:text-primary-300"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>

            {/* GOALS LIST */}
            <AnimatePresence mode="popLayout">
                {filteredAndSortedGoals.length === 0 ? (
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
                            {goals.length === 0 ? 'No goals yet' : 'No goals found'}
                        </h3>
                        <p className="mb-6 text-white/60">
                            {goals.length === 0 
                                ? 'Create your first goal to start tracking progress' 
                                : 'Try adjusting your filters'}
                        </p>
                        {goals.length === 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowWizard(true)}
                                className="px-6 py-3 font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl"
                            >
                                Create Your First Goal
                            </motion.button>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {filteredAndSortedGoals.map((goal, index) => {
                            const category = GOAL_CATEGORIES[goal.category];
                            const daysRemaining = getDaysRemaining(goal.deadline);
                            const isExpired = daysRemaining < 0;
                            const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;

                            return (
                                <motion.div
                                    key={goal.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -4 }}
                                    className="group"
                                >
                                    <Link to={`/goals/${goal.id}`}>
                                        <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all h-full">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${category.color} bg-white/5`}>
                                                        {getCategoryIcon(goal.category)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-primary-400">
                                                            {goal.title}
                                                        </h3>
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${category.color} bg-white/5`}>
                                                            {category.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <FiArrowRight className="w-5 h-5 transition-all text-white/40 group-hover:text-primary-400 group-hover:translate-x-1" />
                                            </div>

                                            {/* Description */}
                                            {goal.description && (
                                                <p className="mb-4 text-sm text-white/60 line-clamp-2">
                                                    {goal.description}
                                                </p>
                                            )}

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-white/80">Progress</span>
                                                    <span className="text-sm font-bold text-white">{goal.percentage.toFixed(0)}%</span>
                                                </div>
                                                <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${goal.percentage}%` }}
                                                        transition={{ duration: 1, ease: "easeOut", delay: index * 0.05 }}
                                                        className={`h-full bg-gradient-to-r ${getProgressColor(goal.percentage)} rounded-full`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Stats Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
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
                                                            {goal.streak || 0} day streak
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Milestones indicator */}
                                                {goal.milestones && goal.milestones.length > 0 && (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                                                        <FiFlag className="w-3.5 h-3.5 text-primary-400" />
                                                        <span className="text-xs font-medium text-primary-400">
                                                            {goal.completedMilestones || 0}/{goal.milestones.length}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            {goal.status === 'completed' && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                                        <FiCheckCircle className="w-4 h-4 text-green-400" />
                                                        <span className="text-xs font-medium text-green-400">Completed</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>

            {/* WIZARD MODAL */}
            <AnimatePresence>
                {showWizard && <GoalWizard onClose={() => setShowWizard(false)} />}
            </AnimatePresence>
        </div>
    );
};
