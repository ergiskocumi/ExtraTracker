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
const projectService = require('../services/projectService');
const workLogService = require('../services/workLogService');

// Controllers
const workspaceController = require('../controllers/workspaceController');

// =========================================
// MIDDLEWARE: Applica a TUTTE le routes
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// PROJECTS ROUTES
// =========================================

/**
 * GET /api/projects
 * Lista tutti i progetti dell'utente corrente
 */
router.get('/projects', asyncHandler(async (req, res) => {
    const projects = await projectService.findWithHealth(req.tenantScope);
    res.json({ success: true, data: projects });
}));

/**
 * GET /api/projects/:id
 * Dettaglio singolo progetto
 */
router.get('/projects/:id', asyncHandler(async (req, res) => {
    const project = await projectService.findById(
        req.tenantScope, 
        req.params.id, 
        { throwIfNotFound: true }
    );
    res.json({ success: true, data: project });
}));

/**
 * POST /api/projects
 * Crea nuovo progetto
 */
router.post('/projects', asyncHandler(async (req, res) => {
    const project = await projectService.create(req.tenantScope, {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        rate: req.body.rate,
        estimatedHours: req.body.estimatedHours,
        progress: req.body.progress,
        status: req.body.status,
        color: req.body.color,
    });
    res.status(201).json({ success: true, data: project });
}));

/**
 * PUT /api/projects/:id
 * Aggiorna progetto
 */
router.put('/projects/:id', asyncHandler(async (req, res) => {
    const project = await projectService.update(
        req.tenantScope,
        req.params.id,
        req.body
    );
    res.json({ success: true, data: project });
}));

/**
 * DELETE /api/projects/:id
 * Elimina progetto (se non ha worklog)
 */
router.delete('/projects/:id', asyncHandler(async (req, res) => {
    await projectService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Progetto eliminato' });
}));

/**
 * GET /api/projects/stats
 * Statistiche progetti con ore e guadagni
 */
router.get('/projects-stats', asyncHandler(async (req, res) => {
    const stats = await projectService.getProjectStats(req.tenantScope);
    res.json({ success: true, data: stats });
}));

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

/**
 * GET /api/worklogs/feed
 * Feed Workspace: timeline unificata con filtri avanzati
 * 
 * Query params:
 * - projectId: Filtra per progetto
 * - date: Filtra per data specifica (YYYY-MM-DD)
 * - startDate: Inizio range date (YYYY-MM-DD)
 * - endDate: Fine range date (YYYY-MM-DD)
 * - tags: Filtra per tag (singolo o multiplo, separato da virgola)
 * - limit: Limite risultati (default: 50)
 * - skip: Skip risultati (per paginazione)
 */
router.get('/worklogs/feed', asyncHandler(async (req, res) => {
    const filters = {};
    
    if (req.query.projectId) {
        filters.projectId = req.query.projectId;
    }
    
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
 * GET /api/worklogs/project/:projectId/stats
 * Statistiche progetto per Vista Amministrativa (Dashboard Progetti)
 * 
 * Questo endpoint serve alla **Vista Amministrativa (Control Room)**.
 * Calcola metriche finanziarie e di progresso per un progetto specifico:
 * - Totale ore lavorate
 * - Revenue totale (ore × tariffa)
 * - Burn rate (ore consumate / ore stimate)
 * - Ultima attività
 * 
 * Response:
 * {
 *   projectId: string,
 *   projectName: string,
 *   projectCode: string,
 *   totalHours: number,
 *   billableHours: number,
 *   nonBillableHours: number,
 *   totalRevenue: number,
 *   burnRate: number | null, // null se estimatedHours non è impostato
 *   lastActivity: string | null, // YYYY-MM-DD
 *   entriesCount: number,
 *   projectRate: number,
 *   estimatedHours: number | null
 * }
 */
router.get('/worklogs/project/:projectId/stats', asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const stats = await workLogService.getProjectStats(req.tenantScope, projectId);
    res.json({ success: true, data: stats });
}));

// =========================================
// WORKSPACE ROUTES (Work Journal)
// =========================================

/**
 * GET /api/workspace/projects
 * Lista tutti i progetti workspace
 */
router.get('/workspace/projects', workspaceController.getProjects);

/**
 * GET /api/workspace/projects/active
 * Lista solo i progetti attivi
 */
router.get('/workspace/projects/active', workspaceController.getActiveProjects);

/**
 * GET /api/workspace/projects/:id
 * Dettaglio singolo progetto
 */
router.get('/workspace/projects/:id', workspaceController.getProject);

/**
 * POST /api/workspace/projects
 * Crea nuovo progetto
 */
router.post('/workspace/projects', workspaceController.createProject);

/**
 * PUT /api/workspace/projects/:id
 * Aggiorna progetto
 */
router.put('/workspace/projects/:id', workspaceController.updateProject);

/**
 * DELETE /api/workspace/projects/:id
 * Elimina progetto
 */
router.delete('/workspace/projects/:id', workspaceController.deleteProject);

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
 * GET /api/workspace/todos/project/:projectId
 * Lista TODO di un progetto
 */
router.get('/workspace/todos/project/:projectId', workspaceController.getTodosByProject);

/**
 * GET /api/workspace/todos/upcoming
 * Lista TODO in scadenza
 */
router.get('/workspace/todos/upcoming', workspaceController.getUpcomingTodos);

/**
 * GET /api/workspace/todos/project/:projectId/stats
 * Statistiche TODO per progetto
 */
router.get('/workspace/todos/project/:projectId/stats', workspaceController.getTodosStats);

/**
 * GET /api/workspace/todos/:id
 * Dettaglio singolo TODO
 */
router.get('/workspace/todos/:id', workspaceController.getTodo);

/**
 * POST /api/workspace/todos
 * Crea nuovo TODO
 */
router.post('/workspace/todos', workspaceController.createTodo);

/**
 * PUT /api/workspace/todos/:id
 * Aggiorna TODO
 */
router.put('/workspace/todos/:id', workspaceController.updateTodo);

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

module.exports = router;
