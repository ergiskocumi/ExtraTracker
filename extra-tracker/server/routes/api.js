/**
 * 🛤️ API ROUTES - Multi-Tenant Protected
 * =======================================
 * 
 * Tutte le routes sono protette da:
 * 1. requireAuth: verifica JWT
 * 2. tenantContext: inietta req.tenantScope
 * 
 * I service usano req.tenantScope per filtrare automaticamente
 * i dati dell'utente corrente.
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const { asyncHandler } = require('../middleware/errorHandler');

// Services
const workLogService = require('../services/workLogService');

// Controllers
const workspaceController = require('../controllers/workspaceController');

// Study routes (folders & tags)
const foldersRoutes = require('./folders');
const tagsRoutes = require('./tags');

// Validators
const { validateMiddleware } = require('../validators/validate');
const { createTodoSchema, updateTodoSchema } = require('../validators/workspaceValidators');

// =========================================
// MIDDLEWARE: Applica a TUTTE le routes
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// WORKLOGS ROUTES
// =========================================

/**
 * GET /api/worklogs
 * Lista tutti i log dell'utente
 */
router.get('/worklogs', asyncHandler(async (req, res) => {
    const logs = await workLogService.find(req.tenantScope);
    res.json({ success: true, data: logs });
}));

/**
 * GET /api/worklogs/feed
 * Feed Workspace: timeline unificata con filtri avanzati
 * 
 * IMPORTANTE: Deve essere PRIMA di /worklogs/:id per evitare che "feed" venga matchato come :id
 * 
 * Query params:
 * - date: Filtra per data specifica (YYYY-MM-DD)
 * - startDate: Inizio range date (YYYY-MM-DD)
 * - endDate: Fine range date (YYYY-MM-DD)
 * - tags: Filtra per tag (singolo o multiplo, separato da virgola)
 * - limit: Limite risultati (default: 50)
 * - skip: Skip risultati (per paginazione)
 */
router.get('/worklogs/feed', asyncHandler(async (req, res) => {
    const filters = {};

    if (req.query.date) {
        filters.date = req.query.date;
    } else if (req.query.startDate || req.query.endDate) {
        filters.startDate = req.query.startDate;
        filters.endDate = req.query.endDate;
    }
    
    if (req.query.tags) {
        // Supporta sia singolo tag che multipli (separati da virgola)
        filters.tags = req.query.tags.includes(',') 
            ? req.query.tags.split(',').map(t => t.trim())
            : req.query.tags;
    }
    
    const options = {};
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }
    if (req.query.skip) {
        options.skip = parseInt(req.query.skip);
    }
    
    const logs = await workLogService.getWorkspaceFeed(req.tenantScope, filters, options);
    res.json({ success: true, data: logs });
}));

/**
 * GET /api/worklogs/:id
 * Dettaglio singolo log
 */
router.get('/worklogs/:id', asyncHandler(async (req, res) => {
    const log = await workLogService.findById(
        req.tenantScope,
        req.params.id,
        { throwIfNotFound: true }
    );
    res.json({ success: true, data: log });
}));

/**
 * POST /api/worklogs
 * Crea nuovo log (supporta sia Timer che Journal)
 * 
 * Body supportato:
 * - projectId (required)
 * - date (required, YYYY-MM-DD)
 * - title (required)
 * - description (optional)
 * - tags (optional, array)
 * - mood (optional: 'high', 'neutral', 'low')
 * - isBillable (optional, default: true)
 * - startTime (optional, HH:mm) - se presente, endTime è required
 * - endTime (optional, HH:mm) - se presente, startTime è required
 * 
 * SICUREZZA:
 * Il service verifica che projectId appartenga all'utente corrente
 */
router.post('/worklogs', asyncHandler(async (req, res) => {
    const log = await workLogService.create(req.tenantScope, {
        projectId: req.body.projectId,
        date: req.body.date,
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        mood: req.body.mood,
        isBillable: req.body.isBillable,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        durationMinutes: req.body.durationMinutes,
        isManualDuration: req.body.isManualDuration,
    });
    res.status(201).json({ success: true, data: log });
}));

/**
 * PUT /api/worklogs/:id
 * Aggiorna log
 */
router.put('/worklogs/:id', asyncHandler(async (req, res) => {
    const log = await workLogService.update(
        req.tenantScope,
        req.params.id,
        req.body
    );
    res.json({ success: true, data: log });
}));

/**
 * DELETE /api/worklogs/:id
 * Elimina log
 */
router.delete('/worklogs/:id', asyncHandler(async (req, res) => {
    await workLogService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Log di lavoro eliminato' });
}));

/**
 * GET /api/worklogs/by-month/:year/:month
 * Log filtrati per mese
 */
router.get('/worklogs/by-month/:year/:month', asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const logs = await workLogService.findByMonth(
        req.tenantScope,
        parseInt(year),
        parseInt(month)
    );
    res.json({ success: true, data: logs });
}));

/**
 * GET /api/worklogs/totals
 * Totali per un periodo (query params: startDate, endDate)
 */
router.get('/worklogs/totals', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const totals = await workLogService.getTotalsByPeriod(
        req.tenantScope,
        startDate,
        endDate
    );
    res.json({ success: true, data: totals });
}));

// =========================================
// WORKSPACE ROUTES (Work Journal)
// =========================================

// =========================================
// WORK ENTRIES ROUTES (DEPRECATO - Unificato in /api/worklogs)
// =========================================
// 
// NOTA: Le route /workspace/entries/* sono state rimosse.
// Usa /api/worklogs/* per gestire sia log con orari che note senza orari.
// 
// Migrazione:
// - GET /workspace/entries -> GET /api/worklogs/feed
// - POST /workspace/entries -> POST /api/worklogs (senza startTime/endTime)
// - GET /workspace/entries/:id -> GET /api/worklogs/:id
// - PUT /workspace/entries/:id -> PUT /api/worklogs/:id
// - DELETE /workspace/entries/:id -> DELETE /api/worklogs/:id

// =========================================
// WORK TODOS ROUTES
// =========================================

/**
 * GET /api/workspace/todos
 * Lista tutti i TODO
 */
router.get('/workspace/todos', workspaceController.getTodos);

/**
 * GET /api/workspace/todos/upcoming
 * Lista TODO in scadenza
 */
router.get('/workspace/todos/upcoming', workspaceController.getUpcomingTodos);

/**
 * GET /api/workspace/todos/:id
 * Dettaglio singolo TODO
 */
router.get('/workspace/todos/:id', workspaceController.getTodo);

/**
 * POST /api/workspace/todos
 * Crea nuovo TODO
 */
router.post('/workspace/todos', validateMiddleware(createTodoSchema), workspaceController.createTodo);

/**
 * PUT /api/workspace/todos/:id
 * Aggiorna TODO
 */
router.put('/workspace/todos/:id', validateMiddleware(updateTodoSchema), workspaceController.updateTodo);

/**
 * PATCH /api/workspace/todos/:id/complete
 * Completa un TODO
 */
router.patch('/workspace/todos/:id/complete', workspaceController.completeTodo);

/**
 * PATCH /api/workspace/todos/:id/reopen
 * Riattiva un TODO completato
 */
router.patch('/workspace/todos/:id/reopen', workspaceController.reopenTodo);

/**
 * DELETE /api/workspace/todos/:id
 * Elimina TODO
 */
router.delete('/workspace/todos/:id', workspaceController.deleteTodo);

// =========================================
// FOLDERS ROUTES (Study Organization)
// =========================================

router.use('/folders', foldersRoutes);

// =========================================
// TAGS ROUTES (Study Organization)
// =========================================

router.use('/tags', tagsRoutes);

module.exports = router;
