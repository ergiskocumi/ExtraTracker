/**
 * ANALYTICS ROUTES
 * ===============
 *
 * Base path: /api/analytics
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const analyticsController = require('../controllers/analyticsController');

router.use(requireAuth);
router.use(tenantContext({ required: true }));

router.get('/weekly', analyticsController.getWeekly);
router.get('/insights', analyticsController.getInsights);

module.exports = router;
