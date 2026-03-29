/**
 * DASHBOARD CONTROLLER
 * =====================
 *
 * Gestisce SOLO HTTP: parsing request, status codes, response.
 * La business logic è delegata a dashboardService.
 */

const dashboardService = require('../services/dashboardService');
const aiUsageService = require('../services/aiUsageService');
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

/**
 * GET /api/dashboard/ai-usage/summary
 */
exports.getAiUsageSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { days = 30, from, to, mode, feature, modality, model } = req.query || {};

    const summary = await aiUsageService.getSummary({ userId, days, from, to, mode, feature, modality, model });

    res.json({ success: true, data: summary });
});

/**
 * GET /api/dashboard/ai-usage/events
 */
exports.getAiUsageEvents = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, pageSize = 50, days = 30, from, to, mode, feature, modality, model, status } = req.query || {};

    const events = await aiUsageService.getEvents({ userId, page, pageSize, days, from, to, mode, feature, modality, model, status });

    res.json({ success: true, data: events });
});
