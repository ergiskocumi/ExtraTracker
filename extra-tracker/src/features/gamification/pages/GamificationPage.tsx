/**
 * GAMIFICATION PAGE
 *
 * Pagina principale per visualizzare tutti gli elementi del sistema di gamification:
 * - Livello e rank
 * - Streak
 * - Challenges (daily, weekly, monthly)
 * - Achievements
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';
import { emitToast } from '../../../shared/components/toast';
import { gamificationService } from '../services/gamificationService';
import type {
    GamificationStatus,
    StreakInfo,
    ChallengesData,
    AchievementsData,
} from '../services/gamificationService';
import { LevelProgress } from '../components/LevelProgress';
import { LevelBadge } from '../components/LevelBadge';
import { StreakCard } from '../components/StreakCard';
import { ChallengesSection } from '../components/ChallengesSection';
import { AchievementsSection } from '../components/AchievementsSection';

export const GamificationPage: React.FC = () => {
    const [status, setStatus] = useState<GamificationStatus | null>(null);
    const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
    const [challenges, setChallenges] = useState<ChallengesData | null>(null);
    const [achievements, setAchievements] = useState<AchievementsData | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch all data
    const fetchData = useCallback(async () => {
        try {
            const [statusData, streakData, challengesData, achievementsData] =
                await Promise.all([
                    gamificationService.getStatus(),
                    gamificationService.getStreakInfo(),
                    gamificationService.getChallenges(),
                    gamificationService.getAchievements(),
                ]);

            setStatus(statusData);
            setStreakInfo(streakData);
            setChallenges(challengesData);
            setAchievements(achievementsData);
        } catch (error) {
            console.error('Error fetching gamification data:', error);
            emitToast.error('Errore nel caricamento dei dati gamification');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Refresh all data
    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await fetchData();
            emitToast.success('Dati aggiornati');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Purchase streak freeze
    const handlePurchaseFreeze = async () => {
        try {
            const result = await gamificationService.purchaseStreakFreeze();
            if (result.success) {
                emitToast.success('Streak Freeze acquistato!');
                // Refresh streak info
                const updatedStreak = await gamificationService.getStreakInfo();
                setStreakInfo(updatedStreak);
            } else {
                emitToast.error(result.reason || 'Errore nell\'acquisto');
            }
        } catch (error) {
            console.error('Error purchasing freeze:', error);
            emitToast.error('Errore nell\'acquisto dello streak freeze');
        }
    };

    // Refresh challenges
    const handleRefreshChallenges = async (period?: 'daily' | 'weekly' | 'monthly') => {
        try {
            const updatedChallenges = await gamificationService.refreshChallenges(period);
            setChallenges(updatedChallenges);
            emitToast.success('Challenges aggiornate');
        } catch (error) {
            console.error('Error refreshing challenges:', error);
            emitToast.error('Errore nel refresh delle challenges');
        }
    };

    return (
        <div className="relative min-h-screen pb-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -right-24 h-64 w-64 rotate-12 rounded-[32px] bg-gradient-to-br from-primary-500/20 via-indigo-500/10 to-transparent blur-2xl" />
                <div className="absolute top-32 -left-16 h-48 w-48 -rotate-12 rounded-[28px] bg-gradient-to-br from-amber-400/15 via-rose-500/10 to-transparent blur-2xl" />
                <div className="absolute bottom-0 right-0 h-72 w-72 rounded-[36px] bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/70"
                            >
                                Progress Hub
                            </motion.div>
                            <div className="mt-3 flex items-center gap-3">
                                <motion.h1
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-3xl font-bold text-white"
                                >
                                    Gamification
                                </motion.h1>
                                <LevelBadge level={status?.level || 1} size="sm" variant="icon" />
                            </div>
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="mt-2 text-white/70"
                            >
                                Traccia i tuoi progressi, sblocca achievements e completa le challenges
                            </motion.p>
                        </div>

                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="group p-3 rounded-xl border border-white/10 bg-white/[0.06] text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.12] shadow-lg shadow-black/10 transition-all disabled:opacity-50"
                        >
                            <motion.div
                                animate={isRefreshing ? { rotate: 360 } : {}}
                                transition={{
                                    duration: 1,
                                    repeat: isRefreshing ? Infinity : 0,
                                    ease: 'linear',
                                }}
                                className="group-hover:text-white"
                            >
                                <FiRefreshCw className="w-5 h-5" />
                            </motion.div>
                        </motion.button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                {/* Top Section: Level & Streak */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Level Progress */}
                    <LevelProgress
                        level={status?.level || 1}
                        title={status?.title || 'Principiante'}
                        rank={status?.rank || 'Novice'}
                        xp={status?.xp || 0}
                        xpForCurrentLevel={status?.xpForCurrentLevel || 0}
                        xpForNextLevel={status?.xpForNextLevel || 100}
                        totalXp={status?.totalXp || 0}
                        multiplier={status?.multipliers?.total}
                        isLoading={isLoading}
                    />

                    {/* Streak Card */}
                    <StreakCard
                        streak={
                            streakInfo || {
                                current: 0,
                                longest: 0,
                                lastActivityDate: null,
                                freezesAvailable: 0,
                                isAtRisk: false,
                                freezeCost: 100,
                                maxFreezes: 3,
                                daysUntilReset: 24,
                            }
                        }
                        onPurchaseFreeze={handlePurchaseFreeze}
                        isLoading={isLoading}
                    />
                </div>

                {/* Challenges Section */}
                <ChallengesSection
                    challenges={
                        challenges || {
                            daily: [],
                            weekly: [],
                            monthly: [],
                        }
                    }
                    onRefresh={handleRefreshChallenges}
                    isLoading={isLoading}
                />

                {/* Achievements Section */}
                <AchievementsSection
                    achievements={
                        achievements || {
                            all: [],
                            unlocked: [],
                            inProgress: [],
                            byCategory: {},
                            stats: { total: 0, unlocked: 0, percentage: 0 },
                        }
                    }
                    isLoading={isLoading}
                />
                </div>
            </div>
        </div>
    );
};

export default GamificationPage;
