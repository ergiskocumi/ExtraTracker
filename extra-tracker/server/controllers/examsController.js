/**
 * 🎓 EXAMS CONTROLLER (CRUD)
 * ==========================
 * Gestisce le richieste HTTP CRUD per gli esami.
 * Delega tutta la business logic a examCrudService.
 *
 * NOTA: examController.js gestisce PDF generation/solver/recovery.
 * Questo controller gestisce solo CRUD base.
 */

const examCrudService = require('../services/examCrudService');
const { asyncHandler } = require('../middleware/errorHandler');

const getAllExams = asyncHandler(async (req, res) => {
    const data = await examCrudService.getAll(req.tenantScope);
    res.json({ success: true, data });
});

const getExamById = asyncHandler(async (req, res) => {
    const data = await examCrudService.getById(req.tenantScope, req.params.id);
    res.json({ success: true, data });
});

const createExam = asyncHandler(async (req, res) => {
    const data = await examCrudService.create(req.tenantScope, req.body);
    res.status(201).json({ success: true, data });
});

const updateExam = asyncHandler(async (req, res) => {
    const data = await examCrudService.update(req.tenantScope, req.params.id, req.body);
    res.json({ success: true, data });
});

const deleteExam = asyncHandler(async (req, res) => {
    const result = await examCrudService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, ...result });
});

module.exports = {
    getAllExams,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
};
