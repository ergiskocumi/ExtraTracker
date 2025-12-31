import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import goalsService from '../services/goalsService';
import { GOAL_CATEGORIES } from '../features/goals/types';
import { BurndownChart } from '../features/goals/BurndownChart';
import { ActivityHeatmap } from '../features/goals/ActivityHeatmap';
import { MoodStats } from '../features/goals/MoodStats';
import { useFormat } from '../hooks/useFormat';
import type { GoalDetailResponse, CreateCheckInDTO, Mood, CheckIn, Milestone } from '../features/goals/types';
import {
    FiArrowLeft,
    FiPlus,
    FiCalendar,
    FiTrendingUp,
    FiActivity,
    FiCheckCircle,
    FiClock,
    FiTarget,
    FiSmile,
    FiMeh,
    FiFrown,
    FiDollarSign,
    FiHeart,
    FiBook,
    FiBriefcase,
    FiUser,
    FiBarChart2,
    FiEdit3,
    FiMessageSquare,
    FiAward,
    FiZap,
    FiStar,
    FiSun,
    FiMoon,
    FiCoffee,
    FiAlertCircle,
    FiRepeat,
    FiFlag,
    FiSquare,
    FiCheckSquare
} from 'react-icons/fi';

// ========================================
// SISTEMA DI INCORAGGIAMENTO INTELLIGENTE
// ========================================

interface EncouragementContext {
    percentage: number;
    daysRemaining: number;
    streak: number;
    lastCheckInDaysAgo: number;
    checkInsThisWeek: number;
    averageMood: number;
    type: 'target' | 'habit';
}

const getEncouragementMessage = (ctx: EncouragementContext): { message: string; type: 'motivation' | 'reminder' | 'celebration' | 'gentle' } => {
    // Celebration - Goal quasi completato
    if (ctx.percentage >= 90) {
        return {
            message: "You're almost there! Just a final push to reach your goal. You've got this!",
            type: 'celebration'
        };
    }
    
    // Celebration - Grande progresso
    if (ctx.percentage >= 75) {
        return {
            message: "Incredible progress! You've completed more than 3/4 of your goal. Keep the momentum!",
            type: 'celebration'
        };
    }
    
    // Reminder - Non hai fatto check-in da un po'
    if (ctx.lastCheckInDaysAgo > 3) {
        return {
            message: `It's been ${ctx.lastCheckInDaysAgo} days since your last update. Every small step counts - let's get back on track!`,
            type: 'reminder'
        };
    }
    
    // Celebration - Buona streak
    if (ctx.streak >= 7) {
        return {
            message: `Amazing! ${ctx.streak} day streak! Consistency is the key to success, and you're proving it.`,
            type: 'celebration'
        };
    }
    
    // Gentle - Mood basso
    if (ctx.averageMood < 1.5 && ctx.checkInsThisWeek > 0) {
        return {
            message: "I notice things have been tough lately. Remember: progress isn't always linear, but every effort matters.",
            type: 'gentle'
        };
    }
    
    // Motivation - Metà strada
    if (ctx.percentage >= 50) {
        return {
            message: "Halfway there! You've proven you can do this. The second half is where champions are made.",
            type: 'motivation'
        };
    }
    
    // Motivation - Urgenza
    if (ctx.daysRemaining <= 7 && ctx.daysRemaining > 0) {
        return {
            message: `${ctx.daysRemaining} days left! Time to focus and accelerate. You can do more than you think.`,
            type: 'motivation'
        };
    }
    
    // Default motivation
    const motivations = [
        "Every step forward is progress. Keep moving!",
        "Small daily improvements lead to stunning results.",
        "Your future self will thank you for the effort you put in today.",
        "Success is the sum of small efforts repeated day in and day out.",
        "You're building something great, one day at a time."
    ];
    
    return {
        message: motivations[Math.floor(Math.random() * motivations.length)],
        type: 'motivation'
    };
};

const getWhereYouLeftOff = (checkIns: CheckIn[], goal: any): string | null => {
    if (checkIns.length === 0) return null;
    
    const lastCheckIn = checkIns[0];
    const lastDate = new Date(lastCheckIn.date);
    const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return null;
    
    const dateStr = lastDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    let context = `On ${dateStr}`;
    if (lastCheckIn.notes) {
        context += `: "${lastCheckIn.notes}"`;
    } else {
        context += ` you logged ${lastCheckIn.value} ${goal.unit || 'units'}`;
    }
    
    return context;
};

const getDailyTip = (goal: any): string => {
    const tips: Record<string, string[]> = {
        finance: [
            "Tip: Review your expenses at the end of each day to stay aware of spending patterns.",
            "Tip: Set up automatic transfers to make saving effortless.",
            "Tip: Track small purchases - they add up faster than you think."
        ],
        health: [
            "Tip: Start with just 10 minutes of exercise - small wins build momentum.",
            "Tip: Prepare your workout clothes the night before.",
            "Tip: Find a workout buddy or accountability partner."
        ],
        learning: [
            "Tip: Use the Pomodoro technique - 25 min focus, 5 min break.",
            "Tip: Teach what you learn to someone else to reinforce knowledge.",
            "Tip: Review material before bed - sleep helps consolidate memory."
        ],
        career: [
            "Tip: Block focused work time in your calendar daily.",
            "Tip: Network with one new person each week.",
            "Tip: Document your achievements - you'll need them for reviews."
        ],
        personal: [
            "Tip: Journal for 5 minutes each morning to set intentions.",
            "Tip: Celebrate small wins to maintain motivation.",
            "Tip: Review your goals weekly to stay aligned."
        ]
    };
    
    const categoryTips = tips[goal.category] || tips.personal;
    return categoryTips[Math.floor(Math.random() * categoryTips.length)];
};

// ========================================
// MAIN COMPONENT
// ========================================

export const GoalDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { showMotivationalMessages } = useFormat();
    
    const [data, setData] = useState<GoalDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Form check-in state
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [checkInValue, setCheckInValue] = useState('');
    const [checkInMood, setCheckInMood] = useState<Mood>(2);
    const [checkInNotes, setCheckInNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Milestone toggle state
    const [togglingMilestone, setTogglingMilestone] = useState<string | null>(null);
    
    // Active tab for analytics
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'insights'>('overview');

    // Today info
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const timeOfDay = today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening';
    const greetings: Record<string, { icon: React.ReactElement; text: string }> = {
        morning: { icon: <FiSun className="w-5 h-5 text-yellow-400" />, text: 'Good morning' },
        afternoon: { icon: <FiCoffee className="w-5 h-5 text-orange-400" />, text: 'Good afternoon' },
        evening: { icon: <FiMoon className="w-5 h-5 text-indigo-400" />, text: 'Good evening' }
    };

    // Load data
    useEffect(() => {
        if (!id) return;
        
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await goalsService.getById(id);
                setData(response);
            } catch (err) {
                setError('Error loading goal details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [id]);

    // Calculate encouragement context
    const encouragementCtx = useMemo(() => {
        if (!data) return null;
        
        const { goal, checkIns } = data;
        const lastCheckIn = checkIns[0];
        const lastCheckInDaysAgo = lastCheckIn 
            ? Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const checkInsThisWeek = checkIns.filter(ci => new Date(ci.date) >= weekAgo).length;
        
        const averageMood = checkIns.length > 0 
            ? checkIns.reduce((sum, ci) => sum + ci.mood, 0) / checkIns.length 
            : 2;
        
        const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return {
            percentage: goal.percentage || 0,
            daysRemaining,
            streak: goal.streak || 0,
            lastCheckInDaysAgo,
            checkInsThisWeek,
            averageMood,
            type: goal.type
        } as EncouragementContext;
    }, [data]);

    // Submit journal entry
    const handleJournalSubmit = async () => {
        if (!id || !checkInValue || isNaN(Number(checkInValue))) return;

        const checkInData: CreateCheckInDTO = {
            value: Number(checkInValue),
            mood: checkInMood,
            notes: checkInNotes || undefined,
        };

        setIsSubmitting(true);
        try {
            await goalsService.createCheckIn(id, checkInData);
            const response = await goalsService.getById(id);
            setData(response);
            setShowJournalForm(false);
            setCheckInValue('');
            setCheckInMood(2);
            setCheckInNotes('');
        } catch (err) {
            alert('Error saving progress');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle milestone completion
    const handleMilestoneToggle = async (milestoneId: string) => {
        if (!id || togglingMilestone) return;
        
        setTogglingMilestone(milestoneId);
        try {
            const response = await goalsService.toggleMilestone(id, milestoneId);
            // Update local state with the new goal data
            setData(prev => prev ? {
                ...prev,
                goal: {
                    ...prev.goal,
                    ...response.goal,
                    percentage: response.stats.percentage,
                    totalProgress: response.stats.totalProgress,
                }
            } : null);
        } catch (err) {
            console.error('Error toggling milestone:', err);
            alert('Error updating milestone');
        } finally {
            setTogglingMilestone(null);
        }
    };

    // Helper functions
    const getCategoryIcon = (category: string): React.ReactElement => {
        const icons: Record<string, React.ReactElement> = {
            finance: <FiDollarSign className="w-6 h-6" />,
            health: <FiHeart className="w-6 h-6" />,
            learning: <FiBook className="w-6 h-6" />,
            career: <FiBriefcase className="w-6 h-6" />,
            personal: <FiUser className="w-6 h-6" />,
        };
        return icons[category] || <FiTarget className="w-6 h-6" />;
    };

    const getDaysRemaining = (deadline: string) => {
        const deadlineDate = new Date(deadline);
        return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 75) return 'from-emerald-500 to-green-600';
        if (percentage >= 50) return 'from-blue-500 to-indigo-600';
        if (percentage >= 25) return 'from-yellow-500 to-orange-600';
        return 'from-gray-500 to-slate-600';
    };

    const getMoodIcon = (mood: Mood, size: string = "w-5 h-5") => {
        if (mood === 3) return <FiSmile className={`${size} text-green-400`} />;
        if (mood === 2) return <FiMeh className={`${size} text-yellow-400`} />;
        return <FiFrown className={`${size} text-red-400`} />;
    };
    
    const getMoodLabel = (mood: Mood) => {
        if (mood === 3) return 'Great';
        if (mood === 2) return 'Okay';
        return 'Tough';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Today's check-in
    const todayCheckIn = data?.checkIns.find(ci => {
        const checkInDate = new Date(ci.date);
        return checkInDate.toDateString() === today.toDateString();
    });

    // Loading state
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

    // Error state
    if (error || !data) {
        return (
            <div className="max-w-md p-6 mx-auto mt-8 text-center border bg-red-500/10 border-red-500/20 rounded-xl">
                <p className="text-red-400">{error || 'Goal not found'}</p>
                <Link to="/goals" className="inline-block mt-4 text-primary-400 hover:text-primary-300">
                    ← Back to Goals
                </Link>
            </div>
        );
    }

    const { goal, checkIns } = data;
    const category = GOAL_CATEGORIES[goal.category];
    const daysRemaining = getDaysRemaining(goal.deadline);
    const isExpired = daysRemaining < 0;
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    
    const encouragement = encouragementCtx ? getEncouragementMessage(encouragementCtx) : null;
    const whereYouLeftOff = getWhereYouLeftOff(checkIns, goal);
    const dailyTip = getDailyTip(goal);

    // Encouragement type styling
    const encouragementStyles: Record<string, string> = {
        celebration: 'from-green-500/20 to-emerald-500/10 border-green-500/30',
        motivation: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
        reminder: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30',
        gentle: 'from-purple-500/20 to-pink-500/10 border-purple-500/30'
    };
    
    const encouragementIcons: Record<string, React.ReactElement> = {
        celebration: <FiAward className="w-6 h-6 text-green-400" />,
        motivation: <FiZap className="w-6 h-6 text-blue-400" />,
        reminder: <FiAlertCircle className="w-6 h-6 text-yellow-400" />,
        gentle: <FiHeart className="w-6 h-6 text-purple-400" />
    };

    return (
        <div className="min-h-screen pb-12">
            {/* BACK BUTTON */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <Link 
                    to="/goals" 
                    className="inline-flex items-center gap-2 mb-6 transition-colors text-white/60 hover:text-white group"
                >
                    <FiArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span>Back to Goals</span>
                </Link>
            </motion.div>

            {/* GREETING & ENCOURAGEMENT SECTION */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                {/* Greeting */}
                <div className="flex items-center gap-3 mb-4">
                    {greetings[timeOfDay].icon}
                    <span className="text-white/60">{greetings[timeOfDay].text}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-sm text-white/40">{todayFormatted}</span>
                </div>

                {/* Encouragement Banner */}
                {showMotivationalMessages && encouragement && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`p-5 rounded-2xl bg-gradient-to-r ${encouragementStyles[encouragement.type]} border backdrop-blur-xl mb-6`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-xl bg-white/10">
                                {encouragementIcons[encouragement.type]}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-white">{encouragement.message}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Where You Left Off */}
                {whereYouLeftOff && !todayCheckIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-4 mb-6 border rounded-xl bg-white/5 border-white/10"
                    >
                        <div className="flex items-center gap-3">
                            <FiRepeat className="w-5 h-5 text-primary-400" />
                            <div>
                                <p className="mb-1 text-sm text-white/60">Where you left off</p>
                                <p className="text-white">{whereYouLeftOff}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* GOAL HEADER CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl ${category.color} bg-white/5`}>
                            {getCategoryIcon(goal.category)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-white">{goal.title}</h1>
                                {goal.status === 'completed' && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                        <FiCheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-xs font-medium text-green-400">Completed</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${category.color} bg-white/5`}>
                                    {category.label}
                                </span>
                                <span className="text-white/40">•</span>
                                <span className="text-sm capitalize text-white/60">{goal.type} goal</span>
                            </div>
                            {goal.description && (
                                <p className="max-w-xl mt-3 text-white/70">{goal.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
                    <div className="p-4 border rounded-xl bg-white/5 border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <FiBarChart2 className="w-4 h-4 text-primary-400" />
                            <span className="text-sm text-white/60">Progress</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{(goal.percentage || 0).toFixed(1)}%</p>
                    </div>

                    <div className="p-4 border rounded-xl bg-white/5 border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <FiCalendar className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-white/60">{isExpired ? 'Expired' : 'Remaining'}</span>
                        </div>
                        <p className={`text-2xl font-bold ${isExpired ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-white'}`}>
                            {Math.abs(daysRemaining)} days
                        </p>
                    </div>

                    {goal.type === 'target' && (
                        <div className="p-4 border rounded-xl bg-white/5 border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <FiTarget className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-white/60">Current / Target</span>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {goal.currentValue || 0} / {goal.targetValue}
                                {goal.unit && <span className="ml-1 text-lg text-white/60">{goal.unit}</span>}
                            </p>
                        </div>
                    )}

                    {goal.type === 'habit' && (
                        <div className="p-4 border rounded-xl bg-white/5 border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <FiActivity className="w-4 h-4 text-orange-400" />
                                <span className="text-sm text-white/60">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{goal.streak || 0} days</p>
                        </div>
                    )}

                    <div className="p-4 border rounded-xl bg-white/5 border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <FiTrendingUp className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-white/60">Total Entries</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{checkIns.length}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/80">Overall Progress</span>
                        <span className="text-sm font-bold text-white">{(goal.percentage || 0).toFixed(1)}%</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.percentage || 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r ${getProgressColor(goal.percentage || 0)} rounded-full`}
                        />
                    </div>
                </div>
            </motion.div>

            {/* MILESTONES SECTION */}
            {goal.milestones && goal.milestones.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
                                <FiFlag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Milestones</h3>
                                <p className="text-sm text-white/60">
                                    {goal.completedMilestones || 0} of {goal.milestones.length} completed
                                </p>
                            </div>
                        </div>
                        
                        {/* Milestone Progress Badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${goal.milestoneProgress || 0}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full bg-primary-500"
                                />
                            </div>
                            <span className="text-xs font-medium text-white/80">
                                {goal.milestoneProgress || 0}%
                            </span>
                        </div>
                    </div>

                    {/* Milestones List */}
                    <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                            {goal.milestones.map((milestone, index) => {
                                const isToggling = togglingMilestone === milestone.id;
                                const isDisabled = goal.status !== 'active' || isExpired;
                                
                                return (
                                    <motion.button
                                        key={milestone.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => !isDisabled && handleMilestoneToggle(milestone.id)}
                                        disabled={isDisabled || isToggling}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${
                                            milestone.isCompleted
                                                ? 'bg-green-500/10 border-green-500/20'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                        } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {/* Checkbox */}
                                        <motion.div
                                            whileTap={!isDisabled ? { scale: 0.9 } : {}}
                                            className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                                milestone.isCompleted
                                                    ? 'bg-green-500 border-green-500'
                                                    : 'border-white/30 group-hover:border-primary-400'
                                            }`}
                                        >
                                            {isToggling ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                                    className="w-3 h-3 border-2 rounded-full border-white/50 border-t-transparent"
                                                />
                                            ) : milestone.isCompleted ? (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                >
                                                    <FiCheckCircle className="w-4 h-4 text-white" />
                                                </motion.div>
                                            ) : null}
                                        </motion.div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium transition-all ${
                                                milestone.isCompleted
                                                    ? 'text-white/60 line-through'
                                                    : 'text-white'
                                            }`}>
                                                {milestone.title}
                                            </p>
                                            {milestone.completedAt && (
                                                <p className="text-xs text-green-400/60 mt-0.5">
                                                    Completed {new Date(milestone.completedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            )}
                                        </div>

                                        {/* Weight Badge (if not default) */}
                                        {milestone.weight > 1 && (
                                            <div className="flex-shrink-0 px-2 py-1 border rounded-md bg-white/5 border-white/10">
                                                <span className="text-xs text-white/60">×{milestone.weight}</span>
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Info text for disabled state */}
                    {(goal.status !== 'active' || isExpired) && (
                        <p className="mt-4 text-sm text-center text-white/40">
                            {goal.status === 'completed' 
                                ? 'Goal completed - milestones are locked'
                                : isExpired 
                                    ? 'Goal expired - milestones are locked'
                                    : 'Milestones are locked'}
                        </p>
                    )}
                </motion.div>
            )}

            {/* TODAY'S JOURNAL SECTION */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
            >
                <div className={`rounded-2xl p-6 border ${todayCheckIn ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20' : 'bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${todayCheckIn ? 'bg-green-500/20' : 'bg-primary-500/20'}`}>
                                {todayCheckIn ? <FiCheckCircle className="w-5 h-5 text-green-400" /> : <FiEdit3 className="w-5 h-5 text-primary-400" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Today's Journal</h2>
                                <p className="text-sm text-white/60">{todayFormatted}</p>
                            </div>
                        </div>
                        
                        {!todayCheckIn && !showJournalForm && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowJournalForm(true)}
                                className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-colors bg-primary-500 hover:bg-primary-600 rounded-xl"
                            >
                                <FiPlus className="w-4 h-4" />
                                Log Progress
                            </motion.button>
                        )}
                    </div>

                    {/* Today's Entry Display */}
                    {todayCheckIn && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-5 border rounded-xl bg-white/5 border-white/10"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-white/5">
                                        {getMoodIcon(todayCheckIn.mood, "w-8 h-8")}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl font-bold text-white">{todayCheckIn.value}</span>
                                            {goal.unit && <span className="text-white/60">{goal.unit}</span>}
                                        </div>
                                        <p className="text-sm text-white/60">
                                            Feeling: <span className={`font-medium ${todayCheckIn.mood === 3 ? 'text-green-400' : todayCheckIn.mood === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {getMoodLabel(todayCheckIn.mood)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                                    <FiCheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-medium text-green-400">Logged</span>
                                </div>
                            </div>
                            
                            {todayCheckIn.notes && (
                                <div className="p-4 border rounded-lg bg-white/5 border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiMessageSquare className="w-4 h-4 text-white/40" />
                                        <span className="text-sm text-white/60">Notes</span>
                                    </div>
                                    <p className="text-white">{todayCheckIn.notes}</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Journal Form */}
                    <AnimatePresence>
                        {showJournalForm && !todayCheckIn && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-6 border rounded-xl bg-white/5 border-white/10">
                                    {/* Value Input */}
                                    <div className="mb-6">
                                        <label className="block mb-3 text-sm font-medium text-white/80">
                                            Progress Value {goal.unit && `(${goal.unit})`}
                                        </label>
                                        <input
                                            type="number"
                                            value={checkInValue}
                                            onChange={(e) => setCheckInValue(e.target.value)}
                                            className="w-full px-4 py-4 text-xl font-bold text-center text-white border bg-white/5 border-white/10 rounded-xl placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder={goal.type === 'habit' ? '1' : '0'}
                                        />
                                    </div>

                                    {/* Mood Selector */}
                                    <div className="mb-6">
                                        <label className="block mb-3 text-sm font-medium text-white/80">
                                            How are you feeling today?
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { mood: 1 as Mood, label: 'Tough Day', icon: FiFrown, color: 'red' },
                                                { mood: 2 as Mood, label: 'Doing Okay', icon: FiMeh, color: 'yellow' },
                                                { mood: 3 as Mood, label: 'Feeling Great', icon: FiSmile, color: 'green' }
                                            ].map((option) => (
                                                <button
                                                    key={option.mood}
                                                    onClick={() => setCheckInMood(option.mood)}
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        checkInMood === option.mood
                                                            ? `border-${option.color}-500 bg-${option.color}-500/20`
                                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <option.icon className={`w-8 h-8 mx-auto mb-2 ${
                                                        option.color === 'red' ? 'text-red-400' : 
                                                        option.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                                                    }`} />
                                                    <p className="text-sm font-medium text-white">{option.label}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-6">
                                        <label className="block mb-3 text-sm font-medium text-white/80">
                                            Journal Entry (optional)
                                        </label>
                                        <textarea
                                            value={checkInNotes}
                                            onChange={(e) => setCheckInNotes(e.target.value)}
                                            className="w-full px-4 py-3 text-white border resize-none bg-white/5 border-white/10 rounded-xl placeholder-white/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                            rows={4}
                                            placeholder="What did you accomplish today? Any challenges? What's your plan for tomorrow?"
                                        />
                                    </div>

                                    {/* Tip */}
                                    {showMotivationalMessages && (
                                        <div className="p-4 mb-6 border rounded-lg bg-white/5 border-white/10">
                                            <div className="flex items-start gap-3">
                                                <FiStar className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-white/70">{dailyTip}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleJournalSubmit}
                                            disabled={isSubmitting || !checkInValue}
                                            className="flex-1 px-6 py-3 font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save Entry'}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowJournalForm(false)}
                                            className="px-6 py-3 font-medium text-white transition-colors border bg-white/5 border-white/10 rounded-xl hover:bg-white/10"
                                        >
                                            Cancel
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* TABS NAVIGATION */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
            >
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                        { id: 'history', label: 'History', icon: FiClock },
                        { id: 'insights', label: 'Insights', icon: FiTrendingUp }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary-500 text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* TAB CONTENT */}
            <AnimatePresence mode="wait">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                    >
                        {/* Burndown Chart */}
                        {goal.type === 'target' && (
                            <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                    <FiTrendingUp className="w-5 h-5 text-primary-400" />
                                    Progress Timeline
                                </h3>
                                <BurndownChart 
                                    checkIns={checkIns} 
                                    targetValue={goal.targetValue!} 
                                    deadline={goal.deadline}
                                    startDate={goal.createdAt!}
                                    unit={goal.unit || ''}
                                />
                            </div>
                        )}

                        {/* Activity Heatmap */}
                        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                <FiCalendar className="w-5 h-5 text-blue-400" />
                                Activity Calendar
                            </h3>
                            <ActivityHeatmap checkIns={checkIns} />
                        </div>

                        {/* Mood Stats */}
                        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                <FiSmile className="w-5 h-5 text-green-400" />
                                Mood Analysis
                            </h3>
                            <MoodStats checkIns={checkIns} />
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                <FiActivity className="w-5 h-5 text-orange-400" />
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                {checkIns.length > 0 && (
                                    <>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <span className="text-white/60">Average per entry</span>
                                            <span className="font-bold text-white">
                                                {(checkIns.reduce((sum, ci) => sum + ci.value, 0) / checkIns.length).toFixed(1)} {goal.unit}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <span className="text-white/60">Best day</span>
                                            <span className="font-bold text-white">
                                                {Math.max(...checkIns.map(ci => ci.value))} {goal.unit}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <span className="text-white/60">This week</span>
                                            <span className="font-bold text-white">
                                                {checkIns.filter(ci => {
                                                    const weekAgo = new Date();
                                                    weekAgo.setDate(weekAgo.getDate() - 7);
                                                    return new Date(ci.date) >= weekAgo;
                                                }).length} entries
                                            </span>
                                        </div>
                                    </>
                                )}
                                {checkIns.length === 0 && (
                                    <p className="py-4 text-center text-white/50">No data yet. Start logging your progress!</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                    >
                        <h3 className="mb-4 text-lg font-bold text-white">Complete History</h3>
                        
                        {checkIns.length === 0 ? (
                            <div className="py-12 text-center">
                                <FiClock className="w-12 h-12 mx-auto mb-4 text-white/20" />
                                <p className="text-white/60">No entries yet</p>
                                <p className="mt-1 text-sm text-white/40">Start logging your progress to build your history</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                {checkIns.map((checkIn, index) => (
                                    <motion.div
                                        key={checkIn.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 transition-colors border rounded-xl bg-white/5 border-white/10 hover:border-white/20"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {getMoodIcon(checkIn.mood, "w-6 h-6")}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-white">{checkIn.value}</span>
                                                        {goal.unit && <span className="text-white/60">{goal.unit}</span>}
                                                    </div>
                                                    <p className="text-sm text-white/50">{formatFullDate(checkIn.date)}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm text-white/40">{formatDate(checkIn.date)}</span>
                                        </div>
                                        
                                        {checkIn.notes && (
                                            <div className="p-3 mt-3 rounded-lg bg-white/5">
                                                <p className="text-sm text-white/80">{checkIn.notes}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* INSIGHTS TAB */}
                {activeTab === 'insights' && (
                    <motion.div
                        key="insights"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Projected Completion */}
                        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                <FiTarget className="w-5 h-5 text-primary-400" />
                                Progress Projection
                            </h3>
                            
                            {checkIns.length >= 3 ? (
                                <div className="space-y-4">
                                    {(() => {
                                        const avgPerDay = checkIns.reduce((sum, ci) => sum + ci.value, 0) / 
                                            Math.max(1, Math.ceil((Date.now() - new Date(goal.createdAt!).getTime()) / (1000 * 60 * 60 * 24)));
                                        const remaining = (goal.targetValue || 0) - (goal.currentValue || 0);
                                        const daysToComplete = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;
                                        const projectedDate = daysToComplete ? new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000) : null;
                                        const deadlineDate = new Date(goal.deadline);
                                        const onTrack = projectedDate && projectedDate <= deadlineDate;

                                        return (
                                            <>
                                                <div className="p-4 rounded-xl bg-white/5">
                                                    <p className="mb-1 text-sm text-white/60">Daily average</p>
                                                    <p className="text-2xl font-bold text-white">{avgPerDay.toFixed(1)} {goal.unit}/day</p>
                                                </div>
                                                
                                                {projectedDate && (
                                                    <div className={`p-4 rounded-xl ${onTrack ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                                        <p className="mb-1 text-sm text-white/60">Projected completion</p>
                                                        <p className={`text-xl font-bold ${onTrack ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                        <p className="mt-1 text-sm text-white/60">
                                                            {onTrack ? '✓ On track to meet deadline' : '⚠ May miss deadline at current pace'}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <p className="py-8 text-center text-white/60">
                                    Log at least 3 entries to see projections
                                </p>
                            )}
                        </div>

                        {/* Patterns & Recommendations */}
                        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-white">
                                <FiZap className="w-5 h-5 text-yellow-400" />
                                Patterns & Recommendations
                            </h3>
                            
                            <div className="space-y-3">
                                {checkIns.length > 0 && (
                                    <>
                                        {/* Best performing days */}
                                        {(() => {
                                            const dayPerformance: Record<string, number[]> = {};
                                            checkIns.forEach(ci => {
                                                const day = new Date(ci.date).toLocaleDateString('en-US', { weekday: 'long' });
                                                if (!dayPerformance[day]) dayPerformance[day] = [];
                                                dayPerformance[day].push(ci.value);
                                            });
                                            
                                            const dayAverages = Object.entries(dayPerformance).map(([day, values]) => ({
                                                day,
                                                avg: values.reduce((a, b) => a + b, 0) / values.length
                                            })).sort((a, b) => b.avg - a.avg);
                                            
                                            const bestDay = dayAverages[0];
                                            
                                            return bestDay && (
                                                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                                                    <FiStar className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-white">Best day: {bestDay.day}</p>
                                                        <p className="text-sm text-white/60">You perform best on {bestDay.day}s with an average of {bestDay.avg.toFixed(1)} {goal.unit}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Mood correlation */}
                                        {(() => {
                                            const highMoodValues = checkIns.filter(ci => ci.mood === 3).map(ci => ci.value);
                                            const lowMoodValues = checkIns.filter(ci => ci.mood === 1).map(ci => ci.value);
                                            
                                            if (highMoodValues.length > 0 && lowMoodValues.length > 0) {
                                                const highAvg = highMoodValues.reduce((a, b) => a + b, 0) / highMoodValues.length;
                                                const lowAvg = lowMoodValues.reduce((a, b) => a + b, 0) / lowMoodValues.length;
                                                const diff = ((highAvg - lowAvg) / lowAvg * 100).toFixed(0);
                                                
                                                return (
                                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                                                        <FiSmile className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-medium text-white">Mood matters</p>
                                                            <p className="text-sm text-white/60">On good days, you achieve {diff}% more than on tough days. Prioritize your wellbeing!</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Consistency insight */}
                                        {checkIns.length >= 7 && (
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                                                <FiRepeat className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-white">Consistency score</p>
                                                    <p className="text-sm text-white/60">
                                                        You've logged {checkIns.length} entries. {
                                                            (goal.streak || 0) >= 3 
                                                                ? `Great ${goal.streak}-day streak! Keep it up!`
                                                                : 'Try to log progress daily for better results.'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {checkIns.length === 0 && (
                                    <p className="py-8 text-center text-white/60">
                                        Start logging entries to discover patterns
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
