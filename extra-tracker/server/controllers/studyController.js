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

// =========================================
// 🪄 MAGIC GENERATE FROM PDF
// =========================================

/**
 * POST /api/study/:id/generate-pdf
 * Carica un PDF e genera flashcards con AI
 */
const uploadAndGenerate = asyncHandler(async (req, res) => {
    console.log('🪄 uploadAndGenerate called');
    console.log('   - req.file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'UNDEFINED');
    console.log('   - req.params.id:', req.params.id);
    console.log('   - req.tenantScope:', req.tenantScope?.userId);

    // Verifica che il file sia stato caricato
    if (!req.file) {
        console.log('❌ No file in request');
        return res.status(400).json({
            success: false,
            error: { message: 'Nessun file caricato. Carica un file PDF.' },
        });
    }

    // Verifica che sia un PDF
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
            success: false,
            error: 'Il file deve essere un PDF.',
        });
    }

    // Limite dimensione file (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'Il file è troppo grande. Massimo 10MB.',
        });
    }

    const result = await studyService.generateCardsFromPDF(
        req.tenantScope,
        req.params.id,
        req.file.buffer
    );

    res.json({
        success: true,
        data: result,
        message: `✨ Generate ${result.generatedCount} flashcard con successo!`,
    });
});

module.exports = {
    createDeck,
    deleteDeck,
    getDeckById,
    addCard,
    getDashboard,
    submitReview,
    uploadAndGenerate,
};
