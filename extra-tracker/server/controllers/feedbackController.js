/**
 * 📝 CONTROLLER FEEDBACK
 *
 * Gestisce:
 * - Creazione feedback da utenti
 * - Lista feedback personali
 * - Gestione admin (lista, aggiorna, elimina)
 * - Statistiche
 */

const feedbackService = require('../services/feedbackService');
const { asyncHandler } = require('../middleware/errorHandler');

// ==========================================
// USER ENDPOINTS
// ==========================================

/**
 * POST /api/feedback
 * Crea un nuovo feedback (con allegati opzionali)
 */
const createFeedback = asyncHandler(async (req, res) => {
    const { title, description, type, priority } = req.body;
    const files = req.files || [];

    const feedback = await feedbackService.createWithAttachments(
        req.tenantScope,
        { title, description, type, priority },
        files
    );

    res.status(201).json({
        success: true,
        message: 'Feedback inviato con successo',
        data: feedback,
    });
});

/**
 * GET /api/feedback/my
 * Ottieni lista dei propri feedback
 */
const getMyFeedback = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await feedbackService.findMyFeedback(req.tenantScope, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/admin/feedback
 * Ottieni lista di tutti i feedback (admin only)
 */
const getAllFeedback = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type, priority, search } = req.query;

    const result = await feedbackService.findAllAdmin(
        { status, type, priority, search },
        { page: parseInt(page, 10), limit: parseInt(limit, 10) }
    );

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * GET /api/admin/feedback/stats
 * Ottieni statistiche feedback (admin only)
 */
const getFeedbackStats = asyncHandler(async (req, res) => {
    const stats = await feedbackService.getStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * GET /api/admin/feedback/:id
 * Ottieni singolo feedback (admin only)
 */
const getFeedbackById = asyncHandler(async (req, res) => {
    const feedback = await feedbackService.findByIdAdmin(req.params.id);

    res.status(200).json({
        success: true,
        data: feedback,
    });
});

/**
 * PATCH /api/admin/feedback/:id
 * Aggiorna feedback (admin only)
 */
const updateFeedback = asyncHandler(async (req, res) => {
    const { status, priority, adminNotes } = req.body;

    const feedback = await feedbackService.updateByAdmin(req.params.id, {
        status,
        priority,
        adminNotes,
    });

    res.status(200).json({
        success: true,
        message: 'Feedback aggiornato',
        data: feedback,
    });
});

/**
 * DELETE /api/admin/feedback/:id
 * Elimina feedback (admin only)
 */
const deleteFeedback = asyncHandler(async (req, res) => {
    await feedbackService.deleteByAdmin(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Feedback eliminato',
    });
});

module.exports = {
    createFeedback,
    getMyFeedback,
    getAllFeedback,
    getFeedbackStats,
    getFeedbackById,
    updateFeedback,
    deleteFeedback,
};
