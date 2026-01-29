/**
 * DASHBOARD PAGE - Design Moderno
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings } from '../../settings/context/SettingsContext';
import {
    Brain,
    ArrowRight,
    Sparkles,
    Calendar,
    BookOpen,
    ChevronRight,
    Play,
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <QuickAction
                            icon={Brain}
                            title="Flashcards"
                            subtitle="Studia i tuoi mazzi"
                            badge={summary.study.dueCards > 0 ? summary.study.dueCards : undefined}
                            bgGradient="bg-gradient-to-br from-violet-600/30 to-purple-700/20"
                            iconBg="bg-violet-500"
                            onClick={() => navigate('/study')}
                        />
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 gap-5">
                        <NextDeck
                            deck={summary.study.nextDeck}
                            totalDue={summary.study.dueCards}
                            onStudy={(id) => navigate(`/study/${id}/session?mode=flashcard`)}
                            onViewAll={() => navigate('/study')}
                        />
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
