/**
 * DASHBOARD CONTROLLER
 * =====================
 *
 * Gestisce SOLO HTTP: parsing request, status codes, response.
 * La business logic è delegata a dashboardService.
 */

const dashboardService = require('../services/dashboardService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/dashboard/summary
 */
exports.getSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await dashboardService.getSummary(userId);

    res.json({ success: true, data });
});

/**
 * GET /api/dashboard/quick-actions
 */
exports.getQuickActions = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await dashboardService.getQuickActions(userId);

    res.json({ success: true, data });
});
