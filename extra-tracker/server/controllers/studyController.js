/**
 * 🧠 STUDY CONTROLLER
 * ==================
 *
 * Gestisce le richieste HTTP per Learning & Flashcards.
 */

const studyService = require('../services/studyService');
const { asyncHandler } = require('../middleware/errorHandler');

// =========================================
// DECKS
// =========================================

/**
 * POST /api/study
 * Crea un nuovo mazzo di flashcard
 */
const createDeck = asyncHandler(async (req, res) => {
    const deck = await studyService.createDeck(req.tenantScope, {
        goalId: req.body.goalId,
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
    });

    res.status(201).json({ success: true, data: deck });
});

/**
 * DELETE /api/study/:id
 * Elimina un mazzo di flashcard
 */
const deleteDeck = asyncHandler(async (req, res) => {
    await studyService.deleteDeck(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Mazzo eliminato' });
});

/**
 * GET /api/study/:id
 * Recupera un singolo mazzo con tutte le sue carte
 */
const getDeckById = asyncHandler(async (req, res) => {
    const deck = await studyService.getDeckById(req.tenantScope, req.params.id);
    res.json({ success: true, data: deck });
});

// =========================================
// CARDS
// =========================================

/**
 * POST /api/study/:id/cards
 * Aggiunge una card a un mazzo
 */
const addCard = asyncHandler(async (req, res) => {
    const deck = await studyService.addCard(req.tenantScope, req.params.id, {
        front: req.body.front,
        back: req.body.back,
    });

    res.status(201).json({ success: true, data: deck });
});

// =========================================
// DASHBOARD
// =========================================

/**
 * GET /api/study/dashboard
 * Restituisce TUTTI i mazzi dell'utente con conteggio carte in scadenza
 */
const getDashboard = asyncHandler(async (req, res) => {
    const result = await studyService.getAllDecks(req.tenantScope);
    res.json({ success: true, data: result });
});

// =========================================
// REVIEW
// =========================================

/**
 * POST /api/study/:id/review
 * Processa una review SM-2
 */
const submitReview = asyncHandler(async (req, res) => {
    const result = await studyService.processCardReview(
        req.tenantScope,
        req.params.id,
        req.body.cardId,
        req.body.rating
    );

    res.json({ success: true, data: result });
});

module.exports = {
    createDeck,
    deleteDeck,
    getDeckById,
    addCard,
    getDashboard,
    submitReview,
};
