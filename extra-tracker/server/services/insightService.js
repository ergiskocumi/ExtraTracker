/**
 * 🧠 INSIGHT SERVICE (AI Coach)
 * ============================
 *
 * Motore di analisi comportamentale basato su UserActivity.
 * Legge gli ultimi 30 giorni di log e genera consigli pratici ("insights").
 */

const UserActivity = require('../models/UserActivity');

const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME_OF_DAY_LABELS = ['morning', 'afternoon', 'evening', 'night'];

const IT_DAY = {
    sun: { label: 'domenica', article: 'la' },
    mon: { label: 'lunedì', article: 'il' },
    tue: { label: 'martedì', article: 'il' },
    wed: { label: 'mercoledì', article: 'il' },
    thu: { label: 'giovedì', article: 'il' },
    fri: { label: 'venerdì', article: 'il' },
    sat: { label: 'sabato', article: 'il' },
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTimeOfDay = (raw, createdAt) => {
    if (TIME_OF_DAY_LABELS.includes(raw)) return raw;

    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

const normalizeDayOfWeek = (raw, createdAt) => {
    if (DAY_LABELS.includes(raw)) return raw;

    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    return DAY_LABELS[date.getDay()] || 'unknown';
};

class InsightService {
    /**
     * Genera insight dagli ultimi 30 giorni di UserActivity.
     * @param {import('mongoose').Types.ObjectId|string} userId
     * @returns {Promise<Array<{type: 'suggestion'|'warning', title: string, message: string, icon: string}>>}
     */
    async generateInsights(userId) {
        const today = new Date();
        const startDate = startOfDay(today);
        startDate.setDate(startDate.getDate() - 29); // 30 giorni inclusivi

        const activities = await UserActivity.forTenant(userId)
            .find({ createdAt: { $gte: startDate } })
            .select('type metadata createdAt')
            .lean();

        const insights = [];

        const chronotype = this._analyzeChronotype(activities);
        if (chronotype) insights.push(chronotype);

        const ambitionGap = this._analyzeAmbitionGap(activities);
        if (ambitionGap) insights.push(ambitionGap);

        const streak = this._analyzeConsistencyStreak(activities, startDate, today);
        if (streak) insights.push(streak);

        return insights;
    }

    // =========================================
    // 1) 🕵️ Analisi Cronotipo (Studio)
    // =========================================
    _analyzeChronotype(activities) {
        const stats = {
            morning: { correct: 0, total: 0, sessions: 0 },
            afternoon: { correct: 0, total: 0, sessions: 0 },
            evening: { correct: 0, total: 0, sessions: 0 },
            night: { correct: 0, total: 0, sessions: 0 },
        };

        activities
            .filter((a) => a.type === 'SESSION_COMPLETE')
            .forEach((activity) => {
                const metadata = activity.metadata && typeof activity.metadata === 'object' ? activity.metadata : {};

                const timeOfDay = normalizeTimeOfDay(metadata.timeOfDay, activity.createdAt);
                if (!stats[timeOfDay]) return;

                const correctCount = Math.max(0, toNumber(metadata.correctCount, 0));
                const wrongCount = Math.max(0, toNumber(metadata.wrongCount, 0));
                const totalCards = Math.max(0, toNumber(metadata.totalCards, 0));

                let total = correctCount + wrongCount;
                if (total <= 0 && totalCards > 0) total = totalCards;
                if (total <= 0) return;

                const safeCorrect = Math.min(correctCount, total);

                stats[timeOfDay].correct += safeCorrect;
                stats[timeOfDay].total += total;
                stats[timeOfDay].sessions += 1;
            });

        const morning = stats.morning;
        const night = stats.night;

        const MIN_TOTAL_ANSWERS = 10;
        if (morning.total < MIN_TOTAL_ANSWERS || night.total < MIN_TOTAL_ANSWERS) {
            return null;
        }

        const morningAccuracy = (morning.correct / morning.total) * 100;
        const nightAccuracy = (night.correct / night.total) * 100;

        // Condizione richiesta: Morning > Night di almeno 20 punti percentuali
        const delta = morningAccuracy - nightAccuracy;
        if (delta < 20) return null;

        const morningPct = Math.round(morningAccuracy);
        const nightPct = Math.round(nightAccuracy);

        return {
            type: 'suggestion',
            title: 'Cambia orario di studio',
            message:
                `💡 Sei un tipo mattiniero! La tua precisione è del ${morningPct}% ` +
                `la mattina contro il ${nightPct}% la sera. Prova a studiare prima di pranzo.`,
            icon: 'sun',
        };
    }

    // =========================================
    // 2) 🛑 Analisi "Ambition Gap" (Obiettivi)
    // =========================================
    _analyzeAmbitionGap(activities) {
        const created = activities.filter((a) => a.type === 'GOAL_CREATED').length;
        const completed = activities.filter((a) => a.type === 'GOAL_COMPLETED').length;

        if (created < 5) return null;

        const completionRate = created > 0 ? completed / created : 0;
        if (completionRate >= 0.3) return null;

        return {
            type: 'warning',
            title: 'Ambition Gap sugli obiettivi',
            message:
                `⚠️ Hai creato ${created} obiettivi ma ne hai completati solo ${completed} ` +
                `negli ultimi 30 giorni. Prova a concentrarti su uno solo per questa settimana ` +
                `per non disperdere energie.`,
            icon: 'target',
        };
    }

    // =========================================
    // 3) 🔥 Analisi Costanza (Streak)
    // =========================================
    _analyzeConsistencyStreak(activities, startDate, endDate) {
        const allActiveDates = new Set(
            activities
                .filter((a) => a.createdAt)
                .map((a) => toDateKey(new Date(a.createdAt)))
        );

        // Troppo poco segnale: evita insight rumorosi.
        if (allActiveDates.size < 10) return null;

        const expectedByDay = DAY_LABELS.reduce((acc, day) => {
            acc[day] = 0;
            return acc;
        }, {});

        for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d.setDate(d.getDate() + 1)) {
            const label = DAY_LABELS[d.getDay()];
            if (label) expectedByDay[label] += 1;
        }

        const activeDatesByDay = DAY_LABELS.reduce((acc, day) => {
            acc[day] = new Set();
            return acc;
        }, {});

        activities.forEach((activity) => {
            if (!activity.createdAt) return;
            const metadata = activity.metadata && typeof activity.metadata === 'object' ? activity.metadata : {};
            const day = normalizeDayOfWeek(metadata.dayOfWeek, activity.createdAt);
            if (!activeDatesByDay[day]) return;
            activeDatesByDay[day].add(toDateKey(new Date(activity.createdAt)));
        });

        const candidates = DAY_LABELS
            .filter((day) => expectedByDay[day] >= 3)
            .map((day) => ({
                day,
                expected: expectedByDay[day],
                active: activeDatesByDay[day].size,
                coverage: expectedByDay[day] > 0 ? activeDatesByDay[day].size / expectedByDay[day] : 0,
            }))
            .sort((a, b) => a.coverage - b.coverage);

        const worst = candidates[0];
        if (!worst) return null;

        // Caso richiesto: "non fai mai nulla" in un determinato giorno
        if (worst.active > 0) return null;

        const dayInfo = IT_DAY[worst.day] || { label: worst.day, article: 'il' };
        const dayLabel = `${dayInfo.article} ${dayInfo.label}`;

        return {
            type: 'warning',
            title: 'Mantieni lo streak',
            message:
                `📅 ${dayLabel} sembra essere il tuo giorno “no”. ` +
                `Prova a impostare un obiettivo minimo (5 minuti) per mantenere lo streak.`,
            icon: 'flame',
        };
    }
}

module.exports = new InsightService();

