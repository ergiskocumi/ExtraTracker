/**
 * 🎯 GOAL CONTROLLER
 * ==================
 * Lightweight endpoints for goal operations.
 */

const AppError = require('../utils/AppError');
const goalService = require('../services/goalService');
const checkInService = require('../services/checkInService');
const { calculateGoalStats } = require('../services/goalStrategies');

/**
 * PATCH /api/goals/:goalId/milestones/:milestoneId/toggle-step
 * Body: { stepIndex: number, isCompleted: boolean }
 */
const toggleMilestoneStep = async (req, res) => {
    const { goalId, milestoneId } = req.params;
    const { stepIndex, isCompleted } = req.body || {};

    if (!goalId || !milestoneId) {
        throw AppError.validation('goalId e milestoneId sono obbligatori');
    }

    if (!Number.isInteger(stepIndex)) {
        throw AppError.validation('stepIndex deve essere un intero');
    }

    if (typeof isCompleted !== 'boolean') {
        throw AppError.validation('isCompleted deve essere boolean');
    }

    const goal = await goalService.toggleMilestoneStep(
        req.tenantScope,
        goalId,
        milestoneId,
        stepIndex,
        isCompleted
    );

    const checkIns = await checkInService.findByGoal(req.tenantScope, goalId);
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
};

module.exports = {
    toggleMilestoneStep,
};
