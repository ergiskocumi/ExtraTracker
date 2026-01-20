/**
 * CHALLENGE SERVICE
 *
 * Gestione challenges giornaliere, settimanali e mensili.
 */

const User = require('../models/User');
const eventBus = require('../utils/eventBus');
const {
    DAILY_CHALLENGES,
    DAILY_CHALLENGES_COUNT,
    DAILY_ALL_COMPLETE_BONUS,
    WEEKLY_CHALLENGES,
    WEEKLY_CHALLENGES_COUNT,
    WEEKLY_ALL_COMPLETE_BONUS,
    MONTHLY_CHALLENGES,
    MONTHLY_CHALLENGES_COUNT,
    MONTHLY_ALL_COMPLETE_BONUS
} = require('../config/gamification');
const { isSameDay, getWeekStart, getMonthStart } = require('./gamificationService');

/**
 * Helper: seleziona random elementi da un array
 */
const selectRandom = (array, count) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

/**
 * Helper: seleziona target/reward casuale per un challenge type
 */
const selectChallengeVariant = (challengeConfig) => {
    const index = Math.floor(Math.random() * challengeConfig.targets.length);
    return {
        target: challengeConfig.targets[index],
        reward: challengeConfig.rewards[index]
    };
};

/**
 * Genera challenges giornaliere per un utente
 */
const generateDailyChallenges = async (userId, force = false) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const dailyChallenges = user.gamification?.dailyChallenges || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verifica se già generate oggi
    if (!force && dailyChallenges.date && isSameDay(dailyChallenges.date, today)) {
        return dailyChallenges.challenges;
    }

    // Seleziona tipi di challenge casuali
    const challengeTypes = Object.keys(DAILY_CHALLENGES);
    const selectedTypes = selectRandom(challengeTypes, DAILY_CHALLENGES_COUNT);

    // Genera challenges
    const challenges = selectedTypes.map(type => {
        const config = DAILY_CHALLENGES[type];
        const variant = selectChallengeVariant(config);

        return {
            type,
            target: variant.target,
            progress: 0,
            reward: variant.reward,
            completed: false,
            completedAt: null
        };
    });

    // Salva nel database
    await User.findByIdAndUpdate(userId, {
        'gamification.dailyChallenges': {
            date: today,
            challenges,
            rerollsUsed: 0,
            allCompleteBonusClaimed: false
        }
    });

    eventBus.emit('gamification.challenges.daily.generated', {
        userId,
        challenges,
        date: today
    });

    return challenges;
};

/**
 * Genera challenges settimanali per un utente
 */
const generateWeeklyChallenges = async (userId, force = false) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const weeklyChallenges = user.gamification?.weeklyChallenges || {};
    const weekStart = getWeekStart();

    // Verifica se già generate questa settimana
    if (!force && weeklyChallenges.weekStart &&
        weeklyChallenges.weekStart.getTime() === weekStart.getTime()) {
        return weeklyChallenges.challenges;
    }

    // Seleziona tipi di challenge casuali
    const challengeTypes = Object.keys(WEEKLY_CHALLENGES);
    const selectedTypes = selectRandom(challengeTypes, WEEKLY_CHALLENGES_COUNT);

    // Genera challenges
    const challenges = selectedTypes.map(type => {
        const config = WEEKLY_CHALLENGES[type];
        const variant = selectChallengeVariant(config);

        return {
            type,
            target: variant.target,
            progress: 0,
            reward: variant.reward,
            completed: false,
            completedAt: null
        };
    });

    // Salva nel database
    await User.findByIdAndUpdate(userId, {
        'gamification.weeklyChallenges': {
            weekStart,
            challenges,
            allCompleteBonusClaimed: false
        }
    });

    eventBus.emit('gamification.challenges.weekly.generated', {
        userId,
        challenges,
        weekStart
    });

    return challenges;
};

/**
 * Genera challenges mensili per un utente
 */
const generateMonthlyChallenges = async (userId, force = false) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    const monthlyChallenges = user.gamification?.monthlyChallenges || {};
    const monthStart = getMonthStart();

    // Verifica se già generate questo mese
    if (!force && monthlyChallenges.monthStart &&
        monthlyChallenges.monthStart.getTime() === monthStart.getTime()) {
        return monthlyChallenges.challenges;
    }

    // Seleziona tipi di challenge casuali
    const challengeTypes = Object.keys(MONTHLY_CHALLENGES);
    const selectedTypes = selectRandom(challengeTypes, MONTHLY_CHALLENGES_COUNT);

    // Genera challenges
    const challenges = selectedTypes.map(type => {
        const config = MONTHLY_CHALLENGES[type];
        const variant = selectChallengeVariant(config);

        return {
            type,
            target: variant.target,
            progress: 0,
            reward: variant.reward,
            completed: false,
            completedAt: null
        };
    });

    // Salva nel database
    await User.findByIdAndUpdate(userId, {
        'gamification.monthlyChallenges': {
            monthStart,
            challenges,
            allCompleteBonusClaimed: false
        }
    });

    eventBus.emit('gamification.challenges.monthly.generated', {
        userId,
        challenges,
        monthStart
    });

    return challenges;
};

/**
 * Aggiorna progresso challenge
 * @param {string} userId
 * @param {string} challengeType - Es: 'STUDY_CARDS', 'WORK_TIME'
 * @param {number} amount - Quantità da aggiungere
 */
const updateChallengeProgress = async (userId, challengeType, amount) => {
    const user = await User.findById(userId);
    if (!user) return { updated: false };

    const results = {
        daily: null,
        weekly: null,
        monthly: null
    };

    // Aggiorna daily challenges
    const dailyChallenges = user.gamification?.dailyChallenges?.challenges || [];
    for (let i = 0; i < dailyChallenges.length; i++) {
        const challenge = dailyChallenges[i];
        if (challenge.type === challengeType && !challenge.completed) {
            const newProgress = Math.min(challenge.progress + amount, challenge.target);
            const completed = newProgress >= challenge.target;

            await User.findByIdAndUpdate(userId, {
                [`gamification.dailyChallenges.challenges.${i}.progress`]: newProgress,
                [`gamification.dailyChallenges.challenges.${i}.completed`]: completed,
                ...(completed && {
                    [`gamification.dailyChallenges.challenges.${i}.completedAt`]: new Date()
                })
            });

            results.daily = {
                type: challengeType,
                newProgress,
                completed,
                reward: completed ? challenge.reward : 0
            };

            if (completed) {
                // Assegna XP per challenge completata
                await User.findByIdAndUpdate(userId, {
                    $inc: {
                        'gamification.xp': challenge.reward,
                        'gamification.extendedStats.challengesCompleted': 1
                    }
                });

                eventBus.emit('gamification.challenge.completed', {
                    userId,
                    period: 'daily',
                    challengeType,
                    reward: challenge.reward
                });
            }
        }
    }

    // Aggiorna weekly challenges
    const weeklyChallenges = user.gamification?.weeklyChallenges?.challenges || [];
    for (let i = 0; i < weeklyChallenges.length; i++) {
        const challenge = weeklyChallenges[i];
        if (challenge.type === `WEEKLY_${challengeType}` && !challenge.completed) {
            const newProgress = Math.min(challenge.progress + amount, challenge.target);
            const completed = newProgress >= challenge.target;

            await User.findByIdAndUpdate(userId, {
                [`gamification.weeklyChallenges.challenges.${i}.progress`]: newProgress,
                [`gamification.weeklyChallenges.challenges.${i}.completed`]: completed,
                ...(completed && {
                    [`gamification.weeklyChallenges.challenges.${i}.completedAt`]: new Date()
                })
            });

            results.weekly = {
                type: `WEEKLY_${challengeType}`,
                newProgress,
                completed,
                reward: completed ? challenge.reward : 0
            };

            if (completed) {
                await User.findByIdAndUpdate(userId, {
                    $inc: {
                        'gamification.xp': challenge.reward,
                        'gamification.extendedStats.challengesCompleted': 1
                    }
                });

                eventBus.emit('gamification.challenge.completed', {
                    userId,
                    period: 'weekly',
                    challengeType: `WEEKLY_${challengeType}`,
                    reward: challenge.reward
                });
            }
        }
    }

    // Aggiorna monthly challenges
    const monthlyChallenges = user.gamification?.monthlyChallenges?.challenges || [];
    for (let i = 0; i < monthlyChallenges.length; i++) {
        const challenge = monthlyChallenges[i];
        if (challenge.type === `MONTHLY_${challengeType}` && !challenge.completed) {
            const newProgress = Math.min(challenge.progress + amount, challenge.target);
            const completed = newProgress >= challenge.target;

            await User.findByIdAndUpdate(userId, {
                [`gamification.monthlyChallenges.challenges.${i}.progress`]: newProgress,
                [`gamification.monthlyChallenges.challenges.${i}.completed`]: completed,
                ...(completed && {
                    [`gamification.monthlyChallenges.challenges.${i}.completedAt`]: new Date()
                })
            });

            results.monthly = {
                type: `MONTHLY_${challengeType}`,
                newProgress,
                completed,
                reward: completed ? challenge.reward : 0
            };

            if (completed) {
                await User.findByIdAndUpdate(userId, {
                    $inc: {
                        'gamification.xp': challenge.reward,
                        'gamification.extendedStats.challengesCompleted': 1
                    }
                });

                eventBus.emit('gamification.challenge.completed', {
                    userId,
                    period: 'monthly',
                    challengeType: `MONTHLY_${challengeType}`,
                    reward: challenge.reward
                });
            }
        }
    }

    // Verifica all complete bonus per ogni periodo
    await checkAllCompleteBonus(userId, 'daily');
    await checkAllCompleteBonus(userId, 'weekly');
    await checkAllCompleteBonus(userId, 'monthly');

    return results;
};

/**
 * Verifica e assegna bonus per completamento tutte le challenges di un periodo
 */
const checkAllCompleteBonus = async (userId, period) => {
    const user = await User.findById(userId);
    if (!user) return null;

    let challenges, bonusClaimed, bonus, statName;

    switch (period) {
        case 'daily':
            challenges = user.gamification?.dailyChallenges?.challenges || [];
            bonusClaimed = user.gamification?.dailyChallenges?.allCompleteBonusClaimed;
            bonus = DAILY_ALL_COMPLETE_BONUS;
            statName = 'dailyAllCompleteCount';
            break;
        case 'weekly':
            challenges = user.gamification?.weeklyChallenges?.challenges || [];
            bonusClaimed = user.gamification?.weeklyChallenges?.allCompleteBonusClaimed;
            bonus = WEEKLY_ALL_COMPLETE_BONUS;
            statName = 'weeklyAllCompleteCount';
            break;
        case 'monthly':
            challenges = user.gamification?.monthlyChallenges?.challenges || [];
            bonusClaimed = user.gamification?.monthlyChallenges?.allCompleteBonusClaimed;
            bonus = MONTHLY_ALL_COMPLETE_BONUS;
            statName = 'monthlyAllCompleteCount';
            break;
        default:
            return null;
    }

    // Verifica se già reclamato o non tutte complete
    if (bonusClaimed) return null;
    if (challenges.length === 0) return null;
    if (!challenges.every(c => c.completed)) return null;

    // Assegna bonus
    await User.findByIdAndUpdate(userId, {
        $inc: {
            'gamification.xp': bonus,
            [`gamification.extendedStats.${statName}`]: 1
        },
        [`gamification.${period}Challenges.allCompleteBonusClaimed`]: true
    });

    eventBus.emit('gamification.challenges.all_complete', {
        userId,
        period,
        bonus
    });

    return { period, bonus };
};

/**
 * Ottiene lo stato corrente delle challenges per un utente
 */
const getUserChallenges = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Utente non trovato');
    }

    // Assicurati che le challenges siano generate
    await ensureChallengesGenerated(userId);

    // Ricarica utente
    const updatedUser = await User.findById(userId);
    const gamification = updatedUser.gamification || {};

    const daily = gamification.dailyChallenges || {};
    const weekly = gamification.weeklyChallenges || {};
    const monthly = gamification.monthlyChallenges || {};

    // Calcola tempo rimanente
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const endOfWeek = getWeekStart();
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const endOfMonth = getMonthStart();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    return {
        daily: {
            date: daily.date,
            challenges: daily.challenges || [],
            rerollsUsed: daily.rerollsUsed || 0,
            allComplete: daily.challenges?.every(c => c.completed) || false,
            allCompleteBonusClaimed: daily.allCompleteBonusClaimed || false,
            allCompleteBonus: DAILY_ALL_COMPLETE_BONUS,
            timeRemaining: endOfDay - now
        },
        weekly: {
            weekStart: weekly.weekStart,
            challenges: weekly.challenges || [],
            allComplete: weekly.challenges?.every(c => c.completed) || false,
            allCompleteBonusClaimed: weekly.allCompleteBonusClaimed || false,
            allCompleteBonus: WEEKLY_ALL_COMPLETE_BONUS,
            timeRemaining: endOfWeek - now
        },
        monthly: {
            monthStart: monthly.monthStart,
            challenges: monthly.challenges || [],
            allComplete: monthly.challenges?.every(c => c.completed) || false,
            allCompleteBonusClaimed: monthly.allCompleteBonusClaimed || false,
            allCompleteBonus: MONTHLY_ALL_COMPLETE_BONUS,
            timeRemaining: endOfMonth - now
        }
    };
};

/**
 * Assicura che le challenges siano generate per tutti i periodi
 */
const ensureChallengesGenerated = async (userId) => {
    await generateDailyChallenges(userId);
    await generateWeeklyChallenges(userId);
    await generateMonthlyChallenges(userId);
};

/**
 * Mappatura tra azioni e tipi di challenge
 */
const ACTION_TO_CHALLENGE_MAP = {
    // Studio
    'session.completed': ['STUDY_CARDS', 'STUDY'],
    'flashcard.reviewed': ['STUDY_CARDS', 'STUDY'],
    'session.perfect': ['PERFECT_SESSION', 'PERFECT'],
    'session.early': ['EARLY_BIRD'],

    // Check-in
    'checkin.completed': ['CHECKIN'],

    // Lavoro
    'worklog.created': ['WORK_TIME', 'WORK'],
    'worklog.updated': ['WORK_TIME', 'WORK'],

    // Goals
    'goal.completed': ['GOAL_PROGRESS', 'GOALS'],
    'goal.progress': ['GOAL_PROGRESS', 'GOALS'],

    // Streak
    'streak.maintained': ['STREAK_KEEPER']
};

/**
 * Aggiorna challenges basate su un'azione specifica
 */
const updateChallengesForAction = async (userId, action, data = {}) => {
    const challengeTypes = ACTION_TO_CHALLENGE_MAP[action];
    if (!challengeTypes) return { updated: false };

    const results = [];
    for (const type of challengeTypes) {
        const amount = data.amount || 1;
        const result = await updateChallengeProgress(userId, type, amount);
        results.push(result);
    }

    return { updated: true, results };
};

module.exports = {
    // Generazione
    generateDailyChallenges,
    generateWeeklyChallenges,
    generateMonthlyChallenges,
    ensureChallengesGenerated,

    // Aggiornamento
    updateChallengeProgress,
    updateChallengesForAction,
    checkAllCompleteBonus,

    // Query
    getUserChallenges,

    // Mappatura
    ACTION_TO_CHALLENGE_MAP
};
