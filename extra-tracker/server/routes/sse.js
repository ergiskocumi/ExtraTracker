/**
 * 📡 SSE ROUTES - Realtime stream
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');
const sseManager = require('../utils/SSEManager');

/**
 * GET /api/sse/stream
 * Apre una connessione SSE per ricevere eventi realtime.
 */
router.get('/stream', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw AppError.unauthorized('Accesso negato. Effettua il login.');
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }

    sseManager.addClient(userId, res);

    res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
}));

module.exports = router;
