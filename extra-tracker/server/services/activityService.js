/**
 * ACTIVITY SERVICE
 *
 * Registro centrale attività + gamification.
 * Integra con i nuovi servizi gamification, streak, achievements e challenges.
 */

const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const AppError = require('../utils/AppError');
const eventBus = require('../utils/eventBus');

// Import nuovi servizi gamification
const gamificationService = require('./gamificationService');
const streakService = require('./streakService');
const achievementService = require('./achievementService');
const challengeService = require('./challengeService');

// Import configurazione
const {
    getLevelFromXp,
    XP_ACTIONS
} = require('../config/gamification');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ACTIVITY_TYPES = [
    'SESSION_COMPLETE',
    'GOAL_CREATED',
    'GOAL_COMPLETED',
    'GOAL_ARCHIVED',
    'WORK_SESSION_LOGGED',
    'WORK_NOTE_CREATED',
    'HABIT_CHECKIN',
    'HABIT_SKIPPED',
    'PROJECT_CREATED',
    'PROJECT_COMPLETED',
    'STREAK_BONUS',
    'EXAM_PASSED',
    'MILESTONE_COMPLETED',
];

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

class ActivityService {
    /**
     * Calcola livello da XP usando la nuova formula
     */
    getLevelFromXP(xp) {
        return getLevelFromXp(this._toNumber(xp, 0));
    }

    /**
     * Aggiorna lo streak usando il nuovo streakService
     */
    async updateStreakAtomically(userId) {
        const result = await streakService.updateStreak(userId);
        return {
            current: result.streak,
            best: result.best,
            updated: result.isNewDay
        };
    }

    /**
     * @deprecated Usa updateStreakAtomically() invece
     */
    updateStreak(userDoc) {
        const streak = userDoc.gamification?.streak || {};
        const current = this._toNumber(streak.current, 0);
        const best = this._toNumber(streak.best, 0);
        const lastActivity = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;

        const today = this._startOfDay(new Date());
        const last = lastActivity ? this._startOfDay(lastActivity) : null;

        let nextCurrent = current;

        if (!last) {
            nextCurrent = 1;
        } else if (today.getTime() === last.getTime()) {
            nextCurrent = Math.max(1, current);
        } else if (today.getTime() - last.getTime() === MS_PER_DAY) {
            nextCurrent = current + 1;
        } else {
            nextCurrent = 1;
        }

        return {
            current: nextCurrent,
            best: Math.max(best, nextCurrent),
            lastActivityDate: today,
        };
    }

    /**
     * Registra un'attività e gestisce gamification completa
     */
    async recordActivity(userId, type, payload = {}) {
        if (!userId) {
            throw AppError.validation('UserId mancante per activity');
        }

        if (!ACTIVITY_TYPES.includes(type)) {
            throw AppError.validation('Tipo attivita non valido');
        }

        const structuredPayload = this._isStructuredPayload(payload);
        const metadata = structuredPayload
            ? this._safeObject(payload.metadata)
            : this._safeObject(payload);
        const entityId = structuredPayload ? payload.entityId ?? null : null;
        const category = structuredPayload ? payload.category ?? '' : '';
        const sentiment = structuredPayload ? payload.sentiment ?? null : null;
        const createdAt = structuredPayload && payload.createdAt
            ? new Date(payload.createdAt)
            : new Date();

        const enrichedMetadata = {
            ...metadata,
            dayOfWeek: metadata.dayOfWeek || this._getDayOfWeekLabel(createdAt),
            timeOfDay: metadata.timeOfDay || this._getTimeOfDayLabel(createdAt),
        };

        // Calcola XP usando il nuovo sistema
        const xpResult = await this._calculateXpNew(type, enrichedMetadata, userId);
        const xpEarned = xpResult.baseXp;

        // Crea record attività
        await UserActivity.create({
            user: userId,
            type,
            entityId,
            category,
            sentiment,
            xpEarned,
            metadata: {
                ...enrichedMetadata,
                xpBreakdown: xpResult.breakdown
            },
            createdAt,
        });

        // Aggiorna streak
        const streakResult = await this.updateStreakAtomically(userId);

        // Assegna XP con multipliers
        const xpCategory = this._getXpCategory(type);
        const awardResult = await gamificationService.awardXp(userId, xpEarned, {
            category: xpCategory,
            breakdown: xpResult.breakdown,
            source: type
        });

        // Aggiorna stats base
        await this._updateBaseStats(userId, type, enrichedMetadata);

        // Aggiorna stats estese per achievements
        await this._updateExtendedStats(userId, type, enrichedMetadata);

        // Aggiorna challenges
        await this._updateChallenges(userId, type, enrichedMetadata);

        // Verifica achievements
        const statsToCheck = this._getStatsToCheckForType(type);
        const achievementResult = await achievementService.checkAchievements(userId, statsToCheck);

        // Se streak milestone raggiunto, assegna bonus XP
        if (streakResult.updated && streakResult.current > 0) {
            const milestoneXp = await this._checkStreakMilestone(userId, streakResult.current);
            if (milestoneXp > 0) {
                await gamificationService.awardXp(userId, milestoneXp, {
                    skipMultipliers: true,
                    source: 'STREAK_MILESTONE'
                });
            }
        }

        // Emit evento attività
        eventBus.emit('activity.recorded', {
            userId,
            type,
            xpEarned: awardResult.xpAwarded,
            leveledUp: awardResult.leveledUp,
            newLevel: awardResult.newLevel,
            streak: streakResult.current,
            achievementsUnlocked: achievementResult.newAchievements.length
        });

        return {
            leveledUp: awardResult.leveledUp,
            xpEarned: awardResult.xpAwarded,
            newLevel: awardResult.newLevel,
            breakdown: awardResult.breakdown,
            multipliers: awardResult.multipliers,
            totalMultiplier: awardResult.totalMultiplier,
            streak: streakResult.current,
            achievementsUnlocked: achievementResult.newAchievements
        };
    }

    /**
     * Calcola XP usando i nuovi servizi
     */
    async _calculateXpNew(type, metadata, userId) {
        switch (type) {
            case 'SESSION_COMPLETE':
                return gamificationService.calculateStudySessionXp({
                    totalCards: this._toNumber(metadata.totalCards, 0),
                    correctCards: this._toNumber(metadata.correctCount, 0),
                    avgTimePerCard: this._toNumber(metadata.avgTimePerCard, 0),
                    accuracy: this._toNumber(metadata.accuracy, 0)
                });

            case 'GOAL_COMPLETED':
                return gamificationService.calculateGoalCompletedXp({
                    type: metadata.goalType || 'target',
                    completedEarly: metadata.completedEarly || false,
                    difficulty: this._toNumber(metadata.difficulty, 1),
                    milestoneCount: this._toNumber(metadata.milestoneCount, 0)
                });

            case 'WORK_SESSION_LOGGED':
                return gamificationService.calculateWorkSessionXp({
                    durationMinutes: this._toNumber(metadata.durationMinutes, 0)
                });

            case 'EXAM_PASSED':
                return gamificationService.calculateExamXp({
                    grade: this._toNumber(metadata.grade, 18),
                    laude: metadata.laude || false
                });

            case 'GOAL_CREATED':
                const baseXp = XP_ACTIONS.GOAL_CREATED.base;
                const breakdown = [{ type: 'base', value: baseXp, description: 'Goal creato' }];
                let total = baseXp;

                if (metadata.hasDeadline) {
                    total += XP_ACTIONS.GOAL_CREATED.deadlineBonus;
                    breakdown.push({ type: 'deadline', value: XP_ACTIONS.GOAL_CREATED.deadlineBonus, description: 'Con deadline' });
                }
                if (metadata.hasMilestones) {
                    total += XP_ACTIONS.GOAL_CREATED.milestonesBonus;
                    breakdown.push({ type: 'milestones', value: XP_ACTIONS.GOAL_CREATED.milestonesBonus, description: 'Con milestones' });
                }

                return { baseXp: total, breakdown };

            case 'HABIT_CHECKIN':
                const habitBase = XP_ACTIONS.HABIT_CHECKIN.daily.base;
                const habitBreakdown = [{ type: 'base', value: habitBase, description: 'Check-in' }];
                let habitTotal = habitBase;

                if (metadata.hasMood) {
                    habitTotal += XP_ACTIONS.HABIT_CHECKIN.daily.moodBonus;
                    habitBreakdown.push({ type: 'mood', value: XP_ACTIONS.HABIT_CHECKIN.daily.moodBonus, description: 'Con mood' });
                }
                if (metadata.hasNotes) {
                    habitTotal += XP_ACTIONS.HABIT_CHECKIN.daily.notesBonus;
                    habitBreakdown.push({ type: 'notes', value: XP_ACTIONS.HABIT_CHECKIN.daily.notesBonus, description: 'Con note' });
                }

                return { baseXp: habitTotal, breakdown: habitBreakdown };

            case 'MILESTONE_COMPLETED':
                const msBase = XP_ACTIONS.MILESTONE_COMPLETED.base;
                const weight = this._toNumber(metadata.weight, 1);
                const weightBonus = weight * XP_ACTIONS.MILESTONE_COMPLETED.weightMultiplier;
                return {
                    baseXp: msBase + weightBonus,
                    breakdown: [
                        { type: 'base', value: msBase, description: 'Milestone completata' },
                        { type: 'weight', value: weightBonus, description: `Peso ${weight}` }
                    ]
                };

            case 'WORK_NOTE_CREATED':
                const noteBase = XP_ACTIONS.WORK_NOTE_CREATED.base;
                const noteBreakdown = [{ type: 'base', value: noteBase, description: 'Nota creata' }];
                let noteTotal = noteBase;

                const charCount = this._toNumber(metadata.charCount, 0);
                if (charCount >= 500) {
                    noteTotal += XP_ACTIONS.WORK_NOTE_CREATED.longNoteBonus;
                    noteBreakdown.push({ type: 'long', value: XP_ACTIONS.WORK_NOTE_CREATED.longNoteBonus, description: 'Nota dettagliata' });
                }

                return { baseXp: noteTotal, breakdown: noteBreakdown };

            case 'PROJECT_CREATED':
                const projBase = XP_ACTIONS.PROJECT_CREATED.base;
                const projBreakdown = [{ type: 'base', value: projBase, description: 'Progetto creato' }];
                let projTotal = projBase;

                if (metadata.hasDescription) {
                    projTotal += XP_ACTIONS.PROJECT_CREATED.descriptionBonus;
                    projBreakdown.push({ type: 'description', value: XP_ACTIONS.PROJECT_CREATED.descriptionBonus, description: 'Con descrizione' });
                }
                if (metadata.hasDeadline) {
                    projTotal += XP_ACTIONS.PROJECT_CREATED.deadlineBonus;
                    projBreakdown.push({ type: 'deadline', value: XP_ACTIONS.PROJECT_CREATED.deadlineBonus, description: 'Con deadline' });
                }

                return { baseXp: projTotal, breakdown: projBreakdown };

            case 'PROJECT_COMPLETED':
                const projCompBase = XP_ACTIONS.PROJECT_COMPLETED.base;
                const days = this._toNumber(metadata.daysActive, 0);
                const milestones = this._toNumber(metadata.milestonesCompleted, 0);
                const dayBonus = days * XP_ACTIONS.PROJECT_COMPLETED.perDayMultiplier;
                const msCompBonus = milestones * XP_ACTIONS.PROJECT_COMPLETED.perMilestoneBonus;

                return {
                    baseXp: projCompBase + dayBonus + msCompBonus,
                    breakdown: [
                        { type: 'base', value: projCompBase, description: 'Progetto completato' },
                        { type: 'days', value: dayBonus, description: `${days} giorni attivi` },
                        { type: 'milestones', value: msCompBonus, description: `${milestones} milestones` }
                    ]
                };

            default:
                return { baseXp: 0, breakdown: [] };
        }
    }

    /**
     * Determina la categoria XP per i daily caps
     */
    _getXpCategory(type) {
        const categoryMap = {
            'SESSION_COMPLETE': 'study',
            'WORK_SESSION_LOGGED': 'work',
            'WORK_NOTE_CREATED': 'notes',
            'PROJECT_CREATED': 'projects',
            'PROJECT_COMPLETED': null // No cap
        };
        return categoryMap[type] || null;
    }

    /**
     * Aggiorna stats base
     */
    async _updateBaseStats(userId, type, metadata) {
        if (type === 'SESSION_COMPLETE') {
            const correctCount = this._toNumber(metadata.correctCount, 0);
            const wrongCount = this._toNumber(metadata.wrongCount, 0);
            const totalCards = this._toNumber(metadata.totalCards, correctCount + wrongCount);

            await User.findByIdAndUpdate(userId, {
                $inc: {
                    'gamification.stats.totalStudySessions': 1,
                    'gamification.stats.totalFlashcardsReviewed': totalCards,
                    'gamification.stats.correctAnswers': correctCount
                }
            });
        }
    }

    /**
     * Aggiorna stats estese per achievements
     */
    async _updateExtendedStats(userId, type, metadata) {
        const updates = {};

        switch (type) {
            case 'SESSION_COMPLETE':
                // Verifica sessione perfetta
                const accuracy = this._toNumber(metadata.accuracy, 0);
                if (accuracy >= 100) {
                    updates['gamification.extendedStats.perfectSessions'] = 1;
                }

                // Verifica orario
                const hour = new Date().getHours();
                if (hour >= 22 || hour < 5) {
                    updates['gamification.extendedStats.nightSessions'] = 1;
                }
                if (hour >= 5 && hour < 8) {
                    updates['gamification.extendedStats.earlySessions'] = 1;
                }

                // Prima attività
                const user = await User.findById(userId);
                if (user?.gamification?.extendedStats?.firstActivity === 0) {
                    updates['gamification.extendedStats.firstActivity'] = 1;
                }
                break;

            case 'GOAL_CREATED':
                updates['gamification.extendedStats.goalsCreated'] = 1;
                break;

            case 'GOAL_COMPLETED':
                updates['gamification.extendedStats.goalsCompleted'] = 1;
                if (metadata.completedEarly) {
                    updates['gamification.extendedStats.earlyCompletions'] = 1;
                }
                if (metadata.hadDeadline) {
                    updates['gamification.extendedStats.deadlinesMet'] = 1;
                }
                break;

            case 'HABIT_CHECKIN':
                updates['gamification.extendedStats.habitCheckIns'] = 1;
                break;

            case 'MILESTONE_COMPLETED':
                updates['gamification.extendedStats.milestonesCompleted'] = 1;
                break;

            case 'WORK_SESSION_LOGGED':
                updates['gamification.extendedStats.workSessionsLogged'] = 1;
                const minutes = this._toNumber(metadata.durationMinutes, 0);
                updates['gamification.extendedStats.totalWorkMinutes'] = minutes;

                // Full work day check
                if (minutes >= 480) { // 8 ore
                    updates['gamification.extendedStats.fullWorkDays'] = 1;
                }
                break;

            case 'WORK_NOTE_CREATED':
                updates['gamification.extendedStats.notesCreated'] = 1;
                break;

            case 'PROJECT_COMPLETED':
                updates['gamification.extendedStats.projectsCompleted'] = 1;
                break;

            case 'EXAM_PASSED':
                const grade = this._toNumber(metadata.grade, 18);
                if (grade >= 28) {
                    updates['gamification.extendedStats.highGradeExams'] = 1;
                }
                if (metadata.laude) {
                    updates['gamification.extendedStats.laudeCount'] = 1;
                }
                break;
        }

        if (Object.keys(updates).length > 0) {
            await User.findByIdAndUpdate(userId, { $inc: updates });
        }
    }

    /**
     * Aggiorna challenges in base all'attività
     */
    async _updateChallenges(userId, type, metadata) {
        const challengeMap = {
            'SESSION_COMPLETE': {
                type: 'STUDY_CARDS',
                amount: this._toNumber(metadata.totalCards, 1)
            },
            'HABIT_CHECKIN': {
                type: 'CHECKIN',
                amount: 1
            },
            'WORK_SESSION_LOGGED': {
                type: 'WORK_TIME',
                amount: Math.floor(this._toNumber(metadata.durationMinutes, 0) / 60)
            },
            'GOAL_COMPLETED': {
                type: 'GOAL_PROGRESS',
                amount: 1
            }
        };

        const mapping = challengeMap[type];
        if (mapping && mapping.amount > 0) {
            await challengeService.updateChallengeProgress(userId, mapping.type, mapping.amount);
        }

        // Check per PERFECT_SESSION
        if (type === 'SESSION_COMPLETE') {
            const accuracy = this._toNumber(metadata.accuracy, 0);
            if (accuracy >= 100) {
                await challengeService.updateChallengeProgress(userId, 'PERFECT_SESSION', 1);
            }
        }

        // Check per EARLY_BIRD
        const hour = new Date().getHours();
        if (hour < 8) {
            await challengeService.updateChallengeProgress(userId, 'EARLY_BIRD', 1);
        }

        // STREAK_KEEPER
        await challengeService.updateChallengeProgress(userId, 'STREAK_KEEPER', 1);
    }

    /**
     * Determina quali stats verificare per achievements
     */
    _getStatsToCheckForType(type) {
        const statMap = {
            'SESSION_COMPLETE': ['totalStudySessions', 'totalFlashcardsReviewed', 'correctAnswers', 'perfectSessions', 'nightSessions', 'earlySessions', 'firstActivity'],
            'GOAL_CREATED': ['goalsCreated'],
            'GOAL_COMPLETED': ['goalsCompleted', 'earlyCompletions', 'deadlinesMet'],
            'HABIT_CHECKIN': ['habitCheckIns'],
            'MILESTONE_COMPLETED': ['milestonesCompleted'],
            'WORK_SESSION_LOGGED': ['workSessionsLogged', 'totalWorkMinutes', 'fullWorkDays'],
            'WORK_NOTE_CREATED': ['notesCreated'],
            'PROJECT_COMPLETED': ['projectsCompleted'],
            'EXAM_PASSED': ['highGradeExams', 'laudeCount']
        };
        return statMap[type] || [];
    }

    /**
     * Verifica streak milestones e ritorna XP bonus
     */
    async _checkStreakMilestone(userId, currentStreak) {
        const { getStreakMilestoneBonus, STREAK_MILESTONES } = require('../config/gamification');

        // Trova il milestone precedente
        const user = await User.findById(userId);
        const previousStreak = (user?.gamification?.streak?.current || 1) - 1;

        return getStreakMilestoneBonus(currentStreak, previousStreak);
    }

    /**
     * Metodo legacy per compatibilità - ora usa il nuovo sistema
     */
    _calculateXp(type, metadata) {
        if (type === 'SESSION_COMPLETE') {
            return this._calculateSessionXp(metadata);
        }
        if (type === 'GOAL_COMPLETED') {
            return this._toNumber(metadata.xpEarned, 25);
        }
        if (type === 'STREAK_BONUS') {
            return this._toNumber(metadata.xpEarned, 5);
        }
        return 0;
    }

    _calculateSessionXp(metadata) {
        const baseXP = 10;
        const correctCount = this._toNumber(metadata.correctCount, 0);
        const wrongCount = this._toNumber(metadata.wrongCount, 0);
        const timeSpentSeconds = this._toNumber(metadata.timeSpentSeconds, 0);
        const totalCards = this._toNumber(metadata.totalCards, correctCount + wrongCount);

        const timePerCard = totalCards > 0 ? timeSpentSeconds / totalCards : 0;
        const timeBonus = timePerCard > 0
            ? Math.max(0, Math.round(10 - timePerCard / 3))
            : 0;

        const streakBonus = this._toNumber(metadata.streakBonus, 0);

        return baseXP + (correctCount * 2) + timeBonus + streakBonus;
    }

    _startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    _toNumber(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    _safeObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    _isStructuredPayload(payload) {
        if (!payload || typeof payload !== 'object') return false;
        return (
            Object.prototype.hasOwnProperty.call(payload, 'metadata') ||
            Object.prototype.hasOwnProperty.call(payload, 'entityId') ||
            Object.prototype.hasOwnProperty.call(payload, 'category') ||
            Object.prototype.hasOwnProperty.call(payload, 'sentiment') ||
            Object.prototype.hasOwnProperty.call(payload, 'createdAt')
        );
    }

    _getDayOfWeekLabel(date) {
        const index = date.getDay();
        return DAY_LABELS[index] || 'unknown';
    }

    _getTimeOfDayLabel(date) {
        const hour = date.getHours();

        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
}

module.exports = new ActivityService();
