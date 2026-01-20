/**
 * ACHIEVEMENTS SECTION COMPONENT
 *
 * Mostra gli achievements dell'utente organizzati per categoria e stato:
 * - Sbloccati
 * - In progresso
 * - Bloccati
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiAward,
    FiLock,
    FiCheckCircle,
    FiTrendingUp,
    FiBook,
    FiZap,
    FiTarget,
    FiClock,
    FiStar,
    FiFilter,
} from 'react-icons/fi';
import type { Achievement, AchievementsData } from '../services/gamificationService';

interface AchievementsSectionProps {
    achievements: AchievementsData;
    isLoading?: boolean;
}

type FilterType = 'all' | 'unlocked' | 'inProgress' | 'locked';
type CategoryType = 'all' | string;

const getTierConfig = (tier: Achievement['tier']) => {
    const configs = {
        bronze: {
            gradient: 'from-amber-700 to-orange-800',
            border: 'border-amber-600/30',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
        },
        silver: {
            gradient: 'from-slate-400 to-gray-500',
            border: 'border-slate-400/30',
            bg: 'bg-slate-400/10',
            text: 'text-slate-300',
        },
        gold: {
            gradient: 'from-yellow-400 to-amber-500',
            border: 'border-yellow-400/30',
            bg: 'bg-yellow-400/10',
            text: 'text-yellow-400',
        },
        platinum: {
            gradient: 'from-cyan-400 to-blue-500',
            border: 'border-cyan-400/30',
            bg: 'bg-cyan-400/10',
            text: 'text-cyan-400',
        },
        diamond: {
            gradient: 'from-violet-400 to-purple-500',
            border: 'border-violet-400/30',
            bg: 'bg-violet-400/10',
            text: 'text-violet-400',
        },
    };
    return configs[tier] || configs.bronze;
};

const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
        study: <FiBook className="w-4 h-4" />,
        streak: <FiZap className="w-4 h-4" />,
        goals: <FiTarget className="w-4 h-4" />,
        time: <FiClock className="w-4 h-4" />,
        mastery: <FiStar className="w-4 h-4" />,
        progress: <FiTrendingUp className="w-4 h-4" />,
        default: <FiAward className="w-4 h-4" />,
    };
    return icons[category] || icons.default;
};

const AchievementCard: React.FC<{
    achievement: Achievement;
    delay?: number;
}> = ({ achievement, delay = 0 }) => {
    const tierConfig = getTierConfig(achievement.tier);
    const isUnlocked = achievement.isUnlocked;
    const progress = achievement.progress.percentage;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            className={`rounded-xl border ${
                isUnlocked ? tierConfig.border : 'border-white/15'
            } ${isUnlocked ? tierConfig.bg : 'bg-slate-900/50'} p-4 relative overflow-hidden group hover:bg-white/[0.06] transition-all shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)]`}
        >
            <div className="absolute -top-8 -right-6 h-20 w-20 rotate-12 rounded-[16px] bg-white/[0.04] border border-white/10" />
            <div className="absolute -bottom-10 -left-6 h-24 w-24 -rotate-12 rounded-[18px] bg-white/[0.03] border border-white/10" />
            {/* Locked Overlay */}
            {!isUnlocked && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiLock className="w-6 h-6 text-white/60" />
                </div>
            )}

            {/* Tier Badge */}
            <div className="absolute top-3 right-3">
                <div
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${tierConfig.bg} ${tierConfig.text}`}
                >
                    {achievement.tier}
                </div>
            </div>

            {/* Icon & Title */}
            <div className="flex items-start gap-3 mb-3">
                <div
                    className={`p-2.5 rounded-xl ${
                        isUnlocked
                            ? `bg-gradient-to-br ${tierConfig.gradient}`
                            : 'bg-white/10'
                    } ${!isUnlocked && 'opacity-50'}`}
                >
                    {getCategoryIcon(achievement.category)}
                </div>
                <div className="flex-1 min-w-0 pr-16">
                    <h4
                        className={`text-sm font-semibold ${
                            isUnlocked ? 'text-white' : 'text-white/70'
                        } truncate`}
                    >
                        {achievement.name}
                    </h4>
                    <p
                        className={`text-xs ${
                            isUnlocked ? 'text-white/70' : 'text-white/60'
                        } line-clamp-2 mt-0.5`}
                    >
                        {achievement.description}
                    </p>
                </div>
            </div>

            {/* Progress Bar (for locked achievements) */}
            {!isUnlocked && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/60">
                            {achievement.progress.current} / {achievement.progress.target}
                        </span>
                        <span className="text-xs font-medium text-white/80">
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 opacity-80 shadow-lg shadow-primary-500/20"
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {isUnlocked ? (
                        <>
                            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">Sbloccato</span>
                        </>
                    ) : (
                        <>
                            <FiLock className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-xs text-white/50">Bloccato</span>
                        </>
                    )}
                </div>
                <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                        isUnlocked
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-white/[0.06] border border-white/15'
                    }`}
                >
                    <FiZap
                        className={`w-3 h-3 ${isUnlocked ? 'text-amber-400' : 'text-white/50'}`}
                    />
                    <span
                        className={`text-xs font-medium ${
                            isUnlocked ? 'text-amber-400' : 'text-white/60'
                        }`}
                    >
                        +{achievement.xpReward} XP
                    </span>
                </div>
            </div>

            {/* Unlocked Date */}
            {isUnlocked && achievement.unlockedAt && (
                <p className="text-[10px] text-white/50 mt-2">
                    Sbloccato il {new Date(achievement.unlockedAt).toLocaleDateString('it-IT')}
                </p>
            )}
        </motion.div>
    );
};

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
    achievements,
    isLoading = false,
}) => {
    const [filter, setFilter] = useState<FilterType>('all');
    const [category, setCategory] = useState<CategoryType>('all');

    const categories = useMemo(() => {
        const cats = Object.keys(achievements.byCategory || {});
        return ['all', ...cats];
    }, [achievements.byCategory]);

    const filteredAchievements = useMemo(() => {
        let result = achievements.all || [];

        // Filter by status
        switch (filter) {
            case 'unlocked':
                result = result.filter((a) => a.isUnlocked);
                break;
            case 'inProgress':
                result = result.filter((a) => !a.isUnlocked && a.progress.percentage > 0);
                break;
            case 'locked':
                result = result.filter((a) => !a.isUnlocked && a.progress.percentage === 0);
                break;
        }

        // Filter by category
        if (category !== 'all') {
            result = result.filter((a) => a.category === category);
        }

        // Sort: unlocked first, then by progress
        result.sort((a, b) => {
            if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
            return b.progress.percentage - a.progress.percentage;
        });

        return result;
    }, [achievements, filter, category]);

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'Tutti' },
        { key: 'unlocked', label: 'Sbloccati' },
        { key: 'inProgress', label: 'In corso' },
        { key: 'locked', label: 'Bloccati' },
    ];

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4 animate-pulse"></div>
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 bg-white/10 rounded-lg w-20 animate-pulse"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-36 bg-white/10 rounded-xl animate-pulse"></div>
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
            <div className="absolute -top-16 -left-10 h-36 w-36 -rotate-12 rounded-[26px] bg-white/[0.04] border border-white/10" />
            <div className="absolute -bottom-16 -right-12 h-40 w-40 rotate-12 rounded-[28px] bg-white/[0.03] border border-white/10" />
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg shadow-black/20">
                        <FiAward className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Achievements</h3>
                        <p className="text-sm text-white/70">
                            {achievements.stats?.unlocked || 0}/{achievements.stats?.total || 0}{' '}
                            sbloccati ({achievements.stats?.percentage?.toFixed(0) || 0}%)
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Overview */}
            <div className="mb-6">
                <div className="h-3 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${achievements.stats?.percentage || 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 shadow-lg shadow-amber-500/20"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                {filters.map((f) => (
                    <motion.button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            filter === f.key
                                ? 'bg-white/15 text-white border border-white/20'
                                : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06] border border-transparent'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {f.label}
                    </motion.button>
                ))}
            </div>

            {/* Category Filter */}
            {categories.length > 2 && (
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                    <FiFilter className="w-4 h-4 text-white/40 flex-shrink-0" />
                    {categories.map((cat) => (
                        <motion.button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                category === cat
                                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                                    : 'text-white/60 hover:text-white/80 bg-white/[0.04] border border-white/10'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {cat === 'all' ? 'Tutte' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Achievements Grid */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${filter}-${category}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {filteredAchievements.length > 0 ? (
                        filteredAchievements.map((achievement, index) => (
                            <AchievementCard
                                key={achievement.id}
                                achievement={achievement}
                                delay={index * 0.05}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center border border-white/10">
                                <FiAward className="w-8 h-8 text-white/50" />
                            </div>
                            <p className="text-white/70">Nessun achievement trovato</p>
                            <p className="text-xs text-white/50 mt-1">
                                Prova a cambiare i filtri
                            </p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default AchievementsSection;
