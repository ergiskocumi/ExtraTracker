/**
 * 📊 DASHBOARD ROUTES
 * ===================
 * 
 * Routes per la dashboard "Command Center"
 * Endpoint aggregati per performance ottimale.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const dashboardController = require('../controllers/dashboardController');

// =========================================
// MIDDLEWARE: Protezione routes
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

/**
 * GET /api/dashboard/summary
 * Riepilogo operativo completo per la dashboard
 */
router.get('/summary', dashboardController.getSummary);

/**
 * GET /api/dashboard/quick-actions
 * Azioni rapide contestuali
 */
router.get('/quick-actions', dashboardController.getQuickActions);

/**
 * GET /api/dashboard/ai-usage/summary
 * Riepilogo aggregato utilizzo AI
 */
router.get('/ai-usage/summary', dashboardController.getAiUsageSummary);

/**
 * GET /api/dashboard/ai-usage/events
 * Eventi dettagliati utilizzo AI
 */
router.get('/ai-usage/events', dashboardController.getAiUsageEvents);

module.exports = router;
