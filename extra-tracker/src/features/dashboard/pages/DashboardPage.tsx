/**
 * 📊 DASHBOARD PAGE - Nuovo Design Completo
 * =========================================
 *
 * Dashboard completamente rinnovata con:
 * - Saluto personalizzato dinamico basato sull'ora
 * - Statistiche giornaliere e settimanali
 * - Card informative con dati in tempo reale
 * - Quick actions per navigazione veloce
 * - Gamification aggiornata
 * - Design moderno e accattivante
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTutorial } from '../../../shared/context/TutorialContext';
import { dashboardTutorial } from '../tutorials/dashboardTutorial';
import { TutorialButton } from '../../../shared/components/Tutorial/TutorialButton';
import { TutorialDebug } from '../../../shared/components/Tutorial/TutorialDebug';
import {
    Brain,
    Target,
    Clock,
    Zap,
    Trophy,
    Flame,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Calendar,
    BookOpen,
    Activity,
    Award,
    Moon,
    Sun,
    Sunrise,
    Sunset
} from 'lucide-react';

import { dashboardService, type DashboardSummary, type RecentItem } from '../services/dashboardService';

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Ottiene il saluto e l'icona appropriati in base all'ora
 */
const getGreetingInfo = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return { text: 'Buongiorno', icon: Sunrise, color: 'from-amber-500 to-orange-500' };
    } else if (hour >= 12 && hour < 18) {
        return { text: 'Buon pomeriggio', icon: Sun, color: 'from-yellow-500 to-orange-500' };
    } else if (hour >= 18 && hour < 22) {
        return { text: 'Buonasera', icon: Sunset, color: 'from-orange-500 to-rose-500' };
    } else {
        return { text: 'Buonanotte', icon: Moon, color: 'from-indigo-500 to-purple-500' };
    }
};

/**
 * Formatta la data corrente in modo leggibile
 */
const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date().toLocaleDateString('it-IT', options);
};

const getUserNameFromGreeting = (greeting: string) => {
    const name = greeting.split(',')[1]?.replace(/[!👋]/g, '').trim();
    return name || 'Utente';
};

/**
 * Formatta numeri con separatori di migliaia in formato italiano
 * Es: 300448 -> "300.448"
 */
const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(num);
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
// NUOVE CARD - Design Migliorato
// =========================================

/**
 * Card: Statistiche di Oggi
 * Mostra attività della giornata corrente
 */
interface TodayStatsCardProps {
    studiedToday: number;
    goalsCompletedToday: number;
    todayFormatted: string;
}

const TodayStatsCard: React.FC<TodayStatsCardProps> = React.memo(
    ({ studiedToday, goalsCompletedToday, todayFormatted }) => (
        <motion.div
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.1 }}
            className="relative rounded-[28px] border border-emerald-400/25 bg-gradient-to-br from-slate-950/80 via-emerald-950/30 to-slate-950/60 p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(16,185,129,0.4)]"
        >
            {/* Background */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-[28px] blur-3xl" />

            <div className="relative">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-400" />
                        Oggi
                    </h3>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">
                        In tempo reale
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Carte studiate */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-violet-300" />
                            </div>
                            <span className="text-white/70 text-sm">Carte ripassate</span>
                        </div>
                        <span className="text-xl font-bold text-white">{studiedToday}</span>
                    </div>

                    {/* Obiettivi */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-amber-300" />
                            </div>
                            <span className="text-white/70 text-sm">Obiettivi completati</span>
                        </div>
                        <span className="text-xl font-bold text-white">{goalsCompletedToday}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
);

/**
 * Card: Prossimi Task
 * Mostra mazzi da ripassare e obiettivi in scadenza
 */
interface UpcomingTasksCardProps {
    dueCards: number;
    nextDeck: { id: string; title: string; dueCards: number } | null;
    overdueCount: number;
    topPriority: {
        id: string;
        title: string;
        category: string;
        isOverdue: boolean;
        progress: number;
    } | null;
}

const UpcomingTasksCard: React.FC<UpcomingTasksCardProps> = React.memo(
    ({ dueCards, nextDeck, overdueCount, topPriority }) => {
        const navigate = useNavigate();

        return (
            <motion.div
                initial={{ opacity: 0, transform: 'translateY(20px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                transition={{ delay: 0.2 }}
                className="relative rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-slate-950/80 via-violet-950/30 to-slate-950/60 p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(139,92,246,0.4)]"
            >
                {/* Background */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-[28px] blur-3xl" />

                <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-violet-400" />
                            Prossimi Task
                        </h3>
                        {(dueCards > 0 || overdueCount > 0) && (
                            <span className="text-xs px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200">
                                {dueCards + overdueCount} urgenti
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* Flashcards */}
                        {nextDeck && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/study/${nextDeck.id}/session?mode=flashcard`)}
                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">{nextDeck.title}</span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-200">
                                        {nextDeck.dueCards} carte
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/50">
                                    <Brain className="w-3 h-3" />
                                    Mazzo da ripassare
                                </div>
                            </motion.button>
                        )}

                        {/* Top Priority Goal */}
                        {topPriority && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/goals/${topPriority.id}`)}
                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium truncate">{topPriority.title}</span>
                                    {topPriority.isOverdue && (
                                        <span className="px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-200">
                                            In ritardo
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            style={{ width: `${topPriority.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-white/60">{Math.round(topPriority.progress)}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/50">
                                    <Target className="w-3 h-3" />
                                    {topPriority.category}
                                </div>
                            </motion.button>
                        )}

                        {!nextDeck && !topPriority && (
                            <div className="p-6 text-center text-white/50">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                                <p className="text-sm">Tutto completato!</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    }
);

/**
 * Card: Quick Actions
 * Azioni rapide per navigazione veloce
 */
const QuickActionsCard: React.FC = React.memo(() => {
    const navigate = useNavigate();

    const actions = [
        {
            icon: Brain,
            label: 'Studia',
            bgColor: 'bg-violet-500/10',
            borderColor: 'border-violet-500/30',
            onClick: () => navigate('/study')
        },
        {
            icon: Target,
            label: 'Obiettivi',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/30',
            onClick: () => navigate('/goals')
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={{ delay: 0.3 }}
            className="relative rounded-[28px] border border-white/15 bg-slate-900/60 backdrop-blur-2xl p-6 overflow-hidden shadow-[0_24px_60px_-40px_rgba(8,14,28,0.9)]"
        >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-[28px] blur-3xl" />

            <div className="relative">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-amber-400" />
                    Quick Actions
                </h3>

                <div className="grid grid-cols-3 gap-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={action.onClick}
                                className={`p-4 rounded-2xl ${action.bgColor} border ${action.borderColor} hover:bg-opacity-20 transition-all`}
                            >
                                <Icon className="w-8 h-8 mx-auto mb-2 text-white" />
                                <p className="text-sm font-medium text-white">{action.label}</p>
                            </motion.button>
                        );
                    })}
                </div>
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
// MAIN COMPONENT
// =========================================

export const DashboardPage = () => {
    const { registerTutorial } = useTutorial();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isInitialLoadRef = useRef(true);

    // Registra il tutorial quando il componente si monta
    useEffect(() => {
        console.log('🎓 DashboardPage: Registrazione tutorial...');
        registerTutorial(dashboardTutorial);
    }, [registerTutorial]);

    useEffect(() => {
        let isCancelled = false;
        let refreshTimerId: NodeJS.Timeout | null = null;

        const fetchSummary = async () => {
            if (isInitialLoadRef.current) {
                setLoading(true);
            }
            setError(null);

            try {
                const summaryData = await dashboardService.getSummary();

                if (!isCancelled) {
                    setSummary(summaryData);
                }
            } catch (err) {
                if (!isCancelled) {
                    setError('Impossibile caricare i dati della dashboard');
                    console.error('Dashboard load error:', err);
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                    isInitialLoadRef.current = false;
                }
            }
        };

        // Carica dati inizialmente
        fetchSummary();

        // Refresh automatico ogni 30 secondi per dati in real-time
        refreshTimerId = setInterval(fetchSummary, 30000);

        return () => {
            isCancelled = true;
            if (refreshTimerId) {
                clearInterval(refreshTimerId);
            }
        };
    }, []);

    return (
        <>
            <TutorialDebug />
            <div className="relative space-y-8 pb-12">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-32 -right-24 h-72 w-72 rotate-12 rounded-[36px] bg-gradient-to-br from-primary-500/20 via-indigo-500/10 to-transparent blur-3xl" />
                <div className="absolute top-40 -left-20 h-56 w-56 -rotate-12 rounded-[32px] bg-gradient-to-br from-emerald-400/15 via-cyan-500/10 to-transparent blur-3xl" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-[40px] bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent blur-3xl" />
            </div>

            {/* Header - Nuovo Design con Saluto Personalizzato */}
            <motion.div
                initial={{ opacity: 0, transform: 'translateY(-20px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                style={{ willChange: 'transform, opacity' }}
                className="relative z-10"
            >
                {!loading && summary && (() => {
                    const greetingInfo = getGreetingInfo();
                    const GreetingIcon = greetingInfo.icon;
                    const userName = getUserNameFromGreeting(summary.greeting);

                    return (
                        <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 backdrop-blur-2xl p-8 shadow-[0_24px_60px_-40px_rgba(8,14,28,0.9)]">
                            {/* Background Decoration */}
                            <div className={`absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br ${greetingInfo.color} opacity-20 rounded-full blur-3xl`} />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-[28px] blur-2xl" />

                            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                {/* Left: Greeting */}
                                <div className="flex items-center gap-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${greetingInfo.color} flex items-center justify-center shadow-2xl ring-4 ring-white/10`}
                                    >
                                        <GreetingIcon className="w-10 h-10 text-white" />
                                    </motion.div>

                                    <div data-tutorial="greeting">
                                        <motion.h1
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-4xl sm:text-5xl font-bold text-white mb-2"
                                        >
                                            {greetingInfo.text}, {userName}
                                        </motion.h1>
                                        <motion.p
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-white/60 text-sm flex items-center gap-2"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            {getCurrentDate()}
                                        </motion.p>
                                    </div>
                                </div>

                                {/* Right: Quick Stats + Tutorial Button */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Tutorial Button - Solo se non completato */}
                                    {!loading && (
                                        <TutorialButton
                                            tutorialId="dashboard-tutorial"
                                            label="Tour"
                                            variant="minimal"
                                            className="mr-2"
                                        />
                                    )}
                                    
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-5 h-5 text-orange-400" />
                                            <div>
                                                <p className="text-xs text-white/50">Streak</p>
                                                <p className="text-lg font-bold text-white">{summary.gamification.streak}</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Trophy className="w-5 h-5 text-amber-400" />
                                            <div>
                                                <p className="text-xs text-white/50">Livello</p>
                                                <p className="text-lg font-bold text-white">{summary.gamification.level}</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 backdrop-blur-sm"
                                    >
                                        <Award className="w-5 h-5 text-violet-300" />
                                        <div>
                                            <p className="text-xs text-white/50">Progresso</p>
                                            <p className="text-lg font-bold text-white">{summary.gamification.progress}%</p>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {loading && (
                    <div className="rounded-[32px] border border-white/10 bg-slate-900/50 p-8 animate-pulse">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-3xl bg-white/10" />
                            <div className="flex-1 space-y-3">
                                <div className="h-8 w-64 rounded bg-white/10" />
                                <div className="h-4 w-48 rounded bg-white/10" />
                            </div>
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
                    {/* Nuove Card Informative */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Statistiche di Oggi */}
                        <div data-tutorial="stats">
                            <TodayStatsCard
                                studiedToday={summary.study.cardsStudiedToday}
                                goalsCompletedToday={summary.goals.completedToday}
                                todayFormatted={summary.work.todayFormatted}
                            />
                        </div>

                        {/* Prossimi Task */}
                        <UpcomingTasksCard
                            dueCards={summary.study.dueCards}
                            nextDeck={summary.study.nextDeck}
                            overdueCount={summary.goals.overdueCount}
                            topPriority={summary.goals.topPriority}
                        />

                        {/* Quick Actions */}
                        <div data-tutorial="quick-actions">
                            <QuickActionsCard />
                        </div>
                    </div>

                    {/* Progresso XP e Livello - Fullwidth */}
                    <motion.div
                        initial={{ opacity: 0, transform: 'translateY(20px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0)' }}
                        transition={{ delay: 0.35 }}
                        className="relative overflow-hidden rounded-[28px] border border-amber-400/25 bg-gradient-to-br from-slate-950/80 via-amber-950/20 to-slate-950/60 p-6 shadow-[0_24px_60px_-40px_rgba(245,158,11,0.3)]"
                    >
                        {/* Background */}
                        <div className="absolute -top-10 -right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />

                        <div className="relative">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                        <Award className="w-7 h-7 text-amber-400" />
                                        Progresso e Livello
                                    </h3>
                                    <p className="text-white/60 text-sm">
                                        Continua così per sbloccare il livello {summary.gamification.level + 1}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Livello Badge Grande */}
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl ring-4 ring-amber-500/20">
                                            <div className="text-center">
                                                <Trophy className="w-8 h-8 text-white mx-auto" />
                                                <p className="text-xs font-bold text-white mt-1">LV {summary.gamification.level}</p>
                                            </div>
                                        </div>
                                        {summary.gamification.streak > 0 && (
                                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center ring-2 ring-slate-950">
                                                <Flame className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* XP Numbers */}
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-white">
                                            {formatNumber(summary.gamification.xp)}
                                            <span className="text-lg text-white/50"> / {formatNumber(summary.gamification.nextLevelXp)}</span>
                                        </p>
                                        <p className="text-sm text-white/60">XP totale</p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="h-4 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${summary.gamification.progress}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/50 relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                                    </motion.div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/60">
                                        {formatNumber(summary.gamification.nextLevelXp - summary.gamification.xp)} XP al prossimo livello
                                    </span>
                                    <span className="text-amber-300 font-semibold">
                                        {summary.gamification.progress}% completato
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Jump Back In - Recent Activities */}
                    {summary.recents.length > 0 && (
                        <RecentActivityList items={summary.recents} />
                    )}
                </div>
            )}
        </div>
        </>
    );
};
