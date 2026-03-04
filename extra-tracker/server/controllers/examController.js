/**
 * 📝 EXAM CONTROLLER
 * ==================
 * Gestisce upload PDF, exam solver, recovery plan.
 */

const flashcardGenerationService = require('../services/flashcardGenerationService');
const examSolverService = require('../services/study/examSolverService');
const recoveryPlanService = require('../services/study/recoveryPlanService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validatePdfFile } = require('../utils/pdfValidator');
const { createSseConnection } = require('../utils/sseHelper');
const logger = require('../utils/logger');
const {
    uploadAndGenerateSchema,
    generateAnswersSchema,
    examSolverSchema,
    resetExamCardsSchema,
    generateRecoveryQuestionsSchema,
} = require('../validators/studyValidators');

// =========================================
// PDF GENERATION
// =========================================

const uploadAndGenerate = asyncHandler(async (req, res) => {
    const { maxCards } = uploadAndGenerateSchema.parse(req.body);

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

// =========================================
// EXAM SOLVER
// =========================================

const extractQuestions = asyncHandler(async (req, res) => {
    logger.debug('ExamController', 'extractQuestions', { file: req.file ? req.file.originalname : 'UNDEFINED' });

    const questionsFile = req.file;
    if (!questionsFile) {
        return res.status(400).json({ success: false, error: { message: 'File domande (questionsFile) obbligatorio' } });
    }

    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' ||
                           questionsFile.originalname.toLowerCase().endsWith('.txt');

    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({ success: false, error: { message: 'File domande deve essere PDF o TXT' } });
    }

    if (questionsFile.size > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: { message: 'File domande troppo grande. Massimo 15MB.' } });
    }

    if (questionsIsPdf) {
        const pdfValidation = await validatePdfFile(questionsFile.path);
        if (!pdfValidation.isValid) {
            return res.status(400).json({ success: false, error: { message: `PDF corrotto: ${pdfValidation.error}` } });
        }
    }

    try {
        const result = await examSolverService.extractExamQuestions(req.tenantScope, questionsFile.path);
        logger.info('ExamController', 'extractQuestions completato', { questionsCount: result.questions.length });
        res.json({ success: true, data: result });
    } catch (err) {
        logger.error('ExamController', 'extractQuestions error', err);
        throw err;
    }
});

const generateAnswers = asyncHandler(async (req, res) => {
    const sourceFile = req.file;

    // Parse e validazione body con Zod (gestisce anche JSON.parse di selectedQuestions)
    let parsed;
    try {
        parsed = generateAnswersSchema.parse(req.body);
    } catch (err) {
        return res.status(400).json({ success: false, error: { message: err.errors?.[0]?.message || 'Dati non validi' } });
    }

    const { selectedQuestions, deckId, title, examId } = parsed;

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

        logger.info('ExamController', 'generateAnswers completato', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs,
            flashcardsCount: result.flashcards?.length || 0,
        });

        if (!result.flashcards || !Array.isArray(result.flashcards)) {
            logger.error('ExamController', 'generateAnswers: flashcards mancanti o non array', result);
        }

        sse.sendEvent('complete', result);
        sse.close();
    } catch (err) {
        logger.error('ExamController', 'generateAnswers error', err);
        sse.sendEvent('error', { message: err.message || 'Errore durante la generazione' });
        sse.close();
    }
});

const examSolver = asyncHandler(async (req, res) => {
    logger.debug('ExamController', 'examSolver', { files: req.files ? Object.keys(req.files) : 'UNDEFINED' });

    const questionsFile = req.files?.questionsFile?.[0];
    if (!questionsFile) {
        return res.status(400).json({ success: false, error: { message: 'File domande (questionsFile) obbligatorio' } });
    }

    const sourceFile = req.files?.sourceFile?.[0];
    if (!sourceFile) {
        return res.status(400).json({ success: false, error: { message: 'File materiale (sourceFile) obbligatorio' } });
    }

    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' ||
                           questionsFile.originalname.toLowerCase().endsWith('.txt');

    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({ success: false, error: { message: 'File domande deve essere PDF o TXT' } });
    }

    if (sourceFile.mimetype !== 'application/pdf') {
        return res.status(400).json({ success: false, error: { message: 'File materiale deve essere un PDF' } });
    }

    const maxSize = 15 * 1024 * 1024;
    if (questionsFile.size > maxSize) {
        return res.status(400).json({ success: false, error: { message: 'File domande troppo grande. Massimo 15MB.' } });
    }
    if (sourceFile.size > maxSize) {
        return res.status(400).json({ success: false, error: { message: 'File materiale troppo grande. Massimo 15MB.' } });
    }

    // Validazione body Zod (deckId/title)
    const { deckId, title, examId } = examSolverSchema.parse(req.body);

    try {
        const result = await examSolverService.examSolver(
            req.tenantScope,
            questionsFile.path,
            sourceFile.path,
            { deckId, title, examId }
        );

        logger.info('ExamController', 'examSolver completato', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs,
        });

        res.json({ success: true, data: result });
    } catch (err) {
        logger.error('ExamController', 'examSolver error', err);
        throw err;
    }
});

// =========================================
// RECOVERY PLAN
// =========================================

const resetExamCards = asyncHandler(async (req, res) => {
    const { type } = resetExamCardsSchema.parse(req.body);
    logger.info('ExamController', 'resetExamCards', { examId: req.params.examId, type });
    const result = await recoveryPlanService.resetExamCards(req.tenantScope, req.params.examId, type);
    logger.info('ExamController', 'resetExamCards completato', result);
    res.json({ success: true, data: result });
});

const generateRecoveryQuestions = asyncHandler(async (req, res) => {
    const { difficulties } = generateRecoveryQuestionsSchema.parse(req.body);
    logger.info('ExamController', 'generateRecoveryQuestions', { examId: req.params.examId, difficulties });
    const result = await recoveryPlanService.generateRecoveryQuestions(req.tenantScope, req.params.examId, difficulties);
    logger.info('ExamController', 'generateRecoveryQuestions completato', result);
    res.json({ success: true, data: result });
});

module.exports = {
    uploadAndGenerate,
    extractQuestions,
    generateAnswers,
    examSolver,
    resetExamCards,
    generateRecoveryQuestions,
};
