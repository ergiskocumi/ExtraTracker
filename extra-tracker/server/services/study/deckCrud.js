/**
 * 🗂️ STUDY SERVICE - Deck CRUD Operations
 * ==========================================
 * Create, Read, Update, Delete for decks and cards.
 */

const Deck = require('../../models/Deck');
const Exam = require('../../models/Exam');
const AppError = require('../../utils/AppError');
const { DEFAULT_EASINESS_FACTOR } = require('./constants');
const logger = require('../../utils/logger');

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
        const userId = this._getUserId(tenantScope);
        const { front, back } = cardData;
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card e\' obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card e\' obbligatorio');
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        deck.cards.push({
            front: normalizedFront,
            back: normalizedBack,
            quizAnswerVariant: '',
            distractors: [],
            aiDistractorsFailed: false,
        });
        await deck.save();

        return deck;
    },

    async updateCard(tenantScope, deckId, cardId, { front, back }) {
        const userId = this._getUserId(tenantScope);
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card e\' obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card e\' obbligatorio');
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Carta');
        }

        card.front = normalizedFront;
        card.back = normalizedBack;
        await deck.save();

        return deck;
    },

    async updateCardAnswer(tenantScope, deckId, cardId, answer) {
        const userId = this._getUserId(tenantScope);
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

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Carta');
        }

        card.back = normalizedAnswer;
        await deck.save();

        return deck;
    },

    async deleteCard(tenantScope, deckId, cardId) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOneAndUpdate(
            { _id: deckId, user: userId },
            { $pull: { cards: { _id: cardId } } },
            { new: true }
        );

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        return deck;
    },

    async reorderCards(tenantScope, deckId, cardIds) {
        const userId = this._getUserId(tenantScope);

        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            throw AppError.validation('Devi fornire un array di card IDs valido');
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

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
        const userId = this._getUserId(tenantScope);
        const { front, back, position } = cardData;
        const normalizedFront = typeof front === 'string' ? front.trim() : '';
        const normalizedBack = typeof back === 'string' ? back.trim() : '';

        if (!normalizedFront) {
            throw AppError.validation('Il fronte della card è obbligatorio');
        }
        if (!normalizedBack) {
            throw AppError.validation('Il retro della card è obbligatorio');
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

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
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

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
                const Folder = require('../../models/Folder');
                const folder = await Folder.findOne({ _id: updates.folderId, user: userId });
                if (!folder) {
                    throw AppError.notFound('Cartella non trovata');
                }
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
                const exam = await Exam.findOne({ _id: updates.examId, user: userId });
                if (!exam) {
                    throw AppError.notFound('Esame non trovato');
                }
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

        const savedDeck = await Deck.findOne({ _id: deck._id, user: userId });
        if (!savedDeck) {
            throw AppError.notFound('Mazzo non trovato dopo il salvataggio');
        }

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
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

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
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        await this._ensureDeckPdfUrlIntegrity(deck);

        return deck.toJSON();
    },

    async saveQuizSnapshot(tenantScope, deckId, payload = {}) {
        const userId = this._getUserId(tenantScope);
        const deck = await Deck.findOne({ _id: deckId, user: userId });

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const cardIdSet = new Set(
            (deck.cards || []).map(card => card?._id?.toString()).filter(Boolean)
        );
        const sourceCardIds = Array.isArray(payload.sourceCardIds)
            ? [...new Set(payload.sourceCardIds
                .map(id => String(id || '').trim())
                .filter(id => id.length > 0 && cardIdSet.has(id)))]
            : [];

        const isAiGeneratedQuiz = sourceCardIds.length === 0 &&
            Array.isArray(payload.sourceCardIds) &&
            payload.sourceCardIds.some(id => String(id).startsWith('quiz_ai_'));

        if (sourceCardIds.length === 0 && !isAiGeneratedQuiz) {
            throw AppError.validation('Impossibile salvare il quiz: nessuna flashcard valida associata');
        }

        const questionCountRaw = this._toNumber(
            payload.questionCount,
            isAiGeneratedQuiz ? payload.questionCount : sourceCardIds.length,
        );
        const questionCount = Math.max(
            1,
            Math.min(sourceCardIds.length, Math.round(questionCountRaw > 0 ? questionCountRaw : sourceCardIds.length))
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

    async getExamSavedQuizzes(tenantScope, examId) {
        const userId = this._getUserId(tenantScope);
        await this._validateExamOwnership(tenantScope, examId);

        const decks = await Deck.find({ user: userId, examId })
            .select('_id title examId savedQuizzes')
            .sort({ updatedAt: -1 });

        const savedQuizzes = [];

        for (const deck of decks) {
            const deckId = deck._id.toString();
            const deckTitle = deck.title;
            const normalizedExamId = deck.examId ? deck.examId.toString() : examId;
            const deckSavedQuizzes = Array.isArray(deck.savedQuizzes) ? deck.savedQuizzes : [];

            for (const quiz of deckSavedQuizzes) {
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
        const deck = await Deck.findOne({
            _id: deckId,
            ...tenantScope,
        });

        if (!deck) {
            throw AppError.notFound('Deck non trovato');
        }

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
