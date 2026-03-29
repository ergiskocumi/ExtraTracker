/**
 * 🗂️ DECK CONTROLLER
 * ==================
 * Gestisce CRUD deck, card e quiz snapshot.
 */

const deckCrudService = require('../services/study/deckCrudService');
const sessionQuizService = require('../services/study/sessionQuizService');
const persistedQuizService = require('../services/study/persistedQuizService');
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
    generatePersistedQuizSchema,
    createRetakeSessionSchema,
    recordQuizAttemptSchema,
    updateDeckSettingsSchema,
} = require('../validators/studyValidators');
const { generateTrueFalseStatementsFromText } = require('../services/study/trueFalseGenerator');

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

const generatePersistedQuiz = asyncHandler(async (req, res) => {
    const body = generatePersistedQuizSchema.parse(req.body);
    const deck = await sessionQuizService.findById(req.tenantScope, req.params.id, {
        select: '+extractedText +recentQuizQuestions',
        throwIfNotFound: true,
    });

    await sessionQuizService._ensureDeckPdfUrlIntegrity(deck);

    const extractedText = typeof deck.extractedText === 'string' ? deck.extractedText.trim() : '';
    if (!extractedText) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Quiz AI non disponibile: carica un PDF per abilitare questa modalità.',
                code: 'QUIZ_PDF_REQUIRED',
            },
        });
    }

    const previousQuestions = Array.isArray(deck.recentQuizQuestions)
        ? deck.recentQuizQuestions.slice(-50)
        : [];
    const telemetry = {
        userId: req.tenantScope?.userId,
        deckId: deck._id,
    };

    let normalizedQuestions = [];
    if (body.quizType === 'true_false') {
        const statements = await generateTrueFalseStatementsFromText(
            extractedText,
            body.questionCount,
            previousQuestions,
            telemetry,
            sessionQuizService._splitTextIntoChunks.bind(sessionQuizService),
        );
        normalizedQuestions = statements.map((statement) => ({
            questionText: statement.statement,
            correctAnswer: statement.isTrue ? 'Vero' : 'Falso',
            options: ['Vero', 'Falso'],
            distractors: [statement.isTrue ? 'Falso' : 'Vero'],
            distractorExplanations: [],
            correctAnswerExplanation: statement.explanation || '',
            difficulty: statement.difficulty || 'standard',
            correctStatement: statement.correctStatement || null,
        }));
    } else {
        const questions = await sessionQuizService.generateQuizFromFullPDF(
            extractedText,
            body.questionCount,
            previousQuestions,
            telemetry,
        );
        normalizedQuestions = questions.map((question) => ({
            questionText: question.questionText,
            correctAnswer: question.correctAnswer,
            distractors: Array.isArray(question.distractors) ? question.distractors : [],
            distractorExplanations: Array.isArray(question.explanations) ? question.explanations : [],
            correctAnswerExplanation: question.correctAnswerExplanation || '',
            difficulty: question.difficulty || 'standard',
        }));
    }

    const createdQuiz = await persistedQuizService.createGeneratedQuiz(req.tenantScope, deck, {
        name: body.name,
        quizType: body.quizType,
        source: body.source,
        questions: normalizedQuestions,
        generatedFromText: extractedText,
        pdfBased: true,
        originKind: 'ai_pdf',
    });

    const session = persistedQuizService.buildSessionFromQuiz(deck, createdQuiz, {
        questionIds: createdQuiz.questions.map((question) => question.questionId),
    });

    const newQuestionTexts = normalizedQuestions.map((question) => question.questionText);
    setImmediate(() => {
        sessionQuizService.updateRaw(req.tenantScope, deck._id, {
            $push: { recentQuizQuestions: { $each: newQuestionTexts, $slice: -50 } },
        }).catch(() => {});
    });

    res.status(201).json({
        success: true,
        data: {
            quiz: {
                id: createdQuiz._id.toString(),
                deckId: deck._id.toString(),
                deckTitle: deck.title,
                examId: deck.examId ? deck.examId.toString() : null,
                name: createdQuiz.name,
                quizType: createdQuiz.quizType,
                questionCount: createdQuiz.questionCount,
                sourceCardIds: createdQuiz.questions.map((question) => question.questionId),
                source: createdQuiz.source,
                createdAt: createdQuiz.createdAt,
                hasQuestions: true,
            },
            session,
        },
    });
});

const getExamSavedQuizzes = asyncHandler(async (req, res) => {
    const quizzes = await deckCrudService.getExamSavedQuizzes(req.tenantScope, req.params.examId);
    res.json({ success: true, data: quizzes });
});

const retakeSavedQuiz = asyncHandler(async (req, res) => {
    const data = await deckCrudService.getSavedQuizForRetake(req.tenantScope, req.params.id, req.params.quizId);
    res.json({ success: true, data });
});

const createRetakeSession = asyncHandler(async (req, res) => {
    const strategy = createRetakeSessionSchema.parse(req.body || {});
    const deck = await deckCrudService.findById(req.tenantScope, req.params.id, {
        throwIfNotFound: true,
    });
    const data = await deckCrudService.getSavedQuizForRetake(req.tenantScope, req.params.id, req.params.quizId, {
        strategy,
        includeSession: true,
        deck,
        totalCards: deck.totalCards || (Array.isArray(deck.cards) ? deck.cards.length : 0),
        dueCount: deck.dueCount || 0,
    });
    res.json({ success: true, data });
});

const reviewSavedQuiz = asyncHandler(async (req, res) => {
    const data = await deckCrudService.getSavedQuizForReview(req.tenantScope, req.params.id, req.params.quizId);
    res.json({ success: true, data });
});

const recordQuizAttempt = asyncHandler(async (req, res) => {
    const body = recordQuizAttemptSchema.parse(req.body);
    const result = await deckCrudService.recordQuizAttempt(req.tenantScope, req.params.id, req.params.quizId, body);
    res.status(201).json({ success: true, data: result });
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
    generatePersistedQuiz,
    getExamSavedQuizzes,
    resetDistractors,
    retakeSavedQuiz,
    createRetakeSession,
    reviewSavedQuiz,
    recordQuizAttempt,
    addCard,
    updateCard,
    updateCardAnswer,
    deleteCard,
    reorderCards,
    addCardAtPosition,
};
