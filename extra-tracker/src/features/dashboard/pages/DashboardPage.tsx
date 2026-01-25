/**
 * DASHBOARD PAGE - Design Moderno
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings } from '../../settings/context/SettingsContext';
import {
    Brain,
    Target,
    Flame,
    Trophy,
    ArrowRight,
    Sparkles,
    Calendar,
    BookOpen,
    Zap,
    ChevronRight,
    Play,
    Award,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { dashboardService, type DashboardSummary } from '../services/dashboardService';

// =========================================
// UTILITIES
// =========================================

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buongiorno';
    if (hour >= 12 && hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
};

const formatDate = () => {
    return new Date().toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
};

const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(num);
};

// =========================================
// QUICK ACTION CARD
// =========================================

interface QuickActionProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    badge?: string | number;
    bgGradient: string;
    iconBg: string;
    onClick: () => void;
}

const QuickAction = ({ icon: Icon, title, subtitle, badge, bgGradient, iconBg, onClick }: QuickActionProps) => (
    <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`
            group relative w-full overflow-hidden rounded-2xl p-5 text-left
            ${bgGradient}
            border border-white/10 hover:border-white/20
            transition-all duration-300
        `}
    >
        <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${iconBg}
            `}>
                <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    {badge !== undefined && badge !== 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-sm text-white/70">{subtitle}</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
    </motion.button>
);

// =========================================
// STAT CARD
// =========================================

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    iconColor: string;
}

const StatCard = ({ icon: Icon, label, value, iconColor }: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-4 bg-slate-800/50 border border-slate-700/50"
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
            </div>
        </div>
    </motion.div>
);

// =========================================
// XP PROGRESS SECTION
// =========================================

interface XpSectionProps {
    level: number;
    xp: number;
    nextLevelXp: number;
    progress: number;
    streak: number;
}

const XpSection = ({ level, xp, nextLevelXp, progress, streak }: XpSectionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-amber-900/40 to-orange-900/20 border border-amber-700/30"
    >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left - Level Badge */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    {streak > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center ring-2 ring-slate-900">
                            <Flame className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm text-amber-300/70">Livello</p>
                    <p className="text-3xl font-bold text-white">{level}</p>
                </div>
            </div>

            {/* Center - XP Info */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{formatNumber(xp)} XP</span>
                    <span className="text-sm text-amber-400">{formatNumber(nextLevelXp)} XP</span>
                </div>
                <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    {formatNumber(nextLevelXp - xp)} XP per il prossimo livello ({progress}%)
                </p>
            </div>

            {/* Right - Streak */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
                <Flame className="w-6 h-6 text-orange-400" />
                <div>
                    <p className="text-xl font-bold text-white">{streak}</p>
                    <p className="text-xs text-slate-400">giorni streak</p>
                </div>
            </div>
        </div>
    </motion.div>
);

// =========================================
// NEXT DECK CARD
// =========================================

interface NextDeckProps {
    deck: { id: string; title: string; dueCards: number } | null;
    totalDue: number;
    onStudy: (id: string) => void;
    onViewAll: () => void;
}

const NextDeck = ({ deck, totalDue, onStudy, onViewAll }: NextDeckProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 bg-slate-800/50 border border-slate-700/50"
    >
        <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-white">Da ripassare</h3>
            {totalDue > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-300">
                    {totalDue} carte
                </span>
            )}
        </div>

        {deck ? (
            <>
                <button
                    onClick={() => onStudy(deck.id)}
                    className="w-full p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-colors group text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{deck.title}</p>
                            <p className="text-xs text-slate-400">{deck.dueCards} carte da ripassare</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 text-violet-400 ml-0.5" />
                        </div>
                    </div>
                </button>
                <button
                    onClick={onViewAll}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Vedi tutti i mazzi
                    <ChevronRight className="w-4 h-4" />
                </button>
            </>
        ) : (
            <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-white font-medium">Tutto fatto!</p>
                <p className="text-sm text-slate-400">Nessun mazzo da ripassare</p>
            </div>
        )}
    </motion.div>
);

// =========================================
// PRIORITY GOAL
// =========================================

interface PriorityGoalProps {
    goal: {
        id: string;
        title: string;
        category: string;
        isOverdue: boolean;
        progress: number;
    };
    onClick: () => void;
}

const PriorityGoal = ({ goal, onClick }: PriorityGoalProps) => (
    <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className="w-full rounded-2xl p-5 bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-colors text-left group"
    >
        <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Obiettivo prioritario</h3>
            {goal.isOverdue && (
                <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300">
                    In ritardo
                </span>
            )}
        </div>

        <h4 className="text-lg font-medium text-white mb-2 group-hover:text-emerald-300 transition-colors">
            {goal.title}
        </h4>

        <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                />
            </div>
            <span className="text-sm text-slate-300">{Math.round(goal.progress)}%</span>
        </div>

        <p className="text-sm text-slate-400">{goal.category}</p>
    </motion.button>
);

// =========================================
// SKELETON LOADERS
// =========================================

const QuickActionSkeleton = () => (
    <div className="rounded-2xl p-5 bg-slate-800/30 border border-slate-700/30 animate-pulse">
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-700/50" />
            <div className="flex-1">
                <div className="h-5 w-24 rounded bg-slate-700/50 mb-2" />
                <div className="h-4 w-32 rounded bg-slate-700/30" />
            </div>
        </div>
    </div>
);

const StatSkeleton = () => (
    <div className="rounded-xl p-4 bg-slate-800/30 border border-slate-700/30 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700/50" />
            <div>
                <div className="h-6 w-12 rounded bg-slate-700/50 mb-1" />
                <div className="h-3 w-20 rounded bg-slate-700/30" />
            </div>
        </div>
    </div>
);

// =========================================
// MAIN COMPONENT
// =========================================

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { profile } = useSettings();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isInitialLoadRef = useRef(true);

    const userName = profile?.firstName || 'Utente';

    useEffect(() => {
        let isCancelled = false;
        let refreshTimer: ReturnType<typeof setInterval> | null = null;

        const fetchSummary = async () => {
            if (isInitialLoadRef.current) setLoading(true);

            try {
                const data = await dashboardService.getSummary();
                if (!isCancelled) {
                    setSummary(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Dashboard load error:', err);
                if (!isCancelled) {
                    setError('Impossibile caricare i dati');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                    isInitialLoadRef.current = false;
                }
            }
        };

        fetchSummary();
        refreshTimer = setInterval(fetchSummary, 60000);

        return () => {
            isCancelled = true;
            if (refreshTimer) clearInterval(refreshTimer);
        };
    }, []);

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 mb-2"
            >
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span className="capitalize">{formatDate()}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                    {getGreeting()},{' '}
                    <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                        {userName}
                    </span>
                </h1>
                <p className="text-slate-400 text-lg">Ecco il tuo riepilogo di oggi</p>
            </motion.div>

            {/* Error State */}
            {error && !loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300"
                >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </motion.div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <QuickActionSkeleton />
                        <QuickActionSkeleton />
                        <QuickActionSkeleton />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </div>
                </div>
            )}

            {/* Main Content */}
            {!loading && summary && (
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <QuickAction
                            icon={Brain}
                            title="Flashcards"
                            subtitle="Studia i tuoi mazzi"
                            badge={summary.study.dueCards > 0 ? summary.study.dueCards : undefined}
                            bgGradient="bg-gradient-to-br from-violet-600/30 to-purple-700/20"
                            iconBg="bg-violet-500"
                            onClick={() => navigate('/study')}
                        />

                        <QuickAction
                            icon={Target}
                            title="Obiettivi"
                            subtitle="Traccia i tuoi progressi"
                            badge={summary.goals.activeCount > 0 ? summary.goals.activeCount : undefined}
                            bgGradient="bg-gradient-to-br from-emerald-600/30 to-teal-700/20"
                            iconBg="bg-emerald-500"
                            onClick={() => navigate('/goals')}
                        />

                        <QuickAction
                            icon={Award}
                            title="Progressi"
                            subtitle="Livelli e achievements"
                            badge={`Lv ${summary.gamification.level}`}
                            bgGradient="bg-gradient-to-br from-amber-600/30 to-orange-700/20"
                            iconBg="bg-amber-500"
                            onClick={() => navigate('/gamification')}
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                        <StatCard
                            icon={BookOpen}
                            label="Studiate oggi"
                            value={summary.study.cardsStudiedToday}
                            iconColor="bg-violet-500/20"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Completati oggi"
                            value={summary.goals.completedToday}
                            iconColor="bg-emerald-500/20"
                        />
                        <StatCard
                            icon={Flame}
                            label="Streak"
                            value={summary.gamification.streak}
                            iconColor="bg-orange-500/20"
                        />
                        <StatCard
                            icon={Zap}
                            label="XP Totali"
                            value={formatNumber(summary.gamification.xp)}
                            iconColor="bg-amber-500/20"
                        />
                    </div>

                    {/* XP Progress */}
                    <XpSection
                        level={summary.gamification.level}
                        xp={summary.gamification.xp}
                        nextLevelXp={summary.gamification.nextLevelXp}
                        progress={summary.gamification.progress}
                        streak={summary.gamification.streak}
                    />

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Next Deck */}
                        <NextDeck
                            deck={summary.study.nextDeck}
                            totalDue={summary.study.dueCards}
                            onStudy={(id) => navigate(`/study/${id}/session?mode=flashcard`)}
                            onViewAll={() => navigate('/study')}
                        />

                        {/* Priority Goal */}
                        {summary.goals.topPriority ? (
                            <PriorityGoal
                                goal={summary.goals.topPriority}
                                onClick={() => navigate(`/goals/${summary.goals.topPriority!.id}`)}
                            />
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl p-5 bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center py-10"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <Target className="w-6 h-6 text-emerald-400" />
                                </div>
                                <p className="text-white font-medium">Nessun obiettivo attivo</p>
                                <button
                                    onClick={() => navigate('/goals')}
                                    className="mt-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    Crea il tuo primo obiettivo
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-3 pt-4 text-slate-500"
                    >
                        <Sparkles className="w-4 h-4" />
                        <p className="text-sm">Continua così, stai facendo un ottimo lavoro!</p>
                        <Sparkles className="w-4 h-4" />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
