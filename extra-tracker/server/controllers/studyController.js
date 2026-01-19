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
 * PATCH /api/study/:id
 * Aggiorna un mazzo (titolo, descrizione, tags)
 */
const updateDeck = asyncHandler(async (req, res) => {
    const deck = await studyService.updateDeck(req.tenantScope, req.params.id, {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        folderId: req.body.folderId,
        goalId: req.body.goalId,
    });
    res.json({ success: true, data: deck });
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

/**
 * GET /api/study/:id/session
 * Recupera una sessione di studio (flashcard | quiz | typing)
 */
const getSession = asyncHandler(async (req, res) => {
    const requestedMode = String(req.query.mode || 'flashcard').toLowerCase();
    const mode = ['flashcard', 'quiz', 'typing'].includes(requestedMode)
        ? requestedMode
        : 'flashcard';

    const session = await studyService.getStudySession(
        req.tenantScope,
        req.params.id,
        mode
    );

    res.json({ success: true, data: session });
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

/**
 * PUT /api/study/:id/cards/:cardId
 * Modifica una card esistente
 */
const updateCard = asyncHandler(async (req, res) => {
    const deck = await studyService.updateCard(
        req.tenantScope,
        req.params.id,
        req.params.cardId,
        {
            front: req.body.front,
            back: req.body.back,
        }
    );

    res.json({ success: true, data: deck });
});

/**
 * DELETE /api/study/:id/cards/:cardId
 * Elimina una card da un mazzo
 */
const deleteCard = asyncHandler(async (req, res) => {
    const deck = await studyService.deleteCard(
        req.tenantScope,
        req.params.id,
        req.params.cardId
    );

    res.json({ success: true, data: deck });
});

/**
 * PUT /api/study/:id/cards/reorder
 * Riordina le card di un mazzo
 * Body: { cardIds: string[] } - Array di card IDs nell'ordine desiderato
 */
const reorderCards = asyncHandler(async (req, res) => {
    const { cardIds } = req.body;

    if (!Array.isArray(cardIds)) {
        return res.status(400).json({
            success: false,
            error: { message: 'cardIds deve essere un array' }
        });
    }

    const deck = await studyService.reorderCards(
        req.tenantScope,
        req.params.id,
        cardIds
    );

    res.json({ success: true, data: deck });
});

/**
 * POST /api/study/:id/cards/insert
 * Aggiunge una card in una posizione specifica
 * Body: { front: string, back: string, position?: number }
 */
const addCardAtPosition = asyncHandler(async (req, res) => {
    const { front, back, position } = req.body;

    const deck = await studyService.addCardAtPosition(
        req.tenantScope,
        req.params.id,
        { front, back, position }
    );

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
 * POST /api/study/:id/session-complete
 * Salva le statistiche di fine sessione e assegna XP
 */
const completeSession = asyncHandler(async (req, res) => {
    const result = await studyService.completeSession(
        req.tenantScope,
        req.params.id,
        {
            mode: req.body.mode,
            stats: req.body.stats,
        }
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/review
 * Processa una review SM-2
 */
const submitReview = asyncHandler(async (req, res) => {
    const result = await studyService.processCardReview(
        req.tenantScope,
        req.params.id,
        req.body.cardId,
        req.body.rating,
        req.body.sessionMeta || req.body.sessionSummary || null
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/verify-answer
 * Verifica una risposta per Typing Mode
 */
const verifyAnswer = asyncHandler(async (req, res) => {
    const result = await studyService.verifyAnswer(
        req.tenantScope,
        req.params.id,
        req.body.cardId,
        req.body.userAnswer
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
        req.file.path
    );

    res.json({
        success: true,
        data: result,
        message: `✨ Generate ${result.generatedCount} flashcard con successo!`,
    });
});

/**
 * POST /api/study/:id/chat
 * Chat contestuale con AI Tutor (RAG Lite sul testo estratto dal PDF).
 */
const chatWithTutor = asyncHandler(async (req, res) => {
    const result = await studyService.askTutor(
        req.tenantScope,
        req.params.id,
        req.body?.message,
        req.body?.history
    );

    res.json({ success: true, data: result });
});

/**
 * PUT /api/study/:id/settings
 * Aggiorna le impostazioni del deck (algoritmo e AI)
 */
const updateDeckSettings = asyncHandler(async (req, res) => {
    const deck = await studyService.updateDeckSettings(
        req.tenantScope,
        req.params.id,
        req.body
    );

    res.json({ success: true, data: deck });
});

/**
 * GET /api/study/:id/analytics
 * Ottiene analytics dettagliate per un deck
 */
const getDeckAnalytics = asyncHandler(async (req, res) => {
    const analytics = await studyService.getDeckAnalytics(
        req.tenantScope,
        req.params.id
    );

    res.json({ success: true, data: analytics });
});

// =========================================
// RECOVERY PLAN
// =========================================

/**
 * POST /api/study/exam/:examId/reset-cards
 * Resetta le carte di tutti i deck associati a un esame
 * Body: { type: 'all' | 'hard-only' }
 */
const resetExamCards = asyncHandler(async (req, res) => {
    console.log('[StudyController] resetExamCards chiamato:', { examId: req.params.examId, type: req.body.type });
    const { type } = req.body;
    
    if (!type || !['all', 'hard-only'].includes(type)) {
        console.error('[StudyController] Tipo non valido:', type);
        return res.status(400).json({
            success: false,
            error: { message: 'type deve essere "all" o "hard-only"' }
        });
    }

    const result = await studyService.resetExamCards(
        req.tenantScope,
        req.params.examId,
        type
    );

    console.log('[StudyController] resetExamCards completato:', result);
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/exam/:examId/generate-recovery-questions
 * Genera domande AI di approfondimento basate sulle difficoltà
 * Body: { difficulties: string[] }
 */
const generateRecoveryQuestions = asyncHandler(async (req, res) => {
    console.log('[StudyController] generateRecoveryQuestions chiamato:', { examId: req.params.examId, difficulties: req.body.difficulties });
    const { difficulties } = req.body;
    
    if (!Array.isArray(difficulties)) {
        console.error('[StudyController] difficulties non è un array:', difficulties);
        return res.status(400).json({
            success: false,
            error: { message: 'difficulties deve essere un array' }
        });
    }

    const result = await studyService.generateRecoveryQuestions(
        req.tenantScope,
        req.params.examId,
        difficulties
    );

    console.log('[StudyController] generateRecoveryQuestions completato:', result);
    res.json({ success: true, data: result });
});

module.exports = {
    createDeck,
    updateDeck,
    deleteDeck,
    getDeckById,
    getSession,
    addCard,
    addCardAtPosition,
    updateCard,
    deleteCard,
    reorderCards,
    getDashboard,
    completeSession,
    submitReview,
    verifyAnswer,
    uploadAndGenerate,
    chatWithTutor,
    updateDeckSettings,
    getDeckAnalytics,
    resetExamCards,
    generateRecoveryQuestions,
};
