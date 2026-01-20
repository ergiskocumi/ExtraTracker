/**
 * LEVEL PROGRESS COMPONENT
 *
 * Mostra il livello attuale, XP, rank e progresso verso il livello successivo.
 */

import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiZap } from 'react-icons/fi';
import { RankBadge } from './RankBadge';
import { LevelBadge } from './LevelBadge';

interface LevelProgressProps {
    level: number;
    title: string;
    rank: string;
    xp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    totalXp: number;
    multiplier?: number;
    isLoading?: boolean;
}

const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
        novice: 'from-slate-400 to-gray-500',
        apprentice: 'from-emerald-400 to-green-500',
        journeyman: 'from-blue-400 to-indigo-500',
        expert: 'from-purple-400 to-violet-500',
        master: 'from-amber-400 to-yellow-500',
        grandmaster: 'from-rose-400 to-pink-500',
        legend: 'from-cyan-400 to-teal-500',
    };
    return colors[rank.toLowerCase()] || colors.novice;
};

export const LevelProgress: React.FC<LevelProgressProps> = ({
    level,
    title,
    rank,
    xp,
    xpForCurrentLevel,
    xpForNextLevel,
    totalXp,
    multiplier = 1,
    isLoading = false,
}) => {
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    const progress = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);
    const rankColor = getRankColor(rank);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 animate-pulse">
                <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="h-24 bg-white/10 rounded-xl mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-full"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/15 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden shadow-[0_20px_50px_-30px_rgba(15,23,42,0.9)]"
        >
            <div className="absolute -top-16 -right-10 h-40 w-40 rotate-12 rounded-[28px] bg-white/[0.04] border border-white/10" />
            <div className="absolute -bottom-12 -left-8 h-32 w-32 -rotate-12 rounded-[24px] bg-gradient-to-br from-white/[0.06] to-transparent border border-white/10" />
            {/* Background Gradient */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${rankColor} opacity-5`}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${rankColor}`}>
                        <FiAward className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Livello & Rank</h3>
                        <p className="text-sm text-white/70">{totalXp.toLocaleString()} XP totali</p>
                    </div>
                </div>

                {multiplier > 1 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30"
                    >
                        <FiZap className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-400">{multiplier.toFixed(1)}x</span>
                    </motion.div>
                )}
            </div>

            {/* Level Display */}
            <div className="relative flex items-center gap-6 mb-6">
                {/* Level Circle */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${rankColor} flex items-center justify-center shadow-lg shadow-black/20`}
                    style={{
                        boxShadow: `0 0 40px rgba(255, 255, 255, 0.12)`,
                    }}
                >
                    <div className="text-center">
                        <span className="text-3xl font-bold text-white">{level}</span>
                        <p className="text-xs text-white/70 uppercase tracking-wider">LVL</p>
                    </div>

                    {/* Circular Progress */}
                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90"
                        viewBox="0 0 100 100"
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="46"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="4"
                        />
                        <motion.circle
                            cx="50"
                            cy="50"
                            r="46"
                            fill="none"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 46}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                            animate={{
                                strokeDashoffset: 2 * Math.PI * 46 * (1 - progress / 100),
                            }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </svg>
                </motion.div>

                {/* Title & Rank */}
                <div className="flex-1">
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xl font-bold text-white mb-1"
                    >
                        {title}
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <RankBadge rank={rank} size="sm" />
                        <LevelBadge level={level} size="sm" variant="icon" />
                    </motion.div>
                </div>
            </div>

            {/* XP Progress Bar */}
            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Progresso livello</span>
                    <span className="text-sm font-medium text-white">
                        {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
                    </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${rankColor} shadow-lg shadow-white/10`}
                    />
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/60">Livello {level}</span>
                    <div className="flex items-center gap-1.5">
                        <FiTrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400">
                            {(xpNeededForLevel - xpInCurrentLevel).toLocaleString()} XP al prossimo livello
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default LevelProgress;
