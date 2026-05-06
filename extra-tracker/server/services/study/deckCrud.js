/**
 * 🗂️ STUDY SERVICE - Deck CRUD Operations
 * ==========================================
 * Create, Read, Update, Delete for decks and cards.
 */

const AppError = require('../../utils/AppError');
const Deck = require('../../models/Deck');
const examRepository = require('../../repositories/ExamRepository');
const folderRepository = require('../../repositories/FolderRepository');
const { DEFAULT_EASINESS_FACTOR } = require('./constants');
const logger = require('../../utils/logger');
const { resolveQuizSnapshotSourceCardIds } = require('./syntheticQuizIds');
const persistedQuizService = require('./persistedQuizService');

module.exports = {

    async createDeck(tenantScope, data = {}) {
        const { examId, title, description, tags } = data;
        if (!title || typeof title !== 'string') {
            throw AppError.validation('Il titolo del mazzo e\' obbligatorio');
        }

        if (examId) {
            await this._validateExamOwnership(tenantScope, examId);
        }

        return this.create(tenantScope, {
            examId: examId || null,
            title,
            description,
            tags,
        });
    },

    async addCard(tenantScope, deckId, cardData = {}) {
        const { front, back } = cardData;
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card e\' obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card e\' obbligatorio');
        }

        const userId = this._getUserId(tenantScope);
        const deck = await Deck.findOneAndUpdate(
            { _id: deckId, user: userId },
            {
                $push: {
                    cards: {
                        front: normalizedFront,
                        back: normalizedBack,
                        quizAnswerVariant: '',
                        distractors: [],
                        aiDistractorsFailed: false,
                    },
                },
            },
            { new: true },
        );

        if (!deck) throw AppError.notFound('Deck');

        return deck;
    },

    async updateCard(tenantScope, deckId, cardId, { front, back }) {
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card e\' obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card e\' obbligatorio');
        }

        const userId = this._getUserId(tenantScope);
        const deck = await Deck.findOneAndUpdate(
            { _id: deckId, user: userId, 'cards._id': cardId },
            { $set: { 'cards.$.front': normalizedFront, 'cards.$.back': normalizedBack } },
            { new: true },
        );

        if (!deck) throw AppError.notFound('Carta o mazzo non trovato');

        return deck;
    },

    async updateCardAnswer(tenantScope, deckId, cardId, answer) {
        const normalizedAnswer = typeof answer === 'string' ? answer.trim() : '';

        if (!normalizedAnswer) {
            throw AppError.validation('La risposta è obbligatoria');
        }
        if (normalizedAnswer.length < 10) {
            throw AppError.validation('La risposta deve contenere almeno 10 caratteri');
        }
        if (normalizedAnswer.length > 1000) {
            throw AppError.validation('La risposta non può superare 1000 caratteri');
        }

        const userId = this._getUserId(tenantScope);
        const deck = await Deck.findOneAndUpdate(
            { _id: deckId, user: userId, 'cards._id': cardId },
            { $set: { 'cards.$.back': normalizedAnswer } },
            { new: true },
        );

        if (!deck) throw AppError.notFound('Carta o mazzo non trovato');

        return deck;
    },

    async deleteCard(tenantScope, deckId, cardId) {
        return this.updateRaw(tenantScope, deckId, { $pull: { cards: { _id: cardId } } });
    },

    async reorderCards(tenantScope, deckId, cardIds) {
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            throw AppError.validation('Devi fornire un array di card IDs valido');
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        const existingCardIds = deck.cards.map(card => card._id.toString());
        const invalidIds = cardIds.filter(id => !existingCardIds.includes(id));
        if (invalidIds.length > 0) {
            throw AppError.validation(`Card IDs non validi: ${invalidIds.join(', ')}`);
        }

        if (cardIds.length !== existingCardIds.length) {
            throw AppError.validation('Devi fornire tutti i card IDs del mazzo');
        }

        const cardMap = new Map();
        deck.cards.forEach(card => {
            cardMap.set(card._id.toString(), card.toObject());
        });

        const reorderedCards = cardIds.map(id => cardMap.get(id));

        const hasUndefined = reorderedCards.some(card => card === undefined);
        if (hasUndefined) {
            throw AppError.internal({ message: 'Errore interno nel riordinamento delle card' });
        }

        deck.cards = reorderedCards;
        await deck.save();

        return deck;
    },

    async addCardAtPosition(tenantScope, deckId, cardData = {}) {
        const { front, back, position } = cardData;
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card è obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card è obbligatorio');
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        const newCard = {
            front: normalizedFront,
            back: normalizedBack,
            quizAnswerVariant: '',
            distractors: [],
            aiDistractorsFailed: false,
        };

        if (typeof position === 'number' && position >= 0 && position <= deck.cards.length) {
            deck.cards.splice(position, 0, newCard);
        } else {
            deck.cards.push(newCard);
        }

        await deck.save();

        return deck;
    },

    async deleteDeck(tenantScope, deckId) {
        return this.delete(tenantScope, deckId);
    },

    async updateDeck(tenantScope, deckId, updates) {
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        if (updates.title !== undefined) {
            deck.title = updates.title.trim();
        }
        if (updates.description !== undefined) {
            deck.description = updates.description?.trim() || '';
        }
        if (updates.tags !== undefined && Array.isArray(updates.tags)) {
            const normalized = updates.tags
                .map(tag => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
                .filter(tag => tag.length > 0)
                .slice(0, 5);
            deck.tags = [...new Set(normalized)];
        }
        if (updates.folderId !== undefined) {
            logger.debug('DeckCrud', 'updateDeck: folderId update', {
                currentFolderId: deck.folderId ? deck.folderId.toString() : null,
                newFolderId: updates.folderId,
            });

            if (updates.folderId !== null && updates.folderId !== '') {
                await folderRepository.findById(tenantScope, updates.folderId, { throwIfNotFound: true });
                deck.folderId = updates.folderId;
                logger.debug('DeckCrud', 'updateDeck: folder verificata');
            } else {
                deck.folderId = null;
                logger.debug('DeckCrud', 'updateDeck: folderId → null');
            }
        }

        if (updates.examId !== undefined) {
            logger.debug('DeckCrud', 'updateDeck: examId update', {
                currentExamId: deck.examId ? deck.examId.toString() : null,
                newExamId: updates.examId,
            });

            if (updates.examId !== null && updates.examId !== '') {
                await examRepository.findById(tenantScope, updates.examId, { throwIfNotFound: true });
                deck.examId = updates.examId;
                logger.debug('DeckCrud', 'updateDeck: exam verificato');
            } else {
                deck.examId = null;
                logger.debug('DeckCrud', 'updateDeck: examId → null');
            }
        }

        await deck.save();
        logger.debug('DeckCrud', 'updateDeck: deck salvato', {
            deckId: deck._id.toString(),
            folderId: deck.folderId ? deck.folderId.toString() : null,
        });

        const savedDeck = await this.findById(tenantScope, deck._id, { throwIfNotFound: true });

        logger.debug('DeckCrud', 'updateDeck: reloaded from DB', {
            deckId: savedDeck._id.toString(),
            folderId: savedDeck.folderId ? savedDeck.folderId.toString() : null,
        });

        const serialized = this._serializeDeck(savedDeck);
        logger.debug('DeckCrud', 'updateDeck: serialized', {
            id: serialized.id,
            folderId: serialized.folderId,
        });

        return serialized;
    },

    async updateDeckSettings(tenantScope, deckId, settings) {
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        if (settings.algorithm && ['sm2', 'fsrs', 'leitner', 'anki'].includes(settings.algorithm)) {
            deck.algorithm = settings.algorithm;
        }

        if (settings.aiSettings) {
            if (!deck.aiSettings) {
                deck.aiSettings = {};
            }
            if (settings.aiSettings.style && ['comprehensive', 'conceptual', 'factual', 'application'].includes(settings.aiSettings.style)) {
                deck.aiSettings.style = settings.aiSettings.style;
            }
            if (settings.aiSettings.difficulty && ['easy', 'medium', 'hard', 'mixed'].includes(settings.aiSettings.difficulty)) {
                deck.aiSettings.difficulty = settings.aiSettings.difficulty;
            }
            if (Array.isArray(settings.aiSettings.questionTypes)) {
                deck.aiSettings.questionTypes = settings.aiSettings.questionTypes;
            }
        }

        await deck.save();
        return this._serializeDeck(deck);
    },

    async getDeckById(tenantScope, deckId) {
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        await this._ensureDeckPdfUrlIntegrity(deck);

        return deck.toJSON();
    },

    async saveQuizSnapshot(tenantScope, deckId, payload = {}) {
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        const cardIdSet = new Set(
            (deck.cards || []).map(card => card?._id?.toString()).filter(Boolean)
        );
        const { sourceCardIds, isSyntheticOnlyQuiz: isAiGeneratedQuiz } = resolveQuizSnapshotSourceCardIds(
            payload.sourceCardIds,
            [...cardIdSet],
        );

        if (sourceCardIds.length === 0 && !isAiGeneratedQuiz) {
            throw AppError.validation('Impossibile salvare il quiz: nessuna flashcard valida associata');
        }

        const questionCountRaw = this._toNumber(
            payload.questionCount,
            isAiGeneratedQuiz ? payload.questionCount : sourceCardIds.length,
        );
        const questionCount = Math.max(
            1,
            isAiGeneratedQuiz
                ? Math.round(questionCountRaw > 0 ? questionCountRaw : sourceCardIds.length)
                : Math.min(sourceCardIds.length, Math.round(questionCountRaw > 0 ? questionCountRaw : sourceCardIds.length))
        );

        const quizType = this._normalizeQuizType(payload.quizType);
        const source = this._normalizeQuizSnapshotSource(payload.source);
        const name = typeof payload.name === 'string' && payload.name.trim().length > 0
            ? payload.name.trim()
            : `Quiz ${questionCount} domande`;

        deck.savedQuizzes.push({
            name,
            quizType,
            questionCount,
            sourceCardIds,
            source,
            questions: Array.isArray(payload.questions) ? payload.questions : [],
            createdAt: new Date(),
        });

        await deck.save();

        const savedQuiz = deck.savedQuizzes[deck.savedQuizzes.length - 1];
        return {
            id: savedQuiz?._id?.toString(),
            deckId: deck._id.toString(),
            deckTitle: deck.title,
            examId: deck.examId ? deck.examId.toString() : null,
            name,
            quizType,
            questionCount,
            sourceCardIds,
            source,
            createdAt: savedQuiz?.createdAt || new Date(),
        };
    },

    async getSavedQuizForRetake(tenantScope, deckId, quizId, options = {}) {
        const persistedQuiz = await persistedQuizService.findQuizForDeck(tenantScope, deckId, quizId, {
            throwIfNotFound: false,
        });
        if (persistedQuiz) {
            return persistedQuizService.getSavedQuizForRetake(tenantScope, deckId, quizId, options);
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });
        const quiz = deck.savedQuizzes.id(quizId);
        if (!quiz) {
            throw AppError.notFound('Quiz salvato');
        }
        if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
            throw AppError.validation('Questo quiz non ha domande salvate (quiz legacy). Usa il flusso di generazione AI.');
        }

        // Fisher-Yates shuffle
        const shuffled = [...quiz.questions.map(q => q.toObject ? q.toObject() : q)];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Map to card format (same shape as _mapAiQuestionsToCards)
        const cards = shuffled.map((q, index) => {
            const opts = Array.isArray(q.options) && q.options.length > 0
                ? q.options
                : this._shuffleOptions([q.correctAnswer, ...q.distractors]);
            const distractorExplanations = {};
            opts.forEach((opt, i) => {
                if (opt === q.correctAnswer) return;
                const distIdx = q.distractors.indexOf(opt);
                if (distIdx !== -1 && Array.isArray(q.distractorExplanations) && q.distractorExplanations[distIdx]) {
                    distractorExplanations[i] = q.distractorExplanations[distIdx];
                }
            });
            return {
                id: `retake_${quizId}_${index}_${Date.now()}`,
                front: q.questionText,
                back: q.correctAnswer,
                canonicalBack: q.correctAnswer,
                difficulty: q.difficulty || 'standard',
                correctAnswerExplanation: q.correctAnswerExplanation || '',
                options: opts,
                distractorExplanations,
                distractors: q.distractors,
                isRetake: true,
            };
        });

        const attempts = (quiz.attempts || []).map(a => ({
            id: a._id?.toString(),
            score: a.score,
            accuracy: a.accuracy,
            timeSeconds: a.timeSeconds,
            completedAt: a.completedAt,
            wrongQuestionIndices: a.wrongQuestionIndices || [],
        }));

        return {
            quizId: quiz._id.toString(),
            name: quiz.name,
            quizType: quiz.quizType,
            questionCount: cards.length,
            cards,
            attempts,
        };
    },

    _shuffleOptions(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    async getSavedQuizForReview(tenantScope, deckId, quizId) {
        const persistedQuiz = await persistedQuizService.findQuizForDeck(tenantScope, deckId, quizId, {
            throwIfNotFound: false,
        });
        if (persistedQuiz) {
            return persistedQuizService.getSavedQuizForReview(tenantScope, deckId, quizId);
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });
        const quiz = deck.savedQuizzes.id(quizId);
        if (!quiz) {
            throw AppError.notFound('Quiz salvato');
        }
        if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
            throw AppError.validation('Questo quiz non ha domande salvate (quiz legacy).');
        }

        const questions = quiz.questions.map(q => {
            const raw = q.toObject ? q.toObject() : q;
            return {
                questionText: raw.questionText,
                correctAnswer: raw.correctAnswer,
                distractors: raw.distractors || [],
                distractorExplanations: raw.distractorExplanations || [],
                correctAnswerExplanation: raw.correctAnswerExplanation || '',
                difficulty: raw.difficulty || 'standard',
                options: raw.options || [],
            };
        });

        const attempts = (quiz.attempts || []).map(a => ({
            id: a._id?.toString(),
            score: a.score,
            accuracy: a.accuracy,
            timeSeconds: a.timeSeconds,
            completedAt: a.completedAt,
            wrongQuestionIndices: a.wrongQuestionIndices || [],
        }));

        return {
            quizId: quiz._id.toString(),
            name: quiz.name,
            quizType: quiz.quizType,
            questions,
            attempts,
        };
    },

    async recordQuizAttempt(tenantScope, deckId, quizId, attemptData) {
        const persistedQuiz = await persistedQuizService.findQuizForDeck(tenantScope, deckId, quizId, {
            throwIfNotFound: false,
        });
        if (persistedQuiz) {
            return persistedQuizService.recordQuizAttempt(tenantScope, deckId, quizId, attemptData);
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });
        const quiz = deck.savedQuizzes.id(quizId);
        if (!quiz) {
            throw AppError.notFound('Quiz salvato');
        }

        if (!Array.isArray(quiz.attempts)) {
            quiz.attempts = [];
        }

        // Cap at 100 attempts
        if (quiz.attempts.length >= 100) {
            quiz.attempts.shift();
        }

        quiz.attempts.push({
            score: attemptData.score,
            accuracy: attemptData.accuracy,
            timeSeconds: attemptData.timeSeconds || 0,
            completedAt: new Date(),
            wrongQuestionIndices: attemptData.wrongQuestionIndices || [],
        });

        await deck.save();

        const saved = quiz.attempts[quiz.attempts.length - 1];
        return {
            id: saved._id?.toString(),
            score: saved.score,
            accuracy: saved.accuracy,
            timeSeconds: saved.timeSeconds,
            completedAt: saved.completedAt,
        };
    },

    async getExamSavedQuizzes(tenantScope, examId) {
        await this._validateExamOwnership(tenantScope, examId);

        const decks = await this.find(tenantScope, { examId }, {
            select: '_id title examId savedQuizzes',
            // TODO: Add compound index { examId: 1, updatedAt: -1 } to Deck model
            // Currently sorts by updatedAt without index support, causing full scan
            sort: { updatedAt: -1 },
            limit: 100,
        });

        const savedQuizzes = [];

        for (const deck of decks) {
            const deckId = deck._id.toString();
            const deckTitle = deck.title;
            const normalizedExamId = deck.examId ? deck.examId.toString() : examId;
            const deckSavedQuizzes = Array.isArray(deck.savedQuizzes) ? deck.savedQuizzes : [];

            for (const quiz of deckSavedQuizzes) {
                const attempts = Array.isArray(quiz?.attempts) ? quiz.attempts : [];
                const scores = attempts.map(a => a.score).filter(score => typeof score === 'number');
                savedQuizzes.push({
                    id: quiz?._id?.toString(),
                    deckId,
                    deckTitle,
                    examId: normalizedExamId,
                    name: typeof quiz?.name === 'string' ? quiz.name : '',
                    quizType: this._normalizeQuizType(quiz?.quizType),
                    questionCount: this._toNumber(quiz?.questionCount, 0),
                    sourceCardIds: Array.isArray(quiz?.sourceCardIds)
                        ? quiz.sourceCardIds.map(id => String(id).trim()).filter(Boolean)
                        : [],
                    source: this._normalizeQuizSnapshotSource(quiz?.source),
                    createdAt: quiz?.createdAt || null,
                    attemptCount: attempts.length,
                    lastScore: scores.length > 0 ? scores[scores.length - 1] : undefined,
                    bestScore: scores.length > 0 ? Math.max(...scores) : undefined,
                    hasQuestions: Boolean(quiz?.quizRefId) || (Array.isArray(quiz?.questions) && quiz.questions.length > 0),
                });
            }
        }

        return savedQuizzes.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    },

    _serializeDeck(deck) {
        if (deck.toJSON) {
            return deck.toJSON();
        }
        return deck.toObject ? deck.toObject() : deck;
    },

    /**
     * Resetta i distrattori AI di tutte le card di un deck.
     * Svuota distractors, distractorExplanations, quizAnswerVariant e resetta aiDistractorsFailed.
     * Alla prossima sessione quiz verranno rigenerati con il nuovo modello/prompt.
     */
    async resetDistractors(tenantScope, deckId) {
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        let resetCount = 0;
        for (const card of deck.cards) {
            if (card.distractors?.length > 0 || card.aiDistractorsFailed || card.distractorPromptVersion) {
                card.distractors = [];
                card.distractorExplanations = [];
                card.quizAnswerVariant = undefined;
                card.aiDistractorsFailed = false;
                card.distractorPromptVersion = '';
                resetCount++;
            }
        }

        if (resetCount > 0) {
            await deck.save();
        }

        return {
            deckId,
            totalCards: deck.cards.length,
            resetCards: resetCount,
            message: `${resetCount} card resettate. I distrattori verranno rigenerati alla prossima sessione quiz.`,
        };
    },
};
