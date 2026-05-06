/**
 * DASHBOARD SERVICE
 * ==================
 *
 * Aggrega dati da Deck, WorkLog, User per la dashboard.
 * Il controller delega qui tutta la business logic.
 */

const User = require('../models/User');
const Deck = require('../models/Deck');
const WorkLog = require('../models/WorkLog');
const logger = require('../utils/logger');

/**
 * Genera saluto dinamico basato sull'ora
 * @param {string} name
 * @returns {string}
 */
const getGreeting = (name) => {
    const hour = new Date().getHours();
    let greeting;

    if (hour >= 5 && hour < 12) {
        greeting = 'Buongiorno';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Buon pomeriggio';
    } else {
        greeting = 'Buonasera';
    }

    return `${greeting}, ${name}!`;
};

/**
 * Calcola il conteggio delle carte da ripassare per un mazzo
 * @param {object} deck - documento Deck (lean)
 * @param {Date} now
 * @returns {number}
 */
const countDueCards = (deck, now) => {
    if (!deck.cards || deck.cards.length === 0) return 0;

    return deck.cards.reduce((count, card) => {
        const reviewDate = card?.nextReviewDate ? new Date(card.nextReviewDate) : null;
        return (!reviewDate || reviewDate <= now) ? count + 1 : count;
    }, 0);
};

/**
 * Recupera il riepilogo operativo della dashboard
 * @param {string} userId
 * @returns {Promise<object>}
 */
const getSummary = async (userId) => {
    const todayDateStr = new Date().toISOString().split('T')[0];

    const [decks, todayWorkLogs, user] = await Promise.all([
        Deck.find({ user: userId }).select('title cards.nextReviewDate').limit(100).lean(),
        WorkLog.find({ user: userId, date: todayDateStr }).lean(),
        User.findById(userId).select('profile').lean(),
    ]);

    const userName = user?.profile?.firstName || user?.profile?.displayName || 'Utente';

    const now = new Date();
    let totalDueCards = 0;
    let nextDeck = null;

    for (const deck of decks) {
        const dueCount = countDueCards(deck, now);
        totalDueCards += dueCount;

        if (dueCount > 0 && !nextDeck) {
            nextDeck = {
                id: deck._id,
                title: deck.title,
                dueCards: dueCount,
                totalCards: deck.cards?.length || 0,
            };
        }
    }

    const todayMinutes = todayWorkLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const todayHours = Math.floor(todayMinutes / 60);
    const remainingMinutes = todayMinutes % 60;

    return {
        greeting: getGreeting(userName),
        study: {
            dueCards: totalDueCards,
            totalDecks: decks.length,
            nextDeck,
            allDone: totalDueCards === 0 && decks.length > 0,
            cardsStudiedToday: 0,
        },
        work: {
            todayMinutes,
            todayFormatted: todayMinutes > 0
                ? `${todayHours}h ${remainingMinutes}m`
                : 'Nessuna sessione',
            sessionsToday: todayWorkLogs.length,
        },
    };
};

/**
 * Recupera azioni rapide contestuali per la dashboard
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
const getQuickActions = async (userId) => {
    const decks = await Deck.find({ user: userId }).select('_id title').limit(5).lean();

    const actions = [];

    if (decks.length > 0) {
        actions.push({
            id: 'study',
            label: 'Studia',
            description: `${decks.length} mazzi disponibili`,
            icon: 'brain',
            color: 'violet',
            link: '/study',
        });
    }

    actions.push({
        id: 'worklog',
        label: 'Registra lavoro',
        description: 'Traccia le tue ore',
        icon: 'clock',
        color: 'blue',
        link: '/dashboard',
    });

    return actions;
};

module.exports = {
    getSummary,
    getQuickActions,
};
