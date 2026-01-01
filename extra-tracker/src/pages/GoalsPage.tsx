import React, { useState, useMemo } from 'react';
import { useGoals } from '../context/GoalsContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { GoalWithProgress } from '../features/goals/types';
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
    FiFlag,
    FiZap,
    FiCheck,
    FiStar,
    FiCpu
} from 'react-icons/fi';

// ============================================================================
// SMART LOGIC HOOK - Algoritmo di Suggerimenti Intelligenti
// ============================================================================
interface SmartLogicResult {
    dailyScore: number;
    suggestedGoal: GoalWithProgress | null;
    motivationalMessage: { message: string; emoji: string; type: 'start' | 'progress' | 'success' };
    habitsDoneToday: number;
    habitsTotal: number;
}

const useGoalSmartLogic = (goals: GoalWithProgress[]): SmartLogicResult => {
    return useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtra solo obiettivi attivi
        const activeGoals = goals.filter(g => g.status !== 'completed');
        
        // Identifica abitudini (habit goals)
        const habitGoals = activeGoals.filter(g => g.type === 'habit');
        
        // Calcola quanti habit hanno uno streak attivo (hanno fatto check-in di recente)
        // Un habit è "attivo" se ha streak > 0 o percentage > 0
        const habitsWithProgress = habitGoals.filter(g => (g.streak || 0) > 0 || g.percentage > 0);
        
        const habitsDoneToday = habitsWithProgress.length;
        const habitsTotal = habitGoals.length;
        
        // Daily Score: basato su progressi generali degli obiettivi attivi
        // Calcola una media ponderata dei progressi + bonus per streak
        let dailyScore = 0;
        if (activeGoals.length > 0) {
            const avgProgress = activeGoals.reduce((sum, g) => sum + g.percentage, 0) / activeGoals.length;
            const streakBonus = activeGoals.filter(g => (g.streak || 0) >= 3).length * 5; // +5% per ogni hot streak
            dailyScore = Math.min(100, Math.round(avgProgress + streakBonus));
        } else {
            dailyScore = 100; // Nessun obiettivo = tutto completato
        }

        // === LOGICA PRIORITÀ SUGGESTED GOAL ===
        let suggestedGoal: GoalWithProgress | null = null;

        // 1. Habit con streak che rischia di perdersi (streak > 0 ma bassa percentuale oggi)
        // Prioritizza habit con streak alto che non sono stati completati oggi
        const habitsWithStreak = habitGoals
            .filter(g => (g.streak || 0) > 0)
            .sort((a, b) => (b.streak || 0) - (a.streak || 0));
        
        if (habitsWithStreak.length > 0 && !suggestedGoal) {
            // Prendi quello con lo streak più alto
            suggestedGoal = habitsWithStreak[0];
        }

        // 2. Obiettivo con scadenza vicina (< 3 giorni)
        if (!suggestedGoal) {
            const urgentGoals = activeGoals
                .filter(g => {
                    const deadline = new Date(g.deadline);
                    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 3 && g.percentage < 100;
                })
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
            
            if (urgentGoals.length > 0) {
                suggestedGoal = urgentGoals[0];
            }
        }

        // 3. Habit senza streak (per iniziare)
        if (!suggestedGoal) {
            const habitsWithoutStreak = habitGoals.filter(g => (g.streak || 0) === 0);
            if (habitsWithoutStreak.length > 0) {
                suggestedGoal = habitsWithoutStreak[0];
            }
        }

        // 4. Fallback: obiettivo con percentuale più bassa (ha bisogno di lavoro)
        if (!suggestedGoal && activeGoals.length > 0) {
            suggestedGoal = [...activeGoals].sort((a, b) => a.percentage - b.percentage)[0];
        }

        // === MOTIVATIONAL MESSAGE ===
        let motivationalMessage: SmartLogicResult['motivationalMessage'];

        if (dailyScore < 30) {
            // START messages
            const startMessages = [
                { message: "Ogni grande viaggio inizia con un piccolo passo. Inizia ora!", emoji: "🚀", type: 'start' as const },
                { message: "Il momento migliore per iniziare è adesso. Sei pronto?", emoji: "⭐", type: 'start' as const },
                { message: "Non aspettare la motivazione, crea l'azione!", emoji: "💪", type: 'start' as const },
                { message: "Oggi è il giorno perfetto per fare progressi.", emoji: "🎯", type: 'start' as const },
            ];
            motivationalMessage = startMessages[Math.floor(Math.random() * startMessages.length)];
        } else if (dailyScore >= 80) {
            // SUCCESS messages
            const successMessages = [
                { message: "Straordinario! Stai dominando i tuoi obiettivi!", emoji: "🏆", type: 'success' as const },
                { message: "Che giornata produttiva! Continua così!", emoji: "🔥", type: 'success' as const },
                { message: "Sei una macchina! I risultati parlano da soli.", emoji: "⚡", type: 'success' as const },
                { message: "Eccellente lavoro! La costanza paga sempre.", emoji: "🌟", type: 'success' as const },
            ];
            motivationalMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
        } else {
            // PROGRESS messages
            const progressMessages = [
                { message: "Buon lavoro finora! Continua a spingere.", emoji: "💫", type: 'progress' as const },
                { message: "Stai costruendo abitudini vincenti!", emoji: "📈", type: 'progress' as const },
                { message: "Ogni check-in ti avvicina al successo.", emoji: "✨", type: 'progress' as const },
                { message: "Sei sulla strada giusta, non fermarti!", emoji: "🎯", type: 'progress' as const },
            ];
            motivationalMessage = progressMessages[Math.floor(Math.random() * progressMessages.length)];
        }

        return {
            dailyScore,
            suggestedGoal,
            motivationalMessage,
            habitsDoneToday,
            habitsTotal,
        };
    }, [goals]);
};

// ============================================================================
// RADIAL PROGRESS COMPONENT
// ============================================================================
interface RadialProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
}

const RadialProgress: React.FC<RadialProgressProps> = ({ value, size = 140, strokeWidth = 12 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    const getScoreColor = (score: number) => {
        if (score >= 80) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }; // emerald
        if (score >= 50) return { stroke: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' }; // blue
        if (score >= 30) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }; // amber
        return { stroke: '#6b7280', glow: 'rgba(107, 114, 128, 0.3)' }; // gray
    };

    const colors = getScoreColor(value);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
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
            {/* Center text */}
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
// MAIN COMPONENT
// ============================================================================
export const GoalsPage = () => {
    const { goals, loading, error, stats, quickCheckIn } = useGoals();
    
    // Smart Logic Hook
    const { dailyScore, suggestedGoal, motivationalMessage, habitsDoneToday, habitsTotal } = useGoalSmartLogic(goals);
    const [showWizard, setShowWizard] = useState(false);
    
    // Quick check-in state
    const [checkingInGoals, setCheckingInGoals] = useState<Set<string>>(new Set());
    const [checkedInGoals, setCheckedInGoals] = useState<Set<string>>(new Set());
    const [pulsingGoals, setPulsingGoals] = useState<Set<string>>(new Set());
    
    // Filtri e ordinamento
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
    const [sortBy, setSortBy] = useState<'percentage' | 'deadline' | 'recent'>('percentage');

    // Quick Check-in handler
    const handleQuickCheckIn = async (e: React.MouseEvent, goalId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (checkingInGoals.has(goalId)) return;
        
        setCheckingInGoals(prev => new Set(prev).add(goalId));
        setPulsingGoals(prev => new Set(prev).add(goalId));
        setTimeout(() => {
            setPulsingGoals(prev => {
                const next = new Set(prev);
                next.delete(goalId);
                return next;
            });
        }, 350);

        try {
            await quickCheckIn(goalId);
            // Show success feedback
            setCheckedInGoals(prev => new Set(prev).add(goalId));
            // Clear feedback after 2s
            setTimeout(() => {
                setCheckedInGoals(prev => {
                    const next = new Set(prev);
                    next.delete(goalId);
                    return next;
                });
            }, 2000);
        } catch (err) {
            console.error('Quick check-in failed:', err);
        } finally {
            setCheckingInGoals(prev => {
                const next = new Set(prev);
                next.delete(goalId);
                return next;
            });
        }
    };

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
            {/* ================================================================
                SMART HERO SECTION - Focus of the Day
            ================================================================= */}
            <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative mb-10 overflow-hidden"
            >
                {/* Background with gradient border effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-blue-500/20 blur-xl" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600">
                            <FiCpu className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Focus del Giorno</h2>
                            <p className="text-sm text-white/50">Il tuo piano d'azione intelligente</p>
                        </div>
                    </div>

                    {/* 3-Column Grid Layout */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* === COLUMN 1: Il Polso - Radial Progress === */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center justify-center p-6 border bg-white/[0.03] rounded-2xl border-white/5"
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

                        {/* === COLUMN 2: Il Focus - Suggested Goal === */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="relative p-6 overflow-hidden border bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-2xl border-primary-500/30"
                        >
                            {/* Glow effect */}
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

                                        {/* Progress mini-bar */}
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

                                        {/* Quick Check-in Button */}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => handleQuickCheckIn(e, suggestedGoal.id)}
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
                                            onClick={() => setShowWizard(true)}
                                            className="px-4 py-2 mt-4 text-sm font-medium rounded-lg text-primary-400 bg-primary-500/10"
                                        >
                                            Crea nuovo obiettivo
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* === COLUMN 3: Motivazione - Quote === */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="relative flex flex-col justify-center p-6 border bg-white/[0.03] rounded-2xl border-white/5"
                        >
                            {/* Decorative quote marks */}
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

            {/* ================================================================
                HEADER SECTION
            ================================================================= */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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

            {/* ================================================================
                GOALS LIST SECTION
            ================================================================= */}
            {/* Section Header */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 mb-6"
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
                    <FiTarget className="w-4 h-4 text-white/60" />
                </div>
                <h2 className="text-xl font-semibold text-white">Tutti gli Obiettivi</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 text-white/60">
                    {filteredAndSortedGoals.length}
                </span>
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
                            const isCompleted = goal.status === 'completed';
                            const isCheckingIn = checkingInGoals.has(goal.id);
                            const justCheckedIn = checkedInGoals.has(goal.id);
                            const isPulsing = pulsingGoals.has(goal.id);
                            const streak = goal.streak || 0;
                            const hasStreak = streak > 0;
                            const hotStreak = streak >= 3;
                            const canQuickCheckIn = goal.type === 'habit' || (goal.type === 'target' && typeof goal.targetValue === 'number');

                            return (
                                <motion.div
                                    key={goal.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -4 }}
                                    className="relative group"
                                >
                                    <Link to={`/goals/${goal.id}`}>
                                        <div className={`relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border rounded-2xl p-6 transition-all h-full ${
                                            justCheckedIn 
                                                ? 'border-green-500/50 ring-2 ring-green-500/20' 
                                                : 'border-white/10 hover:border-white/20'
                                        }`}>
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${category.color} bg-white/5`}>
                                                        {getCategoryIcon(goal.category)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-primary-400">
                                                                {goal.title}
                                                            </h3>
                                                            {/* STREAK BADGE */}
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
                                                        transition={{ duration: 0.5, ease: "easeOut" }}
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
                                                            {streak} day streak
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
                                            {isCompleted && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                                        <FiCheckCircle className="w-4 h-4 text-green-400" />
                                                        <span className="text-xs font-medium text-green-400">Completed</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    {/* QUICK CHECK-IN BUTTON */}
                                    {!isCompleted && canQuickCheckIn && (
                                        <motion.button
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={(e) => handleQuickCheckIn(e, goal.id)}
                                            disabled={isCheckingIn}
                                            className={`absolute -bottom-3 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all z-10 relative ${
                                                justCheckedIn
                                                    ? 'bg-green-500 shadow-green-500/30'
                                                    : isCheckingIn
                                                    ? 'bg-primary-500/50 cursor-wait'
                                                    : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/30 hover:shadow-primary-500/50'
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
