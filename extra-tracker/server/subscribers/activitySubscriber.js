/**
 * ACTIVITY SUBSCRIBER - Pattern Observer con Retry Queue + Gamification
 * ======================================================================
 *
 * Subscriber che ascolta eventi di dominio e registra attività.
 * Decoupling: I servizi non conoscono ActivityService direttamente.
 *
 * Eventi supportati:
 * - worklog.created: quando viene creato un nuovo worklog
 * - worklog.updated: quando viene aggiornato un worklog
 * - goal.completed: quando un goal viene completato
 * - session.completed: quando una sessione di studio viene completata
 * - gamification.xp.awarded: quando vengono assegnati XP
 * - gamification.level.up: quando si sale di livello
 * - gamification.achievement.unlocked: quando si sblocca un achievement
 * - gamification.challenge.completed: quando si completa una challenge
 * - gamification.streak.updated: quando si aggiorna la streak
 *
 * Gestione errori:
 * - Retry automatico con exponential backoff (Bull queue)
 * - Fallback a chiamata diretta se Redis non disponibile
 * - Non blocca la risposta HTTP al client
 */

const { addActivityJob } = require('../queues/activityQueue');
const eventBus = require('../utils/eventBus');
const challengeService = require('../services/challengeService');
const achievementService = require('../services/achievementService');

/**
 * Gestisce l'evento worklog.created
 */
async function handleWorkLogCreated(data) {
    const { userId, workLog } = data;

    if (!userId || !workLog) {
        console.error('ActivitySubscriber: dati mancanti per worklog.created', { userId, workLog });
        return;
    }

    const durationMinutes = Number.isFinite(workLog.durationMinutes)
        ? workLog.durationMinutes
        : 0;

    const tags = Array.isArray(workLog.tags) ? workLog.tags : [];
    const timeOfDay = getTimeOfDayLabel(new Date());
    const charCount = workLog.description?.length || 0;

    // Determina tipo di attività per analytics
    const activityType = (workLog.startTime && workLog.endTime)
        ? 'WORK_SESSION_LOGGED'
        : 'WORK_NOTE_CREATED';

    // Usa queue con retry automatico
    await addActivityJob(userId, activityType, {
        entityId: workLog._id || workLog.id,
        category: 'work',
        metadata: {
            entityId: workLog._id || workLog.id,
            projectId: workLog.projectId,
            durationMinutes,
            tags,
            timeOfDay,
            date: workLog.date,
            startTime: workLog.startTime || null,
            endTime: workLog.endTime || null,
            hasTimeTracking: !!(workLog.startTime && workLog.endTime),
            charCount,
        },
    });
}

/**
 * Gestisce l'evento worklog.updated
 */
async function handleWorkLogUpdated(data) {
    const { userId, workLog, previousWorkLog } = data;

    if (!userId || !workLog) {
        console.error('ActivitySubscriber: dati mancanti per worklog.updated', { userId, workLog });
        return;
    }

    // Registra attività solo se ci sono cambiamenti significativi
    const durationChanged = previousWorkLog &&
        previousWorkLog.durationMinutes !== workLog.durationMinutes;
    const projectChanged = previousWorkLog &&
        previousWorkLog.projectId?.toString() !== workLog.projectId?.toString();

    if (!durationChanged && !projectChanged) {
        return;
    }

    const durationMinutes = Number.isFinite(workLog.durationMinutes)
        ? workLog.durationMinutes
        : 0;

    const tags = Array.isArray(workLog.tags) ? workLog.tags : [];
    const timeOfDay = getTimeOfDayLabel(new Date());

    await addActivityJob(userId, 'WORK_SESSION_UPDATED', {
        entityId: workLog._id || workLog.id,
        category: 'work',
        metadata: {
            entityId: workLog._id || workLog.id,
            projectId: workLog.projectId,
            durationMinutes,
            tags,
            timeOfDay,
            date: workLog.date,
            startTime: workLog.startTime || null,
            endTime: workLog.endTime || null,
            hasTimeTracking: !!(workLog.startTime && workLog.endTime),
            changes: {
                durationChanged,
                projectChanged,
            },
        },
    });
}

/**
 * Gestisce l'evento goal.completed
 */
async function handleGoalCompleted(data) {
    const { userId, goal } = data;

    if (!userId || !goal) {
        console.error('ActivitySubscriber: dati mancanti per goal.completed', { userId, goal });
        return;
    }

    const timeOfDay = getTimeOfDayLabel(new Date());
    const createdAt = goal.createdAt ? new Date(goal.createdAt) : new Date();
    const completedAt = goal.updatedAt ? new Date(goal.updatedAt) : new Date();
    const daysToComplete = Math.ceil((completedAt - createdAt) / (1000 * 60 * 60 * 24));

    // Determina se completato in anticipo
    let completedEarly = false;
    if (goal.deadline) {
        const deadline = new Date(goal.deadline);
        completedEarly = completedAt < deadline;
    }

    await addActivityJob(userId, 'GOAL_COMPLETED', {
        entityId: goal._id || goal.id,
        category: goal.category || 'general',
        metadata: {
            entityId: goal._id || goal.id,
            category: goal.category,
            priority: goal.priority,
            goalType: goal.type || 'target',
            daysToComplete,
            deadline: goal.deadline || null,
            timeOfDay,
            completedEarly,
            hadDeadline: !!goal.deadline,
            milestoneCount: goal.milestones?.length || 0,
            difficulty: goal.difficulty || 1,
        },
    });
}

/**
 * Gestisce l'evento session.completed
 */
async function handleSessionCompleted(data) {
    const { userId, session } = data;

    if (!userId || !session) {
        console.error('ActivitySubscriber: dati mancanti per session.completed', { userId, session });
        return;
    }

    const timeOfDay = getTimeOfDayLabel(new Date());

    await addActivityJob(userId, 'SESSION_COMPLETE', {
        entityId: session.deckId || session.entityId,
        category: 'study',
        metadata: {
            ...session,
            timeOfDay,
        },
    });
}

/**
 * Gestisce l'evento gamification.xp.awarded
 */
async function handleXpAwarded(data) {
    const { userId, xpAwarded, newXp, newLevel, leveledUp, source, multipliers } = data;

    console.log(`[Gamification] XP awarded to ${userId}: +${xpAwarded} (source: ${source})`);

    if (multipliers && multipliers.length > 0) {
        const multiplierStr = multipliers.map(m => `${m.type}:${m.value}x`).join(', ');
        console.log(`[Gamification] Active multipliers: ${multiplierStr}`);
    }
}

/**
 * Gestisce l'evento gamification.level.up
 */
async function handleLevelUp(data) {
    const { userId, previousLevel, newLevel, title, newRank, previousRank, rankChanged } = data;

    console.log(`[Gamification] LEVEL UP! User ${userId}: ${previousLevel} -> ${newLevel} (${title})`);

    if (rankChanged) {
        console.log(`[Gamification] RANK UP! ${previousRank} -> ${newRank}`);
    }

    // Verifica achievements per level
    try {
        await achievementService.checkAchievementsForStats(userId, 'level', 'xp');
    } catch (error) {
        console.error('[Gamification] Error checking achievements on level up:', error.message);
    }
}

/**
 * Gestisce l'evento gamification.achievement.unlocked
 */
async function handleAchievementUnlocked(data) {
    const { userId, achievementId, tier, xpEarned, achievement } = data;

    console.log(`[Gamification] Achievement unlocked for ${userId}: ${achievement?.name} (${tier}) +${xpEarned} XP`);
}

/**
 * Gestisce l'evento gamification.challenge.completed
 */
async function handleChallengeCompleted(data) {
    const { userId, period, challengeType, reward } = data;

    console.log(`[Gamification] Challenge completed by ${userId}: ${challengeType} (${period}) +${reward} XP`);
}

/**
 * Gestisce l'evento gamification.challenges.all_complete
 */
async function handleAllChallengesComplete(data) {
    const { userId, period, bonus } = data;

    console.log(`[Gamification] ALL ${period.toUpperCase()} CHALLENGES COMPLETE for ${userId}! Bonus: +${bonus} XP`);
}

/**
 * Gestisce l'evento gamification.streak.updated
 */
async function handleStreakUpdated(data) {
    const { userId, newStreak, previousStreak, best, milestoneXp } = data;

    if (newStreak > previousStreak) {
        console.log(`[Gamification] Streak for ${userId}: ${newStreak} days (best: ${best})`);

        if (milestoneXp > 0) {
            console.log(`[Gamification] Streak milestone bonus: +${milestoneXp} XP`);
        }
    }

    // Verifica achievements per streak
    try {
        await achievementService.checkAchievementsForStats(userId, 'bestStreak', 'totalActiveDays', 'weekendActiveDays');
    } catch (error) {
        console.error('[Gamification] Error checking achievements on streak update:', error.message);
    }
}

/**
 * Gestisce l'evento gamification.streak.lost
 */
async function handleStreakLost(data) {
    const { userId, previousStreak, daysMissed } = data;

    console.log(`[Gamification] Streak LOST for ${userId}: was ${previousStreak} days, missed ${daysMissed} day(s)`);
}

/**
 * Gestisce l'evento gamification.streak.freeze.used
 */
async function handleStreakFreezeUsed(data) {
    const { userId, freezesUsed, streakPreserved, daysSkipped } = data;

    console.log(`[Gamification] Streak FREEZE used by ${userId}: preserved ${streakPreserved} streak, skipped ${daysSkipped} day(s)`);
}

/**
 * Gestisce l'evento gamification.streak.freeze.purchased
 */
async function handleStreakFreezePurchased(data) {
    const { userId, cost, newTotal } = data;

    console.log(`[Gamification] Streak freeze purchased by ${userId}: -${cost} XP, now has ${newTotal} freezes`);
}

/**
 * Gestisce l'evento gamification.xp.decay
 */
async function handleXpDecay(data) {
    const { userId, xpLost, daysInactive, newXp } = data;

    console.log(`[Gamification] XP decay for ${userId}: -${xpLost} XP after ${daysInactive} days inactive`);
}

/**
 * Gestisce l'evento gamification.stat.updated
 */
async function handleStatUpdated(data) {
    const { userId, statName, newValue, incrementedBy } = data;

    // Verifica achievement per questa stat
    try {
        await achievementService.checkAchievementsForStats(userId, statName);
    } catch (error) {
        console.error('[Gamification] Error checking achievements on stat update:', error.message);
    }
}

/**
 * Helper: determina etichetta time of day (morning, afternoon, evening, night)
 */
function getTimeOfDayLabel(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

/**
 * Inizializza i subscriber
 * Chiama questa funzione all'avvio dell'applicazione
 */
function initializeSubscribers() {
    // Eventi attività
    eventBus.on('worklog.created', handleWorkLogCreated);
    eventBus.on('worklog.updated', handleWorkLogUpdated);
    eventBus.on('goal.completed', handleGoalCompleted);
    eventBus.on('session.completed', handleSessionCompleted);

    // Eventi gamification
    eventBus.on('gamification.xp.awarded', handleXpAwarded);
    eventBus.on('gamification.level.up', handleLevelUp);
    eventBus.on('gamification.achievement.unlocked', handleAchievementUnlocked);
    eventBus.on('gamification.challenge.completed', handleChallengeCompleted);
    eventBus.on('gamification.challenges.all_complete', handleAllChallengesComplete);
    eventBus.on('gamification.streak.updated', handleStreakUpdated);
    eventBus.on('gamification.streak.lost', handleStreakLost);
    eventBus.on('gamification.streak.freeze.used', handleStreakFreezeUsed);
    eventBus.on('gamification.streak.freeze.purchased', handleStreakFreezePurchased);
    eventBus.on('gamification.xp.decay', handleXpDecay);
    eventBus.on('gamification.stat.updated', handleStatUpdated);

    console.log('ActivitySubscriber initialized (worklog, goal, session, gamification)');
}

module.exports = {
    initializeSubscribers,
    // Handler esportati per test
    handleWorkLogCreated,
    handleWorkLogUpdated,
    handleGoalCompleted,
    handleSessionCompleted,
    handleXpAwarded,
    handleLevelUp,
    handleAchievementUnlocked,
    handleChallengeCompleted,
    handleStreakUpdated,
    handleStreakLost,
};
