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

// Controllers
const goalController = require('../controllers/goalController');

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
 * PATCH /api/goals/:goalId/milestones/:milestoneId/toggle-step
 * Toggle di un actionStep specifico (operazione leggera)
 * Body: { stepIndex: number, isCompleted: boolean }
 */
router.patch('/goals/:goalId/milestones/:milestoneId/toggle-step', asyncHandler(goalController.toggleMilestoneStep));

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
 * DELETE /api/goals/:id/milestones/:milestoneId
 * Elimina una milestone specifica (operazione atomica)
 */
router.delete('/goals/:id/milestones/:milestoneId', asyncHandler(async (req, res) => {
    const goal = await goalService.deleteMilestone(
        req.tenantScope,
        req.params.id,
        req.params.milestoneId
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
 * DELETE /api/goals/:id/milestones
 * Elimina più milestones in una singola operazione atomica
 */
router.delete('/goals/:id/milestones', asyncHandler(async (req, res) => {
    const milestoneIds = Array.isArray(req.body?.milestoneIds) ? req.body.milestoneIds : [];

    const goal = await goalService.bulkDeleteMilestones(
        req.tenantScope,
        req.params.id,
        milestoneIds
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
 * POST /api/goals/:id/milestones/bulk-delete
 * Bulk delete milestones (fallback per client/proxy che non supportano DELETE body)
 */
router.post('/goals/:id/milestones/bulk-delete', asyncHandler(async (req, res) => {
    const milestoneIds = Array.isArray(req.body?.milestoneIds) ? req.body.milestoneIds : [];

    const goal = await goalService.bulkDeleteMilestones(
        req.tenantScope,
        req.params.id,
        milestoneIds
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
 * DELETE /api/goals
 * Bulk delete goals (cascade delete dei check-in)
 */
router.delete('/goals', asyncHandler(async (req, res) => {
    const goalIds = Array.isArray(req.body?.goalIds) ? req.body.goalIds : [];
    const result = await goalService.bulkDelete(req.tenantScope, goalIds);
    res.json({ success: true, data: result, message: 'Obiettivi eliminati' });
}));

/**
 * POST /api/goals/bulk-delete
 * Bulk delete goals (fallback per client/proxy che non supportano DELETE body)
 */
router.post('/goals/bulk-delete', asyncHandler(async (req, res) => {
    const goalIds = Array.isArray(req.body?.goalIds) ? req.body.goalIds : [];
    const result = await goalService.bulkDelete(req.tenantScope, goalIds);
    res.json({ success: true, data: result, message: 'Obiettivi eliminati' });
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
 * 
 * Supporta:
 * - Goal type: habit, target (value=1 di default)
 * - Custom value via req.body.value
 * - Aggiorna automaticamente status se completato
 * 
 * TODO: Implementare MongoDB Transactions per evitare Race Condition
 * tra creazione checkIn e aggiornamento status del goal.
 * (Attualmente due operazioni separate: in alta concorrenza, il goal
 * potrebbe essere aggiornato da un'altra richiesta nel mezzo)
 */
router.post('/goals/:goalId/quick-checkin', asyncHandler(async (req, res) => {
    const goal = await goalService.findById(req.tenantScope, req.params.goalId, {
        throwIfNotFound: true,
    });

    // Supporta sia default (1) che custom value da request body
    const value = req.body.value ?? (goal.type === 'habit' || goal.type === 'target' ? 1 : null);
    
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
        mood: 2, // Neutral di default
    });

    const allCheckIns = await checkInService.findByGoal(req.tenantScope, req.params.goalId);
    const stats = calculateGoalStats(goal, allCheckIns);

    // Aggiorna status del goal se completato
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

// =========================================
// AI SMART GOAL WIZARD
// =========================================

const aiGoalService = require('../services/aiGoalService');
const { aiLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/goals/suggest
 * Genera un piano strategico AI per un nuovo obiettivo
 * 
 * @rateLimit AI Rate Limiter: 10 chiamate per ora per utente
 * 
 * Body:
 * - category: string (finance, health, learning, etc.)
 * - query: string (desiderio/intento dell'utente)
 * - intensity: 'relax' | 'normal' | 'hardcore'
 */
router.post('/goals/suggest', aiLimiter, asyncHandler(async (req, res) => {
    const { category, query, intensity } = req.body;
    const userId = req.tenantScope?.userId;

    // Validazione input
    if (!category) {
        return res.status(400).json({
            success: false,
            error: { message: 'La categoria è obbligatoria' },
        });
    }

    if (!query || query.trim().length < 10) {
        return res.status(400).json({
            success: false,
            error: { message: 'Descrivi il tuo obiettivo (almeno 10 caratteri)' },
        });
    }

    const validCategories = ['finance', 'health', 'learning', 'career', 'personal', 'relationships', 'creativity', 'mindfulness'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({
            success: false,
            error: { message: 'Categoria non valida' },
        });
    }

    const validIntensities = ['relax', 'normal', 'hardcore'];
    const safeIntensity = validIntensities.includes(intensity) ? intensity : 'normal';

    // Genera il piano AI
    const result = await aiGoalService.generateGoalPlan(
        userId,
        category,
        query.trim(),
        safeIntensity
    );

    if (result.success) {
        res.json({
            success: true,
            data: result.data,
        });
    } else {
        // Ritorna il fallback se disponibile
        res.status(500).json({
            success: false,
            error: { message: result.error },
            fallback: result.fallback,
        });
    }
}));

module.exports = router;
