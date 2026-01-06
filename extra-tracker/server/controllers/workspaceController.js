/**
 * 🏠 WORKSPACE CONTROLLER
 * =======================
 * 
 * Controller per la gestione del Work Journal (Workspace).
 * Endpoints per progetti e entries.
 */

const workspaceService = require('../services/workspaceService');
const workTodoService = require('../services/workTodoService');
const { asyncHandler } = require('../middleware/errorHandler');

// =========================================
// WORK PROJECTS ENDPOINTS
// =========================================

/**
 * GET /api/workspace/projects
 * Lista tutti i progetti dell'utente corrente
 */
exports.getProjects = asyncHandler(async (req, res) => {
    const { includeStats } = req.query;
    
    let projects;
    if (includeStats === 'true') {
        projects = await workspaceService.projects.findWithEntryCount(req.tenantScope);
    } else {
        projects = await workspaceService.projects.find(req.tenantScope);
    }
    
    res.json({ success: true, data: projects });
});

/**
 * GET /api/workspace/projects/active
 * Lista solo i progetti attivi
 */
exports.getActiveProjects = asyncHandler(async (req, res) => {
    const projects = await workspaceService.projects.findActive(req.tenantScope);
    res.json({ success: true, data: projects });
});

/**
 * GET /api/workspace/projects/:id
 * Dettaglio singolo progetto
 */
exports.getProject = asyncHandler(async (req, res) => {
    const project = await workspaceService.projects.findById(
        req.tenantScope,
        req.params.id,
        { throwIfNotFound: true }
    );
    res.json({ success: true, data: project });
});

/**
 * POST /api/workspace/projects
 * Crea nuovo progetto
 */
exports.createProject = asyncHandler(async (req, res) => {
    const project = await workspaceService.projects.create(req.tenantScope, {
        name: req.body.name,
        description: req.body.description,
        color: req.body.color,
        icon: req.body.icon,
        status: req.body.status || 'active',
    });
    res.status(201).json({ success: true, data: project });
});

/**
 * PUT /api/workspace/projects/:id
 * Aggiorna progetto
 */
exports.updateProject = asyncHandler(async (req, res) => {
    const project = await workspaceService.projects.update(
        req.tenantScope,
        req.params.id,
        req.body
    );
    res.json({ success: true, data: project });
});

/**
 * DELETE /api/workspace/projects/:id
 * Elimina progetto (se non ha entries)
 */
exports.deleteProject = asyncHandler(async (req, res) => {
    await workspaceService.projects.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Progetto eliminato' });
});

// =========================================
// WORK ENTRIES ENDPOINTS (DEPRECATO - Unificato in WorkLog)
// =========================================
// 
// NOTA: Tutti gli endpoint entries sono stati rimossi.
// La logica è stata unificata in WorkLogService.
// 
// Usa /api/worklogs/* per gestire sia log con orari che note senza orari.
// 
// Migrazione:
// - getEntries() -> workLogService.getWorkspaceFeed()
// - createEntry() -> workLogService.create() (senza startTime/endTime)
// - getEntry() -> workLogService.findById()
// - updateEntry() -> workLogService.update()
// - deleteEntry() -> workLogService.delete()

// =========================================
// WORK TODOS ENDPOINTS
// =========================================

/**
 * GET /api/workspace/todos
 * Lista tutti i TODO
 */
exports.getTodos = asyncHandler(async (req, res) => {
    const { project, status, priority } = req.query;
    const filters = {};
    if (project) filters.project = project;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    const todos = await workTodoService.find(req.tenantScope, filters);
    res.json({ success: true, data: todos });
});

/**
 * GET /api/workspace/todos/project/:projectId
 * Lista TODO di un progetto
 */
exports.getTodosByProject = asyncHandler(async (req, res) => {
    const todos = await workTodoService.findByProject(
        req.tenantScope,
        req.params.projectId
    );
    res.json({ success: true, data: todos });
});

/**
 * GET /api/workspace/todos/upcoming
 * Lista TODO in scadenza
 */
exports.getUpcomingTodos = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const todos = await workTodoService.findUpcoming(req.tenantScope, days);
    res.json({ success: true, data: todos });
});

/**
 * GET /api/workspace/todos/project/:projectId/stats
 * Statistiche TODO per progetto
 */
exports.getTodosStats = asyncHandler(async (req, res) => {
    const stats = await workTodoService.countByStatus(
        req.tenantScope,
        req.params.projectId
    );
    res.json({ success: true, data: stats });
});

/**
 * GET /api/workspace/todos/:id
 * Dettaglio singolo TODO
 */
exports.getTodo = asyncHandler(async (req, res) => {
    const todo = await workTodoService.findById(
        req.tenantScope,
        req.params.id,
        { throwIfNotFound: true }
    );
    res.json({ success: true, data: todo });
});

/**
 * POST /api/workspace/todos
 * Crea nuovo TODO
 */
exports.createTodo = asyncHandler(async (req, res) => {
    const todo = await workTodoService.create(req.tenantScope, req.body);
    res.status(201).json({ success: true, data: todo });
});

/**
 * PUT /api/workspace/todos/:id
 * Aggiorna TODO
 */
exports.updateTodo = asyncHandler(async (req, res) => {
    const todo = await workTodoService.update(
        req.tenantScope,
        req.params.id,
        req.body
    );
    res.json({ success: true, data: todo });
});

/**
 * PATCH /api/workspace/todos/:id/complete
 * Completa un TODO
 */
exports.completeTodo = asyncHandler(async (req, res) => {
    const todo = await workTodoService.complete(req.tenantScope, req.params.id);
    res.json({ success: true, data: todo });
});

/**
 * PATCH /api/workspace/todos/:id/reopen
 * Riattiva un TODO completato
 */
exports.reopenTodo = asyncHandler(async (req, res) => {
    const todo = await workTodoService.reopen(req.tenantScope, req.params.id);
    res.json({ success: true, data: todo });
});

/**
 * DELETE /api/workspace/todos/:id
 * Elimina TODO
 */
exports.deleteTodo = asyncHandler(async (req, res) => {
    await workTodoService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'TODO eliminato' });
});
