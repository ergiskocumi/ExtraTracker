/**
 * 🗂️ DECK CONTROLLER
 * ==================
 * Gestisce CRUD deck, card e quiz snapshot.
 */

const deckCrudService = require('../services/study/deckCrudService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const {
    createDeckSchema,
    updateDeckSchema,
    cardBodySchema,
    addCardAtPositionSchema,
    updateCardAnswerSchema,
    reorderCardsSchema,
    saveQuizSnapshotSchema,
    updateDeckSettingsSchema,
} = require('../validators/studyValidators');

// =========================================
// DECKS
// =========================================

const createDeck = asyncHandler(async (req, res) => {
    const { examId, title, description, tags } = createDeckSchema.parse(req.body);
    const deck = await deckCrudService.createDeck(req.tenantScope, { examId, title, description, tags });
    res.status(201).json({ success: true, data: deck });
});

const updateDeck = asyncHandler(async (req, res) => {
    const body = updateDeckSchema.parse(req.body);
    const deck = await deckCrudService.updateDeck(req.tenantScope, req.params.id, body);
    res.json({ success: true, data: deck });
});

const deleteDeck = asyncHandler(async (req, res) => {
    await deckCrudService.deleteDeck(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Mazzo eliminato' });
});

const getDeckById = asyncHandler(async (req, res) => {
    const deck = await deckCrudService.getDeckById(req.tenantScope, req.params.id);
    res.json({ success: true, data: deck });
});

const updateDeckSettings = asyncHandler(async (req, res) => {
    const settings = updateDeckSettingsSchema.parse(req.body);
    const deck = await deckCrudService.updateDeckSettings(req.tenantScope, req.params.id, settings);
    res.json({ success: true, data: deck });
});

const saveQuizSnapshot = asyncHandler(async (req, res) => {
    const body = saveQuizSnapshotSchema.parse(req.body);
    const snapshot = await deckCrudService.saveQuizSnapshot(req.tenantScope, req.params.id, body);
    res.status(201).json({ success: true, data: snapshot });
});

const getExamSavedQuizzes = asyncHandler(async (req, res) => {
    const quizzes = await deckCrudService.getExamSavedQuizzes(req.tenantScope, req.params.examId);
    res.json({ success: true, data: quizzes });
});

const resetDistractors = asyncHandler(async (req, res) => {
    const deckId = req.params.id;
    logger.info('DeckController', 'resetDistractors', { deckId });
    const result = await deckCrudService.resetDistractors(req.tenantScope, deckId);
    logger.info('DeckController', 'resetDistractors completato', result);
    res.json({ success: true, data: result });
});

// =========================================
// CARDS
// =========================================

const addCard = asyncHandler(async (req, res) => {
    const { front, back } = cardBodySchema.parse(req.body);
    const deck = await deckCrudService.addCard(req.tenantScope, req.params.id, { front, back });
    res.status(201).json({ success: true, data: deck });
});

const updateCard = asyncHandler(async (req, res) => {
    const { front, back } = cardBodySchema.parse(req.body);
    const deck = await deckCrudService.updateCard(
        req.tenantScope,
        req.params.id,
        req.params.cardId,
        { front, back }
    );
    res.json({ success: true, data: deck });
});

const updateCardAnswer = asyncHandler(async (req, res) => {
    const { answer } = updateCardAnswerSchema.parse(req.body);
    const deck = await deckCrudService.updateCardAnswer(
        req.tenantScope,
        req.params.id,
        req.params.cardId,
        answer
    );
    res.json({ success: true, data: deck });
});

const deleteCard = asyncHandler(async (req, res) => {
    const deck = await deckCrudService.deleteCard(req.tenantScope, req.params.id, req.params.cardId);
    res.json({ success: true, data: deck });
});

const reorderCards = asyncHandler(async (req, res) => {
    const { cardIds } = reorderCardsSchema.parse(req.body);
    const deck = await deckCrudService.reorderCards(req.tenantScope, req.params.id, cardIds);
    res.json({ success: true, data: deck });
});

const addCardAtPosition = asyncHandler(async (req, res) => {
    const { front, back, position } = addCardAtPositionSchema.parse(req.body);
    const deck = await deckCrudService.addCardAtPosition(
        req.tenantScope,
        req.params.id,
        { front, back, position }
    );
    res.status(201).json({ success: true, data: deck });
});

module.exports = {
    createDeck,
    updateDeck,
    deleteDeck,
    getDeckById,
    updateDeckSettings,
    saveQuizSnapshot,
    getExamSavedQuizzes,
    resetDistractors,
    addCard,
    updateCard,
    updateCardAnswer,
    deleteCard,
    reorderCards,
    addCardAtPosition,
};
