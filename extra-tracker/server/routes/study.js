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
const rateLimit = require('express-rate-limit');

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

// Multer config per Exam Solver (accetta PDF e TXT)
const examSolverStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        try {
            fs.mkdirSync(PDF_UPLOAD_DIR, { recursive: true });
            cb(null, PDF_UPLOAD_DIR);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop() || (file.mimetype === 'application/pdf' ? 'pdf' : 'txt');
        cb(null, `exam-solver-${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`);
    },
});

const examSolverUpload = multer({
    storage: examSolverStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: 2, // Massimo 2 file
    },
    fileFilter: (req, file, cb) => {
        // Accetta PDF e TXT
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'text/plain' ||
            file.originalname.toLowerCase().endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('File deve essere PDF o TXT'), false);
        }
    },
});

// Rate limiter specifico per Exam Solver (5 chiamate/ora - operazione pesante)
const examSolverLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 5, // 5 chiamate per ora
    keyGenerator: (req) => {
        // Usa userId se disponibile, altrimenti IP
        if (req.tenantScope?.userId) {
            return `user:${req.tenantScope.userId}`;
        }
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }
        return req.ip || 'unknown';
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Hai raggiunto il limite di chiamate Exam Solver (5 per ora). Questa operazione è costosa e richiede tempo. Riprova più tardi.',
                code: 'EXAM_SOLVER_RATE_LIMIT_EXCEEDED',
                retryAfter: 3600, // 1 ora in secondi
            },
        });
    },
    skip: (req) => {
        // Skip se non autenticato (dovrebbe essere gestito da auth middleware)
        return !req.tenantScope?.userId && !req.user?.id;
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
router.patch('/:id', studyController.updateDeck);
router.post('/:id/cards', studyController.addCard);
router.post('/:id/cards/insert', studyController.addCardAtPosition); // Inserimento in posizione specifica
router.put('/:id/cards/reorder', studyController.reorderCards); // Riordinamento card
router.put('/:id/cards/:cardId', studyController.updateCard);
router.patch('/:id/cards/:cardId/answer', studyController.updateCardAnswer);
router.put('/:id/settings', studyController.updateDeckSettings);
router.delete('/:id/cards/:cardId', studyController.deleteCard);
router.post('/:id/session-complete', studyController.completeSession);
router.post('/:id/review', studyController.submitReview);
router.post('/:id/verify-answer', studyController.verifyAnswer);
// AI Chat - Rate limited: 10 chiamate per ora per utente
router.post('/:id/chat', aiLimiter, studyController.chatWithTutor);
// Exam Question Answering - Rate limited: 10 chiamate per ora per utente
router.post('/:id/answer-question', aiLimiter, studyController.answerExamQuestion);
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

// =========================================
// RECOVERY PLAN - Exam Recovery Actions
// =========================================

/**
 * POST /api/study/exam/:examId/reset-cards
 * Resetta le carte di tutti i deck associati a un esame
 */
router.post('/exam/:examId/reset-cards', studyController.resetExamCards);

/**
 * POST /api/study/exam/:examId/generate-recovery-questions
 * Genera domande AI di approfondimento basate sulle difficoltà
 */
router.post('/exam/:examId/generate-recovery-questions', aiLimiter, studyController.generateRecoveryQuestions);

/**
 * POST /api/study/exam-solver/extract-questions
 * Estrae domande da un documento (Livello 1 - Preview)
 * Rate limited: 10 chiamate per ora
 */
router.post('/exam-solver/extract-questions', aiLimiter, (req, res, next) => {
    examSolverUpload.single('questionsFile')(req, res, (err) => {
        if (err) {
            console.error('Multer error (extract-questions):', err.message);
            return res.status(400).json({
                success: false,
                error: { message: err.message || 'Errore nel caricamento del file' }
            });
        }
        console.log('📄 Extract Questions file ricevuto:', req.file?.originalname || 'NONE');
        next();
    });
}, studyController.extractQuestions);

/**
 * POST /api/study/exam-solver/generate-answers
 * Genera risposte per domande selezionate (Livello 1 - Preview)
 * Rate limited: 5 chiamate per ora (operazione pesante)
 */
router.post('/exam-solver/generate-answers', examSolverLimiter, (req, res, next) => {
    examSolverUpload.single('sourceFile')(req, res, (err) => {
        if (err) {
            console.error('Multer error (generate-answers):', err.message);
            return res.status(400).json({
                success: false,
                error: { message: err.message || 'Errore nel caricamento del file' }
            });
        }
        console.log('📄 Generate Answers file ricevuto:', req.file?.originalname || 'NONE');
        next();
    });
}, studyController.generateAnswers);

/**
 * POST /api/study/exam-solver
 * Exam Solver: estrae domande da un documento e genera risposte da un altro (LEGACY)
 * Multipart form-data:
 *   - questionsFile: PDF o TXT con le domande
 *   - sourceFile: PDF con il materiale di studio
 *   - deckId: (opzionale) ID deck esistente da aggiornare
 *   - title: (opzionale) Titolo per nuovo deck
 *   - goalId: (opzionale) ID goal per nuovo deck
 * 
 * Rate limited: 5 chiamate per ora (operazione pesante)
 */
router.post('/exam-solver', examSolverLimiter, (req, res, next) => {
    examSolverUpload.fields([
        { name: 'questionsFile', maxCount: 1 },
        { name: 'sourceFile', maxCount: 1 },
    ])(req, res, (err) => {
        if (err) {
            console.error('Multer error (exam-solver):', err.message);
            return res.status(400).json({
                success: false,
                error: { message: err.message || 'Errore nel caricamento dei file' }
            });
        }
        console.log('📄 Exam Solver files ricevuti:', {
            questionsFile: req.files?.questionsFile ? req.files.questionsFile[0]?.originalname : 'NONE',
            sourceFile: req.files?.sourceFile ? req.files.sourceFile[0]?.originalname : 'NONE',
        });
        next();
    });
}, studyController.examSolver);

module.exports = router;
