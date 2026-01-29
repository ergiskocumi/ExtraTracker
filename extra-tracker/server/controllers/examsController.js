/**
 * 🎓 EXAMS CONTROLLER
 * ==================
 *
 * CRUD per esami.
 */

const Exam = require('../models/Exam');
const Deck = require('../models/Deck');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');

// =========================================
// GET ALL EXAMS
// =========================================

const getAllExams = asyncHandler(async (req, res) => {
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;
    const exams = await Exam.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: serializeDocuments(exams) });
});

// =========================================
// GET EXAM BY ID
// =========================================

const getExamById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    res.json({ success: true, data: serializeDocument(exam) });
});

// =========================================
// CREATE EXAM
// =========================================

const createExam = asyncHandler(async (req, res) => {
    const { title, description, deadline, status, outcome } = req.body || {};
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;

    if (!title || !String(title).trim()) {
        throw AppError.validation('Il titolo è obbligatorio');
    }
    if (!deadline) {
        throw AppError.validation('La data dell\'esame è obbligatoria');
    }

    const exam = await Exam.create({
        title: String(title).trim(),
        description: typeof description === 'string' ? description.trim() : '',
        deadline: new Date(deadline),
        status: status || 'active',
        outcome: outcome || null,
        user: userId,
    });

    res.status(201).json({ success: true, data: serializeDocument(exam) });
});

// =========================================
// UPDATE EXAM
// =========================================

const updateExam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, deadline, status, outcome } = req.body || {};
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    if (title !== undefined) {
        if (!String(title).trim()) {
            throw AppError.validation('Il titolo non può essere vuoto');
        }
        exam.title = String(title).trim();
    }

    if (description !== undefined) {
        exam.description = typeof description === 'string' ? description.trim() : '';
    }

    if (deadline !== undefined) {
        exam.deadline = new Date(deadline);
    }

    if (status !== undefined) {
        exam.status = status;
    }

    if (outcome !== undefined) {
        exam.outcome = outcome;
    }

    await exam.save();
    res.json({ success: true, data: serializeDocument(exam) });
});

// =========================================
// DELETE EXAM
// =========================================

const deleteExam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;

    const exam = await Exam.findOne({ _id: id, user: userId });
    if (!exam) {
        throw AppError.notFound('Esame non trovato');
    }

    await Deck.updateMany(
        { user: userId, examId: id },
        { $unset: { examId: 1 } }
    );

    await exam.deleteOne();

    res.json({ success: true, message: 'Esame eliminato' });
});

module.exports = {
    getAllExams,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
};
