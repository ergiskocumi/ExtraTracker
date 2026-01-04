/**
 * 📊 DASHBOARD PAGE - Command Center
 * ===================================
 * 
 * Dashboard azionabile che mostra:
 * - Hero Actions: Flashcards, Goals, Work Tracker
 * - Jump Back In: Attività recenti
 * - Analytics Widget (in basso)
 * 
 * Design: Bento Grid moderno con focus su UX e azioni immediate.
 */
import React, { lazy, Suspense } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Brain,
    Target,
    Clock,
    ChevronRight,
    Zap,
    Trophy,
    Flame,
    Play,
    Plus,
    TrendingUp,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Sparkles
} from 'lucide-react';

import { dashboardService, type DashboardSummary, type RecentItem } from '../services/dashboardService';
import { analyticsService, type WeeklyAnalyticsResponse } from '../../analytics/services/analyticsService';

// OTTIMIZZATO: Lazy load componenti pesanti (charts, AI widgets)
const ProductivityChart = lazy(() => import('../../analytics/components/ProductivityChart').then(m => ({ default: m.ProductivityChart })));
const AIInsightsWidget = lazy(() => import('../AIInsightsWidget').then(m => ({ default: m.AIInsightsWidget })));

// =========================================
// SKELETON LOADERS
// =========================================

const ActionCardSkeleton = () => (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
        <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10" />
            <div className="w-20 h-6 rounded-full bg-white/10" />
        </div>
        <div className="space-y-3">
            <div className="h-6 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
        </div>
        <div className="mt-6 h-12 rounded-xl bg-white/10" />
    </div>
);

const RecentItemSkeleton = () => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
            </div>
        </div>
    </div>
);

// =========================================
// ACTION CARDS
// =========================================

interface StudyActionCardProps {
    dueCards: number;
    nextDeck: { id: string; title: string; dueCards: number } | null;
    allDone: boolean;
    totalDecks: number;
}

const StudyActionCard: React.FC<StudyActionCardProps> = React.memo(({ dueCards, nextDeck, allDone, totalDecks }) => {
    const navigate = useNavigate();

    const handleStudy = () => {
        if (nextDeck) {
            navigate(`/study/${nextDeck.id}/session?mode=flashcard`);
        } else {
            navigate('/study');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-6 overflow-hidden group"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                        <Brain className="w-7 h-7 text-violet-400" />
                    </div>
                    {dueCards > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium">
                            <Zap className="w-4 h-4" />
                            {dueCards} da fare
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {allDone ? 'Tutto completato!' : 'Flashcards'}
                    </h3>
                    <p className="text-white/60 text-sm">
                        {allDone 
                            ? 'Ottimo lavoro! Hai ripassato tutte le carte 🎉'
                            : nextDeck 
                                ? `Continua con "${nextDeck.title}"`
                                : totalDecks > 0 
                                    ? `${totalDecks} mazzi pronti per lo studio`
                                    : 'Crea il tuo primo mazzo'
                        }
                    </p>
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStudy}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium transition-all ${
                        dueCards > 0
                            ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-600'
                            : 'bg-white/10 text-white/80 hover:bg-white/15'
                    }`}
                >
                    {dueCards > 0 ? (
                        <>
                            <Play className="w-4 h-4" />
                            Studia Ora
                        </>
                    ) : totalDecks > 0 ? (
                        <>
                            <Brain className="w-4 h-4" />
                            Vai ai Mazzi
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Crea Mazzo
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
});

interface GoalActionCardProps {
    activeCount: number;
    overdueCount: number;
    topPriority: {
        id: string;
        title: string;
        category: string;
        isOverdue: boolean;
        progress: number;
    } | null;
}

const GoalActionCard: React.FC<GoalActionCardProps> = React.memo(({ activeCount, overdueCount, topPriority }) => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 overflow-hidden"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <Target className="w-7 h-7 text-emerald-400" />
                    </div>
                    {overdueCount > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            {overdueCount} in ritardo
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {topPriority ? topPriority.title : 'Obiettivi'}
                    </h3>
                    <p className="text-white/60 text-sm">
                        {topPriority 
                            ? `${topPriority.category} • ${Math.round(topPriority.progress)}% completato`
                            : activeCount > 0 
                                ? `${activeCount} obiettivi attivi`
                                : 'Inizia a tracciare i tuoi traguardi'
                        }
                    </p>
                    
                    {topPriority && (
                        <div className="mt-4">
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${topPriority.progress}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(topPriority ? `/goals/${topPriority.id}` : '/goals')}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium transition-all ${
                        overdueCount > 0
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600'
                            : 'bg-white/10 text-white/80 hover:bg-white/15'
                    }`}
                >
                    {topPriority ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Check-in Veloce
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Nuovo Obiettivo
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
});

interface WorkActionCardProps {
    todayFormatted: string;
    todayMinutes: number;
    sessionsToday: number;
}

const WorkActionCard: React.FC<WorkActionCardProps> = React.memo(({ todayFormatted, todayMinutes, sessionsToday }) => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-6 overflow-hidden"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-blue-400" />
                    </div>
                    {todayMinutes > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
                            <TrendingUp className="w-4 h-4" />
                            {todayFormatted}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Work Tracker
                    </h3>
                    <p className="text-white/60 text-sm">
                        {todayMinutes > 0 
                            ? `${sessionsToday} ${sessionsToday === 1 ? 'sessione' : 'sessioni'} registrate oggi`
                            : 'Nessuna sessione registrata oggi'
                        }
                    </p>
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/timeline')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Registra Lavoro
                </motion.button>
            </div>
        </motion.div>
    );
});

// =========================================
// RECENT ACTIVITY LIST
// =========================================

interface RecentActivityListProps {
    items: RecentItem[];
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({ items }) => {
    const navigate = useNavigate();

    if (items.length === 0) return null;

    const handleClick = (item: RecentItem) => {
        switch (item.type) {
            case 'deck':
                navigate(`/study/${item.id}/session?mode=flashcard`);
                break;
            case 'goal':
                navigate(`/goals/${item.id}`);
                break;
            case 'worklog':
                navigate('/timeline');
                break;
        }
    };

    const getItemStyles = (type: string) => {
        switch (type) {
            case 'deck': return 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10';
            case 'goal': return 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10';
            case 'worklog': return 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10';
            default: return 'border-white/10 bg-white/5 hover:bg-white/10';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Riprendi da dove eri
                </h3>
                <span className="text-sm text-white/50">
                    {items.length} recenti
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {items.map((item, index) => {
                    const styles = getItemStyles(item.type);
                    return (
                        <motion.button
                            key={`${item.type}-${item.id}-${index}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleClick(item)}
                            className={`relative text-left p-4 rounded-2xl border ${styles} transition-all group`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{item.icon}</span>
                                <ArrowRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </div>
                            <p className="text-sm font-medium text-white truncate">
                                {item.title}
                            </p>
                            <p className="text-xs text-white/50 mt-1">
                                {item.lastAction}
                            </p>
                        </motion.button>
                    );
                })}
            </div>
        </motion.div>
    );
};

// =========================================
// GAMIFICATION WIDGET
// =========================================

interface GamificationWidgetProps {
    streak: number;
    level: number;
    xp: number;
    nextLevelXp: number;
    progress: number;
}

const GamificationWidget: React.FC<GamificationWidgetProps> = React.memo(({ streak, level, xp, nextLevelXp, progress }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6"
    >
        <div className="flex items-center gap-6">
            {/* Level Badge */}
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Trophy className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-amber-600 text-xs font-bold flex items-center justify-center shadow">
                    {level}
                </span>
            </div>

            {/* Stats */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Livello {level}</span>
                    <div className="flex items-center gap-1.5 text-orange-400">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm font-semibold">{streak} giorni</span>
                    </div>
                </div>
                
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    />
                </div>
                
                <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{xp} XP</span>
                    <span>{nextLevelXp} XP</span>
                </div>
            </div>
        </div>
    </motion.div>
));

// =========================================
// MAIN COMPONENT
// =========================================

export const DashboardPage = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analyticsData, setAnalyticsData] = useState<WeeklyAnalyticsResponse | null>(null);

    useEffect(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardPage.tsx:473',message:'Dashboard useEffect triggered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        let cancelled = false;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const loadStart = performance.now();
                const [summaryData, analytics] = await Promise.all([
                    dashboardService.getSummary(),
                    analyticsService.getWeekly().catch(() => null)
                ]);
                const loadTime = performance.now() - loadStart;

                if (!cancelled) {
                    setSummary(summaryData);
                    setAnalyticsData(analytics);

                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardPage.tsx:485',message:'Dashboard loadData success',data:{loadTime:Math.round(loadTime),hasSummary:!!summaryData,hasAnalytics:!!analytics},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Impossibile caricare i dati della dashboard');
                    console.error('Dashboard load error:', err);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DashboardPage.tsx:490',message:'Dashboard loadData error',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                    // #endregion
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6 pb-10">
            {/* Header con Saluto */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-1">
                        Command Center
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                        {loading ? 'Caricamento...' : summary?.greeting || 'Benvenuto'}
                    </h1>
                </div>

                {!loading && summary && (
                    <div className="flex items-center gap-2">
                        <Link
                            to="/study"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all text-sm"
                        >
                            <Brain className="w-4 h-4" />
                            Flashcards
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/goals"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all text-sm"
                        >
                            <Target className="w-4 h-4" />
                            Obiettivi
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </motion.div>

            {/* Error State */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ActionCardSkeleton />
                        <ActionCardSkeleton />
                        <ActionCardSkeleton />
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/2 rounded bg-white/10" />
                                    <div className="h-2 rounded-full bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {[...Array(5)].map((_, i) => (
                            <RecentItemSkeleton key={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            {!loading && summary && (
                <>
                    {/* Hero Action Cards - Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StudyActionCard
                            dueCards={summary.study.dueCards}
                            nextDeck={summary.study.nextDeck}
                            allDone={summary.study.allDone}
                            totalDecks={summary.study.totalDecks}
                        />
                        <GoalActionCard
                            activeCount={summary.goals.activeCount}
                            overdueCount={summary.goals.overdueCount}
                            topPriority={summary.goals.topPriority}
                        />
                        <WorkActionCard
                            todayFormatted={summary.work.todayFormatted}
                            todayMinutes={summary.work.todayMinutes}
                            sessionsToday={summary.work.sessionsToday}
                        />
                        <GamificationWidget
                            streak={summary.gamification.streak}
                            level={summary.gamification.level}
                            xp={summary.gamification.xp}
                            nextLevelXp={summary.gamification.nextLevelXp}
                            progress={summary.gamification.progress}
                        />
                    </div>

                    {/* Jump Back In - Recent Activities */}
                    {summary.recents.length > 0 && (
                        <RecentActivityList items={summary.recents} />
                    )}

                    {/* Analytics Section (Ridotta) */}
                    {analyticsData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary-400" />
                                    Andamento Settimanale
                                </h3>
                                <Link
                                    to="/timeline"
                                    className="text-sm text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
                                >
                                    Vedi tutto
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                            
                            <div className="h-64">
                                <Suspense fallback={<div className="h-full flex items-center justify-center text-white/50">Caricamento grafico...</div>}>
                                    <ProductivityChart
                                        data={analyticsData.dailyActivity}
                                        isLoading={false}
                                    />
                                </Suspense>
                            </div>
                        </motion.div>
                    )}

                    <Suspense fallback={<div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 animate-pulse h-32" />}>
                        <AIInsightsWidget />
                    </Suspense>
                </>
            )}
        </div>
    );
};
