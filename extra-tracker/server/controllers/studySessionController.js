/**
 * 📚 STUDY SESSION CONTROLLER
 * ============================
 * Gestisce sessioni di studio, review SM-2, tutor AI e progresso esame.
 */

const sessionQuizService = require('../services/study/sessionQuizService');
const cardReviewService = require('../services/study/cardReviewService');
const aiTutorService = require('../services/study/aiTutorService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const {
    getSessionSchema,
    submitReviewSchema,
    verifyAnswerSchema,
    completeSessionSchema,
    chatWithTutorSchema,
    answerExamQuestionSchema,
    saveExamProgressSchema,
} = require('../validators/studyValidators');

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

const getDashboard = asyncHandler(async (req, res) => {
    const result = await sessionQuizService.getAllDecks(req.tenantScope);
    res.json({ success: true, data: result });
});

const completeSession = asyncHandler(async (req, res) => {
    const { mode, stats } = completeSessionSchema.parse(req.body);
    const result = await cardReviewService.completeSession(
        req.tenantScope,
        req.params.id,
        { mode, stats }
    );
    res.json({ success: true, data: result });
});

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

const chatWithTutor = asyncHandler(async (req, res) => {
    const { message, history } = chatWithTutorSchema.parse(req.body);
    const result = await aiTutorService.askTutor(req.tenantScope, req.params.id, message, history);
    res.json({ success: true, data: result });
});

const answerExamQuestion = asyncHandler(async (req, res) => {
    const { question } = answerExamQuestionSchema.parse(req.body);
    const result = await aiTutorService.answerExamQuestion(req.tenantScope, req.params.id, question);
    res.json({ success: true, data: result });
});

const saveExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudySessionController', 'saveExamProgress', { deckId: req.params.id });
    const progressData = saveExamProgressSchema.parse(req.body);
    const result = await cardReviewService.saveExamProgress(req.tenantScope, req.params.id, progressData);
    logger.info('StudySessionController', 'saveExamProgress completato');
    res.json({ success: true, data: result });
});

const getExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudySessionController', 'getExamProgress', { deckId: req.params.id });
    const progress = await cardReviewService.getExamProgress(req.tenantScope, req.params.id);
    logger.info('StudySessionController', 'getExamProgress completato', { hasProgress: !!progress });
    res.json({ success: true, data: progress });
});

const clearExamProgress = asyncHandler(async (req, res) => {
    logger.info('StudySessionController', 'clearExamProgress', { deckId: req.params.id });
    const result = await cardReviewService.clearExamProgress(req.tenantScope, req.params.id);
    logger.info('StudySessionController', 'clearExamProgress completato');
    res.json({ success: true, data: result });
});

module.exports = {
    getSession,
    getDashboard,
    completeSession,
    submitReview,
    verifyAnswer,
    chatWithTutor,
    answerExamQuestion,
    saveExamProgress,
    getExamProgress,
    clearExamProgress,
};
