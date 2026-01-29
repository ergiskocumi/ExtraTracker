/**
 * DASHBOARD CONTROLLER - Command Center Aggregation
 * ====================================================
 * 
 * Endpoint unico ultra-veloce che aggrega tutti i dati
 * necessari per la dashboard "azionabile".
 * 
 * Invece di far fare 10 chiamate API al frontend,
 * restituisce tutto in una sola risposta.
 */

const goalService = require('../services/goalService');
const User = require('../models/User');
const Deck = require('../models/Deck');
const WorkLog = require('../models/WorkLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Genera saluto dinamico basato sull'ora
 */
const getGreeting = (name) => {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Buongiorno';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Buon pomeriggio';
    } else if (hour >= 18 && hour < 22) {
        greeting = 'Buonasera';
    } else {
        greeting = 'Buonanotte';
    }

    return `${greeting}, ${name}!`;
};

/**
 * GET /api/dashboard/summary
 * 
 * Restituisce un riepilogo operativo completo:
 * - Saluto personalizzato
 * - Flashcards da ripassare
 * - Obiettivi attivi e in scadenza
 * - Ore lavorate oggi
 */
exports.getSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Middleware usa req.user.id, non _id
    const tenantScope = req.tenantScope;
    const todayDateStr = new Date().toISOString().split('T')[0];

    // =========================================
    // AGGREGAZIONE PARALLELA (Promise.all)
    // =========================================
    
    const [
        decks,
        activeGoals,
        todayWorkLogs,
        user
    ] = await Promise.all([
        // 1. Tutti i mazzi con carte da ripassare
        Deck.find({ user: userId }).select('title cards.nextReviewDate').lean(),
        
        // 2. Obiettivi attivi
        goalService.findActive(tenantScope),
        
        // 3. WorkLog di oggi per ore lavorate
        WorkLog.find({ user: userId, date: todayDateStr }).lean(),
        
        // 4. Dati utente (+ firstName per greeting)
        User.findById(userId).select('profile').lean()
    ]);

    // Estrai nome utente dal DB (firstName è dentro profile)
    const userName = user?.profile?.firstName || user?.profile?.displayName || 'Utente';

    const todayStats = { cardsStudiedToday: 0, goalsCompletedToday: 0 };

    // =========================================
    // ELABORAZIONE DATI STUDIO
    // =========================================
    
    let totalDueCards = 0;
    let nextDeck = null;
    const now = new Date();

    for (const deck of decks) {
        let deckDueCount = 0;
        
        if (deck.cards && deck.cards.length > 0) {
            for (const card of deck.cards) {
                const reviewDate = card?.nextReviewDate ? new Date(card.nextReviewDate) : null;
                if (!reviewDate || reviewDate <= now) {
                    deckDueCount++;
                }
            }
        }
        
        totalDueCards += deckDueCount;

        deck.dueCount = deckDueCount;
        
        // Seleziona il primo mazzo con carte da fare
        if (deckDueCount > 0 && !nextDeck) {
            nextDeck = {
                id: deck._id,
                title: deck.title,
                dueCards: deckDueCount,
                totalCards: deck.cards?.length || 0
            };
        }
    }

    // =========================================
    // ELABORAZIONE OBIETTIVI
    // =========================================
    
    const overdueGoals = [];
    const highPriorityGoals = [];
    const upcomingGoals = [];
    
    for (const goal of activeGoals) {
        const deadline = goal.deadline ? new Date(goal.deadline) : null;
        const isOverdue = deadline && deadline < now;
        const isHighPriority = goal.priority === 'high';
        const isUpcoming = deadline && (deadline - now) < 7 * 24 * 60 * 60 * 1000; // 7 giorni
        
        if (isOverdue) {
            overdueGoals.push(goal);
        } else if (isHighPriority) {
            highPriorityGoals.push(goal);
        } else if (isUpcoming) {
            upcomingGoals.push(goal);
        }
    }
    
    // Top priority goal da mostrare
    const topPriorityGoal = overdueGoals[0] || highPriorityGoals[0] || upcomingGoals[0] || activeGoals[0];

    const recents = [];

    // =========================================
    // ELABORAZIONE LAVORO DI OGGI
    // =========================================
    
    const todayMinutes = todayWorkLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const todayHours = Math.floor(todayMinutes / 60);
    const remainingMinutes = todayMinutes % 60;

    // =========================================
    // RESPONSE
    // =========================================
    
    res.json({
        success: true,
        data: {
            greeting: getGreeting(userName),
            
            study: {
                dueCards: totalDueCards,
                totalDecks: decks.length,
                nextDeck,
                allDone: totalDueCards === 0 && decks.length > 0,
                cardsStudiedToday: todayStats.cardsStudiedToday
            },
            
            goals: {
                activeCount: activeGoals.length,
                overdueCount: overdueGoals.length,
                highPriorityCount: highPriorityGoals.length,
                topPriority: topPriorityGoal ? {
                    id: topPriorityGoal._id,
                    title: topPriorityGoal.title,
                    category: topPriorityGoal.category,
                    deadline: topPriorityGoal.deadline,
                    isOverdue: overdueGoals.includes(topPriorityGoal),
                    progress: topPriorityGoal.progress || 0
                } : null,
                completedToday: todayStats.goalsCompletedToday
            },
            
            work: {
                todayMinutes,
                todayFormatted: todayMinutes > 0 
                    ? `${todayHours}h ${remainingMinutes}m`
                    : 'Nessuna sessione',
                sessionsToday: todayWorkLogs.length
            },
            
            recents
        }
    });
});

/**
 * GET /api/dashboard/quick-actions
 * 
 * Restituisce azioni rapide contestuali
 */
exports.getQuickActions = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const decks = await Deck.find({ user: userId }).select('_id title').limit(5).lean();
    
    const actions = [];
    
    // Quick action: Nuova sessione di studio
    if (decks.length > 0) {
        actions.push({
            id: 'study',
            label: 'Studia',
            description: `${decks.length} mazzi disponibili`,
            icon: 'brain',
            color: 'violet',
            link: '/study'
        });
    }
    
    // Quick action: Log lavoro
    actions.push({
        id: 'worklog',
        label: 'Registra lavoro',
        description: 'Traccia le tue ore',
        icon: 'clock',
        color: 'blue',
        link: '/dashboard'
    });
    
    // Quick action: Nuovo obiettivo
    actions.push({
        id: 'goal',
        label: 'Nuovo obiettivo',
        description: 'Crea un traguardo',
        icon: 'target',
        color: 'emerald',
        link: '/goals/new'
    });
    
    res.json({
        success: true,
        data: actions
    });
});
