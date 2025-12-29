const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const CheckIn = require('../models/CheckIn');

//! ==================== ROTTE PER GLI OBIETTIVI ====================

//! GET - Recupera tutti gli obiettivi
router.get('/goals', async (req, res) => {
    try {
        const goals = await Goal.find({});
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! GET - Recupera un singolo obiettivo con i suoi check-in e progresso calcolato
router.get('/goals/:id', async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) {
            return res.status(404).json({ message: 'Obiettivo non trovato' });
        }
        
        // Recupera tutti i check-in per questo obiettivo
        const checkIns = await CheckIn.find({ goalId: req.params.id }).sort({ date: -1 });
        
        // Calcola il progresso totale
        const totalProgress = checkIns.reduce((sum, ci) => sum + ci.value, 0);
        
        // Calcola la percentuale (solo per obiettivi target)
        let percentage = 0;
        if (goal.type === 'target' && goal.targetValue > 0) {
            percentage = Math.min(100, Math.round((totalProgress / goal.targetValue) * 100));
        }
        
        res.json({
            goal: goal.toJSON(),
            checkIns,
            stats: {
                totalProgress,
                percentage,
                checkInsCount: checkIns.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! POST - Crea un nuovo obiettivo
router.post('/goals', async (req, res) => {
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

    try {
        const newGoal = await goal.save();
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//! PUT - Modifica un obiettivo esistente
router.put('/goals/:id', async (req, res) => {
    try {
        const updatedGoal = await Goal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedGoal) {
            return res.status(404).json({ message: 'Obiettivo non trovato' });
        }
        res.json(updatedGoal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//! DELETE - Elimina un obiettivo e tutti i suoi check-in
router.delete('/goals/:id', async (req, res) => {
    try {
        // Prima elimina tutti i check-in associati
        await CheckIn.deleteMany({ goalId: req.params.id });
        // Poi elimina l'obiettivo
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Obiettivo e check-in eliminati' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! ==================== ROTTE PER I CHECK-IN ====================

//! GET - Recupera tutti i check-in di un obiettivo
router.get('/goals/:goalId/checkins', async (req, res) => {
    try {
        const checkIns = await CheckIn.find({ goalId: req.params.goalId }).sort({ date: -1 });
        res.json(checkIns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! POST - Crea un nuovo check-in (aggiorna progresso)
router.post('/goals/:goalId/checkins', async (req, res) => {
    // Verifica che l'obiettivo esista
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) {
        return res.status(404).json({ message: 'Obiettivo non trovato' });
    }

    const checkIn = new CheckIn({
        goalId: req.params.goalId,
        date: req.body.date || new Date(),
        value: req.body.value,
        mood: req.body.mood,
        notes: req.body.notes
    });

    try {
        const newCheckIn = await checkIn.save();
        
        // Calcola e ritorna anche il nuovo progresso totale
        const allCheckIns = await CheckIn.find({ goalId: req.params.goalId });
        const totalProgress = allCheckIns.reduce((sum, ci) => sum + ci.value, 0);
        
        let percentage = 0;
        if (goal.type === 'target' && goal.targetValue > 0) {
            percentage = Math.min(100, Math.round((totalProgress / goal.targetValue) * 100));
        }

        // Se l'obiettivo è raggiunto, aggiornalo automaticamente
        if (percentage >= 100 && goal.status === 'active') {
            await Goal.findByIdAndUpdate(req.params.goalId, { status: 'completed' });
        }

        res.status(201).json({
            checkIn: newCheckIn,
            stats: {
                totalProgress,
                percentage
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//! DELETE - Elimina un check-in specifico
router.delete('/checkins/:id', async (req, res) => {
    try {
        await CheckIn.findByIdAndDelete(req.params.id);
        res.json({ message: 'Check-in eliminato' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! ==================== ROTTE DASHBOARD ====================

//! GET - Statistiche generali per la dashboard
router.get('/goals-stats', async (req, res) => {
    try {
        const goals = await Goal.find({});
        const checkIns = await CheckIn.find({});
        
        // Statistiche generali
        const activeGoals = goals.filter(g => g.status === 'active').length;
        const completedGoals = goals.filter(g => g.status === 'completed').length;
        
        // Calcola progresso per ogni goal attivo
        const goalsWithProgress = await Promise.all(
            goals.filter(g => g.status === 'active').map(async (goal) => {
                const goalCheckIns = checkIns.filter(ci => ci.goalId.toString() === goal._id.toString());
                const totalProgress = goalCheckIns.reduce((sum, ci) => sum + ci.value, 0);
                let percentage = 0;
                if (goal.type === 'target' && goal.targetValue > 0) {
                    percentage = Math.min(100, Math.round((totalProgress / goal.targetValue) * 100));
                }
                return {
                    ...goal.toJSON(),
                    totalProgress,
                    percentage
                };
            })
        );

        res.json({
            summary: {
                totalGoals: goals.length,
                activeGoals,
                completedGoals,
                totalCheckIns: checkIns.length
            },
            activeGoalsWithProgress: goalsWithProgress
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
