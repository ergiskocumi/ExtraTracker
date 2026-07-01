/**
 * 🏠 WORKSPACE CONTROLLER
 * =======================
 *
 * Controller per la gestione del Work Journal (Workspace).
 * Endpoints per TODO.
 */

const workTodoService = require('../services/workTodoService');
const { asyncHandler } = require('../middleware/errorHandler');

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
 * GET /api/workspace/todos/upcoming
 * Lista TODO in scadenza
 */
exports.getUpcomingTodos = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const todos = await workTodoService.findUpcoming(req.tenantScope, days);
    res.json({ success: true, data: todos });
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
    res.json({ success: true, message: 'TODO eliminato', data: null });
});
