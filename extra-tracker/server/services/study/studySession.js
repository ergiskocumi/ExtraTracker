/**
 * 📚 STUDY SERVICE - Study Session & Card Selection
 * ===================================================
 * Session creation, card selection, difficulty filtering.
 */

const Deck = require('../../models/Deck');
const AppError = require('../../utils/AppError');
const { MIN_QUIZ_CARDS_REQUIRED, QUIZ_TYPES, DEFAULT_EASINESS_FACTOR, MIN_EASINESS_FACTOR } = require('./constants');

module.exports = {

    // =========================================
    // STUDY SESSION
    // =========================================

    async getStudySession(tenantScope, deckId, options = {}) {
        const userId = this._getUserId(tenantScope);
        const config = typeof options === 'string' ? { mode: options } : (options || {});

        const deck = await Deck.findOne({
            _id: deckId,
            user: userId,
        }).select('+extractedText +recentQuizQuestions');

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        await this._ensureDeckPdfUrlIntegrity(deck);

        const deckJson = deck.toJSON();
        const cards = Array.isArray(deckJson.cards) ? deckJson.cards : [];
        const now = new Date();

        const mode = this._normalizeStudyMode(config.mode);
        const normalizedFocus = this._normalizeSessionFocus(config.focus);
        const focus = mode === 'exam' ? 'all' : mode === 'focus' ? 'weak' : normalizedFocus;
        const direction = this._normalizeSessionDirection(config.direction);
        const requestedLimit = this._toNumber(config.limit, 0);
        const requestedQuestions = this._toNumber(config.questionCount, 0);
        const timeLimitMinutes = this._toNumber(config.timeLimitMinutes, 0);

        // Exam-specific configuration
        const examType = config.examType && typeof config.examType === 'string' ? config.examType.toLowerCase() : undefined;
        const examDifficulty = config.examDifficulty && typeof config.examDifficulty === 'string' ? config.examDifficulty.toLowerCase() : undefined;
        const quizType = this._normalizeQuizType(config.quizType);
        const sourceCardIds = Array.isArray(config.sourceCardIds)
            ? config.sourceCardIds.map(id => String(id).trim()).filter(Boolean)
            : [];

        const sourceCardIdSet = new Set(sourceCardIds);
        const scopedQuizCards = mode === 'quiz' && sourceCardIds.length > 0
            ? cards.filter(card => sourceCardIdSet.has(this._resolveCardId(card)))
            : cards;

        // DEBUG: Log exam configuration
        if (mode === 'exam') {
            console.log(`[StudyService.getStudySession] EXAM MODE ACTIVATED`);
            console.log(`[StudyService.getStudySession] examType: ${examType || 'NOT SET'}`);
            console.log(`[StudyService.getStudySession] examDifficulty: ${examDifficulty || 'NOT SET'}`);
            console.log(`[StudyService.getStudySession] Total cards in deck: ${cards.length}`);
            console.log(`[StudyService.getStudySession] questionCount: ${requestedQuestions}`);
        }

        if (mode === 'quiz' && sourceCardIds.length > 0 && scopedQuizCards.length === 0) {
            throw AppError.validation('Nessuna flashcard valida per il quiz richiesto');
        }

        const isMultipleChoiceQuiz = mode === 'quiz' && quizType !== QUIZ_TYPES.TRUE_FALSE;
        if (isMultipleChoiceQuiz) {
            if (!(deck.extractedText || '').trim()) {
                throw AppError.validation('Quiz AI non disponibile: carica un PDF per abilitare questa modalità.');
            }
        } else if (mode === 'quiz' && sourceCardIds.length === 0 && cards.length < MIN_QUIZ_CARDS_REQUIRED) {
            throw AppError.validation('Crea almeno 10 flashcard per sbloccare la generazione del quiz');
        }

        const availableCards = mode === 'quiz' ? scopedQuizCards : cards;

        const dueCards = cards.filter(card => {
            const nextReview = new Date(card.nextReviewDate);
            return nextReview <= now;
        });

        const defaultLimit = this._getDefaultSessionLimit(mode);
        const requestedQuestionLimit = (mode === 'exam' || mode === 'quiz') && requestedQuestions > 0
            ? requestedQuestions
            : 0;
        const sessionLimit = Math.min(
            requestedLimit > 0
                ? requestedLimit
                : requestedQuestionLimit > 0
                    ? requestedQuestionLimit
                    : defaultLimit,
            availableCards.length
        );

        const sessionCards = mode === 'quiz'
            ? this._sampleCardsWithoutReplacement(availableCards, sessionLimit || availableCards.length)
            : this._selectSessionCards({
                cards: availableCards,
                dueCards,
                mode,
                focus,
                limit: sessionLimit,
                now,
                examDifficulty,
            });

        const cardModes = this._buildCardModes(mode, sessionCards, examType);

        // PDF-based AI quiz: genera le domande dal testo estratto e ritorna subito
        if (isMultipleChoiceQuiz) {
            const questionCount = requestedQuestions > 0 ? requestedQuestions
                : requestedLimit > 0 ? requestedLimit
                    : 10;
            const previousQuestions = Array.isArray(deck.recentQuizQuestions)
                ? deck.recentQuizQuestions.slice(-50)
                : [];
            const aiQuestions = await this.generateQuizFromFullPDF(
                deck.extractedText || '',
                questionCount,
                previousQuestions,
                {
                    userId,
                    deckId: deck._id,
                }
            );
            const enrichedCards = this._mapAiQuestionsToCards(aiQuestions);

            const newQuestionTexts = aiQuestions.map(q => q.questionText);
            setImmediate(() => {
                Deck.updateOne(
                    { _id: deck._id },
                    { $push: { recentQuizQuestions: { $each: newQuestionTexts, $slice: -50 } } },
                ).catch(() => {});
            });

            this._logQuizDebug('session-ai-quiz', {
                deckId: deck._id.toString(),
                questionCount: enrichedCards.length,
                textLength: (deck.extractedText || '').length,
            });

            return {
                deck: { ...deckJson, totalCards: cards.length, dueCount: dueCards.length },
                cards: enrichedCards,
                remaining: enrichedCards.length,
                total: enrichedCards.length,
                mode,
                cardModes: {},
                meta: {
                    focus: 'all',
                    limit: enrichedCards.length,
                    timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : undefined,
                    questionCount: enrichedCards.length,
                    direction: undefined,
                    quizType,
                },
            };
        }

        const allAnswers = cards
            .map(card => card.back)
            .filter(answer => typeof answer === 'string' && answer.trim().length > 0);

        // True/false quiz e tutti gli altri modi usano ancora la selezione flashcard
        let enrichedCards = sessionCards.map(card => card);

        if (mode === 'quiz') {
            const sample = enrichedCards
                .slice(0, 5)
                .map(card => ({
                    cardId: this._resolveCardId(card),
                    words: this._countWords(card?.back || ''),
                    options: this._getOptionMetrics(card?.options || []),
                }));
            this._logQuizDebug('session-options-sample', {
                deckId: deck._id.toString(),
                totalCards: enrichedCards.length,
                sample,
            });
        }

        // Se examType è 'true_false', trasforma le carte in formato Vero/Falso
        if ((mode === 'quiz' && quizType === QUIZ_TYPES.TRUE_FALSE) || examType === 'true_false') {
            console.log(`[StudyService.getStudySession] Transforming cards to TRUE/FALSE format`);
            enrichedCards = this._transformToTrueFalse(enrichedCards, allAnswers);
        }

        return {
            deck: {
                ...deckJson,
                totalCards: cards.length,
                dueCount: dueCards.length,
            },
            cards: enrichedCards,
            remaining: sessionCards.length,
            total: availableCards.length,
            mode,
            cardModes,
            meta: {
                focus,
                limit: sessionLimit || availableCards.length,
                timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : undefined,
                questionCount: mode === 'exam' || mode === 'quiz' ? sessionLimit : undefined,
                direction,
                quizType: mode === 'quiz' ? quizType : undefined,
            },
        };
    },

    // =========================================
    // DASHBOARD
    // =========================================

    async getAllDecks(tenantScope) {
        const userId = this._getUserId(tenantScope);
        const now = new Date();

        const decks = await Deck.find({ user: userId })
            .sort({ createdAt: -1 });

        let totalDueCount = 0;

        const normalizedDecks = decks.map(deck => {
            const deckJson = deck.toJSON();
            const cards = Array.isArray(deckJson.cards) ? deckJson.cards : [];

            const dueCards = cards.filter(card => {
                const nextReview = new Date(card.nextReviewDate);
                return nextReview <= now;
            });

            totalDueCount += dueCards.length;

            return {
                ...deckJson,
                totalCards: cards.length,
                dueCount: dueCards.length,
            };
        });

        return {
            decks: normalizedDecks,
            dueCardCount: totalDueCount,
        };
    },

    async getDueCards(tenantScope) {
        const userId = this._getUserId(tenantScope);
        const now = new Date();

        const decks = await Deck.find({
            user: userId,
            'cards.nextReviewDate': { $lte: now },
        }).sort({ 'cards.nextReviewDate': 1 });

        return decks.map(deck => {
            const deckJson = deck.toJSON();
            const dueCards = deckJson.cards.filter(card => {
                const nextReview = new Date(card.nextReviewDate);
                return nextReview <= now;
            });

            return {
                ...deckJson,
                cards: dueCards,
                dueCount: dueCards.length,
            };
        });
    },

    // =========================================
    // SESSION CARD SELECTION HELPERS
    // =========================================

    _calculateCardDifficulty(card, now) {
        const ease = Number.isFinite(Number(card?.easinessFactor)) ? Number(card.easinessFactor) : 2.5;
        const interval = Number.isFinite(Number(card?.interval)) ? Number(card.interval) : 0;
        const repetitions = Number.isFinite(Number(card?.repetitions)) ? Number(card.repetitions) : 0;
        const status = typeof card?.status === 'string' ? card.status : 'review';

        const nowTs = now instanceof Date ? now.getTime() : Date.now();
        const nextReviewTs = card?.nextReviewDate ? new Date(card.nextReviewDate).getTime() : 0;
        const overdueDays = nextReviewTs > 0 ? Math.max(0, (nowTs - nextReviewTs) / 86400000) : 0;

        const easePenalty = Math.max(0, 2.6 - ease) * 1.2;
        const intervalPenalty = interval > 0 ? Math.min(1.2, 1 / interval) : 0.9;
        const repetitionPenalty = repetitions < 2 ? 0.8 : repetitions < 4 ? 0.4 : 0;
        const statusBonus = status === 'learning' ? 0.6 : status === 'new' ? 0.4 : 0;
        const overdueBonus = Math.min(2, overdueDays * 0.15);

        return easePenalty + intervalPenalty + repetitionPenalty + statusBonus + overdueBonus;
    },

    _buildSmartSelection(cards, dueCards, now) {
        const sortedDue = [...dueCards].sort((a, b) => {
            const aTime = new Date(a.nextReviewDate).getTime();
            const bTime = new Date(b.nextReviewDate).getTime();
            return aTime - bTime;
        });
        const dueIds = new Set(sortedDue.map(card => this._resolveCardId(card)));
        const remaining = cards.filter(card => !dueIds.has(this._resolveCardId(card)));
        const scored = remaining
            .map(card => ({ card, score: this._calculateCardDifficulty(card, now) }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.card);
        return [...sortedDue, ...scored];
    },

    _buildExamSelection(cards, limit) {
        const buckets = {
            new: [],
            learning: [],
            review: [],
            mastered: [],
        };

        for (const card of cards) {
            const status = typeof card.status === 'string' ? card.status : 'review';
            if (buckets[status]) {
                buckets[status].push(card);
            } else {
                buckets.review.push(card);
            }
        }

        const order = [
            { key: 'learning', weight: 3 },
            { key: 'review', weight: 3 },
            { key: 'new', weight: 2 },
            { key: 'mastered', weight: 1 },
        ];

        const shuffledBuckets = Object.fromEntries(
            Object.entries(buckets).map(([key, items]) => [key, this._shuffleArray(items)])
        );

        const selection = [];
        let progressMade = true;

        while (selection.length < limit && progressMade) {
            progressMade = false;
            for (const bucket of order) {
                for (let i = 0; i < bucket.weight; i += 1) {
                    if (selection.length >= limit) break;
                    const items = shuffledBuckets[bucket.key];
                    if (items.length > 0) {
                        selection.push(items.pop());
                        progressMade = true;
                    }
                }
                if (selection.length >= limit) break;
            }
        }

        if (selection.length < limit) {
            const selectedIds = new Set(selection.map(card => this._resolveCardId(card)));
            const remaining = cards.filter(card => !selectedIds.has(this._resolveCardId(card)));
            const filler = this._shuffleArray(remaining);
            for (const card of filler) {
                if (selection.length >= limit) break;
                selection.push(card);
            }
        }

        return selection;
    },

    _buildCardModes(mode, cards, examType) {
        if (mode !== 'mix' && mode !== 'exam') return undefined;

        let cycle;

        if (mode === 'exam' && examType) {
            console.log(`[StudyService._buildCardModes] EXAM MODE with examType=${examType}`);
            switch (examType) {
                case 'quiz_initial':
                    cycle = ['quiz'];
                    break;
                case 'full_mixed':
                    cycle = ['quiz', 'quiz', 'quiz', 'quiz', 'quiz', 'typing', 'typing', 'typing', 'flashcard', 'flashcard'];
                    break;
                case 'true_false':
                    cycle = ['quiz'];
                    console.log(`[StudyService._buildCardModes] WARNING: true_false is not fully implemented, using regular quiz mode`);
                    break;
                case 'mixed':
                default:
                    cycle = ['quiz', 'typing', 'quiz', 'flashcard', 'typing'];
                    break;
            }
            console.log(`[StudyService._buildCardModes] Cycle selected:`, cycle);
        } else {
            cycle = mode === 'exam'
                ? ['quiz', 'typing', 'quiz', 'flashcard', 'typing']
                : ['quiz', 'typing', 'flashcard'];
            console.log(`[StudyService._buildCardModes] Using default cycle for mode=${mode}:`, cycle);
        }

        const cardModes = cards.reduce((acc, card, index) => {
            acc[this._resolveCardId(card)] = cycle[index % cycle.length];
            return acc;
        }, {});

        console.log(`[StudyService._buildCardModes] Generated cardModes for ${cards.length} cards`);
        return cardModes;
    },

    _selectSessionCards({ cards, dueCards, mode, focus, limit, now, examDifficulty }) {
        let selection = [];

        if (mode === 'exam') {
            let examCards = [...cards];

            console.log(`[StudyService._selectSessionCards] EXAM MODE: cards=${cards.length}, limit=${limit}, examDifficulty=${examDifficulty || 'NONE'}`);

            if (examDifficulty) {
                examCards = this._filterCardsByDifficulty(cards, examDifficulty);
                console.log(`[StudyService._selectSessionCards] After difficulty filter: ${examCards.length} cards`);
            }

            selection = this._buildExamSelection(examCards, limit || examCards.length);
            console.log(`[StudyService._selectSessionCards] After _buildExamSelection: ${selection.length} cards selected`);
        } else if (focus === 'due') {
            const sortedDue = [...dueCards].sort((a, b) => {
                const aTime = new Date(a.nextReviewDate).getTime();
                const bTime = new Date(b.nextReviewDate).getTime();
                return aTime - bTime;
            });
            selection = sortedDue.length > 0 ? sortedDue : cards;
        } else if (focus === 'weak') {
            selection = [...cards]
                .map(card => ({ card, score: this._calculateCardDifficulty(card, now) }))
                .sort((a, b) => b.score - a.score)
                .map(item => item.card);
        } else if (focus === 'all') {
            selection = [...cards];
        } else {
            selection = this._buildSmartSelection(cards, dueCards, now);
        }

        const trimmed = limit > 0 ? selection.slice(0, limit) : selection;
        const shouldShuffle = ['quiz', 'mix', 'sprint'].includes(mode) && focus !== 'due';
        return shouldShuffle ? this._shuffleArray(trimmed) : trimmed;
    },

    _calculateSuccessRate(card) {
        const ef = typeof card.easinessFactor === 'number' ? card.easinessFactor : DEFAULT_EASINESS_FACTOR;

        const minEF = MIN_EASINESS_FACTOR;
        const maxEF = DEFAULT_EASINESS_FACTOR;
        const normalizedEF = (ef - minEF) / (maxEF - minEF);
        const successRate = Math.max(0, Math.min(100, normalizedEF * 100));

        return successRate;
    },

    _filterCardsByDifficulty(cards, difficulty) {
        const cardsWithSuccessRate = cards.map(card => ({
            card,
            successRate: this._calculateSuccessRate(card),
        }));

        const successRateStats = {
            easy: cardsWithSuccessRate.filter(item => item.successRate > 80).length,
            medium: cardsWithSuccessRate.filter(item => item.successRate >= 50 && item.successRate <= 80).length,
            hard: cardsWithSuccessRate.filter(item => item.successRate < 50).length,
        };
        console.log(`[StudyService._filterCardsByDifficulty] Total cards: ${cards.length}, Difficulty requested: ${difficulty}`);
        console.log(`[StudyService._filterCardsByDifficulty] Distribution: easy=${successRateStats.easy}, medium=${successRateStats.medium}, hard=${successRateStats.hard}`);

        const sample = cardsWithSuccessRate.slice(0, 5).map(item => ({
            ef: item.card.easinessFactor,
            reps: item.card.repetitions,
            successRate: item.successRate.toFixed(2)
        }));
        console.log(`[StudyService._filterCardsByDifficulty] Sample cards:`, JSON.stringify(sample));

        let filtered;

        switch (difficulty) {
            case 'easy':
                filtered = cardsWithSuccessRate.filter(item => item.successRate > 80);
                break;
            case 'hard':
                filtered = cardsWithSuccessRate.filter(item => item.successRate < 50);
                break;
            case 'medium':
            default:
                filtered = cardsWithSuccessRate.filter(item => item.successRate >= 50 && item.successRate <= 80);
                break;
        }

        console.log(`[StudyService._filterCardsByDifficulty] Filtered result: ${filtered.length} cards`);

        if (filtered.length === 0) {
            console.warn(`[StudyService._filterCardsByDifficulty] Nessuna carta trovata per difficulty=${difficulty}, usando tutte le carte`);
            return cards;
        }

        return filtered.map(item => item.card);
    },

    _sampleCardsWithoutReplacement(cards = [], limit = 0) {
        const source = Array.isArray(cards) ? [...cards] : [];
        if (source.length === 0) return [];

        const requested = Number.isFinite(Number(limit)) ? Number(limit) : source.length;
        const safeLimit = Math.max(0, Math.min(source.length, Math.round(requested)));
        if (safeLimit === 0) return [];

        return this._shuffleArray(source).slice(0, safeLimit);
    },
};
