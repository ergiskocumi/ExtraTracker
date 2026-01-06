/**
 * ACTIVITY SERVICE
 *
 * Registro centrale attività + gamification.
 * Estende recordActivity con metadata comuni (dayOfWeek, timeOfDay).
 */

const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const AppError = require('../utils/AppError');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const XP_LEVEL_BASE = 100;

const ACTIVITY_TYPES = [
    'SESSION_COMPLETE',
    'GOAL_CREATED',
    'GOAL_COMPLETED',
    'GOAL_ARCHIVED',
    'WORK_SESSION_LOGGED',
    'WORK_NOTE_CREATED', // Note/journal senza orari
    'HABIT_CHECKIN',
    'HABIT_SKIPPED',
    'PROJECT_CREATED',
    'PROJECT_COMPLETED',
    'STREAK_BONUS',
];

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

class ActivityService {
    getLevelFromXP(xp) {
        const safeXp = this._toNumber(xp, 0);
        return Math.max(1, Math.floor(Math.sqrt(safeXp / XP_LEVEL_BASE)) + 1);
    }

    /**
     * Aggiorna lo streak usando operatori atomici MongoDB.
     * 
     * ⚠️ RACE CONDITION RISOLTA:
     * Invece di leggere, modificare in JS e salvare (non atomico),
     * usiamo operatori MongoDB atomici direttamente nel database.
     * 
     * Logica atomica:
     * 1. Se lastActivityDate non è oggi:
     *    - Se è ieri (range): incrementa streak
     *    - Altrimenti: reset streak a 1
     *    - Aggiorna lastActivityDate a oggi
     * 2. Se lastActivityDate è già oggi: nessuna modifica (idempotente)
     * 
     * Usa pipeline di aggiornamento per logica condizionale atomica.
     * 
     * @param {ObjectId} userId - ID dell'utente
     * @returns {Promise<Object>} - { current, best, updated } - updated indica se è stato aggiornato
     */
    async updateStreakAtomically(userId) {
        const today = this._startOfDay(new Date());
        const yesterdayStart = new Date(today.getTime() - MS_PER_DAY);
        const yesterdayEnd = new Date(today.getTime() - 1); // Un millisecondo prima di oggi
        
        // OPERAZIONE 1: Incrementa streak se lastActivityDate è ieri (o null/inesistente)
        // Condizione atomica: solo se lastActivityDate non è oggi
        const incrementResult = await User.updateOne(
            {
                _id: userId,
                // Condizione: lastActivityDate è ieri (range) o null/inesistente, E non è oggi
                $or: [
                    { 'gamification.streak.lastActivityDate': { $exists: false } },
                    { 'gamification.streak.lastActivityDate': null },
                    {
                        $and: [
                            { 'gamification.streak.lastActivityDate': { $gte: yesterdayStart } },
                            { 'gamification.streak.lastActivityDate': { $lt: today } },
                        ],
                    },
                ],
            },
            {
                $inc: { 'gamification.streak.current': 1 },
                $set: { 'gamification.streak.lastActivityDate': today },
            }
        );

        // OPERAZIONE 2: Reset streak a 1 se lastActivityDate è più vecchio di ieri
        // Solo se la prima operazione non ha matchato
        if (incrementResult.matchedCount === 0) {
            const resetResult = await User.updateOne(
                {
                    _id: userId,
                    // Condizione: lastActivityDate esiste, non è null, ed è più vecchio di ieri
                    'gamification.streak.lastActivityDate': {
                        $exists: true,
                        $ne: null,
                        $lt: yesterdayStart,
                    },
                },
                {
                    $set: {
                        'gamification.streak.current': 1,
                        'gamification.streak.lastActivityDate': today,
                    },
                }
            );

            // Se anche questa non ha matchato, significa che lastActivityDate è già oggi
            // (idempotente: nessuna modifica necessaria)
            if (resetResult.matchedCount === 0) {
                const user = await User.findById(userId).select('gamification.streak');
                const streak = user?.gamification?.streak || {};
                return {
                    current: this._toNumber(streak.current, 0),
                    best: this._toNumber(streak.best, 0),
                    updated: false, // Non aggiornato perché già aggiornato oggi
                };
            }
        }

        // Aggiorna best streak se necessario (dopo incremento o reset)
        // Recupera il nuovo current e aggiorna best se maggiore
        const user = await User.findById(userId).select('gamification.streak');
        const newCurrent = this._toNumber(user?.gamification?.streak?.current, 0);
        const currentBest = this._toNumber(user?.gamification?.streak?.best, 0);
        
        if (newCurrent > currentBest) {
            await User.updateOne(
                { _id: userId },
                { $set: { 'gamification.streak.best': newCurrent } }
            );
        }

        // Recupera i valori finali aggiornati
        const updatedUser = await User.findById(userId).select('gamification.streak');
        const streak = updatedUser?.gamification?.streak || {};
        
        return {
            current: this._toNumber(streak.current, 0),
            best: this._toNumber(streak.best, 0),
            updated: true, // Aggiornato con successo
        };
    }

    /**
     * @deprecated Usa updateStreakAtomically() invece
     * Mantenuto per compatibilità temporanea
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

        const xpEarned = Math.max(0, this._calculateXp(type, enrichedMetadata));

        await UserActivity.create({
            user: userId,
            type,
            entityId,
            category,
            sentiment,
            xpEarned,
            metadata: enrichedMetadata,
            createdAt,
        });

        const user = await User.findById(userId);
        if (!user) {
            throw AppError.notFound('Utente');
        }

        const gamification = user.gamification || {};
        const rawStats = gamification.stats && typeof gamification.stats === 'object'
            ? gamification.stats
            : {};
        const previousLevel = this._toNumber(gamification.level, 1);
        const previousXp = this._toNumber(gamification.xp, 0);

        const nextXp = previousXp + xpEarned;
        const newLevel = this.getLevelFromXP(nextXp);
        const leveledUp = newLevel > previousLevel;

        // ⚠️ ATOMIC UPDATE: Usa operatori MongoDB atomici invece di read-modify-write
        // Questo previene race conditions quando più richieste arrivano simultaneamente
        const streakResult = await this.updateStreakAtomically(userId);
        const nextStreak = {
            current: streakResult.current,
            best: streakResult.best,
            lastActivityDate: this._startOfDay(new Date()),
        };

        const nextStats = {
            totalStudySessions: this._toNumber(rawStats.totalStudySessions, 0),
            totalFlashcardsReviewed: this._toNumber(rawStats.totalFlashcardsReviewed, 0),
            correctAnswers: this._toNumber(rawStats.correctAnswers, 0),
        };

        if (type === 'SESSION_COMPLETE') {
            const correctCount = this._toNumber(enrichedMetadata.correctCount, 0);
            const wrongCount = this._toNumber(enrichedMetadata.wrongCount, 0);
            const totalCards = this._toNumber(enrichedMetadata.totalCards, correctCount + wrongCount);

            nextStats.totalStudySessions += 1;
            nextStats.totalFlashcardsReviewed += totalCards;
            nextStats.correctAnswers += correctCount;
        }

        user.set('gamification', {
            xp: nextXp,
            level: newLevel,
            streak: nextStreak,
            stats: nextStats,
        });

        await user.save({ validateModifiedOnly: true });

        return {
            leveledUp,
            xpEarned,
            newLevel,
        };
    }

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
