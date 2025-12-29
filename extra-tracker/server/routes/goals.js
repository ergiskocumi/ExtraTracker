const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const CheckIn = require('../models/CheckIn');
const { calculateGoalStats } = require('../services/goalStrategies');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');

//! ==================== ROTTE PER GLI OBIETTIVI ====================

//! GET - Recupera tutti gli obiettivi
router.get('/goals', asyncHandler(async (req, res) => {
    const goals = await Goal.find({});
    res.json({ success: true, data: goals });
}));

//! GET - Recupera un singolo obiettivo con i suoi check-in e progresso calcolato
router.get('/goals/:id', asyncHandler(async (req, res) => {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
        throw AppError.notFound('Obiettivo');
    }
    
    // Recupera tutti i check-in per questo obiettivo
    const checkIns = await CheckIn.find({ goalId: req.params.id }).sort({ date: -1 });
    
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

//! POST - Crea un nuovo obiettivo
router.post('/goals', asyncHandler(async (req, res) => {
    const goal = new Goal({
        title: req.body.title,
        category: req.body.category,
        type: req.body.type,
        targetValue: req.body.targetValue,
        unit: req.body.unit,
        frequency: req.body.frequency,
        deadline: req.body.deadline,
        description: req.body.description
    });

    const newGoal = await goal.save();
    res.status(201).json({ success: true, data: newGoal });
}));

//! PUT - Modifica un obiettivo esistente
router.put('/goals/:id', asyncHandler(async (req, res) => {
    const updatedGoal = await Goal.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!updatedGoal) {
        throw AppError.notFound('Obiettivo');
    }
    res.json({ success: true, data: updatedGoal });
}));

//! DELETE - Elimina un obiettivo e tutti i suoi check-in
router.delete('/goals/:id', asyncHandler(async (req, res) => {
    const deletedGoal = await Goal.findByIdAndDelete(req.params.id);
    if (!deletedGoal) {
        throw AppError.notFound('Obiettivo');
    }
    // Prima elimina tutti i check-in associati
    await CheckIn.deleteMany({ goalId: req.params.id });
    res.json({ success: true, message: 'Obiettivo e check-in eliminati' });
}));

//! ==================== ROTTE PER I CHECK-IN ====================

//! GET - Recupera tutti i check-in di un obiettivo
router.get('/goals/:goalId/checkins', asyncHandler(async (req, res) => {
    const checkIns = await CheckIn.find({ goalId: req.params.goalId }).sort({ date: -1 });
    res.json({ success: true, data: checkIns });
}));

//! POST - Crea un nuovo check-in (aggiorna progresso)
router.post('/goals/:goalId/checkins', asyncHandler(async (req, res) => {
    // Verifica che l'obiettivo esista
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) {
        throw AppError.notFound('Obiettivo');
    }

    const checkIn = new CheckIn({
        goalId: req.params.goalId,
        date: req.body.date || new Date(),
        value: req.body.value,
        mood: req.body.mood,
        notes: req.body.notes
    });

    const newCheckIn = await checkIn.save();
    
    // Calcola le nuove statistiche usando la strategy
    const allCheckIns = await CheckIn.find({ goalId: req.params.goalId });
    const stats = calculateGoalStats(goal, allCheckIns);

    // Se l'obiettivo è raggiunto, aggiornalo automaticamente
    if (stats.isCompleted && goal.status === 'active') {
        await Goal.findByIdAndUpdate(req.params.goalId, { status: 'completed' });
    }

    res.status(201).json({
        success: true,
        data: {
            checkIn: newCheckIn,
            stats: {
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
            },
        },
    });
}));

//! DELETE - Elimina un check-in specifico
router.delete('/checkins/:id', asyncHandler(async (req, res) => {
    const deletedCheckIn = await CheckIn.findByIdAndDelete(req.params.id);
    if (!deletedCheckIn) {
        throw AppError.notFound('Check-in');
    }
    res.json({ success: true, message: 'Check-in eliminato' });
}));

//! ==================== ROTTE DASHBOARD ====================

//! GET - Statistiche generali per la dashboard
router.get('/goals-stats', asyncHandler(async (req, res) => {
    const goals = await Goal.find({});
    const checkIns = await CheckIn.find({});
    
    // Statistiche generali
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    
    // Calcola progresso per ogni goal attivo usando la strategy
    const goalsWithProgress = await Promise.all(
        goals.filter(g => g.status === 'active').map(async (goal) => {
            const goalCheckIns = checkIns.filter(ci => ci.goalId.toString() === goal._id.toString());
            const stats = calculateGoalStats(goal, goalCheckIns);
            
            return {
                ...goal.toJSON(),
                totalProgress: stats.totalProgress,
                percentage: stats.percentage,
                ...(goal.type === 'habit' && { streak: stats.streak })
            };
        })
    );

    res.json({
        success: true,
        data: {
            summary: {
                totalGoals: goals.length,
                activeGoals,
                completedGoals,
                totalCheckIns: checkIns.length,
            },
            activeGoalsWithProgress: goalsWithProgress,
        },
    });
}));

module.exports = router;
