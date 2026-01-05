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
 * Crea nuovo log
 * 
 * SICUREZZA:
 * Il service verifica che projectId appartenga all'utente corrente
 */
router.post('/worklogs', asyncHandler(async (req, res) => {
    const log = await workLogService.create(req.tenantScope, {
        projectId: req.body.projectId,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        description: req.body.description,
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

/**
 * GET /api/workspace/entries
 * Lista tutte le entries
 */
router.get('/workspace/entries', workspaceController.getEntries);

/**
 * GET /api/workspace/entries/timeline
 * Raggruppa entries per data (timeline)
 */
router.get('/workspace/entries/timeline', workspaceController.getTimeline);

/**
 * GET /api/workspace/entries/by-month/:year/:month
 * Entries filtrate per mese
 */
router.get('/workspace/entries/by-month/:year/:month', workspaceController.getEntriesByMonth);

/**
 * GET /api/workspace/entries/by-project/:projectId
 * Entries di un progetto
 */
router.get('/workspace/entries/by-project/:projectId', workspaceController.getEntriesByProject);

/**
 * GET /api/workspace/entries/stats
 * Statistiche entries per progetto
 */
router.get('/workspace/entries/stats', workspaceController.getEntriesStats);

/**
 * GET /api/workspace/entries/:id
 * Dettaglio singola entry
 */
router.get('/workspace/entries/:id', workspaceController.getEntry);

/**
 * POST /api/workspace/entries
 * Crea nuova entry
 */
router.post('/workspace/entries', workspaceController.createEntry);

/**
 * PUT /api/workspace/entries/:id
 * Aggiorna entry
 */
router.put('/workspace/entries/:id', workspaceController.updateEntry);

/**
 * DELETE /api/workspace/entries/:id
 * Elimina entry
 */
router.delete('/workspace/entries/:id', workspaceController.deleteEntry);

module.exports = router;
