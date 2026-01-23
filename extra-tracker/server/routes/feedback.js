/**
 * 📝 FEEDBACK ROUTES - Bug Report & Feedback System
 * ==================================================
 *
 * User routes: /api/feedback
 * Admin routes: /api/admin/feedback
 */

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Middleware
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const feedbackController = require('../controllers/feedbackController');

// =========================================
// MULTER CONFIG - Disk Storage per allegati
// =========================================

const FEEDBACK_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'feedback');
fs.mkdirSync(FEEDBACK_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        try {
            fs.mkdirSync(FEEDBACK_UPLOAD_DIR, { recursive: true });
            cb(null, FEEDBACK_UPLOAD_DIR);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const userId = req.user?.id || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.file';
        const safeOriginalName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 50);
        cb(null, `${userId}-${timestamp}-${safeOriginalName}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max per file
        files: 3, // Max 3 file
    },
    fileFilter: (req, file, cb) => {
        // Tipi consentiti: immagini e PDF
        const allowedMimeTypes = [
            'image/png',
            'image/jpeg',
            'image/gif',
            'application/pdf',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo file non supportato. Usa PNG, JPEG, GIF o PDF.'), false);
        }
    },
});

// =========================================
// USER ROUTES - /api/feedback
// =========================================

const userRoutes = express.Router();

// Middleware: Auth + Tenant Context
userRoutes.use(requireAuth);
userRoutes.use(tenantContext({ required: true }));

/**
 * POST /api/feedback
 * Crea un nuovo feedback con allegati opzionali
 */
userRoutes.post('/', (req, res, next) => {
    upload.array('attachments', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer error (feedback):', err.message);
            return res.status(400).json({
                success: false,
                error: { message: err.message || 'Errore nel caricamento dei file' },
            });
        }
        next();
    });
}, feedbackController.createFeedback);

/**
 * GET /api/feedback/my
 * Ottieni lista dei propri feedback
 */
userRoutes.get('/my', feedbackController.getMyFeedback);

// =========================================
// ADMIN ROUTES - /api/admin/feedback
// =========================================

const adminRoutes = express.Router();

// Middleware: Auth + Admin check
adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

/**
 * GET /api/admin/feedback/stats
 * Ottieni statistiche feedback
 */
adminRoutes.get('/stats', feedbackController.getFeedbackStats);

/**
 * GET /api/admin/feedback
 * Ottieni lista di tutti i feedback
 */
adminRoutes.get('/', feedbackController.getAllFeedback);

/**
 * GET /api/admin/feedback/:id
 * Ottieni singolo feedback
 */
adminRoutes.get('/:id', feedbackController.getFeedbackById);

/**
 * PATCH /api/admin/feedback/:id
 * Aggiorna feedback (status, priority, adminNotes)
 */
adminRoutes.patch('/:id', feedbackController.updateFeedback);

/**
 * DELETE /api/admin/feedback/:id
 * Elimina feedback
 */
adminRoutes.delete('/:id', feedbackController.deleteFeedback);

module.exports = {
    userRoutes,
    adminRoutes,
};
