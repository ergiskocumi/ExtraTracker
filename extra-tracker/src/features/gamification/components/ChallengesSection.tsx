/**
 * CHALLENGES SECTION COMPONENT
 *
 * Mostra le challenges dell'utente organizzate per periodo:
 * - Daily challenges
 * - Weekly challenges
 * - Monthly challenges
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiTarget,
    FiCalendar,
    FiClock,
    FiCheckCircle,
    FiZap,
    FiBook,
    FiTrendingUp,
    FiAward,
    FiStar,
    FiRefreshCw,
} from 'react-icons/fi';
import type { Challenge, ChallengesData } from '../services/gamificationService';

interface ChallengesSectionProps {
    challenges: ChallengesData;
    onRefresh?: (period?: 'daily' | 'weekly' | 'monthly') => Promise<void>;
    isLoading?: boolean;
}

type TabType = 'daily' | 'weekly' | 'monthly';

const getIconForChallengeType = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
        study_time: <FiClock className="w-4 h-4" />,
        cards_reviewed: <FiBook className="w-4 h-4" />,
        sessions_completed: <FiTarget className="w-4 h-4" />,
        streak_days: <FiZap className="w-4 h-4" />,
        goals_completed: <FiCheckCircle className="w-4 h-4" />,
        xp_earned: <FiTrendingUp className="w-4 h-4" />,
        perfect_sessions: <FiStar className="w-4 h-4" />,
        default: <FiAward className="w-4 h-4" />,
    };
    return icons[type] || icons.default;
};

const ChallengeCard: React.FC<{
    challenge: Challenge;
    delay?: number;
}> = ({ challenge, delay = 0 }) => {
    const isCompleted = challenge.status === 'completed';
    const isFailed = challenge.status === 'failed';
    const progress = Math.min(100, challenge.progress);

    const getStatusColor = () => {
        if (isCompleted) return 'from-emerald-500 to-green-500';
        if (isFailed) return 'from-rose-500 to-red-500';
        if (progress >= 75) return 'from-amber-500 to-yellow-500';
        return 'from-primary-500 to-indigo-500';
    };

    const getTimeRemaining = () => {
        const now = new Date();
        const expires = new Date(challenge.expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return 'Scaduta';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}g ${hours % 24}h`;
        if (hours > 0) return `${hours}h`;
        return '< 1h';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            className={`rounded-xl border ${
                isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isFailed
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : 'border-white/15 bg-slate-900/50'
            } p-4 relative overflow-hidden shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)]`}
        >
            <div className="absolute -top-10 -right-8 h-24 w-24 rotate-12 rounded-[18px] bg-white/[0.04] border border-white/10" />
            <div className="absolute -bottom-8 -left-6 h-20 w-20 -rotate-12 rounded-[16px] bg-white/[0.03] border border-white/10" />
            {/* Completed Badge */}
            {isCompleted && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                >
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                        <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${getStatusColor()} bg-opacity-20 shadow-lg shadow-black/10`}
                >
                    {getIconForChallengeType(challenge.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate pr-8">
                        {challenge.title}
                    </h4>
                    <p className="text-xs text-white/70 line-clamp-2 mt-0.5">
                        {challenge.description}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/70">
                        {challenge.currentValue} / {challenge.targetValue}
                    </span>
                    <span className="text-xs font-medium text-white/90">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${getStatusColor()} shadow-lg shadow-white/10`}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <FiClock className="w-3 h-3" />
                    <span>{getTimeRemaining()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <FiZap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">
                        +{challenge.xpReward} XP
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export const ChallengesSection: React.FC<ChallengesSectionProps> = ({
    challenges,
    onRefresh,
    isLoading = false,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('daily');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'daily', label: 'Giornaliere', icon: <FiCalendar className="w-4 h-4" /> },
        { key: 'weekly', label: 'Settimanali', icon: <FiClock className="w-4 h-4" /> },
        { key: 'monthly', label: 'Mensili', icon: <FiTarget className="w-4 h-4" /> },
    ];

    const currentChallenges = challenges[activeTab] || [];

    const handleRefresh = async () => {
        if (!onRefresh || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await onRefresh(activeTab);
        } finally {
            setIsRefreshing(false);
        }
    };

    const completedCount = currentChallenges.filter((c) => c.status === 'completed').length;
    const totalCount = currentChallenges.length;

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4 animate-pulse"></div>
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-white/10 rounded-xl flex-1 animate-pulse"></div>
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-white/10 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/15 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden shadow-[0_22px_50px_-30px_rgba(15,23,42,0.9)]"
        >
            <div className="absolute -top-16 -right-10 h-36 w-36 rotate-12 rounded-[26px] bg-white/[0.04] border border-white/10" />
            <div className="absolute -bottom-14 -left-10 h-32 w-32 -rotate-12 rounded-[24px] bg-white/[0.03] border border-white/10" />
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500 shadow-lg shadow-black/20">
                        <FiTarget className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Challenges</h3>
                        <p className="text-sm text-white/70">
                            {completedCount}/{totalCount} completate
                        </p>
                    </div>
                </div>

                {onRefresh && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.12] transition-all disabled:opacity-50"
                    >
                        <motion.div
                            animate={isRefreshing ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
                        >
                            <FiRefreshCw className="w-4 h-4" />
                        </motion.div>
                    </motion.button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/[0.06] rounded-xl mb-6 border border-white/10">
                {tabs.map((tab) => (
                    <motion.button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-white/15 text-white shadow-lg'
                                : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Challenges List */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                >
                    {currentChallenges.length > 0 ? (
                        currentChallenges.map((challenge, index) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                delay={index * 0.1}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                                <FiTarget className="w-8 h-8 text-white/30" />
                            </div>
                            <p className="text-white/50">Nessuna challenge disponibile</p>
                            <p className="text-xs text-white/30 mt-1">
                                Le nuove challenges verranno generate presto
                            </p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default ChallengesSection;
