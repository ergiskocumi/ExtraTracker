/**
 * GAMIFICATION SERVICE
 *
 * Servizio principale per calcolo XP, multipliers, level up,
 * e gestione del sistema di gamification.
 */

const User = require('../models/User');
const eventBus = require('../utils/eventBus');
const {
    XP_ACTIONS,
    XP_MULTIPLIERS,
    DAILY_XP_CAPS,
    getXpForLevel,
    getLevelFromXp,
    getCumulativeXpForLevel,
    getLevelMultiplier,
    getRankForLevel,
    getStreakMultiplier,
    isWeekend,
    getComboMultiplier,
    getStreakMilestoneBonus,
    LEVEL_TITLES
} = require('../config/gamification');

/**
 * Helper: verifica se due date sono lo stesso giorno
 */
const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

/**
 * Helper: verifica se una data è oggi
 */
const isToday = (date) => {
    return isSameDay(date, new Date());
};

/**
 * Helper: ottiene inizio settimana (lunedì)
 */
const getWeekStart = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Helper: ottiene inizio mese
 */
const getMonthStart = (date = new Date()) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Calcola tutti i multipliers attivi per un utente
 */
const calculateMultipliers = async (userId, options = {}) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const now = new Date();
    const multipliers = [];
    let totalMultiplier = 1.0;

    // 1. Streak multiplier
    const streakDays = gamification.streak?.current || 0;
    const streakMult = getStreakMultiplier(streakDays);
    if (streakMult > 1.0) {
        multipliers.push({
            type: 'streak',
            value: streakMult,
            description: `Streak ${streakDays} giorni`
        });
        totalMultiplier *= streakMult;
    }

    // 2. Weekend multiplier
    if (isWeekend(now)) {
        multipliers.push({
            type: 'weekend',
            value: XP_MULTIPLIERS.WEEKEND,
            description: 'Bonus Weekend'
        });
        totalMultiplier *= XP_MULTIPLIERS.WEEKEND;
    }

    // 3. First of day multiplier
    if (options.isFirstOfDay) {
        multipliers.push({
            type: 'first_of_day',
            value: XP_MULTIPLIERS.FIRST_OF_DAY,
            description: 'Prima attività del giorno'
        });
        totalMultiplier *= XP_MULTIPLIERS.FIRST_OF_DAY;
    }

    // 4. Combo multiplier
    const comboCount = gamification.comboCount || 0;
    if (comboCount > 0) {
        const comboMult = getComboMultiplier(comboCount);
        if (comboMult > 1.0) {
            multipliers.push({
                type: 'combo',
                value: comboMult,
                description: `Combo x${comboCount}`
            });
            totalMultiplier *= comboMult;
        }
    }

    // 5. Weekly consistency multiplier
    const weeklyActivity = gamification.weeklyActivity || {};
    if (weeklyActivity.daysActive && weeklyActivity.daysActive.length === 7) {
        multipliers.push({
            type: 'weekly_consistency',
            value: XP_MULTIPLIERS.WEEKLY_CONSISTENCY,
            description: 'Settimana completa!'
        });
        totalMultiplier *= XP_MULTIPLIERS.WEEKLY_CONSISTENCY;
    }

    // 6. Level multiplier
    const level = gamification.level || 1;
    const levelMult = getLevelMultiplier(level);
    if (levelMult > 1.0) {
        multipliers.push({
            type: 'level',
            value: levelMult,
            description: `Livello ${level}`
        });
        totalMultiplier *= levelMult;
    }

    // Apply cap
    totalMultiplier = Math.min(totalMultiplier, XP_MULTIPLIERS.MAX_TOTAL);

    return {
        multipliers,
        totalMultiplier,
        capped: totalMultiplier >= XP_MULTIPLIERS.MAX_TOTAL
    };
};

/**
 * Verifica e aggiorna i daily XP caps
 */
const checkDailyCap = async (userId, category, xpToAdd) => {
    const user = await User.findById(userId);
    if (!user) return { allowed: 0, remaining: 0 };

    const gamification = user.gamification || {};
    const dailyCaps = gamification.dailyXpCaps || {};
    const cap = DAILY_XP_CAPS[category];

    if (!cap) {
        // Nessun cap per questa categoria
        return { allowed: xpToAdd, remaining: Infinity };
    }

    // Reset caps se è un nuovo giorno
    if (!dailyCaps.date || !isToday(dailyCaps.date)) {
        await User.findByIdAndUpdate(userId, {
            'gamification.dailyXpCaps.date': new Date(),
            'gamification.dailyXpCaps.byCategory': {
                study: 0,
                work: 0,
                notes: 0,
                projects: 0
            }
        });
        return { allowed: Math.min(xpToAdd, cap), remaining: cap - Math.min(xpToAdd, cap) };
    }

    const currentUsed = dailyCaps.byCategory?.[category] || 0;
    const remaining = cap - currentUsed;
    const allowed = Math.min(xpToAdd, remaining);

    return { allowed, remaining: remaining - allowed };
};

/**
 * Aggiorna il cap usato per una categoria
 */
const updateDailyCap = async (userId, category, xpUsed) => {
    const updatePath = `gamification.dailyXpCaps.byCategory.${category}`;
    await User.findByIdAndUpdate(userId, {
        $inc: { [updatePath]: xpUsed }
    });
};

/**
 * Calcola XP per una sessione di studio
 */
const calculateStudySessionXp = (sessionData) => {
    const {
        totalCards = 0,
        correctCards = 0,
        avgTimePerCard = 0,
        accuracy = 0
    } = sessionData;

    const config = XP_ACTIONS.SESSION_COMPLETE;
    let xp = config.base;
    const breakdown = [{ type: 'base', value: config.base, description: 'Sessione completata' }];

    // Bonus per risposte corrette
    const correctBonus = correctCards * config.perCorrect;
    if (correctBonus > 0) {
        xp += correctBonus;
        breakdown.push({ type: 'correct', value: correctBonus, description: `${correctCards} risposte corrette` });
    }

    // Speed bonus (tempo medio < 5 secondi = bonus pieno)
    if (avgTimePerCard > 0 && avgTimePerCard < 10000) {
        const speedFactor = Math.max(0, 1 - (avgTimePerCard / 10000));
        const speedBonus = Math.floor(speedFactor * config.speedBonus.max);
        if (speedBonus > 0) {
            xp += speedBonus;
            breakdown.push({ type: 'speed', value: speedBonus, description: 'Velocità risposta' });
        }
    }

    // Accuracy bonus
    const accuracyConfig = XP_ACTIONS.ACCURACY_BONUS;
    let accuracyBonus = 0;
    if (accuracy >= 100) {
        accuracyBonus = accuracyConfig.perfect;
    } else if (accuracy >= 90) {
        accuracyBonus = accuracyConfig.excellent;
    } else if (accuracy >= 80) {
        accuracyBonus = accuracyConfig.good;
    }

    if (accuracyBonus > 0) {
        xp += accuracyBonus;
        breakdown.push({ type: 'accuracy', value: accuracyBonus, description: `Accuratezza ${accuracy}%` });
    }

    return { baseXp: xp, breakdown };
};

/**
 * Calcola XP per completamento goal
 */
const calculateGoalCompletedXp = (goalData) => {
    const { type, completedEarly = false, difficulty = 1, milestoneCount = 0 } = goalData;

    const config = XP_ACTIONS.GOAL_COMPLETED[type] || XP_ACTIONS.GOAL_COMPLETED.target;
    let xp = config.base;
    const breakdown = [{ type: 'base', value: config.base, description: `${type} completato` }];

    // Early bonus
    if (completedEarly && config.earlyBonus) {
        xp += config.earlyBonus;
        breakdown.push({ type: 'early', value: config.earlyBonus, description: 'Completato in anticipo' });
    }

    // Difficulty bonus
    if (difficulty > 1 && config.difficultyBonus) {
        const diffBonus = Math.floor(config.difficultyBonus * (difficulty - 1));
        if (diffBonus > 0) {
            xp += diffBonus;
            breakdown.push({ type: 'difficulty', value: diffBonus, description: `Difficoltà ${difficulty}` });
        }
    }

    // Milestones bonus
    if (milestoneCount > 0 && config.perMilestoneBonus) {
        const msBonus = milestoneCount * config.perMilestoneBonus;
        xp += msBonus;
        breakdown.push({ type: 'milestones', value: msBonus, description: `${milestoneCount} milestone` });
    }

    // Challenge difficulty multiplier
    if (type === 'challenge' && config.difficultyMultiplier) {
        const multiplierBonus = Math.floor(xp * (config.difficultyMultiplier - 1));
        xp += multiplierBonus;
        breakdown.push({ type: 'challenge_mult', value: multiplierBonus, description: 'Bonus sfida' });
    }

    return { baseXp: xp, breakdown };
};

/**
 * Calcola XP per sessione di lavoro
 */
const calculateWorkSessionXp = (sessionData) => {
    const { durationMinutes = 0 } = sessionData;
    const config = XP_ACTIONS.WORK_SESSION_LOGGED;

    let xp = config.base;
    const breakdown = [{ type: 'base', value: config.base, description: 'Sessione registrata' }];

    // Bonus per ore
    const hours = Math.min(durationMinutes / 60, config.maxHours);
    const hourBonus = Math.floor(hours * config.perHour);
    if (hourBonus > 0) {
        xp += hourBonus;
        breakdown.push({ type: 'hours', value: hourBonus, description: `${Math.round(hours * 10) / 10}h lavorate` });
    }

    return { baseXp: xp, breakdown };
};

/**
 * Calcola XP per esame superato
 */
const calculateExamXp = (examData) => {
    const { grade, laude = false } = examData;
    const config = XP_ACTIONS.EXAM_PASSED;

    let xp = config.base;
    const breakdown = [{ type: 'base', value: config.base, description: 'Esame superato' }];

    // Grade bonus
    const gradeBonus = config.gradeBonus[grade] || 0;
    if (gradeBonus > 0) {
        xp += gradeBonus;
        breakdown.push({ type: 'grade', value: gradeBonus, description: `Voto ${grade}` });
    }

    // Laude bonus
    if (laude) {
        xp += config.laudeBonus;
        breakdown.push({ type: 'laude', value: config.laudeBonus, description: 'E Lode!' });
    }

    return { baseXp: xp, breakdown };
};

/**
 * Assegna XP a un utente con tutti i calcoli
 */
const awardXp = async (userId, baseXp, options = {}) => {
    const {
        category = null,
        breakdown = [],
        skipMultipliers = false,
        source = 'unknown'
    } = options;

    let finalXp = baseXp;
    let multiplierInfo = { multipliers: [], totalMultiplier: 1.0 };

    // Check daily cap se categoria specificata
    if (category) {
        const capCheck = await checkDailyCap(userId, category, baseXp);
        if (capCheck.allowed < baseXp) {
            finalXp = capCheck.allowed;
            if (finalXp === 0) {
                return {
                    xpAwarded: 0,
                    reason: 'daily_cap_reached',
                    category
                };
            }
        }
    }

    // Calcola multipliers
    if (!skipMultipliers) {
        // Check if first activity of day
        const user = await User.findById(userId);
        const isFirstOfDay = !user?.gamification?.lastActivityTimestamp ||
                            !isToday(user.gamification.lastActivityTimestamp);

        multiplierInfo = await calculateMultipliers(userId, { isFirstOfDay });
        finalXp = Math.floor(finalXp * multiplierInfo.totalMultiplier);
    }

    // Update user XP
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const currentXp = user.gamification?.xp || 0;
    const currentLevel = user.gamification?.level || 1;
    const newXp = currentXp + finalXp;
    const newLevel = getLevelFromXp(newXp);

    // Prepare update
    const updateData = {
        'gamification.xp': newXp,
        'gamification.level': newLevel,
        'gamification.lastActivityTimestamp': new Date()
    };

    // Update rank if level changed
    if (newLevel !== currentLevel) {
        const newRank = getRankForLevel(newLevel);
        updateData['gamification.rank'] = newRank.key;
    }

    // Update daily cap if category
    if (category) {
        await updateDailyCap(userId, category, finalXp);
    }

    // Update combo count (reset if last activity was > 1 hour ago)
    const lastActivity = user.gamification?.lastActivityTimestamp;
    if (lastActivity && (Date.now() - new Date(lastActivity).getTime()) < 3600000) {
        updateData['gamification.comboCount'] = (user.gamification?.comboCount || 0) + 1;
    } else {
        updateData['gamification.comboCount'] = 1;
    }

    // Update weekly activity
    const weekStart = getWeekStart();
    const dayOfWeek = new Date().getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Lunedì, 6=Domenica

    if (!user.gamification?.weeklyActivity?.weekStart ||
        user.gamification.weeklyActivity.weekStart.getTime() !== weekStart.getTime()) {
        // Nuova settimana
        updateData['gamification.weeklyActivity'] = {
            weekStart,
            daysActive: [adjustedDay]
        };
    } else {
        // Stessa settimana, aggiungi giorno se non presente
        const currentDays = user.gamification.weeklyActivity.daysActive || [];
        if (!currentDays.includes(adjustedDay)) {
            updateData['gamification.weeklyActivity.daysActive'] = [...currentDays, adjustedDay];
        }
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Emit events
    const result = {
        xpAwarded: finalXp,
        baseXp,
        multipliers: multiplierInfo.multipliers,
        totalMultiplier: multiplierInfo.totalMultiplier,
        breakdown,
        newXp,
        newLevel,
        leveledUp: newLevel > currentLevel,
        previousLevel: currentLevel,
        source
    };

    // Emit XP awarded event
    eventBus.emit('gamification.xp.awarded', {
        userId,
        ...result
    });

    // Emit level up event if applicable
    if (newLevel > currentLevel) {
        const newRank = getRankForLevel(newLevel);
        const prevRank = getRankForLevel(currentLevel);

        eventBus.emit('gamification.level.up', {
            userId,
            previousLevel: currentLevel,
            newLevel,
            title: LEVEL_TITLES[newLevel],
            newRank: newRank.key,
            previousRank: prevRank.key,
            rankChanged: newRank.key !== prevRank.key
        });
    }

    return result;
};

/**
 * Ottiene lo stato gamification completo per un utente
 */
const getGamificationStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const level = gamification.level || 1;
    const xp = gamification.xp || 0;
    const rank = getRankForLevel(level);

    // Calcola progressione livello
    const currentLevelXp = getCumulativeXpForLevel(level);
    const nextLevelXp = getCumulativeXpForLevel(level + 1);
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForNext = nextLevelXp - currentLevelXp;
    const progressPercent = Math.floor((xpInCurrentLevel / xpNeededForNext) * 100);

    // Calcola multipliers attuali
    const multiplierInfo = await calculateMultipliers(userId, {
        isFirstOfDay: !gamification.lastActivityTimestamp ||
                      !isToday(gamification.lastActivityTimestamp)
    });

    return {
        xp,
        level,
        title: LEVEL_TITLES[level],
        rank: rank.key,
        rankColor: rank.color,
        rankName: rank.name,

        // Progressione
        progression: {
            xpInCurrentLevel,
            xpNeededForNext,
            progressPercent,
            currentLevelXp,
            nextLevelXp
        },

        // Streak
        streak: {
            current: gamification.streak?.current || 0,
            best: gamification.streak?.best || 0,
            lastActivityDate: gamification.streak?.lastActivityDate
        },

        // Multipliers
        activeMultipliers: multiplierInfo.multipliers,
        totalMultiplier: multiplierInfo.totalMultiplier,

        // Streak freezes
        streakFreezes: {
            available: gamification.streakFreezes?.available || 0,
            lastPurchased: gamification.streakFreezes?.lastPurchased
        },

        // Stats
        stats: gamification.stats || {},
        extendedStats: gamification.extendedStats || {},

        // Achievements count
        achievementsCount: gamification.achievements?.length || 0,

        // Daily XP caps status
        dailyXpCaps: gamification.dailyXpCaps || {}
    };
};

/**
 * Incrementa una stat estesa
 */
const incrementExtendedStat = async (userId, statName, amount = 1) => {
    const updatePath = `gamification.extendedStats.${statName}`;
    const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { [updatePath]: amount } },
        { new: true }
    );

    const newValue = user?.gamification?.extendedStats?.[statName] || 0;

    eventBus.emit('gamification.stat.updated', {
        userId,
        statName,
        newValue,
        incrementedBy: amount
    });

    return newValue;
};

/**
 * Aggiorna highestRank se necessario
 */
const updateHighestRank = async (userId, newRank) => {
    const rankOrder = ['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'];
    const user = await User.findById(userId);
    const currentHighest = user?.gamification?.extendedStats?.highestRank || 'UNRANKED';

    if (rankOrder.indexOf(newRank) > rankOrder.indexOf(currentHighest)) {
        await User.findByIdAndUpdate(userId, {
            'gamification.extendedStats.highestRank': newRank
        });
        return newRank;
    }
    return currentHighest;
};

module.exports = {
    // Calcoli XP
    calculateStudySessionXp,
    calculateGoalCompletedXp,
    calculateWorkSessionXp,
    calculateExamXp,

    // Multipliers
    calculateMultipliers,

    // Award XP
    awardXp,

    // Daily caps
    checkDailyCap,
    updateDailyCap,

    // Status
    getGamificationStatus,

    // Stats
    incrementExtendedStat,
    updateHighestRank,

    // Helpers
    isSameDay,
    isToday,
    getWeekStart,
    getMonthStart
};
