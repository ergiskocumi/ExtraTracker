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
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');
const Deck = require('../models/Deck');
const WorkLog = require('../models/WorkLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { getXpForLevel } = require('../config/gamification');

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
 * Formatta il tempo relativo in modo leggibile
 */
const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Adesso';
    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
    if (days < 7) return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

/**
 * GET /api/dashboard/summary
 * 
 * Restituisce un riepilogo operativo completo:
 * - Saluto personalizzato
 * - Flashcards da ripassare
 * - Obiettivi attivi e in scadenza
 * - Attività recenti per "Jump Back In"
 * - Statistiche gamification
 * - Ore lavorate oggi
 */
exports.getSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Middleware usa req.user.id, non _id
    const tenantScope = req.tenantScope;
    const tenantId = tenantScope?.tenantId || userId;
    const todayDateStr = new Date().toISOString().split('T')[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // =========================================
    // AGGREGAZIONE PARALLELA (Promise.all)
    // =========================================
    
    const [
        decks,
        activeGoals,
        recentActivities,
        todayWorkLogs,
        todayActivityStats,
        user
    ] = await Promise.all([
        // 1. Tutti i mazzi con carte da ripassare
        Deck.find({ user: userId }).select('title cards.nextReviewDate').lean(),
        
        // 2. Obiettivi attivi
        goalService.findActive(tenantScope),
        
        // 3. Ultime 10 attività per "Jump Back In"
        UserActivity.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        
        // 4. WorkLog di oggi per ore lavorate
        WorkLog.find({ user: userId, date: todayDateStr }).lean(),

        // 5. Attivita di oggi (study + goal completati)
        UserActivity.aggregate([
            {
                $match: {
                    user: tenantId,
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    type: { $in: ['SESSION_COMPLETE', 'GOAL_COMPLETED'] },
                },
            },
            {
                $group: {
                    _id: '$type',
                    totalCards: {
                        $sum: {
                            $ifNull: [
                                '$metadata.totalCards',
                                {
                                    $add: [
                                        { $ifNull: ['$metadata.correctCount', 0] },
                                        { $ifNull: ['$metadata.wrongCount', 0] },
                                    ],
                                },
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]),
        
        // 6. Dati utente per gamification (+ firstName per greeting)
        User.findById(userId).select('profile gamification').lean()
    ]);

    // Estrai nome utente dal DB (firstName è dentro profile)
    const userName = user?.profile?.firstName || user?.profile?.displayName || 'Utente';

    const todayStats = todayActivityStats.reduce((acc, entry) => {
        if (entry._id === 'SESSION_COMPLETE') {
            acc.cardsStudiedToday = entry.totalCards || 0;
        } else if (entry._id === 'GOAL_COMPLETED') {
            acc.goalsCompletedToday = entry.count || 0;
        }
        return acc;
    }, { cardsStudiedToday: 0, goalsCompletedToday: 0 });

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

    // =========================================
    // ELABORAZIONE "JUMP BACK IN" (Recents)
    // =========================================
    
    const recents = [];
    const seenEntities = new Set();
    
    for (const activity of recentActivities) {
        // Evita duplicati
        const entityKey = `${activity.type}_${activity.entityId}`;
        if (seenEntities.has(entityKey) || !activity.entityId) continue;
        seenEntities.add(entityKey);
        
        let recentItem = null;
        
        if (activity.type === 'SESSION_COMPLETE') {
            // Era una sessione di studio
            const deck = decks.find(d => d._id.toString() === activity.entityId?.toString());
            if (deck) {
                recentItem = {
                    type: 'deck',
                    id: deck._id,
                    title: deck.title,
                    icon: '🧠',
                    action: 'Riprendi studio',
                    lastAction: formatRelativeTime(activity.createdAt),
                    metadata: {
                        totalCards: deck.cards?.length || 0,
                        dueCards: deck.dueCount || 0
                    }
                };
            }
        } else if (activity.type === 'WORK_SESSION_LOGGED') {
            // Era un log di lavoro
            const durationMinutes = Number(activity.metadata?.durationMinutes) || 0;
            recentItem = {
                type: 'worklog',
                id: activity.entityId,
                title: activity.metadata?.projectName || 'Progetto',
                icon: '⏱️',
                action: 'Continua lavoro',
                lastAction: formatRelativeTime(activity.createdAt),
                metadata: {
                    durationMinutes
                }
            };
        } else if (activity.type === 'GOAL_CREATED' || activity.type === 'HABIT_CHECKIN') {
            // Era un check-in su obiettivo
            const goal = activeGoals.find(g => g._id.toString() === activity.entityId?.toString());
            if (goal) {
                recentItem = {
                    type: 'goal',
                    id: goal._id,
                    title: goal.title,
                    icon: '🎯',
                    action: 'Check-in',
                    lastAction: formatRelativeTime(activity.createdAt),
                    metadata: {
                        category: goal.category,
                        progress: goal.progress || 0
                    }
                };
            }
        }
        
        if (recentItem) {
            recents.push(recentItem);
        }
        
        // Massimo 5 recenti
        if (recents.length >= 5) break;
    }

    // =========================================
    // ELABORAZIONE LAVORO DI OGGI
    // =========================================
    
    const todayMinutes = todayWorkLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const todayHours = Math.floor(todayMinutes / 60);
    const remainingMinutes = todayMinutes % 60;

    // =========================================
    // GAMIFICATION
    // =========================================
    
    const gamification = user?.gamification || {};
    const streak = gamification.streak?.current || 0;
    const level = gamification.level || 1;
    const xp = gamification.xp || 0;
    
    // Calcola XP richiesto per il PROSSIMO livello usando formula corretta
    const nextLevelXp = getXpForLevel(level + 1);
    
    // XP current è quello del livello attuale
    const currentLevelXp = getXpForLevel(level);
    
    // Progress: XP fino al livello attuale
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpRequiredForCurrentLevel = nextLevelXp - currentLevelXp;
    const progress = Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForCurrentLevel) * 100));

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
            
            recents,
            
            gamification: {
                streak,
                level,
                xp,
                nextLevelXp,
                progress
            }
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
