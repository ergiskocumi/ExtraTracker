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
import React, { lazy, Suspense, useRef } from 'react';
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
import { LevelBadge } from '../../gamification/components/LevelBadge';

// OTTIMIZZATO: Lazy load componenti pesanti (charts, AI widgets)
const ProductivityChart = lazy(() => import('../../analytics/components/ProductivityChart').then(m => ({ default: m.ProductivityChart })));
const AIInsightsWidget = lazy(() => import('../AIInsightsWidget').then(m => ({ default: m.AIInsightsWidget })));

// OTTIMIZZATO: Componente wrapper per lazy load con Intersection Observer
const LazyAnalyticsChart = ({ data }: { data: any[] }) => {
    const [shouldLoad, setShouldLoad] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' } // Carica 100px prima che sia visibile
        );

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.6 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-900/60 backdrop-blur-2xl p-6 shadow-[0_24px_60px_-40px_rgba(8,14,28,0.9)]"
        >
            <div className="absolute -top-12 -right-16 h-36 w-36 rotate-12 rounded-[24px] bg-white/5 border border-white/10" />
            <div className="absolute -bottom-16 -left-12 h-40 w-40 -rotate-12 rounded-[26px] bg-white/[0.04] border border-white/10" />
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-400" />
                    Andamento Settimanale
                </h3>
                <span className="text-sm text-white/40 flex items-center gap-1">
                    Storico timeline disabilitato
                    <ChevronRight className="w-4 h-4" />
                </span>
            </div>
            
            <div className="h-64">
                {shouldLoad ? (
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-white/50">Caricamento grafico...</div>}>
                        <ProductivityChart
                            data={data}
                            isLoading={false}
                        />
                    </Suspense>
                ) : (
                    <div className="h-full flex items-center justify-center text-white/50">Caricamento grafico...</div>
                )}
            </div>
        </motion.div>
    );
};

// =========================================
// SKELETON LOADERS
// =========================================

const ActionCardSkeleton = () => (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/50 p-6 animate-pulse">
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
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 animate-pulse">
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
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.1 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-slate-950/80 via-violet-950/40 to-slate-950/60 p-6 overflow-hidden group shadow-[0_24px_60px_-40px_rgba(71,48,180,0.6)]"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-violet-500/15 rounded-[28px] blur-3xl rotate-12" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-[24px] blur-2xl -rotate-12" />
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Brain className="w-7 h-7 text-violet-300" />
                    </div>
                    {dueCards > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-200 text-sm font-medium">
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
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold transition-all ${
                        dueCards > 0
                            ? 'bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-400 hover:to-violet-500 hover:shadow-violet-500/40'
                            : 'bg-white/[0.06] text-white/80 hover:bg-white/[0.12] border border-white/[0.12]'
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
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.2 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative rounded-[28px] border border-emerald-400/25 bg-gradient-to-br from-slate-950/80 via-emerald-950/40 to-slate-950/60 p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(16,185,129,0.5)]"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/12 rounded-[28px] blur-3xl rotate-12" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-[24px] blur-2xl -rotate-12" />
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Target className="w-7 h-7 text-emerald-300" />
                    </div>
                    {overdueCount > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm font-medium">
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
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${topPriority.progress}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30"
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
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold transition-all ${
                        overdueCount > 0
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40'
                            : 'bg-white/[0.06] text-white/80 hover:bg-white/[0.12] border border-white/[0.12]'
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
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.3 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative rounded-[28px] border border-sky-400/25 bg-gradient-to-br from-slate-950/80 via-sky-950/40 to-slate-950/60 p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(59,130,246,0.5)]"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-500/12 rounded-[28px] blur-3xl rotate-12" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-[24px] blur-2xl -rotate-12" />
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/20">
                        <Clock className="w-7 h-7 text-sky-300" />
                    </div>
                    {todayMinutes > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-200 text-sm font-medium">
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
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.06] text-white/80 hover:bg-white/[0.12] border border-white/[0.12] font-semibold transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Apri Tracker
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
                navigate('/dashboard');
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
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.4 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative overflow-hidden rounded-[28px] border border-white/15 bg-slate-900/60 backdrop-blur-2xl p-6 shadow-[0_24px_60px_-40px_rgba(8,14,28,0.9)]"
        >
            <div className="absolute -top-12 -right-16 h-36 w-36 rotate-12 rounded-[24px] bg-white/5 border border-white/10" />
            <div className="absolute -bottom-16 -left-12 h-40 w-40 -rotate-12 rounded-[26px] bg-white/[0.04] border border-white/10" />
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Riprendi da dove eri
                </h3>
                <span className="text-sm text-white/50">
                    {items.length} recenti
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 relative z-10">
                {items.map((item, index) => {
                    const styles = getItemStyles(item.type);
                    return (
                        <motion.button
                            key={`${item.type}-${item.id}-${index}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                            whileHover={{ scale: 1.03, transform: 'translateY(-2px)' }}
                            whileTap={{ scale: 0.98 }}
                            style={{ willChange: 'transform, opacity' }}
                            onClick={() => handleClick(item)}
                            className={`relative text-left p-4 rounded-2xl border ${styles} transition-all group hover:-translate-y-0.5`}
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

const GamificationWidget: React.FC<GamificationWidgetProps> = React.memo(
    ({ streak, level, xp, nextLevelXp, progress }) => (
        <motion.div
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.35 }}
            style={{ willChange: 'transform, opacity' }}
            className="relative rounded-[28px] border border-amber-400/25 bg-gradient-to-br from-slate-950/80 via-amber-950/40 to-slate-950/60 p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(245,158,11,0.45)]"
        >
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/12 rounded-[28px] blur-3xl rotate-12" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-[24px] blur-2xl -rotate-12" />
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            <div className="relative flex items-center gap-6">
                {/* Level Badge */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2">
                        <LevelBadge level={level} size="sm" variant="icon" />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">Livello {level}</span>
                        <div className="flex items-center gap-1.5 text-orange-300">
                            <Flame className="w-4 h-4" />
                            <span className="text-sm font-semibold">{streak} giorni</span>
                        </div>
                    </div>

                    <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2 ring-1 ring-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30"
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{xp} XP</span>
                        <span>{nextLevelXp} XP</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
);

// =========================================
// MAIN COMPONENT
// =========================================

export const DashboardPage = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analyticsData, setAnalyticsData] = useState<WeeklyAnalyticsResponse | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [summaryData, analytics] = await Promise.all([
                    dashboardService.getSummary(),
                    analyticsService.getWeekly().catch(() => null)
                ]);

                if (!cancelled) {
                    setSummary(summaryData);
                    setAnalyticsData(analytics);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Impossibile caricare i dati della dashboard');
                    console.error('Dashboard load error:', err);
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
        <div className="relative space-y-8 pb-12">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-32 -right-24 h-72 w-72 rotate-12 rounded-[36px] bg-gradient-to-br from-primary-500/20 via-indigo-500/10 to-transparent blur-3xl" />
                <div className="absolute top-40 -left-20 h-56 w-56 -rotate-12 rounded-[32px] bg-gradient-to-br from-emerald-400/15 via-cyan-500/10 to-transparent blur-3xl" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-[40px] bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent blur-3xl" />
            </div>

            {/* Header - Nuovo stile */}
            <motion.div
                initial={{ opacity: 0, transform: 'translateY(-20px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                style={{ willChange: 'transform, opacity' }}
                className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-2">
                        Control Nexus
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">
                        {loading ? 'Caricamento...' : summary?.greeting || 'Benvenuto'}
                    </h1>
                    <p className="text-sm text-white/60 mt-2">
                        Un centro operativo futuristico per guidare ogni obiettivo.
                    </p>
                </div>

                {!loading && summary && (
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/study"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm"
                        >
                            <Brain className="w-4 h-4" />
                            Flashcards
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/goals"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm"
                        >
                            <Target className="w-4 h-4" />
                            Obiettivi
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm">
                            <Sparkles className="w-4 h-4 text-primary-300" />
                            Livello attivo
                            <LevelBadge level={summary.gamification.level} size="sm" variant="icon" />
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Error State */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-10 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="relative z-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ActionCardSkeleton />
                        <ActionCardSkeleton />
                        <ActionCardSkeleton />
                        <div className="rounded-[28px] border border-white/10 bg-slate-900/50 p-6 animate-pulse">
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
                <div className="relative z-10 space-y-8">
                    {/* Hero Action Cards - Nuova griglia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

                    {/* Analytics Section */}
                    {analyticsData && <LazyAnalyticsChart data={analyticsData.dailyActivity} />}

                    {/* AI Insights */}
                    <Suspense fallback={<div className="rounded-[28px] border border-white/10 bg-slate-900/50 p-6 animate-pulse h-32" />}>
                        <AIInsightsWidget />
                    </Suspense>
                </div>
            )}
        </div>
    );
};
