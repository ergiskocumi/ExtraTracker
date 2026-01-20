/**
 * STREAK SERVICE
 *
 * Gestione streak, streak freeze, e penalità inattività (XP decay).
 */

const User = require('../models/User');
const eventBus = require('../utils/eventBus');
const {
    STREAK_FREEZE,
    INACTIVITY_PENALTY,
    calculateXpDecay,
    getStreakMilestoneBonus,
    STREAK_MILESTONES
} = require('../config/gamification');
const { isSameDay, isToday } = require('./gamificationService');

/**
 * Helper: ottiene la data di ieri
 */
const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date;
};

/**
 * Helper: calcola giorni tra due date
 */
const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Aggiorna la streak quando viene registrata un'attività
 */
const updateStreak = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const streak = gamification.streak || { current: 0, best: 0, lastActivityDate: null };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let newStreak = streak.current;
    let streakMilestoneXp = 0;
    let isNewDay = false;
    let isComeback = false;

    if (!streak.lastActivityDate) {
        // Prima attività in assoluto
        newStreak = 1;
        isNewDay = true;
    } else if (isSameDay(streak.lastActivityDate, now)) {
        // Già attivo oggi, non cambia nulla
        return {
            streak: newStreak,
            best: streak.best,
            isNewDay: false,
            milestoneXp: 0,
            isComeback: false
        };
    } else {
        const lastActivity = new Date(streak.lastActivityDate);
        lastActivity.setHours(0, 0, 0, 0);
        const daysDiff = daysBetween(lastActivity, today);

        if (daysDiff === 1) {
            // Attività consecutiva
            newStreak = streak.current + 1;
            isNewDay = true;
        } else if (daysDiff > 1) {
            // Streak interrotta
            // Verifica se ci sono streak freeze disponibili
            const freezes = gamification.streakFreezes?.available || 0;
            const freezesNeeded = daysDiff - 1;

            if (freezes >= freezesNeeded) {
                // Usa freeze automaticamente
                newStreak = streak.current + 1;
                isNewDay = true;

                // Rimuovi freeze usati
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'gamification.streakFreezes.available': -freezesNeeded },
                    $inc: { 'gamification.extendedStats.freezesUsed': freezesNeeded }
                });

                eventBus.emit('gamification.streak.freeze.used', {
                    userId,
                    freezesUsed: freezesNeeded,
                    streakPreserved: streak.current,
                    daysSkipped: freezesNeeded
                });
            } else {
                // Streak persa
                if (streak.current >= 3) {
                    // Era una streak significativa, conta come comeback potenziale
                    isComeback = true;
                }
                newStreak = 1;
                isNewDay = true;

                eventBus.emit('gamification.streak.lost', {
                    userId,
                    previousStreak: streak.current,
                    daysMissed: daysDiff - 1
                });
            }
        }
    }

    // Calcola milestone bonus
    if (isNewDay && newStreak > streak.current) {
        streakMilestoneXp = getStreakMilestoneBonus(newStreak, streak.current);
    }

    // Aggiorna best streak
    const newBest = Math.max(streak.best, newStreak);

    // Update database
    const updateData = {
        'gamification.streak.current': newStreak,
        'gamification.streak.lastActivityDate': now,
        'gamification.streak.best': newBest
    };

    // Incrementa totale giorni attivi
    if (isNewDay) {
        updateData['$inc'] = { 'gamification.extendedStats.totalActiveDays': 1 };

        // Weekend check
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            if (!updateData['$inc']) updateData['$inc'] = {};
            updateData['$inc']['gamification.extendedStats.weekendActiveDays'] = 1;
        }

        // Comeback check
        if (isComeback && newStreak >= 3) {
            if (!updateData['$inc']) updateData['$inc'] = {};
            updateData['$inc']['gamification.extendedStats.comebacks'] = 1;
        }
    }

    // Gestisci $inc separatamente
    const incData = updateData['$inc'];
    delete updateData['$inc'];

    await User.findByIdAndUpdate(userId, {
        $set: updateData,
        ...(incData && { $inc: incData })
    });

    // Emit eventi
    if (isNewDay) {
        eventBus.emit('gamification.streak.updated', {
            userId,
            newStreak,
            previousStreak: streak.current,
            best: newBest,
            milestoneXp: streakMilestoneXp
        });

        // Check per achievement week streak
        if (newStreak >= 7 && (newStreak - 1) % 7 === 6) {
            await User.findByIdAndUpdate(userId, {
                $inc: { 'gamification.extendedStats.weekStreaksAchieved': 1 }
            });
        }
    }

    return {
        streak: newStreak,
        best: newBest,
        isNewDay,
        milestoneXp: streakMilestoneXp,
        isComeback
    };
};

/**
 * Acquista uno streak freeze
 */
const purchaseStreakFreeze = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const currentXp = gamification.xp || 0;
    const freezes = gamification.streakFreezes || { available: 0, lastPurchased: null };

    // Verifica XP sufficiente
    if (currentXp < STREAK_FREEZE.cost) {
        return {
            success: false,
            reason: 'insufficient_xp',
            required: STREAK_FREEZE.cost,
            current: currentXp
        };
    }

    // Verifica max freeze
    if (freezes.available >= STREAK_FREEZE.maxAvailable) {
        return {
            success: false,
            reason: 'max_freezes_reached',
            max: STREAK_FREEZE.maxAvailable,
            current: freezes.available
        };
    }

    // Verifica cooldown
    if (freezes.lastPurchased) {
        const hoursSinceLastPurchase = (Date.now() - new Date(freezes.lastPurchased).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPurchase < STREAK_FREEZE.cooldownHours) {
            const remainingHours = STREAK_FREEZE.cooldownHours - hoursSinceLastPurchase;
            return {
                success: false,
                reason: 'cooldown_active',
                remainingHours: Math.ceil(remainingHours)
            };
        }
    }

    // Esegui acquisto
    await User.findByIdAndUpdate(userId, {
        $inc: {
            'gamification.xp': -STREAK_FREEZE.cost,
            'gamification.streakFreezes.available': 1
        },
        $set: {
            'gamification.streakFreezes.lastPurchased': new Date()
        }
    });

    eventBus.emit('gamification.streak.freeze.purchased', {
        userId,
        cost: STREAK_FREEZE.cost,
        newTotal: freezes.available + 1
    });

    return {
        success: true,
        cost: STREAK_FREEZE.cost,
        newXp: currentXp - STREAK_FREEZE.cost,
        freezesAvailable: freezes.available + 1
    };
};

/**
 * Applica XP decay per inattività
 */
const applyXpDecay = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const lastActivity = gamification.streak?.lastActivityDate;

    if (!lastActivity) {
        return { decayApplied: 0, reason: 'no_previous_activity' };
    }

    // Calcola giorni di inattività
    const now = new Date();
    const daysInactive = daysBetween(lastActivity, now);

    // Verifica se decay già applicato oggi
    const decayDate = gamification.xpDecayApplied;
    if (decayDate && isSameDay(decayDate, now)) {
        return { decayApplied: 0, reason: 'already_applied_today' };
    }

    // Se entro grace period, nessun decay
    if (daysInactive <= INACTIVITY_PENALTY.gracePeriodDays) {
        return { decayApplied: 0, reason: 'within_grace_period' };
    }

    // Calcola decay
    const currentXp = gamification.xp || 0;
    const currentLevel = gamification.level || 1;
    const xpLoss = calculateXpDecay(currentXp, currentLevel, daysInactive);

    if (xpLoss === 0) {
        return { decayApplied: 0, reason: 'no_decay_needed' };
    }

    // Applica decay
    const newXp = currentXp - xpLoss;
    await User.findByIdAndUpdate(userId, {
        $set: {
            'gamification.xp': newXp,
            'gamification.xpDecayApplied': now
        }
    });

    eventBus.emit('gamification.xp.decay', {
        userId,
        xpLost: xpLoss,
        daysInactive,
        newXp
    });

    return {
        decayApplied: xpLoss,
        daysInactive,
        newXp
    };
};

/**
 * Verifica e resetta streak se necessario
 * Chiamata tipicamente all'avvio del server o periodicamente
 */
const checkAndResetStreaks = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Trova utenti con streak attiva ma nessuna attività negli ultimi 2 giorni
    // e senza freeze sufficienti
    const usersToCheck = await User.find({
        'gamification.streak.current': { $gt: 0 },
        'gamification.streak.lastActivityDate': { $lt: twoDaysAgo }
    });

    const results = [];

    for (const user of usersToCheck) {
        const lastActivity = new Date(user.gamification.streak.lastActivityDate);
        lastActivity.setHours(0, 0, 0, 0);
        const daysDiff = daysBetween(lastActivity, today);
        const freezesNeeded = daysDiff - 1;
        const freezesAvailable = user.gamification.streakFreezes?.available || 0;

        if (freezesAvailable < freezesNeeded) {
            // Reset streak
            const previousStreak = user.gamification.streak.current;

            await User.findByIdAndUpdate(user._id, {
                $set: {
                    'gamification.streak.current': 0
                }
            });

            eventBus.emit('gamification.streak.lost', {
                userId: user._id,
                previousStreak,
                daysMissed: daysDiff - 1
            });

            results.push({
                userId: user._id,
                previousStreak,
                daysMissed: daysDiff - 1
            });
        }
    }

    return results;
};

/**
 * Ottiene info streak per un utente
 */
const getStreakInfo = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const gamification = user.gamification || {};
    const streak = gamification.streak || { current: 0, best: 0, lastActivityDate: null };
    const freezes = gamification.streakFreezes || { available: 0, lastPurchased: null };

    // Prossimo milestone
    let nextMilestone = null;
    let xpAtNextMilestone = 0;
    for (const [days, xp] of Object.entries(STREAK_MILESTONES)) {
        if (parseInt(days) > streak.current) {
            nextMilestone = parseInt(days);
            xpAtNextMilestone = xp;
            break;
        }
    }

    // Calcola se può acquistare freeze
    const currentXp = gamification.xp || 0;
    const canPurchaseFreeze = currentXp >= STREAK_FREEZE.cost &&
                              freezes.available < STREAK_FREEZE.maxAvailable;

    let cooldownRemaining = 0;
    if (freezes.lastPurchased) {
        const hoursSince = (Date.now() - new Date(freezes.lastPurchased).getTime()) / (1000 * 60 * 60);
        if (hoursSince < STREAK_FREEZE.cooldownHours) {
            cooldownRemaining = Math.ceil(STREAK_FREEZE.cooldownHours - hoursSince);
        }
    }

    return {
        current: streak.current,
        best: streak.best,
        lastActivityDate: streak.lastActivityDate,
        isActiveToday: streak.lastActivityDate && isSameDay(streak.lastActivityDate, new Date()),

        // Milestone info
        nextMilestone,
        xpAtNextMilestone,
        daysToNextMilestone: nextMilestone ? nextMilestone - streak.current : null,

        // Freeze info
        freezes: {
            available: freezes.available,
            maxAvailable: STREAK_FREEZE.maxAvailable,
            cost: STREAK_FREEZE.cost,
            canPurchase: canPurchaseFreeze,
            cooldownHoursRemaining: cooldownRemaining
        }
    };
};

module.exports = {
    updateStreak,
    purchaseStreakFreeze,
    applyXpDecay,
    checkAndResetStreaks,
    getStreakInfo,

    // Helpers
    daysBetween,
    getYesterday
};
