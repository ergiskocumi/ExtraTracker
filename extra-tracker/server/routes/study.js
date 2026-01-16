/**
 * 🧠 STUDY ROUTES - Learning & Flashcards
 * =======================================
 *
 * Base path: /api/study
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const { aiLimiter } = require('../middleware/rateLimiter');

// Controller
const studyController = require('../controllers/studyController');

// =========================================
// MULTER CONFIG - Disk Storage per PDF (persistente)
// =========================================

const PDF_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pdfs');
fs.mkdirSync(PDF_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        try {
            fs.mkdirSync(PDF_UPLOAD_DIR, { recursive: true });
            cb(null, PDF_UPLOAD_DIR);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, _file, cb) => {
        const deckId = req.params?.id || 'deck';
        const timestamp = Date.now();
        cb(null, `${deckId}-${timestamp}.pdf`);
    },
});

const upload = multer({
    storage,
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
router.get('/:id/analytics', studyController.getDeckAnalytics);
router.get('/:id/session', studyController.getSession);
router.get('/:id', studyController.getDeckById);
router.post('/', studyController.createDeck);
router.patch('/:id', studyController.updateDeck);
router.post('/:id/cards', studyController.addCard);
router.put('/:id/cards/:cardId', studyController.updateCard);
router.put('/:id/settings', studyController.updateDeckSettings);
router.delete('/:id/cards/:cardId', studyController.deleteCard);
router.post('/:id/session-complete', studyController.completeSession);
router.post('/:id/review', studyController.submitReview);
router.post('/:id/verify-answer', studyController.verifyAnswer);
// AI Chat - Rate limited: 10 chiamate per ora per utente
router.post('/:id/chat', aiLimiter, studyController.chatWithTutor);
router.delete('/:id', studyController.deleteDeck);

// 🪄 Magic Generate from PDF (con multer middleware)
// AI Generate - Rate limited: 10 chiamate per ora per utente
router.post('/:id/generate-pdf', aiLimiter, (req, res, next) => {
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
