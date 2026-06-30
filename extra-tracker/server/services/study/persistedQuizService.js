const crypto = require('crypto');
const mongoose = require('mongoose');
const BaseService = require('../BaseService');
const AppError = require('../../utils/AppError');
const Deck = require('../../models/Deck');
const QuizDefinition = require('../../models/QuizDefinition');
const QuizAttempt = require('../../models/QuizAttempt');
const {
    DISTRACTOR_AI_MODEL,
    DISTRACTOR_PROMPT_VERSION,
    QUIZ_TYPES,
} = require('./constants');

const DEFAULT_ATTEMPT_STRATEGY = {
    mode: 'full',
    targetCount: 0,
    seed: '',
    params: {
        wrongWeight: 0.4,
        recencyWeight: 0.25,
        difficultyWeight: 0.15,
        noveltyWeight: 0.1,
        shuffleStrength: 0.1,
    },
};
const RETAKE_MODES = ['full', 'weak_first', 'errors_only', 'spaced_mix'];

class PersistedQuizService extends BaseService {
    constructor() {
        super(QuizDefinition, {
            defaultSort: { createdAt: -1 },
            entityName: 'Quiz persistito',
        });
    }

    _normalizeQuizType(quizType) {
        return String(quizType || '').toLowerCase() === QUIZ_TYPES.TRUE_FALSE
            ? QUIZ_TYPES.TRUE_FALSE
            : QUIZ_TYPES.MULTIPLE_CHOICE;
    }

    _normalizeSource(source) {
        const normalized = String(source || '').toLowerCase();
        return ['chapter', 'repeat', 'errors', 'saved'].includes(normalized)
            ? normalized
            : 'chapter';
    }

    _normalizeRetakeMode(mode) {
        const normalized = String(mode || '').toLowerCase();
        return RETAKE_MODES.includes(normalized) ? normalized : DEFAULT_ATTEMPT_STRATEGY.mode;
    }

    _normalizeRetakeParams(params = {}) {
        return {
            wrongWeight: typeof params.wrongWeight === 'number' && params.wrongWeight >= 0
                ? params.wrongWeight
                : DEFAULT_ATTEMPT_STRATEGY.params.wrongWeight,
            recencyWeight: typeof params.recencyWeight === 'number' && params.recencyWeight >= 0
                ? params.recencyWeight
                : DEFAULT_ATTEMPT_STRATEGY.params.recencyWeight,
            difficultyWeight: typeof params.difficultyWeight === 'number' && params.difficultyWeight >= 0
                ? params.difficultyWeight
                : DEFAULT_ATTEMPT_STRATEGY.params.difficultyWeight,
            noveltyWeight: typeof params.noveltyWeight === 'number' && params.noveltyWeight >= 0
                ? params.noveltyWeight
                : DEFAULT_ATTEMPT_STRATEGY.params.noveltyWeight,
            shuffleStrength: typeof params.shuffleStrength === 'number' && params.shuffleStrength >= 0
                ? params.shuffleStrength
                : DEFAULT_ATTEMPT_STRATEGY.params.shuffleStrength,
        };
    }

    _normalizeRetakeStrategy(strategy = {}, totalQuestions = 0) {
        const safeTotal = Math.max(0, Number(totalQuestions || 0));
        const requestedTarget = Number(strategy.targetCount || 0);
        const fallbackTarget = safeTotal > 0 ? safeTotal : DEFAULT_ATTEMPT_STRATEGY.targetCount;
        const normalizedTarget = requestedTarget > 0 ? Math.floor(requestedTarget) : fallbackTarget;
        const targetCount = safeTotal > 0
            ? Math.min(safeTotal, Math.max(1, normalizedTarget || safeTotal))
            : Math.max(1, normalizedTarget || 1);

        return {
            mode: this._normalizeRetakeMode(strategy.mode),
            targetCount,
            seed: typeof strategy.seed === 'string' && strategy.seed.trim()
                ? strategy.seed.trim()
                : crypto.randomUUID().slice(0, 12),
            params: this._normalizeRetakeParams(strategy.params),
        };
    }

    _toDeckJson(deck, totalCards = null, dueCount = null) {
        const deckJson = deck?.toJSON ? deck.toJSON() : (deck?.toObject ? deck.toObject() : deck);
        const cards = Array.isArray(deckJson?.cards) ? deckJson.cards : [];
        return {
            ...deckJson,
            totalCards: typeof totalCards === 'number' ? totalCards : cards.length,
            dueCount: typeof dueCount === 'number' ? dueCount : cards.length,
        };
    }

    _trimArray(values = []) {
        if (!Array.isArray(values)) return [];
        return values
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean);
    }

    _dedupePreservingOrder(values = []) {
        return [...new Set(values)];
    }

    _daysSince(dateValue) {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return null;
        const elapsedMs = Date.now() - date.getTime();
        return Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));
    }

    _shuffleArray(values = []) {
        const next = [...values];
        for (let i = next.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
    }

    _normalizeQuestionSpec(question = {}, index = 0, quizType = QUIZ_TYPES.MULTIPLE_CHOICE) {
        const normalizedQuizType = this._normalizeQuizType(quizType);
        const questionText = typeof question.questionText === 'string' ? question.questionText.trim() : '';
        const correctAnswer = typeof question.correctAnswer === 'string' ? question.correctAnswer.trim() : '';
        if (!questionText || !correctAnswer) {
            return null;
        }

        const difficulty = question.difficulty === 'hard' ? 'hard' : 'standard';
        const rawDistractors = this._trimArray(question.distractors);
        const rawExplanations = this._trimArray(question.distractorExplanations || question.explanations);
        let options = this._trimArray(question.options);
        let distractors = rawDistractors;

        if (normalizedQuizType === QUIZ_TYPES.TRUE_FALSE) {
            options = ['Vero', 'Falso'];
            distractors = options.filter((option) => option !== correctAnswer);
        } else {
            if (options.length === 0) {
                options = this._shuffleArray(this._dedupePreservingOrder([correctAnswer, ...distractors]));
            } else {
                if (!options.includes(correctAnswer)) {
                    options = this._dedupePreservingOrder([correctAnswer, ...options]);
                }
                options = this._dedupePreservingOrder(options);
            }

            if (distractors.length === 0) {
                distractors = options.filter((option) => option !== correctAnswer);
            }
        }

        const promptVersion = typeof question.promptVersion === 'string' && question.promptVersion.trim()
            ? question.promptVersion.trim()
            : DISTRACTOR_PROMPT_VERSION;

        return {
            questionId: typeof question.questionId === 'string' && question.questionId.trim()
                ? question.questionId.trim()
                : `qq_${index + 1}_${crypto.randomUUID().slice(0, 8)}`,
            positionSeed: typeof question.positionSeed === 'number' ? question.positionSeed : index,
            questionText,
            correctAnswer,
            options,
            distractors,
            distractorExplanations: rawExplanations,
            correctAnswerExplanation: typeof question.correctAnswerExplanation === 'string'
                ? question.correctAnswerExplanation.trim()
                : '',
            difficulty,
            questionType: normalizedQuizType,
            correctStatement: typeof question.correctStatement === 'string' && question.correctStatement.trim()
                ? question.correctStatement.trim()
                : null,
            sourceCardId: typeof question.sourceCardId === 'string' && question.sourceCardId.trim()
                ? question.sourceCardId.trim()
                : null,
            stats: {
                shownCount: 0,
                correctCount: 0,
                wrongCount: 0,
                wrongStreak: 0,
                lastSeenAt: null,
                lastCorrectAt: null,
                averageResponseMs: null,
                masteryScore: 0,
                reviewPriority: difficulty === 'hard' ? 0.15 : 0,
            },
            promptVersion,
        };
    }

    _mapQuestionToCard(question = {}) {
        const options = Array.isArray(question.options) && question.options.length > 0
            ? question.options
            : question.questionType === QUIZ_TYPES.TRUE_FALSE
                ? ['Vero', 'Falso']
                : this._shuffleArray([question.correctAnswer, ...(question.distractors || [])]);

        const distractorExplanations = {};
        options.forEach((option, optionIndex) => {
            if (option === question.correctAnswer) return;
            const distractorIndex = Array.isArray(question.distractors)
                ? question.distractors.indexOf(option)
                : -1;
            if (
                distractorIndex >= 0 &&
                Array.isArray(question.distractorExplanations) &&
                question.distractorExplanations[distractorIndex]
            ) {
                distractorExplanations[optionIndex] = question.distractorExplanations[distractorIndex];
            }
        });

        return {
            id: question.questionId,
            front: question.questionText,
            back: question.correctAnswer,
            canonicalBack: question.correctAnswer,
            options,
            distractors: Array.isArray(question.distractors) ? question.distractors : [],
            distractorExplanations,
            isTrueFalse: question.questionType === QUIZ_TYPES.TRUE_FALSE,
            explanation: question.correctAnswerExplanation || '',
            correctAnswerExplanation: question.correctAnswerExplanation || '',
            correctStatement: question.correctStatement || null,
            difficulty: question.difficulty || 'standard',
            nextReviewDate: new Date().toISOString(),
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            status: 'new',
        };
    }

    _selectOrderedQuestions(questions = [], questionIds = []) {
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            return Array.isArray(questions) ? questions : [];
        }

        const questionMap = new Map(
            (Array.isArray(questions) ? questions : []).map((question) => [question.questionId, question])
        );

        return questionIds
            .map((questionId) => questionMap.get(questionId))
            .filter(Boolean);
    }

    _mapAttempts(attempts = []) {
        return attempts.map((attempt) => ({
            id: attempt._id?.toString() || attempt.id,
            score: attempt.score,
            accuracy: attempt.accuracy,
            timeSeconds: attempt.timeSeconds,
            completedAt: attempt.completedAt,
            strategy: attempt.strategy
                ? {
                    mode: attempt.strategy.mode,
                    targetCount: attempt.strategy.targetCount,
                    seed: attempt.strategy.seed,
                    params: attempt.strategy.params,
                }
                : undefined,
            wrongQuestionIndices: Array.isArray(attempt.results)
                ? attempt.results.filter((result) => !result.isCorrect).map((result) => result.shownIndex)
                : Array.isArray(attempt.wrongQuestionIndices)
                    ? attempt.wrongQuestionIndices
                    : [],
        }));
    }

    async _getAttemptsForQuiz(tenantScope, quizId) {
        return QuizAttempt
            .find(this._buildFilter(tenantScope, { quizId }))
            .sort({ completedAt: -1 })
            .limit(100)
            .lean()
            .exec();
    }

    _computeQuestionSignals(question = {}, strategyParams = DEFAULT_ATTEMPT_STRATEGY.params) {
        const stats = question.stats || {};
        const shownCount = Math.max(0, Number(stats.shownCount || 0));
        const correctCount = Math.max(0, Number(stats.correctCount || 0));
        const wrongCount = Math.max(0, Number(stats.wrongCount || 0));
        const wrongStreak = Math.max(0, Number(stats.wrongStreak || 0));
        const successRate = correctCount / Math.max(shownCount, 1);
        const errorRate = wrongCount / Math.max(shownCount, 1);
        const recencyDays = this._daysSince(stats.lastSeenAt);
        const lastCorrectDays = this._daysSince(stats.lastCorrectAt);
        const recencyBoost = shownCount === 0
            ? 1
            : Math.min(1, (recencyDays ?? 14) / 14);
        const difficultyBoost = question.difficulty === 'hard' ? 1 : 0;
        const noveltyBoost = shownCount === 0 ? 1 : 0;
        const wrongStreakBoost = Math.min(1, wrongStreak / 3);
        const averageResponseMs = typeof stats.averageResponseMs === 'number' && stats.averageResponseMs >= 0
            ? stats.averageResponseMs
            : null;
        const speedSignal = averageResponseMs && averageResponseMs > 0
            ? Math.max(0, 1 - Math.min(1, averageResponseMs / 30000))
            : 0;
        const recencySuccess = lastCorrectDays === null
            ? 0
            : Math.max(0, 1 - Math.min(1, lastCorrectDays / 14));
        const streakSignal = shownCount === 0
            ? 0
            : Math.max(0, 1 - Math.min(1, wrongStreak / 4));
        const reviewPriority = Number((
            (strategyParams.wrongWeight * errorRate) +
            (0.25 * wrongStreakBoost) +
            (strategyParams.recencyWeight * recencyBoost) +
            (strategyParams.difficultyWeight * difficultyBoost) +
            (strategyParams.noveltyWeight * noveltyBoost)
        ).toFixed(4));
        const masteryScore = Number((
            (0.5 * successRate) +
            (0.2 * recencySuccess) +
            (0.2 * streakSignal) +
            (0.1 * speedSignal)
        ).toFixed(4));

        return {
            shownCount,
            correctCount,
            wrongCount,
            wrongStreak,
            successRate,
            errorRate,
            recencyBoost,
            difficultyBoost,
            noveltyBoost,
            wrongStreakBoost,
            averageResponseMs,
            masteryScore,
            reviewPriority,
        };
    }

    _calculateQuestionStats(question = {}, stats = {}, result = {}, strategyParams = DEFAULT_ATTEMPT_STRATEGY.params) {
        const shownCount = Number(stats.shownCount || 0) + 1;
        const correctCount = Number(stats.correctCount || 0) + (result.isCorrect ? 1 : 0);
        const wrongCount = Number(stats.wrongCount || 0) + (result.isCorrect ? 0 : 1);
        const wrongStreak = result.isCorrect ? 0 : Number(stats.wrongStreak || 0) + 1;
        const averageResponseMs = typeof result.responseMs === 'number' && result.responseMs >= 0
            ? (
                typeof stats.averageResponseMs === 'number' && stats.averageResponseMs >= 0
                    ? ((stats.averageResponseMs * (shownCount - 1)) + result.responseMs) / shownCount
                    : result.responseMs
            )
            : stats.averageResponseMs ?? null;

        const nextStats = {
            shownCount,
            correctCount,
            wrongCount,
            wrongStreak,
            lastSeenAt: new Date(),
            lastCorrectAt: result.isCorrect ? new Date() : (stats.lastCorrectAt || null),
            averageResponseMs,
        };
        const computedSignals = this._computeQuestionSignals({
            ...question,
            stats: nextStats,
        }, strategyParams);

        return {
            ...nextStats,
            masteryScore: computedSignals.masteryScore,
            reviewPriority: computedSignals.reviewPriority,
        };
    }

    _weightedShuffle(scoredQuestions = [], strategy = DEFAULT_ATTEMPT_STRATEGY) {
        const shuffleStrength = Math.max(0.01, Number(strategy?.params?.shuffleStrength || 0.1));
        return [...scoredQuestions]
            .map((entry) => {
                const baseWeight = Math.max(0.05, Number(entry.signals?.reviewPriority || 0) + shuffleStrength);
                const randomKey = -Math.log(Math.max(Number.MIN_VALUE, Math.random())) / baseWeight;
                return {
                    ...entry,
                    randomKey,
                };
            })
            .sort((a, b) => a.randomKey - b.randomKey)
            .map(({ randomKey: _randomKey, ...entry }) => entry);
    }

    _takeDistinctQuestions(scoredQuestions = [], count = 0, selectedIds = new Set(), strategy = DEFAULT_ATTEMPT_STRATEGY) {
        const weighted = this._weightedShuffle(
            scoredQuestions.filter((entry) => !selectedIds.has(entry.question.questionId)),
            strategy,
        );
        const picked = [];
        for (const entry of weighted) {
            if (picked.length >= count) break;
            if (selectedIds.has(entry.question.questionId)) continue;
            selectedIds.add(entry.question.questionId);
            picked.push(entry);
        }
        return picked;
    }

    _selectSpacedMixQuestions(scoredQuestions = [], strategy = DEFAULT_ATTEMPT_STRATEGY) {
        const targetCount = Math.min(strategy.targetCount, scoredQuestions.length);
        const selectedIds = new Set();
        const selected = [];

        const weakPool = scoredQuestions.filter((entry) =>
            entry.signals.reviewPriority >= 0.35 || entry.signals.wrongCount > 0 || entry.signals.wrongStreak > 0
        );
        const stalePool = scoredQuestions.filter((entry) => entry.signals.recencyBoost >= 0.4);
        const unseenPool = scoredQuestions.filter((entry) => entry.signals.shownCount === 0);

        selected.push(...this._takeDistinctQuestions(weakPool, Math.ceil(targetCount * 0.5), selectedIds, strategy));
        selected.push(...this._takeDistinctQuestions(stalePool, Math.ceil(targetCount * 0.3), selectedIds, strategy));
        selected.push(...this._takeDistinctQuestions(unseenPool, Math.ceil(targetCount * 0.2), selectedIds, strategy));

        if (selected.length < targetCount) {
            selected.push(
                ...this._takeDistinctQuestions(
                    scoredQuestions,
                    targetCount - selected.length,
                    selectedIds,
                    strategy,
                ),
            );
        }

        return this._weightedShuffle(selected, strategy).slice(0, targetCount);
    }

    _selectQuestionsForRetake(questions = [], strategy = DEFAULT_ATTEMPT_STRATEGY) {
        const scoredQuestions = (Array.isArray(questions) ? questions : []).map((question) => ({
            question,
            signals: this._computeQuestionSignals(question, strategy.params),
        }));

        if (scoredQuestions.length === 0) return [];

        if (strategy.mode === 'spaced_mix') {
            return this._selectSpacedMixQuestions(scoredQuestions, strategy).map((entry) => entry.question);
        }

        let candidates = scoredQuestions;
        if (strategy.mode === 'errors_only') {
            candidates = scoredQuestions.filter((entry) => entry.signals.wrongCount > 0);
            if (candidates.length === 0) {
                candidates = scoredQuestions.filter((entry) => entry.signals.reviewPriority > 0.25);
            }
        } else if (strategy.mode === 'weak_first') {
            candidates = scoredQuestions.filter((entry) =>
                entry.signals.reviewPriority > 0 ||
                entry.signals.wrongCount > 0 ||
                entry.signals.shownCount === 0
            );
        }

        if (candidates.length === 0) {
            candidates = scoredQuestions;
        }

        const selectedEntries = this._weightedShuffle(candidates, strategy).slice(0, strategy.targetCount);
        if (selectedEntries.length >= strategy.targetCount) {
            return selectedEntries.map((entry) => entry.question);
        }

        const selectedIds = new Set(selectedEntries.map((entry) => entry.question.questionId));
        const fillerEntries = this._takeDistinctQuestions(
            scoredQuestions,
            strategy.targetCount - selectedEntries.length,
            selectedIds,
            strategy,
        );

        return [...selectedEntries, ...fillerEntries].map((entry) => entry.question);
    }

    async createGeneratedQuiz(tenantScope, deck, payload = {}) {
        const quizType = this._normalizeQuizType(payload.quizType);
        const source = this._normalizeSource(payload.source);
        const normalizedQuestions = (Array.isArray(payload.questions) ? payload.questions : [])
            .map((question, index) => this._normalizeQuestionSpec(question, index, quizType))
            .filter(Boolean);

        if (normalizedQuestions.length === 0) {
            throw AppError.validation('Impossibile creare il quiz: nessuna domanda valida generata');
        }

        const name = typeof payload.name === 'string' && payload.name.trim()
            ? payload.name.trim()
            : `Quiz ${normalizedQuestions.length} domande`;
        const generatedFromTextHash = typeof payload.generatedFromText === 'string' && payload.generatedFromText.trim()
            ? crypto.createHash('sha256').update(payload.generatedFromText.trim()).digest('hex').slice(0, 24)
            : '';
        const sourceCardIds = this._trimArray(payload.sourceCardIds);

        // Prova con transazione; se MongoDB è standalone (non replica set), fallback senza
        let session;
        let useTransaction = true;
        try {
            session = await mongoose.startSession();
        } catch (_err) {
            useTransaction = false;
        }

        const saveQuiz = async (writeSession) => {
            const createdQuiz = await new QuizDefinition({
                ...this._buildFilter(tenantScope, {}),
                deckId: deck._id,
                examId: deck.examId || null,
                name,
                quizType,
                source,
                origin: {
                    kind: payload.originKind || 'ai_pdf',
                    pdfBased: payload.pdfBased !== false,
                    sourceCardIds,
                    generatedFromTextHash,
                    aiModel: payload.aiModel || DISTRACTOR_AI_MODEL,
                    promptVersion: payload.promptVersion || DISTRACTOR_PROMPT_VERSION,
                },
                questionCount: normalizedQuestions.length,
                questions: normalizedQuestions,
                status: 'ready',
            }).save(writeSession ? { session: writeSession } : {});

            if (deck?.savedQuizzes) {
                deck.savedQuizzes.push({
                    _id: createdQuiz._id,
                    quizRefId: createdQuiz._id,
                    name,
                    quizType,
                    questionCount: normalizedQuestions.length,
                    sourceCardIds: sourceCardIds.length > 0
                        ? sourceCardIds
                        : normalizedQuestions.map((question) => question.questionId),
                    source,
                    questions: [],
                    attempts: [],
                    createdAt: createdQuiz.createdAt,
                });
                await deck.save(writeSession ? { session: writeSession } : {});
            }

            return createdQuiz;
        };

        try {
            if (useTransaction && session) {
                let createdQuiz;
                await session.withTransaction(async () => {
                    createdQuiz = await saveQuiz(session);
                });
                return createdQuiz;
            }
            return await saveQuiz(null);
        } catch (err) {
            // Standalone MongoDB — transazioni non supportate, riprova senza
            if (err.message && err.message.includes('Transaction numbers are only allowed')) {
                if (session) {
                    try { await session.endSession(); } catch (_) { /* ignore */ }
                    session = null;
                }
                return await saveQuiz(null);
            }
            throw err;
        } finally {
            if (session) {
                try { await session.endSession(); } catch (_) { /* ignore */ }
            }
        }
    }

    async findQuizForDeck(tenantScope, deckId, quizId, options = {}) {
        const quiz = await this.findById(tenantScope, quizId, {
            throwIfNotFound: options.throwIfNotFound !== false,
        });

        if (!quiz) return null;

        if (String(quiz.deckId) !== String(deckId)) {
            if (options.throwIfNotFound !== false) {
                throw AppError.notFound('Quiz persistito');
            }
            return null;
        }

        return quiz;
    }

    buildSessionFromQuiz(deck, quiz, options = {}) {
        const requestedQuestionIds = this._trimArray(options.questionIds);
        const selectedQuestions = this._selectOrderedQuestions(quiz.questions || [], requestedQuestionIds);
        const cards = selectedQuestions.map((question) => this._mapQuestionToCard(question));

        if (cards.length === 0) {
            throw AppError.validation('Nessuna domanda disponibile per il quiz richiesto');
        }

        const deckJson = this._toDeckJson(deck, options.totalCards, options.dueCount);

        return {
            deck: deckJson,
            cards,
            remaining: cards.length,
            total: cards.length,
            mode: 'quiz',
            cardModes: {},
            meta: {
                focus: 'all',
                limit: cards.length,
                timeLimitMinutes: options.timeLimitMinutes > 0 ? options.timeLimitMinutes : undefined,
                questionCount: cards.length,
                quizType: quiz.quizType,
                quizId: quiz._id.toString(),
                retakeStrategy: options.strategy || undefined,
            },
        };
    }

    async getSavedQuizForRetake(tenantScope, deckId, quizId, options = {}) {
        const quiz = await this.findQuizForDeck(tenantScope, deckId, quizId);
        const strategy = this._normalizeRetakeStrategy(options.strategy, (quiz.questions || []).length);
        const questionIds = Array.isArray(options.questionIds) && options.questionIds.length > 0
            ? options.questionIds
            : this._selectQuestionsForRetake(quiz.questions || [], strategy)
                .map((question) => question.questionId);
        const cards = this
            ._selectOrderedQuestions(quiz.questions || [], questionIds)
            .map((question) => this._mapQuestionToCard(question));
        const attempts = await this._getAttemptsForQuiz(tenantScope, quiz._id);
        const session = options.includeSession
            ? this.buildSessionFromQuiz(options.deck || { _id: deckId }, quiz, {
                questionIds,
                totalCards: options.totalCards,
                dueCount: options.dueCount,
                timeLimitMinutes: options.timeLimitMinutes,
                strategy,
            })
            : undefined;

        return {
            quizId: quiz._id.toString(),
            name: quiz.name,
            quizType: quiz.quizType,
            questionCount: cards.length,
            strategy,
            cards,
            attempts: this._mapAttempts(attempts),
            session,
        };
    }

    async getSavedQuizForReview(tenantScope, deckId, quizId) {
        const quiz = await this.findQuizForDeck(tenantScope, deckId, quizId);
        const attempts = await this._getAttemptsForQuiz(tenantScope, quiz._id);

        return {
            quizId: quiz._id.toString(),
            name: quiz.name,
            quizType: quiz.quizType,
            questions: (quiz.questions || []).map((question) => ({
                questionId: question.questionId,
                questionText: question.questionText,
                correctAnswer: question.correctAnswer,
                distractors: question.distractors || [],
                distractorExplanations: question.distractorExplanations || [],
                correctAnswerExplanation: question.correctAnswerExplanation || '',
                difficulty: question.difficulty || 'standard',
                options: question.options || [],
                correctStatement: question.correctStatement || null,
            })),
            attempts: this._mapAttempts(attempts),
        };
    }

    async recordQuizAttempt(tenantScope, deckId, quizId, attemptData = {}) {
        const quiz = await this.findQuizForDeck(tenantScope, deckId, quizId);
        const strategy = this._normalizeRetakeStrategy(
            attemptData.strategy || DEFAULT_ATTEMPT_STRATEGY,
            (quiz.questions || []).length,
        );
        const normalizedResults = Array.isArray(attemptData.results)
            ? attemptData.results
                .map((result, index) => ({
                    questionId: typeof result.questionId === 'string' ? result.questionId.trim() : '',
                    shownIndex: typeof result.shownIndex === 'number' ? result.shownIndex : index,
                    selectedAnswer: typeof result.selectedAnswer === 'string' ? result.selectedAnswer : '',
                    correctAnswer: typeof result.correctAnswer === 'string' ? result.correctAnswer : '',
                    isCorrect: Boolean(result.isCorrect),
                    responseMs: typeof result.responseMs === 'number' && result.responseMs >= 0 ? result.responseMs : null,
                    skipped: Boolean(result.skipped),
                }))
                .filter((result) => result.questionId)
            : [];

        const orderedQuestionIds = normalizedResults
            .slice()
            .sort((a, b) => a.shownIndex - b.shownIndex)
            .map((result) => result.questionId);

        const resultsMap = new Map(normalizedResults.map((result) => [result.questionId, result]));

        // Wrap multi-collection writes in transaction for consistency (standalone fallback included)
        let session;
        let createdAttempt;
        try {
            session = await mongoose.startSession();
        } catch (_err) {
            session = null;
        }

        const doSave = async (writeSession) => {
            createdAttempt = await QuizAttempt.create([{
                ...this._buildFilter(tenantScope, {}),
                quizId: quiz._id,
                deckId: quiz.deckId,
                examId: quiz.examId || null,
                strategy: { ...strategy, targetCount: normalizedResults.length },
                orderedQuestionIds,
                results: normalizedResults,
                score: attemptData.score,
                accuracy: attemptData.accuracy,
                timeSeconds: attemptData.timeSeconds || 0,
                startedAt: attemptData.startedAt ? new Date(attemptData.startedAt) : new Date(),
                completedAt: attemptData.completedAt ? new Date(attemptData.completedAt) : new Date(),
            }], writeSession ? { session: writeSession } : {});
            createdAttempt = createdAttempt[0];

            let mutated = false;
            for (const question of quiz.questions || []) {
                const result = resultsMap.get(question.questionId);
                if (!result) continue;
                question.stats = this._calculateQuestionStats(question, question.stats || {}, result, strategy.params);
                mutated = true;
            }
            if (mutated) {
                await quiz.save(writeSession ? { session: writeSession } : {});
            }

            const deck = await Deck.findOne(this._buildFilter(tenantScope, { _id: deckId })).exec();
            if (deck) {
                const summary = deck.savedQuizzes?.id(quizId);
                if (summary) {
                    if (!Array.isArray(summary.attempts)) {
                        summary.attempts = [];
                    }
                    if (summary.attempts.length >= 100) {
                        summary.attempts.shift();
                    }
                    summary.attempts.push({
                        score: attemptData.score,
                        accuracy: attemptData.accuracy,
                        timeSeconds: attemptData.timeSeconds || 0,
                        completedAt: new Date(),
                        wrongQuestionIndices: normalizedResults
                            .filter((result) => !result.isCorrect)
                            .map((result) => result.shownIndex),
                    });
                    await deck.save(writeSession ? { session: writeSession } : {});
                }
            }
        };

        try {
            if (session) {
                await session.withTransaction(async () => { await doSave(session); });
            } else {
                await doSave(null);
            }
        } catch (err) {
            if (err.message && err.message.includes('Transaction numbers are only allowed')) {
                if (session) {
                    try { await session.endSession(); } catch (_) { /* ignore */ }
                    session = null;
                }
                await doSave(null);
            } else {
                throw err;
            }
        } finally {
            if (session) {
                try { await session.endSession(); } catch (_) { /* ignore */ }
            }
        }

        return {
            id: createdAttempt._id?.toString(),
            score: createdAttempt.score,
            accuracy: createdAttempt.accuracy,
            timeSeconds: createdAttempt.timeSeconds,
            completedAt: createdAttempt.completedAt,
        };
    }
}

module.exports = new PersistedQuizService();
