/**
 * ACHIEVEMENT SERVICE
 *
 * Gestione sistema achievements/badge con tier progressivi.
 */

const User = require('../models/User');
const eventBus = require('../utils/eventBus');
const {
    ACHIEVEMENTS,
    ACHIEVEMENT_TIERS,
    ACHIEVEMENT_BASE_XP
} = require('../config/gamification');

/**
 * Ordine dei tier per comparazione
 */
const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

/**
 * Ottiene il prossimo tier
 */
const getNextTier = (currentTier) => {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex >= TIER_ORDER.length - 1) {
        return null;
    }
    return TIER_ORDER[currentIndex + 1];
};

/**
 * Calcola XP per un achievement a un dato tier
 */
const calculateAchievementXp = (tier) => {
    const tierInfo = ACHIEVEMENT_TIERS[tier];
    if (!tierInfo) return ACHIEVEMENT_BASE_XP;
    return Math.floor(ACHIEVEMENT_BASE_XP * tierInfo.multiplier);
};

/**
 * Verifica se un valore soddisfa il requisito di un tier
 */
const checkTierRequirement = (value, requirement) => {
    // Per achievement basati su rank (string)
    if (typeof requirement === 'string') {
        const rankOrder = ['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'];
        return rankOrder.indexOf(value) >= rankOrder.indexOf(requirement);
    }
    // Per achievement numerici
    return value >= requirement;
};

/**
 * Verifica e sblocca achievements per un utente
 * Chiamata dopo ogni aggiornamento di stat
 */
const checkAchievements = async (userId, statsToCheck = null) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const currentAchievements = gamification.achievements || [];
    const stats = gamification.stats || {};
    const extendedStats = gamification.extendedStats || {};
    const level = gamification.level || 1;
    const xp = gamification.xp || 0;

    // Combina tutte le stats
    const allStats = {
        ...stats,
        ...extendedStats,
        level,
        xp
    };

    const unlockedAchievements = [];
    const newAchievements = [];

    // Filtra achievements da controllare
    const achievementsToCheck = statsToCheck
        ? Object.values(ACHIEVEMENTS).filter(a => statsToCheck.includes(a.stat))
        : Object.values(ACHIEVEMENTS);

    for (const achievement of achievementsToCheck) {
        const statValue = allStats[achievement.stat];
        if (statValue === undefined) continue;

        // Trova il tier più alto attualmente sbloccato per questo achievement
        const currentUnlocked = currentAchievements.find(a => a.achievementId === achievement.id);
        const currentTier = currentUnlocked?.tier || null;
        const currentTierIndex = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;

        // Verifica ogni tier disponibile
        for (let i = currentTierIndex + 1; i < TIER_ORDER.length; i++) {
            const tier = TIER_ORDER[i];
            const requirement = achievement.tiers[tier];

            if (requirement === undefined) continue;

            if (checkTierRequirement(statValue, requirement)) {
                const xpEarned = calculateAchievementXp(tier);

                newAchievements.push({
                    achievementId: achievement.id,
                    tier,
                    xpEarned,
                    achievement: {
                        ...achievement,
                        tierInfo: ACHIEVEMENT_TIERS[tier]
                    }
                });

                unlockedAchievements.push({
                    achievementId: achievement.id,
                    tier,
                    unlockedAt: new Date(),
                    xpEarned
                });
            }
        }
    }

    // Aggiorna database se ci sono nuovi achievements
    if (newAchievements.length > 0) {
        // Rimuovi vecchi tier dello stesso achievement e aggiungi i nuovi
        const achievementIds = newAchievements.map(a => a.achievementId);

        // Prima rimuovi i vecchi
        await User.findByIdAndUpdate(userId, {
            $pull: {
                'gamification.achievements': {
                    achievementId: { $in: achievementIds }
                }
            }
        });

        // Poi aggiungi i nuovi (includi tier più alto raggiunto)
        const achievementsToAdd = [];
        for (const achievementId of achievementIds) {
            const highest = newAchievements
                .filter(a => a.achievementId === achievementId)
                .reduce((best, current) => {
                    const currentIndex = TIER_ORDER.indexOf(current.tier);
                    const bestIndex = TIER_ORDER.indexOf(best.tier);
                    return currentIndex > bestIndex ? current : best;
                });

            achievementsToAdd.push({
                achievementId: highest.achievementId,
                tier: highest.tier,
                unlockedAt: new Date(),
                xpEarned: highest.xpEarned
            });
        }

        await User.findByIdAndUpdate(userId, {
            $push: {
                'gamification.achievements': { $each: achievementsToAdd }
            },
            $inc: {
                'gamification.extendedStats.challengesCompleted': newAchievements.length
            }
        });

        // Assegna XP per ogni achievement
        const totalXp = newAchievements.reduce((sum, a) => sum + a.xpEarned, 0);
        if (totalXp > 0) {
            await User.findByIdAndUpdate(userId, {
                $inc: { 'gamification.xp': totalXp }
            });
        }

        // Emit eventi per ogni nuovo achievement
        for (const achievement of newAchievements) {
            eventBus.emit('gamification.achievement.unlocked', {
                userId,
                achievementId: achievement.achievementId,
                tier: achievement.tier,
                xpEarned: achievement.xpEarned,
                achievement: achievement.achievement
            });
        }
    }

    return {
        newAchievements,
        totalXpEarned: newAchievements.reduce((sum, a) => sum + a.xpEarned, 0)
    };
};

/**
 * Ottiene tutti gli achievements con lo stato per un utente
 */
const getUserAchievements = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const unlockedAchievements = gamification.achievements || [];
    const stats = gamification.stats || {};
    const extendedStats = gamification.extendedStats || {};
    const level = gamification.level || 1;
    const xp = gamification.xp || 0;

    const allStats = {
        ...stats,
        ...extendedStats,
        level,
        xp
    };

    const achievements = [];

    for (const achievement of Object.values(ACHIEVEMENTS)) {
        const unlocked = unlockedAchievements.find(a => a.achievementId === achievement.id);
        const currentValue = allStats[achievement.stat] || 0;

        // Costruisci info tier
        const tiers = [];
        for (const tier of TIER_ORDER) {
            const requirement = achievement.tiers[tier];
            if (requirement === undefined) continue;

            const isUnlocked = unlocked && TIER_ORDER.indexOf(unlocked.tier) >= TIER_ORDER.indexOf(tier);
            const progress = typeof requirement === 'number'
                ? Math.min((currentValue / requirement) * 100, 100)
                : (checkTierRequirement(currentValue, requirement) ? 100 : 0);

            tiers.push({
                tier,
                requirement,
                isUnlocked,
                progress: Math.floor(progress),
                xpReward: calculateAchievementXp(tier),
                color: ACHIEVEMENT_TIERS[tier].color
            });
        }

        // Trova prossimo tier da sbloccare
        const nextTier = tiers.find(t => !t.isUnlocked);

        achievements.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            stat: achievement.stat,
            currentValue,
            currentTier: unlocked?.tier || null,
            unlockedAt: unlocked?.unlockedAt || null,
            totalXpEarned: unlocked?.xpEarned || 0,
            tiers,
            nextTier: nextTier || null,
            isFullyCompleted: !nextTier
        });
    }

    // Raggruppa per categoria
    const byCategory = achievements.reduce((acc, achievement) => {
        if (!acc[achievement.category]) {
            acc[achievement.category] = [];
        }
        acc[achievement.category].push(achievement);
        return acc;
    }, {});

    // Statistiche generali
    const totalAchievements = achievements.length;
    const unlockedCount = achievements.filter(a => a.currentTier).length;
    const fullyCompletedCount = achievements.filter(a => a.isFullyCompleted).length;

    // Conta per tier
    const tierCounts = {};
    for (const tier of TIER_ORDER) {
        tierCounts[tier] = unlockedAchievements.filter(a => a.tier === tier).length;
    }

    return {
        achievements,
        byCategory,
        stats: {
            total: totalAchievements,
            unlocked: unlockedCount,
            fullyCompleted: fullyCompletedCount,
            tierCounts,
            completionPercent: Math.floor((unlockedCount / totalAchievements) * 100)
        }
    };
};

/**
 * Ottiene un singolo achievement con dettagli
 */
const getAchievementDetails = async (userId, achievementId) => {
    const userAchievements = await getUserAchievements(userId);
    const achievement = userAchievements.achievements.find(a => a.id === achievementId);

    if (!achievement) {
        throw new Error('Achievement non trovato');
    }

    return achievement;
};

/**
 * Ottiene achievements recentemente sbloccati
 */
const getRecentAchievements = async (userId, limit = 5) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const achievements = user.gamification?.achievements || [];

    // Ordina per data e prendi i più recenti
    const recent = achievements
        .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
        .slice(0, limit)
        .map(a => {
            const achievementDef = ACHIEVEMENTS[a.achievementId];
            return {
                ...a,
                name: achievementDef?.name || 'Unknown',
                description: achievementDef?.description || '',
                category: achievementDef?.category || 'unknown',
                tierInfo: ACHIEVEMENT_TIERS[a.tier]
            };
        });

    return recent;
};

/**
 * Verifica specifici achievements dopo un'azione
 * Utility per chiamare dopo azioni specifiche
 */
const checkAchievementsForStats = async (userId, ...statNames) => {
    return await checkAchievements(userId, statNames);
};

module.exports = {
    checkAchievements,
    checkAchievementsForStats,
    getUserAchievements,
    getAchievementDetails,
    getRecentAchievements,
    calculateAchievementXp,

    // Helpers
    TIER_ORDER,
    getNextTier
};
