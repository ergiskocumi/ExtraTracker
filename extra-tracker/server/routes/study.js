/**
 * 🧠 STUDY ROUTES - Learning & Flashcards
 * =======================================
 *
 * Base path: /api/study
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const studyController = require('../controllers/studyController');

// =========================================
// MIDDLEWARE: Auth + Tenant Context
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

router.get('/dashboard', studyController.getDashboard);
router.get('/:id', studyController.getDeckById);
router.post('/', studyController.createDeck);
router.post('/:id/cards', studyController.addCard);
router.post('/:id/review', studyController.submitReview);
router.delete('/:id', studyController.deleteDeck);

module.exports = router;
