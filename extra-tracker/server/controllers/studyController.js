/**
 * 🧠 STUDY CONTROLLER
 * ==================
 *
 * Gestisce le richieste HTTP per Learning & Flashcards.
 */

const flashcardGenerationService = require('../services/flashcardGenerationService');
const deckCrudService = require('../services/study/deckCrudService');
const aiTutorService = require('../services/study/aiTutorService');
const sessionQuizService = require('../services/study/sessionQuizService');
const cardReviewService = require('../services/study/cardReviewService');
const recoveryPlanService = require('../services/study/recoveryPlanService');
const examSolverService = require('../services/study/examSolverService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validatePdfFile } = require('../utils/pdfValidator');
const { createSseConnection } = require('../utils/sseHelper');
const {
    getSessionSchema,
    createDeckSchema,
    updateDeckSchema,
    cardBodySchema,
    addCardAtPositionSchema,
    updateCardAnswerSchema,
    reorderCardsSchema,
    submitReviewSchema,
    verifyAnswerSchema,
    completeSessionSchema,
    chatWithTutorSchema,
    answerExamQuestionSchema,
    saveQuizSnapshotSchema,
    resetExamCardsSchema,
    generateRecoveryQuestionsSchema,
} = require('../validators/studyValidators');
const logger = require('../utils/logger');

// =========================================
// DECKS
// =========================================

/**
 * POST /api/study
 * Crea un nuovo mazzo di flashcard
 */
const createDeck = asyncHandler(async (req, res) => {
    const { examId, title, description, tags } = createDeckSchema.parse(req.body);
    const deck = await deckCrudService.createDeck(req.tenantScope, {
        examId,
        title,
        description,
        tags,
    });

    res.status(201).json({ success: true, data: deck });
});

/**
 * PATCH /api/study/:id
 * Aggiorna un mazzo (titolo, descrizione, tags)
 */
const updateDeck = asyncHandler(async (req, res) => {
    const body = updateDeckSchema.parse(req.body);
    const deck = await deckCrudService.updateDeck(req.tenantScope, req.params.id, body);
    res.json({ success: true, data: deck });
});

/**
 * DELETE /api/study/:id
 * Elimina un mazzo di flashcard
 */
const deleteDeck = asyncHandler(async (req, res) => {
    await deckCrudService.deleteDeck(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Mazzo eliminato' });
});

/**
 * GET /api/study/:id
 * Recupera un singolo mazzo con tutte le sue carte
 */
const getDeckById = asyncHandler(async (req, res) => {
    const deck = await deckCrudService.getDeckById(req.tenantScope, req.params.id);
    res.json({ success: true, data: deck });
});

/**
 * GET /api/study/:id/session
 * Recupera una sessione di studio (flashcard | quiz | typing | mix | sprint | focus | exam)
 */
const getSession = asyncHandler(async (req, res) => {
    const {
        mode,
        focus,
        limit,
        time: timeLimitMinutes,
        questions: questionCount,
        direction,
        examType,
        examDifficulty,
        quizType,
        sourceCardIds,
    } = getSessionSchema.parse(req.query);

    const session = await sessionQuizService.getStudySession(
        req.tenantScope,
        req.params.id,
        { mode, focus, limit, timeLimitMinutes, questionCount, direction, examType, examDifficulty, quizType, sourceCardIds }
    );

    res.json({ success: true, data: session });
});

/**
 * POST /api/study/:id/quizzes
 * Salva uno snapshot di un quiz generato (per riuso futuro)
 */
const saveQuizSnapshot = asyncHandler(async (req, res) => {
    const body = saveQuizSnapshotSchema.parse(req.body);
    const snapshot = await deckCrudService.saveQuizSnapshot(
        req.tenantScope,
        req.params.id,
        body
    );

    res.status(201).json({ success: true, data: snapshot });
});

/**
 * GET /api/study/exam/:examId/quizzes
 * Restituisce lo storico quiz salvati di un esame
 */
const getExamSavedQuizzes = asyncHandler(async (req, res) => {
    const quizzes = await deckCrudService.getExamSavedQuizzes(
        req.tenantScope,
        req.params.examId
    );

    res.json({ success: true, data: quizzes });
});

// =========================================
// CARDS
// =========================================

/**
 * POST /api/study/:id/cards
 * Aggiunge una card a un mazzo
 */
const addCard = asyncHandler(async (req, res) => {
    const { front, back } = cardBodySchema.parse(req.body);
    const deck = await deckCrudService.addCard(req.tenantScope, req.params.id, { front, back });

    res.status(201).json({ success: true, data: deck });
});

/**
 * PUT /api/study/:id/cards/:cardId
 * Modifica una card esistente
 */
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

/**
 * PATCH /api/study/:id/cards/:cardId/answer
 * Aggiorna solo la risposta (back) di una flashcard
 */
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

/**
 * DELETE /api/study/:id/cards/:cardId
 * Elimina una card da un mazzo
 */
const deleteCard = asyncHandler(async (req, res) => {
    const deck = await deckCrudService.deleteCard(
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
    const { cardIds } = reorderCardsSchema.parse(req.body);

    const deck = await deckCrudService.reorderCards(
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
    const { front, back, position } = addCardAtPositionSchema.parse(req.body);

    const deck = await deckCrudService.addCardAtPosition(
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
    const result = await sessionQuizService.getAllDecks(req.tenantScope);
    res.json({ success: true, data: result });
});

// =========================================
// REVIEW
// =========================================

/**
 * POST /api/study/:id/session-complete
 * Salva le statistiche di fine sessione
 */
const completeSession = asyncHandler(async (req, res) => {
    const { mode, stats } = completeSessionSchema.parse(req.body);
    const result = await cardReviewService.completeSession(
        req.tenantScope,
        req.params.id,
        { mode, stats }
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/review
 * Processa una review SM-2
 */
const submitReview = asyncHandler(async (req, res) => {
    const { cardId, rating, sessionMeta, sessionSummary } = submitReviewSchema.parse(req.body);
    const result = await cardReviewService.processCardReview(
        req.tenantScope,
        req.params.id,
        cardId,
        rating,
        sessionMeta || sessionSummary || null
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/verify-answer
 * Verifica una risposta per Typing Mode
 */
const verifyAnswer = asyncHandler(async (req, res) => {
    const { cardId, userAnswer } = verifyAnswerSchema.parse(req.body);
    const result = await cardReviewService.verifyAnswer(
        req.tenantScope,
        req.params.id,
        cardId,
        userAnswer
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
    // Validazione PDF delegata al middleware validatePdf nelle routes
    const maxCardsRaw = Number(req.body?.maxCards);
    const maxCards = Number.isFinite(maxCardsRaw) && maxCardsRaw > 0
        ? Math.round(maxCardsRaw)
        : undefined;

    const result = await flashcardGenerationService.generateCardsFromPDF(
        req.tenantScope,
        req.params.id,
        req.file.path,
        { maxCards }
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
    const { message, history } = chatWithTutorSchema.parse(req.body);
    const result = await aiTutorService.askTutor(
        req.tenantScope,
        req.params.id,
        message,
        history
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/answer-question
 * Risponde a una domanda d'esame usando ESCLUSIVAMENTE il contesto fornito dal PDF.
 */
const answerExamQuestion = asyncHandler(async (req, res) => {
    const { question } = answerExamQuestionSchema.parse(req.body);

    const result = await aiTutorService.answerExamQuestion(
        req.tenantScope,
        req.params.id,
        question
    );

    res.json({ success: true, data: result });
});

/**
 * PUT /api/study/:id/settings
 * Aggiorna le impostazioni del deck (algoritmo e AI)
 */
const updateDeckSettings = asyncHandler(async (req, res) => {
    const deck = await deckCrudService.updateDeckSettings(
        req.tenantScope,
        req.params.id,
        req.body
    );

    res.json({ success: true, data: deck });
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
    const { type } = resetExamCardsSchema.parse(req.body);
    logger.info('StudyController', 'resetExamCards', { examId: req.params.examId, type });

    const result = await recoveryPlanService.resetExamCards(
        req.tenantScope,
        req.params.examId,
        type
    );

    logger.info('StudyController', 'resetExamCards completato', result);
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/exam/:examId/generate-recovery-questions
 * Genera domande AI di approfondimento basate sulle difficoltà
 * Body: { difficulties: string[] }
 */
const generateRecoveryQuestions = asyncHandler(async (req, res) => {
    const { difficulties } = generateRecoveryQuestionsSchema.parse(req.body);
    logger.info('StudyController', 'generateRecoveryQuestions', { examId: req.params.examId, difficulties });

    const result = await recoveryPlanService.generateRecoveryQuestions(
        req.tenantScope,
        req.params.examId,
        difficulties
    );

    logger.info('StudyController', 'generateRecoveryQuestions completato', result);
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/exam-solver/extract-questions
 * Estrae domande da un documento (Livello 1 - Preview)
 * Multipart form-data:
 *   - questionsFile: PDF o TXT con le domande
 */
const extractQuestions = asyncHandler(async (req, res) => {
    logger.debug('StudyController', 'extractQuestions', { file: req.file ? req.file.originalname : 'UNDEFINED' });

    // Con multer.single(), il file è in req.file, non req.files
    const questionsFile = req.file;
    if (!questionsFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande (questionsFile) obbligatorio' }
        });
    }

    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' ||
                           questionsFile.originalname.toLowerCase().endsWith('.txt');

    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande deve essere PDF o TXT' }
        });
    }

    const maxSize = 15 * 1024 * 1024;
    if (questionsFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande troppo grande. Massimo 15MB.' }
        });
    }

    // Validate PDF integrity (magic bytes check)
    if (questionsIsPdf) {
        const pdfValidation = await validatePdfFile(questionsFile.path);
        if (!pdfValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: { message: `PDF corrotto: ${pdfValidation.error}` }
            });
        }
    }

    try {
        const result = await examSolverService.extractExamQuestions(
            req.tenantScope,
            questionsFile.path
        );

        logger.info('StudyController', 'extractQuestions completato', { questionsCount: result.questions.length });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        logger.error('StudyController', 'extractQuestions error', err);
        throw err;
    }
});

/**
 * POST /api/study/exam-solver/generate-answers
 * Genera risposte per domande selezionate (Livello 1 - Preview)
 * Usa Server-Sent Events (SSE) per inviare progress in tempo reale
 * Multipart form-data:
 *   - sourceFile: PDF con il materiale di studio
 *   - selectedQuestions: JSON array di domande selezionate
 *   - deckId: (opzionale) ID deck esistente da aggiornare
 *   - title: (opzionale) Titolo per nuovo deck
 *   - examId: (opzionale) ID esame per nuovo deck
 */
const generateAnswers = asyncHandler(async (req, res) => {
    // Validazione PDF delegata al middleware validatePdf nelle routes
    const sourceFile = req.file;

    // Parse selectedQuestions
    let selectedQuestions = [];
    try {
        const questionsStr = req.body?.selectedQuestions;
        if (questionsStr) {
            selectedQuestions = JSON.parse(questionsStr);
        }
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: { message: 'selectedQuestions deve essere un JSON array valido' }
        });
    }

    if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
        return res.status(400).json({
            success: false,
            error: { message: 'Devi selezionare almeno una domanda' }
        });
    }

    const deckId = req.body?.deckId || null;
    const title = req.body?.title || null;
    const examId = req.body?.examId || null;

    if (!deckId && !title) {
        return res.status(400).json({
            success: false,
            error: { message: 'Se non specifichi deckId, devi fornire title per creare un nuovo deck' }
        });
    }

    const sse = createSseConnection(req, res);

    try {
        const result = await examSolverService.generateExamAnswers(
            req.tenantScope,
            sourceFile.path,
            selectedQuestions,
            { deckId, title, examId },
            (event) => {
                const eventType = event.type === 'flashcard' ? 'flashcard' : 'progress';
                sse.sendEvent(eventType, event);
            }
        );

        logger.info('StudyController', 'generateAnswers completato', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs,
            flashcardsCount: result.flashcards?.length || 0,
        });

        if (!result.flashcards || !Array.isArray(result.flashcards)) {
            logger.error('StudyController', 'generateAnswers: flashcards mancanti o non array', result);
        }

        sse.sendEvent('complete', result);
        sse.close();
    } catch (err) {
        logger.error('StudyController', 'generateAnswers error', err);
        sse.sendEvent('error', { message: err.message || 'Errore durante la generazione' });
        sse.close();
    }
});

/**
 * POST /api/study/exam-solver
 * Exam Solver: estrae domande da un documento e genera risposte da un altro (LEGACY)
 * Multipart form-data:
 *   - questionsFile: PDF o TXT con le domande
 *   - sourceFile: PDF con il materiale di studio
 *   - deckId: (opzionale) ID deck esistente da aggiornare
 *   - title: (opzionale) Titolo per nuovo deck
 *   - examId: (opzionale) ID esame per nuovo deck
 */
const examSolver = asyncHandler(async (req, res) => {
    logger.debug('StudyController', 'examSolver', { files: req.files ? Object.keys(req.files) : 'UNDEFINED' });

    // Verifica file domande (multer.fields() restituisce un oggetto con array)
    const questionsFile = req.files?.questionsFile?.[0];
    if (!questionsFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande (questionsFile) obbligatorio' }
        });
    }

    // Verifica file materiale
    const sourceFile = req.files?.sourceFile?.[0];
    if (!sourceFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale (sourceFile) obbligatorio' }
        });
    }

    // Validazione tipo file domande (PDF o TXT)
    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' ||
                           questionsFile.originalname.toLowerCase().endsWith('.txt');

    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande deve essere PDF o TXT' }
        });
    }

    // Validazione tipo file materiale (solo PDF)
    if (sourceFile.mimetype !== 'application/pdf') {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale deve essere un PDF' }
        });
    }

    // Limite dimensione file (15MB)
    const maxSize = 15 * 1024 * 1024;
    if (questionsFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande troppo grande. Massimo 15MB.' }
        });
    }
    if (sourceFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale troppo grande. Massimo 15MB.' }
        });
    }

    // Opzioni
    const deckId = req.body?.deckId || null;
    const title = req.body?.title || null;
    const examId = req.body?.examId || null;

    // Validazione opzioni
    if (!deckId && !title) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Se non specifichi deckId, devi fornire title per creare un nuovo deck'
            }
        });
    }

    try {
        const result = await examSolverService.examSolver(
            req.tenantScope,
            questionsFile.path,
            sourceFile.path,
            { deckId, title, examId }
        );

        logger.info('StudyController', 'examSolver completato', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs,
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        logger.error('StudyController', 'examSolver error', err);
        throw err; // L'asyncHandler gestirà l'errore
    }
});

/**
 * POST /api/study/:id/exam-progress
 * Salva il progresso di un esame in corso per pausa/resume
 */
const saveExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudyController', 'saveExamProgress', { deckId: req.params.id });

    const result = await cardReviewService.saveExamProgress(
        req.tenantScope,
        req.params.id,
        req.body
    );

    logger.info('StudyController', 'saveExamProgress completato');
    res.json({ success: true, data: result });
});

/**
 * GET /api/study/:id/exam-progress
 * Recupera il progresso salvato di un esame
 */
const getExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudyController', 'getExamProgress', { deckId: req.params.id });

    const progress = await cardReviewService.getExamProgress(
        req.tenantScope,
        req.params.id
    );

    logger.info('StudyController', 'getExamProgress completato', { hasProgress: !!progress });
    res.json({ success: true, data: progress });
});

/**
 * DELETE /api/study/:id/exam-progress
 * Cancella il progresso salvato di un esame
 */
const clearExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudyController', 'clearExamProgress', { deckId: req.params.id });

    const result = await cardReviewService.clearExamProgress(
        req.tenantScope,
        req.params.id
    );

    logger.info('StudyController', 'clearExamProgress completato');
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/reset-distractors
 * Resetta distrattori AI di tutte le card di un deck per forzare la rigenerazione
 * con il nuovo modello/prompt pedagogico
 */
const resetDistractors = asyncHandler(async (req, res) => {
    const deckId = req.params.id;
    logger.info('StudyController', 'resetDistractors', { deckId });

    const result = await deckCrudService.resetDistractors(
        req.tenantScope,
        deckId
    );

    logger.info('StudyController', 'resetDistractors completato', result);
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
    updateCardAnswer,
    deleteCard,
    reorderCards,
    getDashboard,
    completeSession,
    submitReview,
    verifyAnswer,
    uploadAndGenerate,
    chatWithTutor,
    answerExamQuestion,
    examSolver,
    extractQuestions,
    generateAnswers,
    updateDeckSettings,
    resetExamCards,
    generateRecoveryQuestions,
    saveExamProgress,
    getExamProgress,
    clearExamProgress,
    saveQuizSnapshot,
    getExamSavedQuizzes,
    resetDistractors,
};
