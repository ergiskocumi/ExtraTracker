/**
 * 🎯 GOALS ROUTES - Multi-Tenant Protected
 * ========================================
 * 
 * Routes per obiettivi e check-in.
 * Tutte le query sono automaticamente filtrate per utente.
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const { asyncHandler } = require('../middleware/errorHandler');

// Services
const goalService = require('../services/goalService');
const checkInService = require('../services/checkInService');

// Strategies
const { calculateGoalStats } = require('../services/goalStrategies');

// =========================================
// MIDDLEWARE: Applica a TUTTE le routes
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// GOALS ROUTES
// =========================================

/**
 * GET /api/goals
 * Lista tutti gli obiettivi dell'utente
 */
router.get('/goals', asyncHandler(async (req, res) => {
    const goals = await goalService.find(req.tenantScope);
    res.json({ success: true, data: goals });
}));

/**
 * GET /api/goals/:id
 * Dettaglio obiettivo con check-in e statistiche
 */
router.get('/goals/:id', asyncHandler(async (req, res) => {
    const goal = await goalService.findById(
        req.tenantScope,
        req.params.id,
        { throwIfNotFound: true }
    );
    
    // Recupera tutti i check-in per questo obiettivo
    const checkIns = await checkInService.findByGoal(req.tenantScope, req.params.id);
    
    // Usa la strategy per calcolare le statistiche
    const stats = calculateGoalStats(goal, checkIns);
    
    res.json({
        success: true,
        data: {
            goal: goal.toJSON(),
            checkIns,
            stats,
        },
    });
}));

/**
 * POST /api/goals
 * Crea nuovo obiettivo
 */
router.post('/goals', asyncHandler(async (req, res) => {
    const goal = await goalService.create(req.tenantScope, {
        title: req.body.title,
        category: req.body.category,
        type: req.body.type,
        targetValue: req.body.targetValue,
        unit: req.body.unit,
        frequency: req.body.frequency,
        deadline: req.body.deadline,
        description: req.body.description,
        milestones: req.body.milestones, // Supporto milestones
    });
    res.status(201).json({ success: true, data: goal });
}));

/**
 * PUT /api/goals/:id
 * Aggiorna obiettivo
 */
router.put('/goals/:id', asyncHandler(async (req, res) => {
    const goal = await goalService.update(
        req.tenantScope,
        req.params.id,
        req.body
    );
    res.json({ success: true, data: goal });
}));

/**
 * PATCH /api/goals/:id/milestones/:milestoneId/toggle
 * Toggle isCompleted di una specifica milestone (operazione atomica)
 */
router.patch('/goals/:id/milestones/:milestoneId/toggle', asyncHandler(async (req, res) => {
    const goal = await goalService.toggleMilestone(
        req.tenantScope,
        req.params.id,
        req.params.milestoneId
    );
    
    // Calcola statistiche aggiornate
    const checkIns = await checkInService.findByGoal(req.tenantScope, req.params.id);
    const stats = calculateGoalStats(goal, checkIns);
    
    res.json({ 
        success: true, 
        data: {
            goal: goal.toJSON(),
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
                milestoneProgress: goal.milestoneProgress,
                completedMilestones: goal.completedMilestones,
                totalMilestones: goal.milestones?.length || 0
            }
        }
    });
}));

/**
 * PATCH /api/goals/:id/milestones/:milestoneId
 * Aggiorna dati di una milestone (es. notes)
 */
router.patch('/goals/:id/milestones/:milestoneId', asyncHandler(async (req, res) => {
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    const goal = await goalService.updateMilestone(
        req.tenantScope,
        req.params.id,
        req.params.milestoneId,
        { notes }
    );

    const checkIns = await checkInService.findByGoal(req.tenantScope, req.params.id);
    const stats = calculateGoalStats(goal, checkIns);

    res.json({
        success: true,
        data: {
            goal: goal.toJSON(),
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
                milestoneProgress: goal.milestoneProgress,
                completedMilestones: goal.completedMilestones,
                totalMilestones: goal.milestones?.length || 0,
            },
        },
    });
}));

/**
 * DELETE /api/goals/:id
 * Elimina obiettivo (cascade delete dei check-in)
 */
router.delete('/goals/:id', asyncHandler(async (req, res) => {
    await goalService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Obiettivo e check-in eliminati' });
}));

// =========================================
// CHECK-IN ROUTES
// =========================================

/**
 * POST /api/goals/:goalId/quick-checkin
 * Check-in rapido per habit/target senza body complesso
 */
router.post('/goals/:goalId/quick-checkin', asyncHandler(async (req, res) => {
    const goal = await goalService.findById(req.tenantScope, req.params.goalId, {
        throwIfNotFound: true,
    });

    const value = goal.type === 'habit' || goal.type === 'target' ? 1 : null;
    if (value == null) {
        return res.status(400).json({
            success: false,
            message: 'Tipo di obiettivo non supportato per quick check-in',
        });
    }

    const checkIn = await checkInService.create(req.tenantScope, {
        goalId: req.params.goalId,
        date: new Date(),
        value,
    });

    const allCheckIns = await checkInService.findByGoal(req.tenantScope, req.params.goalId);
    const stats = calculateGoalStats(goal, allCheckIns);

    if (stats.isCompleted && goal.status === 'active') {
        await goalService.update(req.tenantScope, req.params.goalId, {
            status: 'completed',
        });
    }

    res.status(201).json({
        success: true,
        data: {
            checkIn,
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
            },
        },
    });
}));

/**
 * GET /api/goals/:goalId/checkins
 * Lista check-in di un obiettivo
 */
router.get('/goals/:goalId/checkins', asyncHandler(async (req, res) => {
    // Verifica che il goal appartenga all'utente
    await goalService.findById(req.tenantScope, req.params.goalId, {
        throwIfNotFound: true,
    });
    
    const checkIns = await checkInService.findByGoal(req.tenantScope, req.params.goalId);
    res.json({ success: true, data: checkIns });
}));

/**
 * POST /api/goals/:goalId/checkins
 * Crea check-in per un obiettivo
 */
router.post('/goals/:goalId/checkins', asyncHandler(async (req, res) => {
    // Il service verifica automaticamente che il goal appartenga all'utente
    const checkIn = await checkInService.create(req.tenantScope, {
        goalId: req.params.goalId,
        date: req.body.date || new Date(),
        value: req.body.value,
        mood: req.body.mood,
        notes: req.body.notes,
    });
    
    // Ricalcola statistiche
    const goal = await goalService.findById(req.tenantScope, req.params.goalId);
    const allCheckIns = await checkInService.findByGoal(req.tenantScope, req.params.goalId);
    const stats = calculateGoalStats(goal, allCheckIns);

    // Se completato, aggiorna stato
    if (stats.isCompleted && goal.status === 'active') {
        await goalService.update(req.tenantScope, req.params.goalId, {
            status: 'completed',
        });
    }

    res.status(201).json({
        success: true,
        data: {
            checkIn,
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
            },
        },
    });
}));

/**
 * POST /api/goals/:goalId/quick-checkin
 * Quick Check-in - Endpoint leggero per "Fatto!" con un click
 * Defaults: value=1, mood=2, date=now
 */
router.post('/goals/:goalId/quick-checkin', asyncHandler(async (req, res) => {
    const value = req.body.value ?? 1;
    
    const checkIn = await checkInService.create(req.tenantScope, {
        goalId: req.params.goalId,
        date: new Date(),
        value: value,
        mood: 2, // Neutral di default
        notes: '',
    });
    
    const goal = await goalService.findById(req.tenantScope, req.params.goalId);
    const allCheckIns = await checkInService.findByGoal(req.tenantScope, req.params.goalId);
    const stats = calculateGoalStats(goal, allCheckIns);

    // Se completato, aggiorna stato
    if (stats.isCompleted && goal.status === 'active') {
        await goalService.update(req.tenantScope, req.params.goalId, {
            status: 'completed',
        });
    }

    res.status(201).json({
        success: true,
        data: {
            checkIn,
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
                streak: stats.streak,
            },
        },
    });
}));

/**
 * DELETE /api/checkins/:id
 * Elimina un check-in
 */
router.delete('/checkins/:id', asyncHandler(async (req, res) => {
    await checkInService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Check-in eliminato' });
}));

// =========================================
// DASHBOARD ROUTES
// =========================================

/**
 * GET /api/goals-stats
 * Statistiche dashboard obiettivi
 */
router.get('/goals-stats', asyncHandler(async (req, res) => {
    const { goals, stats } = await goalService.getDashboard(req.tenantScope);
    
    // Calcola statistiche con strategy per ogni goal
    const allCheckIns = await checkInService.find(req.tenantScope);
    
    const goalsWithProgress = await Promise.all(
        goals.filter(g => g.status === 'active').map(async (goal) => {
            const goalCheckIns = allCheckIns.filter(
                ci => ci.goalId.toString() === goal.id.toString()
            );
            const goalStats = calculateGoalStats(goal, goalCheckIns);
            
            return {
                ...goal,
                totalProgress: goalStats.totalProgress,
                percentage: goalStats.percentage,
                ...(goal.type === 'habit' && { streak: goalStats.streak }),
            };
        })
    );

    res.json({
        success: true,
        data: {
            summary: {
                totalGoals: goals.length,
                activeGoals: goals.filter(g => g.status === 'active').length,
                completedGoals: goals.filter(g => g.status === 'completed').length,
                totalCheckIns: allCheckIns.length,
            },
            activeGoalsWithProgress: goalsWithProgress,
        },
    });
}));

/**
 * GET /api/mood-stats
 * Statistiche mood nel tempo
 */
router.get('/mood-stats', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const stats = await checkInService.getMoodStats(req.tenantScope, days);
    res.json({ success: true, data: stats });
}));

module.exports = router;
