/**
 * 📝 STUDY SERVICE - Review Logic & Exam Progress
 * =================================================
 * Answer verification, session completion, SM-2 review, exam progress.
 */

const AppError = require('../../utils/AppError');
const { checkAnswerSimilarity } = require('../../utils/stringAnalysis');
const { AlgorithmFactory } = require('../spacedRepetitionAlgorithms');
const logger = require('../../utils/logger');
const { isSyntheticQuizCardId } = require('./syntheticQuizIds');

module.exports = {

    // =========================================
    // TYPING MODE
    // =========================================

    async verifyAnswer(tenantScope, deckId, cardId, userAnswer) {
        if (!userAnswer || typeof userAnswer !== 'string') {
            throw AppError.validation('La risposta e\' obbligatoria');
        }

        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Card');
        }

        return {
            isCorrect: checkAnswerSimilarity(userAnswer, card.back),
        };
    },

    // =========================================
    // SESSION COMPLETE
    // =========================================

    async completeSession(tenantScope, deckId, sessionData = {}) {
        await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        const stats = sessionData?.stats && typeof sessionData.stats === 'object'
            ? sessionData.stats
            : {};
        const mode = typeof sessionData?.mode === 'string'
            ? sessionData.mode.toLowerCase()
            : 'flashcard';

        const correctCount = this._toNumber(stats.correct ?? stats.correctCount, 0);
        const wrongCount = this._toNumber(stats.wrong ?? stats.wrongCount, 0);
        const timeSpentSeconds = this._toNumber(stats.timeSeconds ?? stats.timeSpentSeconds, 0);
        const totalCards = this._toNumber(stats.totalCards, correctCount + wrongCount);

        const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
        const avgTimePerCard = totalCards > 0 ? (timeSpentSeconds * 1000) / totalCards : 0;

        const metadata = {
            correctCount,
            wrongCount,
            timeSpentSeconds,
            totalCards,
            deckId,
            mode,
            accuracy,
            avgTimePerCard,
        };

        return {
            stats: metadata,
        };
    },

    // =========================================
    // EXAM PROGRESS (Pause/Resume)
    // =========================================

    async saveExamProgress(tenantScope, deckId, progressData = {}) {
        if (!progressData || typeof progressData !== 'object') {
            throw AppError.validation('Dati di progresso non validi');
        }

        const examProgress = {
            examConfig: progressData.examConfig || {},
            currentCardIndex: this._toNumber(progressData.currentCardIndex, 0),
            stats: {
                hard: this._toNumber(progressData.stats?.hard, 0),
                good: this._toNumber(progressData.stats?.good, 0),
                easy: this._toNumber(progressData.stats?.easy, 0),
            },
            elapsedSeconds: this._toNumber(progressData.elapsedSeconds, 0),
            answers: Array.isArray(progressData.answers) ? progressData.answers : [],
            sessionCardIds: Array.isArray(progressData.sessionCardIds) ? progressData.sessionCardIds : [],
            pausedAt: new Date(),
        };

        const deck = await this.update(tenantScope, deckId, { examProgress });

        logger.debug('ReviewLogic', `Exam progress saved for deck ${deckId}`);

        return {
            success: true,
            message: 'Progresso esame salvato',
            pausedAt: examProgress.pausedAt,
        };
    },

    async getExamProgress(tenantScope, deckId) {
        const deck = await this.findById(tenantScope, deckId, { select: 'examProgress', throwIfNotFound: true });

        if (!deck.examProgress) {
            return null;
        }

        return deck.examProgress;
    },

    async clearExamProgress(tenantScope, deckId) {
        await this.update(tenantScope, deckId, { examProgress: null });

        logger.debug('ReviewLogic', `Exam progress cleared for deck ${deckId}`);

        return {
            success: true,
            message: 'Progresso esame cancellato',
        };
    },

    // =========================================
    // SM-2 REVIEW LOGIC
    // =========================================

    async processCardReview(tenantScope, deckId, cardId, rating, sessionMeta = null) {
        const quality = Number(rating);

        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw AppError.validation('Il rating deve essere un numero tra 1 e 5');
        }

        // Card generate da AI: nessun ID MongoDB reale, skip SRS tracking.
        if (isSyntheticQuizCardId(cardId)) {
            return { skipped: true, reason: 'ai-generated' };
        }

        // Carica solo i dati necessari (non l'intero deck) per calcolare SRS
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });
        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Card');
        }

        const algorithmName = deck.algorithm || 'sm2';
        const algorithmResult = AlgorithmFactory.processReview(card, quality, algorithmName);

        const newReviewEntry = {
            date: new Date(),
            rating: quality,
            interval: algorithmResult.interval,
            easinessFactor: algorithmResult.easinessFactor || card.easinessFactor,
            repetitions: algorithmResult.repetitions,
            algorithm: algorithmName,
        };

        const effectiveEF = algorithmResult.easinessFactor !== undefined
            ? algorithmResult.easinessFactor : card.easinessFactor;
        const status = this._resolveCardStatus({
            quality,
            repetitions: algorithmResult.repetitions,
            interval: algorithmResult.interval,
            card: card,
        });

        // Aggiornamento atomico: solo la carta specifica, non l'intero deck
        const setFields = {
            'cards.$.interval': algorithmResult.interval,
            'cards.$.repetitions': algorithmResult.repetitions,
            'cards.$.nextReviewDate': algorithmResult.nextReviewDate,
            'cards.$.lastReviewed': new Date(),
            'cards.$.status': status,
            'cards.$.easinessFactor': effectiveEF,
        };
        if (algorithmResult.stability !== undefined) setFields['cards.$.stability'] = algorithmResult.stability;
        if (algorithmResult.box !== undefined) setFields['cards.$.box'] = algorithmResult.box;
        if (algorithmResult.difficulty !== undefined) setFields['cards.$.difficulty'] = algorithmResult.difficulty;

        const secureFilter = this._buildFilter(tenantScope, { _id: deckId, 'cards._id': cardId });
        await this.Model.findOneAndUpdate(
            secureFilter,
            {
                $set: setFields,
                $push: { 'cards.$.reviewHistory': { $each: [newReviewEntry], $slice: -50 } },
            }
        );

        card.interval = algorithmResult.interval;
        card.repetitions = algorithmResult.repetitions;
        card.nextReviewDate = algorithmResult.nextReviewDate;
        card.lastReviewed = new Date();
        card.status = status;
        card.easinessFactor = effectiveEF;
        if (algorithmResult.stability !== undefined) card.stability = algorithmResult.stability;
        if (algorithmResult.box !== undefined) card.box = algorithmResult.box;
        if (algorithmResult.difficulty !== undefined) card.difficulty = algorithmResult.difficulty;
        const updatedCard = this._serializeCard(card);

        return {
            card: updatedCard,
            stats: {
                rating: quality,
                easinessFactor: updatedCard.easinessFactor,
                interval: algorithmResult.interval,
                repetitions: algorithmResult.repetitions,
                status,
                nextReviewDate: algorithmResult.nextReviewDate,
                nextReviewInDays: algorithmResult.interval,
            },
        };
    },
};
