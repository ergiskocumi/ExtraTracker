/**
 * 🧠 STUDY ROUTES - Learning & Flashcards
 * =======================================
 *
 * Base path: /api/study
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const studyController = require('../controllers/studyController');

// =========================================
// MULTER CONFIG - Memory Storage per PDF
// =========================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, //! 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo file PDF sono accettati'), false);
        }
    },
});

// =========================================
// MIDDLEWARE: Auth + Tenant Context
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

router.get('/dashboard', studyController.getDashboard);
router.get('/:id/session', studyController.getSession);
router.get('/:id', studyController.getDeckById);
router.post('/', studyController.createDeck);
router.post('/:id/cards', studyController.addCard);
router.put('/:id/cards/:cardId', studyController.updateCard);
router.delete('/:id/cards/:cardId', studyController.deleteCard);
router.post('/:id/session-complete', studyController.completeSession);
router.post('/:id/review', studyController.submitReview);
router.post('/:id/verify-answer', studyController.verifyAnswer);
router.delete('/:id', studyController.deleteDeck);

// 🪄 Magic Generate from PDF (con multer middleware)
router.post('/:id/generate-pdf', (req, res, next) => {
    upload.single('pdf')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err.message);
            return res.status(400).json({
                success: false,
                error: { message: err.message || 'Errore nel caricamento del file' }
            });
        }
        console.log('📄 File ricevuto:', req.file ? req.file.originalname : 'NESSUN FILE');
        next();
    });
}, studyController.uploadAndGenerate);

module.exports = router;
