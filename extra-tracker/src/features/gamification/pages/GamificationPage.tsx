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
        <div className="min-h-screen pb-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-white mb-2"
                        >
                            Gamification
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-white/60"
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
                        className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
                    >
                        <motion.div
                            animate={isRefreshing ? { rotate: 360 } : {}}
                            transition={{
                                duration: 1,
                                repeat: isRefreshing ? Infinity : 0,
                                ease: 'linear',
                            }}
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
    );
};

export default GamificationPage;
