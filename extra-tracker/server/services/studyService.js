/**
 * 🧠 STUDY SERVICE - Learning & Flashcards (SM-2)
 * ===============================================
 * 
 * 🆕 SMART GENERATION V2 - Miglioramenti chiave:
 * - Micro-chunking semantico (8k invece di 40-50k)
 * - Pre-estrazione concetti per evitare duplicati
 * - Prompt multi-tipo per varietà domande
 * - Deduplica semantica post-generazione
 * - Target dinamico basato su densità contenuto
 *
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const BaseService = require('./BaseService');
const Deck = require('../models/Deck');
const Goal = require('../models/Goal');
const AppError = require('../utils/AppError');
const { checkAnswerSimilarity } = require('../utils/stringAnalysis');
const eventBus = require('../utils/eventBus');
const sseManager = require('../utils/SSEManager');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs/promises');
const path = require('path');
const vectorStoreService = require('./vectorStoreService');
const { AlgorithmFactory } = require('./spacedRepetitionAlgorithms');
const activityService = require('./activityService');

// =========================================
// COSTANTI BASE
// =========================================
const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
const MAX_EXTRACTED_TEXT_STORE_LENGTH = 200000;
const MAX_TUTOR_CONTEXT_LENGTH = 50000;
const MAX_TUTOR_MESSAGE_LENGTH = 2000;
const MAX_TUTOR_HISTORY_MESSAGES = 12;
const MAX_TUTOR_HISTORY_MESSAGE_LENGTH = 1000;
const SESSION_BASE_XP = 10;
const QUIZ_FALLBACK_OPTIONS = [
    'Nessuna delle precedenti',
    'Altro',
    'Non specificato',
    'Informazione non presente',
];

// =========================================
// 🆕 SMART GENERATION V2 - CONFIGURATION
// =========================================

// Micro-chunking: chunk PIÙ PICCOLI = domande PIÙ PRECISE
const MICRO_CHUNK_SIZE = 6000;        // 6k caratteri (era 40-50k!)
const MICRO_CHUNK_OVERLAP = 200;      // Overlap ridotto
const MIN_CHUNK_LENGTH = 400;         // Ignora chunk troppo corti (indici, titoli)

// Target dinamico basato sulla densità del contenuto
const MIN_CARDS_PER_CHUNK = 3;        // Minimo 3 card per chunk
const MAX_CARDS_PER_CHUNK = 12;       // Massimo 12 card per singola chiamata
const MAX_TOTAL_CARDS = 100;          // Cap totale per evitare mazzi enormi

// Deduplica semantica - soglia più aggressiva per rimuovere più duplicati
const SIMILARITY_THRESHOLD = 0.50;    // Soglia Jaccard (più bassa = più aggressiva)

// Tipi di domande con distribuzione
const QUESTION_TYPES = {
    definition: { weight: 2, prompt: 'domande di DEFINIZIONE (Cosa significa/è X?)' },
    explanation: { weight: 2, prompt: 'domande di SPIEGAZIONE (Come funziona X? Perché X?)' },
    causeEffect: { weight: 1.5, prompt: 'domande CAUSA-EFFETTO (Cosa succede se X? Perché X causa Y?)' },
    application: { weight: 1.5, prompt: 'domande di APPLICAZIONE (Come si usa X? In quale caso si applica?)' },
    comparison: { weight: 1, prompt: 'domande di CONFRONTO (Differenza tra X e Y?)' },
    process: { weight: 1, prompt: 'domande su PROCESSI/SEQUENZE (Quali sono i passaggi per X?)' },
};

// =========================================
// CONFIGURAZIONE MODELLO AI
// =========================================
const ACTIVE_AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!global.__studyServiceModelLogged) {
    console.log(`🤖 StudyService usando modello: ${ACTIVE_AI_MODEL}`);
    global.__studyServiceModelLogged = true;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

class StudyService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }

    // =========================================
    // CRUD BASE (invariato)
    // =========================================

    async createDeck(tenantScope, data = {}) {
        const { goalId, title, description, tags } = data;

        if (!goalId) {
            throw AppError.validation('Il goal associato e\' obbligatorio');
        }
        if (!title || typeof title !== 'string') {
            throw AppError.validation('Il titolo del mazzo e\' obbligatorio');
        }

        await this._validateGoalOwnership(tenantScope, goalId);

        return this.create(tenantScope, {
            goalId,
            title,
            description,
            tags,
        });
    }

    async addCard(tenantScope, deckId, cardData = {}) {
        const userId = this._getUserId(tenantScope);
        const { front, back } = cardData;

        if (!front || typeof front !== 'string') {
            throw AppError.validation('Il fronte della card e\' obbligatorio');
        }
        if (!back || typeof back !== 'string') {
            throw AppError.validation('Il retro della card e\' obbligatorio');
        }

        const deck = await Deck.findOneAndUpdate(
            { _id: deckId, user: userId },
            {
                $push: {
                    cards: {
                        front,
                        back,
                    },
                },
            },
            { new: true, runValidators: true }
        );

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        return deck;
    }

    async updateCard(tenantScope, deckId, cardId, { front, back }) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOneAndUpdate(
            {
                _id: deckId,
                user: userId,
                'cards._id': cardId,
            },
            {
                $set: {
                    'cards.$.front': front,
                    'cards.$.back': back,
                },
            },
            { new: true, runValidators: true }
        );

        if (!deck) {
            throw AppError.notFound('Mazzo o carta');
        }

        return deck;
    }

    async deleteCard(tenantScope, deckId, cardId) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOneAndUpdate(
            {
                _id: deckId,
                user: userId,
            },
            {
                $pull: {
                    cards: { _id: cardId },
                },
            },
            { new: true }
        );

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        return deck;
    }

    /**
     * Riordina le card di un mazzo
     * @param {object} tenantScope - Scope del tenant
     * @param {string} deckId - ID del mazzo
     * @param {string[]} cardIds - Array di card IDs nell'ordine desiderato
     * @returns {Promise<object>} - Deck aggiornato
     */
    async reorderCards(tenantScope, deckId, cardIds) {
        const userId = this._getUserId(tenantScope);

        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            throw AppError.validation('Devi fornire un array di card IDs valido');
        }

        // Recupera il deck corrente
        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        // Verifica che tutti i cardIds esistano nel deck
        const existingCardIds = deck.cards.map(card => card._id.toString());
        const invalidIds = cardIds.filter(id => !existingCardIds.includes(id));
        if (invalidIds.length > 0) {
            throw AppError.validation(`Card IDs non validi: ${invalidIds.join(', ')}`);
        }

        // Verifica che tutti i cardIds del deck siano presenti nell'array fornito
        if (cardIds.length !== existingCardIds.length) {
            throw AppError.validation('Devi fornire tutti i card IDs del mazzo');
        }

        // Crea una mappa per accesso rapido alle card
        const cardMap = new Map();
        deck.cards.forEach(card => {
            cardMap.set(card._id.toString(), card.toObject());
        });

        // Riordina le card secondo l'ordine fornito
        const reorderedCards = cardIds.map(id => cardMap.get(id));

        // Aggiorna il deck con le card riordinate
        deck.cards = reorderedCards;
        await deck.save();

        return deck;
    }

    /**
     * Aggiunge una card in una posizione specifica
     * @param {object} tenantScope - Scope del tenant
     * @param {string} deckId - ID del mazzo
     * @param {object} cardData - Dati della card (front, back, position)
     * @param {string} cardData.front - Fronte della card
     * @param {string} cardData.back - Retro della card
     * @param {number} cardData.position - Posizione dove inserire (0-based, opzionale, default: fine)
     * @returns {Promise<object>} - Deck aggiornato
     */
    async addCardAtPosition(tenantScope, deckId, cardData = {}) {
        const userId = this._getUserId(tenantScope);
        const { front, back, position } = cardData;

        if (!front || typeof front !== 'string') {
            throw AppError.validation('Il fronte della card è obbligatorio');
        }
        if (!back || typeof back !== 'string') {
            throw AppError.validation('Il retro della card è obbligatorio');
        }

        // Recupera il deck corrente
        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        // Crea la nuova card
        const newCard = {
            front: front.trim(),
            back: back.trim(),
        };

        // Se position è specificato, inserisci in quella posizione
        if (typeof position === 'number' && position >= 0 && position <= deck.cards.length) {
            deck.cards.splice(position, 0, newCard);
        } else {
            // Altrimenti aggiungi alla fine
            deck.cards.push(newCard);
        }

        await deck.save();

        return deck;
    }

    async deleteDeck(tenantScope, deckId) {
        return this.delete(tenantScope, deckId);
    }

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
            // Normalizza e limita a 5 tag
            const normalized = updates.tags
                .map(tag => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
                .filter(tag => tag.length > 0)
                .slice(0, 5);
            deck.tags = [...new Set(normalized)]; // Rimuove duplicati
        }
        if (updates.folderId !== undefined) {
            console.log('[StudyService] updateDeck: Updating folderId', {
                currentFolderId: deck.folderId ? deck.folderId.toString() : null,
                newFolderId: updates.folderId,
            });
            
            // Verifica che la cartella esista e appartenga all'utente (se non è null)
            if (updates.folderId !== null && updates.folderId !== '') {
                const Folder = require('../models/Folder');
                const folder = await Folder.findOne({ _id: updates.folderId, user: userId });
                if (!folder) {
                    throw AppError.notFound('Cartella non trovata');
                }
                deck.folderId = updates.folderId;
                console.log('[StudyService] updateDeck: Folder verified, setting folderId');
            } else {
                // Se folderId è null o stringa vuota, rimuovi il riferimento
                deck.folderId = null;
                console.log('[StudyService] updateDeck: Setting folderId to null');
            }
        }
        
        // Gestione del cambio di esame (goalId)
        if (updates.goalId !== undefined) {
            console.log('[StudyService] updateDeck: Updating goalId', {
                currentGoalId: deck.goalId ? deck.goalId.toString() : null,
                newGoalId: updates.goalId,
            });
            
            // Verifica che l'esame (goal) esista e appartenga all'utente (se non è null)
            if (updates.goalId !== null && updates.goalId !== '') {
                const Goal = require('../models/Goal');
                const goal = await Goal.findOne({ _id: updates.goalId, user: userId });
                if (!goal) {
                    throw AppError.notFound('Esame non trovato');
                }
                // Verifica che sia un esame (category === 'learning')
                if (goal.category !== 'learning') {
                    throw AppError.badRequest('Il goal selezionato non è un esame (category deve essere "learning")');
                }
                deck.goalId = updates.goalId;
                console.log('[StudyService] updateDeck: Goal verified, setting goalId');
            } else {
                // Se goalId è null o stringa vuota, non possiamo rimuoverlo perché è required
                // Ma possiamo permettere di cambiarlo con un altro esame
                throw AppError.badRequest('Un mazzo deve essere associato a un esame. Seleziona un esame valido.');
            }
        }

        await deck.save();
        console.log('[StudyService] updateDeck: Deck saved', {
            deckId: deck._id.toString(),
            folderId: deck.folderId ? deck.folderId.toString() : null,
        });
        
        // Ricarica dal DB per essere sicuri
        const savedDeck = await Deck.findOne({ _id: deck._id, user: userId });
        if (!savedDeck) {
            throw AppError.notFound('Mazzo non trovato dopo il salvataggio');
        }
        
        console.log('[StudyService] updateDeck: Reloaded from DB', {
            deckId: savedDeck._id.toString(),
            folderId: savedDeck.folderId ? savedDeck.folderId.toString() : null,
        });
        
        const serialized = this._serializeDeck(savedDeck);
        console.log('[StudyService] updateDeck: Serialized deck', {
            id: serialized.id,
            folderId: serialized.folderId,
        });
        
        return serialized;
    }

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
    }

    async getDeckAnalytics(tenantScope, deckId) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const cards = Array.isArray(deck.cards) ? deck.cards : [];
        const now = new Date();

        const stats = {
            totalCards: cards.length,
            newCards: cards.filter(c => c.status === 'new').length,
            learningCards: cards.filter(c => c.status === 'learning').length,
            reviewCards: cards.filter(c => c.status === 'review').length,
            masteredCards: cards.filter(c => c.status === 'mastered').length,
            dueCards: cards.filter(c => {
                const nextReview = new Date(c.nextReviewDate);
                return nextReview <= now;
            }).length,
            averageEasinessFactor: cards.length > 0
                ? cards.reduce((sum, c) => sum + (c.easinessFactor || 2.5), 0) / cards.length
                : 2.5,
            averageRepetitions: cards.length > 0
                ? cards.reduce((sum, c) => sum + (c.repetitions || 0), 0) / cards.length
                : 0,
        };

        const analytics = deck.analytics || {
            totalReviews: 0,
            averageTimePerCard: 0,
            retentionRate: 0,
            lastStudied: null,
            studyStreak: 0,
        };

        return {
            stats,
            analytics: {
                totalReviews: analytics.totalReviews || 0,
                averageTimePerCard: analytics.averageTimePerCard || 0,
                retentionRate: analytics.retentionRate || 0,
                retentionRatePercent: Math.round((analytics.retentionRate || 0) * 100),
                lastStudied: analytics.lastStudied,
                studyStreak: analytics.studyStreak || 0,
            },
            algorithm: deck.algorithm || 'sm2',
            aiSettings: deck.aiSettings || {
                style: 'comprehensive',
                difficulty: 'medium',
                questionTypes: ['definition', 'concept', 'relationship'],
            },
        };
    }

    async getDeckById(tenantScope, deckId) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({
            _id: deckId,
            user: userId,
        });

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        return deck.toJSON();
    }

    _serializeDeck(deck) {
        // Converti deck Mongoose a plain object se necessario
        const deckObj = deck.toObject ? deck.toObject() : deck;
        return deck.toJSON();
    }

    // =========================================
    // STUDY SESSION (invariato)
    // =========================================

    async getStudySession(tenantScope, deckId, mode = 'flashcard') {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({
            _id: deckId,
            user: userId,
        });

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const deckJson = deck.toJSON();
        const cards = Array.isArray(deckJson.cards) ? deckJson.cards : [];
        const now = new Date();

        const dueCards = cards.filter(card => {
            const nextReview = new Date(card.nextReviewDate);
            return nextReview <= now;
        });

        const sessionCards = dueCards.length > 0 ? dueCards : cards;

        let enrichedCards = sessionCards;
        if (mode === 'quiz') {
            const allAnswers = cards
                .map(card => card.back)
                .filter(answer => typeof answer === 'string' && answer.trim().length > 0);

            enrichedCards = sessionCards.map(card => ({
                ...card,
                options: this._buildQuizOptions(card.back, allAnswers),
            }));
        }

        return {
            deck: {
                ...deckJson,
                totalCards: cards.length,
                dueCount: dueCards.length,
            },
            cards: enrichedCards,
            remaining: sessionCards.length,
            total: cards.length,
            mode,
        };
    }

    // =========================================
    // DASHBOARD (invariato)
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
    }

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
    }

    // =========================================
    // TYPING MODE (invariato)
    // =========================================

    async verifyAnswer(tenantScope, deckId, cardId, userAnswer) {
        const userId = this._getUserId(tenantScope);

        if (!userAnswer || typeof userAnswer !== 'string') {
            throw AppError.validation('La risposta e\' obbligatoria');
        }

        const deck = await Deck.findOne({
            _id: deckId,
            user: userId,
            'cards._id': cardId,
        });

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Card');
        }

        return {
            isCorrect: checkAnswerSimilarity(userAnswer, card.back),
        };
    }

    // =========================================
    // SESSION COMPLETE (invariato)
    // =========================================

    async completeSession(tenantScope, deckId, sessionData = {}) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId }).select('_id');
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

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

        const metadata = {
            correctCount,
            wrongCount,
            timeSpentSeconds,
            totalCards,
            deckId,
            mode,
        };

        const xpBreakdown = this._calculateSessionXpBreakdown(metadata);
        const result = await activityService.recordActivity(userId, 'SESSION_COMPLETE', {
            entityId: deckId,
            category: 'study',
            metadata,
        });

        return {
            ...result,
            xpBreakdown,
            stats: metadata,
        };
    }

    // =========================================
    // SM-2 REVIEW LOGIC (invariato)
    // =========================================

    async processCardReview(tenantScope, deckId, cardId, rating, sessionMeta = null) {
        const userId = this._getUserId(tenantScope);
        const quality = Number(rating);

        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw AppError.validation('Il rating deve essere un numero tra 1 e 5');
        }

        const deck = await Deck.findOne({
            _id: deckId,
            user: userId,
            'cards._id': cardId,
        });

        if (!deck) {
            throw AppError.notFound('Mazzo o card');
        }

        const card = deck.cards.id(cardId);
        if (!card) {
            throw AppError.notFound('Card');
        }

        const algorithmName = deck.algorithm || 'sm2';
        const algorithmResult = AlgorithmFactory.processReview(card, quality, algorithmName);

        if (algorithmResult.easinessFactor !== undefined) {
            card.easinessFactor = algorithmResult.easinessFactor;
        }
        if (algorithmResult.stability !== undefined) {
            card.stability = algorithmResult.stability;
        }
        if (algorithmResult.box !== undefined) {
            card.box = algorithmResult.box;
        }
        card.interval = algorithmResult.interval;
        card.repetitions = algorithmResult.repetitions;
        card.nextReviewDate = algorithmResult.nextReviewDate;
        card.lastReviewed = new Date();

        if (!card.reviewHistory) {
            card.reviewHistory = [];
        }
        card.reviewHistory.push({
            date: new Date(),
            rating: quality,
            interval: algorithmResult.interval,
            easinessFactor: algorithmResult.easinessFactor || card.easinessFactor,
            repetitions: algorithmResult.repetitions,
            algorithm: algorithmName,
        });

        if (card.reviewHistory.length > 50) {
            card.reviewHistory = card.reviewHistory.slice(-50);
        }

        const status = this._resolveCardStatus({
            quality,
            repetitions: algorithmResult.repetitions,
            interval: algorithmResult.interval,
            card: card,
        });
        card.status = status;

        this._updateDeckAnalytics(deck, quality, sessionMeta);

        await deck.save();

        let gamification = null;
        const shouldRecord = sessionMeta?.isComplete || sessionMeta?.completed;
        if (shouldRecord) {
            eventBus.emit('session.completed', {
                userId,
                session: {
                    deckId,
                    ...sessionMeta,
                },
            });
        }

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
            gamification,
        };
    }

    // =========================================
    // 🆕 SMART GENERATION V2 - MAGIC GENERATE
    // =========================================

    /**
     * 🪄 MAGIC GENERATE V2 - Pipeline migliorata
     * 
     * Miglioramenti rispetto a V1:
     * 1. Micro-chunking (6k invece di 40-50k) per domande più precise
     * 2. Estrazione concetti chiave per evitare ripetizioni
     * 3. Prompt multi-tipo per varietà
     * 4. Deduplica semantica post-generazione
     * 5. Validazione qualità più rigorosa
     */
    async generateCardsFromPDF(tenantScope, deckId, pdfFilePath) {
        const userId = this._getUserId(tenantScope);

        // 1. Verifica mazzo
        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        if (!pdfFilePath || typeof pdfFilePath !== 'string') {
            throw AppError.validation('Path PDF non valido');
        }

        const pdfFileName = path.basename(pdfFilePath);
        const pdfUrl = `/uploads/pdfs/${pdfFileName}`;
        deck.pdfUrl = pdfUrl;
        await deck.save({ validateModifiedOnly: true });

        sseManager.sendToUser(userId, 'pdf-progress', { step: 'analyzing', message: 'Analisi documento...' });

        // 2. Leggi e parsa PDF
        let pdfBuffer;
        try {
            pdfBuffer = await fs.readFile(pdfFilePath);
        } catch (err) {
            console.error('❌ PDF Read Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF caricato.');
        }

        let pdfText;
        try {
            const pdfData = await pdfParse(pdfBuffer);
            pdfText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            console.error('❌ PDF Parse Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF. Assicurati che sia valido e non protetto.');
        }

        if (!pdfText || pdfText.trim().length < 100) {
            throw AppError.validation('Il PDF non contiene abbastanza testo da elaborare.');
        }

        const normalizedText = this._normalizeExtractedText(pdfText);
        deck.extractedText = this._truncateText(normalizedText, MAX_EXTRACTED_TEXT_STORE_LENGTH);
        await deck.save({ validateModifiedOnly: true });

        // 3. Analisi strutturale (Blueprint)
        console.log('🏗️ FASE 1: Analisi strutturale...');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'blueprint', message: 'Identifico struttura documento...' });
        
        const blueprint = await this._analyzeDocumentStructure(normalizedText);
        console.log('📋 Blueprint:', JSON.stringify(blueprint, null, 2));

        // 4. Ingestione vettoriale (background)
        try {
            await vectorStoreService.ingestDeck(deckId, normalizedText);
        } catch (err) {
            console.warn('⚠️ Vector ingest error (non bloccante):', err.message);
        }

        // 5. 🆕 MICRO-CHUNKING SEMANTICO
        console.log('📦 FASE 2: Micro-chunking semantico...');
        const microChunks = this._createSemanticMicroChunks(normalizedText);
        console.log(`📊 Creati ${microChunks.length} micro-chunk da ~${MICRO_CHUNK_SIZE} caratteri`);
        
        sseManager.sendToUser(userId, 'pdf-progress', { 
            step: 'chunking', 
            totalChunks: microChunks.length,
            message: `Diviso in ${microChunks.length} sezioni` 
        });

        // 6. 🆕 ESTRAZIONE CONCETTI CHIAVE (Pre-pass per evitare duplicati)
        console.log('🔑 FASE 3: Estrazione concetti chiave...');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'concepts', message: 'Estraggo concetti chiave...' });
        
        const globalConcepts = await this._extractKeyConcepts(normalizedText, blueprint);
        console.log(`🎯 Estratti ${globalConcepts.length} concetti chiave`);

        // 7. 🆕 GENERAZIONE MULTI-TIPO
        console.log('✨ FASE 4: Generazione flashcard...');
        let allGeneratedCards = [];
        const usedConcepts = new Set(); // Traccia concetti già usati
        
        for (let i = 0; i < microChunks.length; i++) {
            const chunk = microChunks[i];
            
            // Calcola target dinamico basato su lunghezza chunk
            const targetCards = this._calculateChunkTarget(chunk.text.length, chunk.hasTitles);
            
            console.log(`🔄 Chunk ${i + 1}/${microChunks.length}: ${chunk.text.length} chars, target ${targetCards} cards`);
            
            sseManager.sendToUser(userId, 'pdf-progress', {
                step: 'generating',
                currentChunk: i + 1,
                totalChunks: microChunks.length,
                generatedSoFar: allGeneratedCards.length,
                message: `Elaboro sezione ${i + 1}/${microChunks.length}...`
            });

            try {
                const chunkCards = await this._generateCardsV2(
                    chunk.text,
                    blueprint,
                    targetCards,
                    usedConcepts,
                    i,
                    microChunks.length
                );
                
                // Aggiungi concetti usati al set globale
                chunkCards.forEach(card => {
                    const conceptKey = this._extractConceptKey(card.front);
                    if (conceptKey) usedConcepts.add(conceptKey);
                });
                
                allGeneratedCards.push(...chunkCards);
                console.log(`✅ Chunk ${i + 1}: Generate ${chunkCards.length} card (totale: ${allGeneratedCards.length})`);
                
            } catch (err) {
                console.error(`❌ Errore chunk ${i + 1}:`, err.message);
                // Continua con altri chunk
            }

            // Rate limiting: pausa tra chiamate API
            if (i < microChunks.length - 1) {
                await this._sleep(500);
            }
        }

        // 8. 🆕 DEDUPLICA SEMANTICA
        console.log('🧹 FASE 5: Deduplica semantica...');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'deduplicating', message: 'Rimuovo duplicati...' });
        
        const beforeDedup = allGeneratedCards.length;
        const uniqueCards = this._deduplicateCards(allGeneratedCards);
        const removedCount = beforeDedup - uniqueCards.length;
        console.log(`🗑️ Rimossi ${removedCount} duplicati (${beforeDedup} → ${uniqueCards.length})`);

        // 9. Validazione finale e salvataggio
        const validCards = uniqueCards
            .filter(card => this._validateCardQuality(card))
            .slice(0, MAX_TOTAL_CARDS)
            .map(card => {
                const cardData = {
                    front: card.front.trim(),
                    back: card.back.trim(),
                    status: 'new',
                    nextReviewDate: new Date(),
                    easinessFactor: DEFAULT_EASINESS_FACTOR,
                    interval: 0,
                    repetitions: 0,
                };

                // Includi source_metadata se presente e valido
                if (card.sourceMetadata && 
                    typeof card.sourceMetadata === 'object' &&
                    Number.isFinite(card.sourceMetadata.pageNumber) &&
                    card.sourceMetadata.pageNumber > 0 &&
                    typeof card.sourceMetadata.originalText === 'string' &&
                    card.sourceMetadata.originalText.trim().length >= 20) {
                    cardData.sourceMetadata = {
                        pageNumber: card.sourceMetadata.pageNumber,
                        originalText: card.sourceMetadata.originalText.trim(),
                    };
                }

                return cardData;
            });

        if (validCards.length === 0) {
            sseManager.sendToUser(userId, 'pdf-progress', { step: 'completed', totalCards: 0 });
            return {
                deck: deck.toJSON(),
                generatedCount: 0,
                warning: 'Nessuna flashcard generata. Il PDF potrebbe non contenere contenuto elaborabile.',
            };
        }

        deck.cards.push(...validCards);
        await deck.save();

        console.log(`✨ COMPLETATO: ${validCards.length} flashcard generate per deck ${deckId}`);
        sseManager.sendToUser(userId, 'pdf-progress', { 
            step: 'completed', 
            totalCards: validCards.length,
            message: `Generate ${validCards.length} flashcard!`
        });

        return {
            deck: deck.toJSON(),
            generatedCount: validCards.length,
            stats: {
                totalChunks: microChunks.length,
                duplicatesRemoved: removedCount,
                conceptsExtracted: globalConcepts.length,
            }
        };
    }

    // =========================================
    // 🆕 SMART GENERATION V2 - HELPER METHODS
    // =========================================

    /**
     * 🔪 Micro-Chunking Semantico
     * Divide il testo in chunk piccoli rispettando i confini semantici
     */
    _createSemanticMicroChunks(text) {
        if (!text || text.length <= MICRO_CHUNK_SIZE) {
            return [{ text, hasTitles: this._detectTitles(text) }];
        }

        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + MICRO_CHUNK_SIZE, text.length);

            // Trova punto di interruzione naturale
            if (end < text.length) {
                const searchZone = text.slice(Math.max(start, end - 1000), end);
                
                // Priorità: 1. Marker pagina (nuovo formato), 2. Marker pagina (vecchio formato), 3. Doppio a capo, 4. Punto finale
                const pageMarkerNew = searchZone.lastIndexOf('--- PAGE');
                const pageMarkerOld = searchZone.lastIndexOf('--- Pagina');
                const pageMarker = pageMarkerNew > pageMarkerOld ? pageMarkerNew : pageMarkerOld;
                const doubleLine = searchZone.lastIndexOf('\n\n');
                const period = searchZone.lastIndexOf('. ');

                let bestBreak = -1;
                if (pageMarker > searchZone.length * 0.5) {
                    bestBreak = pageMarker;
                } else if (doubleLine > searchZone.length * 0.5) {
                    bestBreak = doubleLine + 2;
                } else if (period > searchZone.length * 0.3) {
                    bestBreak = period + 2;
                }

                if (bestBreak > 0) {
                    end = Math.max(start, end - 1000) + bestBreak;
                }
            }

            const chunkText = text.slice(start, end).trim();
            
            // Ignora chunk troppo corti
            if (chunkText.length >= MIN_CHUNK_LENGTH) {
                chunks.push({
                    text: chunkText,
                    hasTitles: this._detectTitles(chunkText),
                });
            }

            // Avanza con overlap minimo
            start = end - MICRO_CHUNK_OVERLAP;
            if (start >= text.length - MIN_CHUNK_LENGTH) break;
        }

        return chunks;
    }

    /**
     * 🔑 Estrazione Concetti Chiave (per evitare duplicati cross-chunk)
     * Versione migliorata con fallback locale
     */
    async _extractKeyConcepts(text, blueprint) {
        try {
            const sampleText = this._truncateText(text, 20000);
            const globalContext = blueprint?.globalContext || 'Documento accademico';

            const completion = await openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `Sei un analista esperto. Estrai i 20-30 CONCETTI CHIAVE più importanti dal testo.
Ogni concetto deve essere una parola o frase breve (2-4 parole max).

Contesto del documento: ${globalContext}

Restituisci SOLO JSON valido:
{ "concepts": ["concetto1", "concetto2", "concetto3", ...] }`
                    },
                    { role: 'user', content: `Analizza questo testo ed estrai i concetti chiave:\n\n${sampleText}` }
                ],
                temperature: 0.3,
                max_completion_tokens: 800,
                response_format: { type: 'json_object' },
            });

            const rawResponse = completion.choices[0]?.message?.content || '{}';
            console.log('📝 Raw concept extraction response length:', rawResponse.length);
            
            const cleaned = this._cleanJSON(rawResponse);
            const parsed = JSON.parse(cleaned);
            
            const concepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];
            console.log(`🔑 Estratti ${concepts.length} concetti via AI`);
            
            // Se AI fallisce, estrai concetti localmente
            if (concepts.length === 0) {
                console.log('⚠️ AI non ha estratto concetti, uso estrazione locale...');
                return this._extractConceptsLocally(sampleText);
            }
            
            return concepts;
        } catch (err) {
            console.warn('⚠️ Concept extraction error:', err.message);
            // Fallback: estrazione locale
            return this._extractConceptsLocally(text);
        }
    }

    /**
     * 🔧 Estrazione Concetti Locale (fallback senza AI)
     * Usa TF-IDF semplificato per trovare termini rilevanti
     */
    _extractConceptsLocally(text) {
        if (!text || typeof text !== 'string') return [];
        
        // Stopwords italiane comuni
        const stopwords = new Set([
            'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
            'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
            'che', 'non', 'come', 'anche', 'più', 'dove', 'quando',
            'essere', 'avere', 'fare', 'dire', 'andare', 'vedere',
            'questo', 'quello', 'suo', 'loro', 'nostro', 'vostro',
            'tutto', 'ogni', 'altro', 'molto', 'poco', 'tanto',
            'nel', 'nella', 'dello', 'della', 'degli', 'delle',
            'sono', 'è', 'sia', 'sono', 'siamo', 'hanno', 'ha',
            'può', 'deve', 'vuole', 'quindi', 'perché', 'se', 'ma',
            'the', 'and', 'or', 'of', 'to', 'in', 'for', 'is', 'are'
        ]);
        
        // Tokenizza e conta frequenze
        const words = text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4 && !stopwords.has(w));
        
        const freq = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }
        
        // Ordina per frequenza e prendi i top 25
        const concepts = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([word]) => word);
        
        console.log(`🔧 Estratti ${concepts.length} concetti localmente`);
        return concepts;
    }

    /**
     * ✨ Generazione Flashcard V2 - Prompt Migliorato
     */
    async _generateCardsV2(chunkText, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        // Costruisci lista concetti già usati (per evitare ripetizioni)
        const avoidList = usedConcepts.size > 0 
            ? `\n\n⚠️ EVITA domande su questi concetti già trattati: ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        // Seleziona tipi di domande per questo chunk (varietà)
        const questionTypesForChunk = this._selectQuestionTypes(chunkIndex, totalChunks);

        const systemPrompt = `Sei un ESPERTO CREATORE DI FLASHCARD per lo studio universitario.
Il tuo obiettivo è creare flashcard PRECISE, UNICHE e UTILI per la memorizzazione attiva.

📚 CONTESTO DOCUMENTO: "${globalContext}"
📄 TIPO: ${documentType}
📍 SEZIONE: ${chunkIndex + 1} di ${totalChunks}

🎯 CREA ESATTAMENTE ${targetCount} FLASHCARD seguendo queste regole:

TIPI DI DOMANDE DA INCLUDERE:
${questionTypesForChunk}

📏 FORMATO OBBLIGATORIO:
- DOMANDA (front): Specifica, chiara, che richieda ragionamento. MIN 10 parole.
- RISPOSTA (back): Completa ma concisa. Includi il "perché" quando rilevante. MIN 20 parole.
${avoidList}

❌ EVITA:
- Domande troppo generiche ("Cos'è X?" senza contesto)
- Domande che si possono rispondere con sì/no
- Ripetizioni dello stesso concetto con parole diverse
- Informazioni non presenti nel testo

✅ PREFERISCI:
- Domande che collegano concetti
- Domande che richiedono spiegazione del "perché"
- Domande su processi e sequenze
- Domande che testano comprensione profonda

📌 CRITICAL: SOURCE GROUNDING (OBBLIGATORIO)
Il testo fornito contiene marker di pagina nel formato:
--- PAGE {n} ---
{contenuto della pagina}
--- END PAGE {n} ---

Per OGNI flashcard generata, DEVI includere:
1. page_number: Il numero della pagina (intero) trovato nel marker "--- PAGE {n} ---" da cui hai estratto l'informazione
2. original_quote: La CITAZIONE ESATTA (verbatim) dal testo originale che hai usato per generare la risposta

⚠️ REGOLA VERBATIM STRINGENTE:
- original_quote DEVE essere una copia ESATTA (carattere per carattere) di una frase o paragrafo presente nel testo
- NON parafrasare, NON riassumere, NON modificare
- Se non trovi una citazione esatta nel testo, NON generare la flashcard
- La citazione deve essere sufficientemente lunga da essere univoca (minimo 20 caratteri)
- Verifica che la citazione esista letteralmente nel testo prima di includerla

FORMATO JSON OUTPUT (STRICT):
{
  "cards": [
    {
      "front": "Domanda completa e specifica...",
      "back": "Risposta esaustiva con spiegazione...",
      "source_metadata": {
        "page_number": 5,
        "original_quote": "La citazione ESATTA dal testo originale, senza modifiche."
      }
    }
  ]
}

ESEMPIO:
Se nel testo vedi:
--- PAGE 3 ---
La fotosintesi è il processo mediante il quale le piante convertono la luce solare in energia chimica.
--- END PAGE 3 ---

E generi una flashcard su questo concetto, DEVI includere:
{
  "front": "Come le piante convertono la luce solare in energia?",
  "back": "Le piante convertono la luce solare in energia chimica attraverso il processo chiamato fotosintesi.",
  "source_metadata": {
    "page_number": 3,
    "original_quote": "La fotosintesi è il processo mediante il quale le piante convertono la luce solare in energia chimica."
  }
}

NOTA: original_quote deve essere IDENTICA al testo tra i marker di pagina.`;

        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const completion = await openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `TESTO DA ANALIZZARE:\n\n${chunkText}` }
                    ],
                    temperature: attempt === 1 ? 0.6 : 0.4,
                    max_completion_tokens: 3500,
                    response_format: { type: 'json_object' },
                });

                const response = completion.choices[0]?.message?.content;
                if (!response) {
                    if (attempt === MAX_RETRIES) return [];
                    continue;
                }

                const cleaned = this._cleanJSON(response);
                const parsed = JSON.parse(cleaned);
                const cards = this._extractGeneratedCards(parsed);

                return cards
                    .map(c => this._normalizeGeneratedCard(c))
                    .filter(c => c.front && c.back);

            } catch (err) {
                console.error(`❌ Generation attempt ${attempt} failed:`, err.message);
                if (attempt === MAX_RETRIES) return [];
                await this._sleep(1000);
            }
        }
        return [];
    }

    /**
     * 🎲 Seleziona tipi di domande per varietà
     */
    _selectQuestionTypes(chunkIndex, totalChunks) {
        const allTypes = Object.entries(QUESTION_TYPES);
        
        // Ruota i tipi in base al chunk per garantire varietà
        const offset = chunkIndex % allTypes.length;
        const selectedTypes = [];
        
        for (let i = 0; i < Math.min(4, allTypes.length); i++) {
            const typeIndex = (offset + i) % allTypes.length;
            const [name, config] = allTypes[typeIndex];
            selectedTypes.push(`- ${config.prompt}`);
        }
        
        return selectedTypes.join('\n');
    }

    /**
     * 📊 Calcola target card per chunk basato su lunghezza e contenuto
     */
    _calculateChunkTarget(chunkLength, hasTitles) {
        // Base: 1 card ogni 600 caratteri (densità aumentata)
        let target = Math.ceil(chunkLength / 600);
        
        // Bonus se ha titoli (contenuto più strutturato)
        if (hasTitles) target = Math.ceil(target * 1.2);
        
        // Applica limiti
        return Math.max(MIN_CARDS_PER_CHUNK, Math.min(MAX_CARDS_PER_CHUNK, target));
    }

    /**
     * 🔍 Rileva se il chunk contiene titoli/header
     */
    _detectTitles(text) {
        const titlePatterns = [
            /^#+\s+.+$/m,           // Markdown headers
            /^[A-Z][A-Z\s]{5,}$/m,  // ALL CAPS lines
            /^\d+\.\s+[A-Z]/m,      // Numbered sections
            /^Capitolo\s+\d+/im,    // "Capitolo X"
            /^Sezione\s+\d+/im,     // "Sezione X"
        ];
        return titlePatterns.some(p => p.test(text));
    }

    /**
     * 🔑 Estrae una chiave concettuale dalla domanda
     */
    _extractConceptKey(question) {
        if (!question || typeof question !== 'string') return null;
        
        // Normalizza e estrai parole chiave
        const normalized = question
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 5)
            .sort()
            .join('_');
        
        return normalized || null;
    }

    /**
     * 🧹 Deduplica Semantica usando Jaccard Similarity
     */
    _deduplicateCards(cards) {
        if (!Array.isArray(cards) || cards.length === 0) return [];
        
        const unique = [];
        
        for (const card of cards) {
            const isDuplicate = unique.some(existing => {
                const similarity = this._jaccardSimilarity(
                    existing.front + ' ' + existing.back,
                    card.front + ' ' + card.back
                );
                return similarity > SIMILARITY_THRESHOLD;
            });
            
            if (!isDuplicate) {
                unique.push(card);
            }
        }
        
        return unique;
    }

    /**
     * 📐 Jaccard Similarity per confronto testi
     */
    _jaccardSimilarity(text1, text2) {
        const tokenize = (text) => {
            return new Set(
                text.toLowerCase()
                    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                    .split(/\s+/)
                    .filter(w => w.length > 2)
            );
        };
        
        const set1 = tokenize(text1);
        const set2 = tokenize(text2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }

    /**
     * ✅ Validazione qualità card
     */
    _validateCardQuality(card) {
        if (!card || typeof card !== 'object') return false;
        
        const front = card.front?.trim() || '';
        const back = card.back?.trim() || '';
        
        // Lunghezza minima
        if (front.length < 15 || back.length < 30) return false;
        
        // Evita domande troppo semplici
        const simplePatterns = [
            /^(cos'è|cosa è|che cos'è)\s+\w+\??$/i,
            /^definisci\s+\w+\.?$/i,
        ];
        if (simplePatterns.some(p => p.test(front))) return false;
        
        // La risposta deve essere sostanziale
        const wordCount = back.split(/\s+/).length;
        if (wordCount < 8) return false;
        
        return true;
    }

    /**
     * ⏱️ Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =========================================
    // AI TUTOR (invariato)
    // =========================================

    async askTutor(tenantScope, deckId, message, history = []) {
        const userId = this._getUserId(tenantScope);

        if (!message || typeof message !== 'string') {
            throw AppError.validation('Il messaggio e\' obbligatorio');
        }

        const cleanMessage = message.trim();
        if (!cleanMessage) {
            throw AppError.validation('Il messaggio non puo\' essere vuoto');
        }
        if (cleanMessage.length > MAX_TUTOR_MESSAGE_LENGTH) {
            throw AppError.validation(`Messaggio troppo lungo (max ${MAX_TUTOR_MESSAGE_LENGTH} caratteri)`);
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId })
            .select('+extractedText');

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        let extractedText = typeof deck.extractedText === 'string' ? deck.extractedText : '';
        const hasPageMarkers = /--- Pagina \d+ ---/.test(extractedText);

        const extractAndStorePdfText = async ({ strict = true } = {}) => {
            if (!deck.pdfUrl || typeof deck.pdfUrl !== 'string') {
                if (strict) {
                    throw AppError.validation('Nessun PDF collegato a questo mazzo');
                }
                return null;
            }

            const pdfFileName = path.basename(deck.pdfUrl);
            const pdfFilePath = path.join(__dirname, '..', 'uploads', 'pdfs', pdfFileName);

            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(pdfFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('PDF non trovato sul server. Ricaricalo e riprova.');
                }
                return null;
            }

            let pdfText;
            try {
                const pdfData = await pdfParse(pdfBuffer);
                pdfText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('Impossibile leggere il PDF per la chat.');
                }
                return null;
            }

            const normalizedExtracted = this._normalizeExtractedText(pdfText);
            if (!normalizedExtracted || normalizedExtracted.length < 50) {
                if (strict) {
                    throw AppError.validation('Il PDF non contiene testo leggibile.');
                }
                return null;
            }

            deck.extractedText = this._truncateText(
                normalizedExtracted,
                MAX_EXTRACTED_TEXT_STORE_LENGTH,
                '\n\n[...testo troncato...]'
            );
            await deck.save({ validateModifiedOnly: true });
            extractedText = deck.extractedText;

            return extractedText;
        };

        if (!extractedText || extractedText.trim().length < 50) {
            await extractAndStorePdfText({ strict: true });
        } else if (!hasPageMarkers) {
            await extractAndStorePdfText({ strict: false });
        }

        let context = '';
        try {
            const matches = await vectorStoreService.queryDeck(deckId, cleanMessage, 5);
            if (Array.isArray(matches) && matches.length > 0) {
                context = matches.join('\n\n---\n\n');
            }
        } catch (err) {
            console.error('⚠️ Vector query error:', err.message);
        }

        if (!context && extractedText) {
            try {
                await vectorStoreService.ingestDeck(deckId, extractedText);
                const matches = await vectorStoreService.queryDeck(deckId, cleanMessage, 5);
                if (Array.isArray(matches) && matches.length > 0) {
                    context = matches.join('\n\n---\n\n');
                }
            } catch (err) {
                console.error('⚠️ Vector ingest+query fallback error:', err.message);
            }
        }

        const model = process.env.OPENAI_CHAT_MODEL || ACTIVE_AI_MODEL;
        const contextLimit = model.includes('gpt-3.5') ? 15000 : 50000;

        if (!context) {
            context = this._buildTutorContext(extractedText, cleanMessage, contextLimit);
        }

        if (!context || context.trim().length < 20) {
            throw AppError.validation('Non ci sono abbastanza dati per rispondere.');
        }

        context = this._truncateText(context, contextLimit, '\n\n[...contesto troncato...]');

        const systemPrompt =
            'Sei Silvi, un Tutor Esperto e Socratico: chiaro, rigoroso e incoraggiante.\n' +
            'Rispondi alla domanda dell\'utente basandoti ESCLUSIVAMENTE sul CONTESTO fornito.\n' +
            'Se la risposta non è nel contesto, dillo chiaramente.\n\n' +
            'CONTESTO:\n"""\n' + context + '\n"""\n\n' +
            'Rispondi in italiano. Se utile, cita brevi frasi tra virgolette.';

        const safeHistory = this._sanitizeTutorHistory(history);

        let aiResponse;
        try {
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...safeHistory,
                    { role: 'user', content: cleanMessage },
                ],
                temperature: 0.2,
                max_completion_tokens: 600,
            });

            aiResponse = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error('❌ OpenAI Tutor Error:', err.message);
            
            if (err.code === 'insufficient_quota') {
                throw AppError.validation('Quota OpenAI esaurita.');
            }
            throw AppError.validation('Errore nella risposta AI. Riprova.');
        }

        const reply = typeof aiResponse === 'string' ? aiResponse.trim() : '';
        if (!reply) {
            throw AppError.validation('Risposta AI vuota. Riprova.');
        }

        return { reply };
    }

    async generateCardsFromAI(_tenantScope, _payload) {
        return null;
    }

    // =========================================
    // PRIVATE HELPERS
    // =========================================

    async _validateGoalOwnership(tenantScope, goalId) {
        const userId = this._getUserId(tenantScope);
        const goal = await Goal.findOne({ _id: goalId, user: userId });
        if (!goal) {
            throw AppError.notFound('Obiettivo');
        }
    }

    _resolveCardStatus({ quality, repetitions, interval, card = null }) {
        if (quality < 3) {
            return 'learning';
        }

        if (repetitions <= 1) {
            return 'learning';
        }

        let recentQuality = quality;
        let consecutiveGood = 1;

        if (card && Array.isArray(card.reviewHistory) && card.reviewHistory.length > 0) {
            const recentHistory = card.reviewHistory.slice(-5);
            
            for (let i = recentHistory.length - 1; i >= 0; i--) {
                if (recentHistory[i].rating >= 3) {
                    consecutiveGood++;
                } else {
                    break;
                }
            }

            const lastThree = recentHistory.slice(-3);
            if (lastThree.length > 0) {
                const avgQuality = lastThree.reduce((sum, r) => sum + (r.rating || 0), 0) / lastThree.length;
                recentQuality = (avgQuality + quality) / 2;
            }
        }

        const isMastered = 
            repetitions >= 5 &&
            interval >= 30 &&
            consecutiveGood >= 3 &&
            recentQuality >= 3.5;

        if (isMastered) {
            return 'mastered';
        }

        const isReview = 
            repetitions >= 2 &&
            interval > 1 &&
            recentQuality >= 3;

        if (isReview) {
            return 'review';
        }

        return 'learning';
    }

    _serializeCard(card) {
        if (!card) return null;
        const obj = card.toObject({ virtuals: true });
        obj.id = obj._id?.toString() || obj.id;
        delete obj._id;
        return obj;
    }

    _extractGeneratedCards(parsed) {
        if (Array.isArray(parsed)) return parsed;
        if (!parsed || typeof parsed !== 'object') return [];

        if (Array.isArray(parsed.cards)) return parsed.cards;
        if (Array.isArray(parsed.flashcards)) return parsed.flashcards;
        if (Array.isArray(parsed.items)) return parsed.items;
        if (Array.isArray(parsed.data)) return parsed.data;

        if (parsed.front && parsed.back) return [parsed];

        const values = Object.values(parsed).filter(value => value && typeof value === 'object');
        const hasCardShape = values.some(value => value.front || value.back || value.question || value.answer || value.q || value.a);
        return hasCardShape ? values : [];
    }

    /**
     * Normalizza una card generata dall'AI, includendo source_metadata se presente
     */
    _normalizeGeneratedCard(card) {
        if (!card || typeof card !== 'object') return {};
        
        const normalized = {
            front: card.front ?? card.question ?? card.q,
            back: card.back ?? card.answer ?? card.a,
        };

        // Gestisci source_metadata se presente
        if (card.source_metadata || card.sourceMetadata) {
            const sourceMeta = card.source_metadata || card.sourceMetadata;
            if (sourceMeta && typeof sourceMeta === 'object') {
                const pageNumber = Number.isFinite(Number(sourceMeta.page_number ?? sourceMeta.pageNumber)) 
                    ? Number(sourceMeta.page_number ?? sourceMeta.pageNumber) 
                    : null;
                const originalQuote = typeof sourceMeta.original_quote === 'string' 
                    ? sourceMeta.original_quote.trim() 
                    : (typeof sourceMeta.originalQuote === 'string' ? sourceMeta.originalQuote.trim() : null);

                // Valida che abbiamo almeno page_number e original_quote
                if (pageNumber !== null && pageNumber > 0 && originalQuote && originalQuote.length >= 20) {
                    normalized.sourceMetadata = {
                        pageNumber: pageNumber,
                        originalText: originalQuote,
                    };
                }
            }
        }

        return normalized;
    }

    _cleanJSON(dirtyJSON) {
        if (!dirtyJSON || typeof dirtyJSON !== 'string') return '';
        
        let cleaned = dirtyJSON.trim();
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/g, '');
        cleaned = cleaned.replace(/^(Ecco|Here|JSON|Risposta|Response):\s*/i, '');
        
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        
        return cleaned.trim();
    }

    async _analyzeDocumentStructure(extractedText) {
        const defaultBlueprint = {
            documentType: 'other',
            densityScore: 0.5,
            globalContext: 'Documento generico',
            mainTopics: [],
        };

        try {
            if (!extractedText || typeof extractedText !== 'string') {
                return defaultBlueprint;
            }

            const sampleText = this._truncateText(extractedText, 25000);
            if (!sampleText || sampleText.trim().length === 0) {
                return defaultBlueprint;
            }

            const systemPrompt = `Analizza il testo e restituisci SOLO JSON:
{
  "documentType": "textbook" | "slide_deck" | "research_paper" | "exam_text" | "notes" | "other",
  "globalContext": "Frase riassuntiva concisa (max 20 parole)",
  "mainTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "densityScore": 0.0 to 1.0
}`;

            const completion = await openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Testo:\n\n${sampleText}` },
                ],
                temperature: 0.2,
                max_completion_tokens: 500,
                response_format: { type: 'json_object' },
            });

            const aiResponse = completion.choices[0]?.message?.content;
            if (!aiResponse) return defaultBlueprint;

            const cleanedJSON = this._cleanJSON(aiResponse);
            if (!cleanedJSON) return defaultBlueprint;

            const parsed = JSON.parse(cleanedJSON);

            const allowedTypes = new Set(['textbook', 'slide_deck', 'research_paper', 'exam_text', 'notes', 'other']);
            const documentType = allowedTypes.has(parsed?.documentType) ? parsed.documentType : 'other';
            
            const globalContext = typeof parsed?.globalContext === 'string' 
                ? parsed.globalContext.split(/\s+/).slice(0, 20).join(' ')
                : 'Documento generico';

            const mainTopics = Array.isArray(parsed?.mainTopics)
                ? parsed.mainTopics.filter(t => typeof t === 'string').slice(0, 5)
                : [];

            const densityScore = Number.isFinite(Number(parsed?.densityScore))
                ? Math.max(0, Math.min(1, Number(parsed.densityScore)))
                : 0.5;

            return { documentType, globalContext, mainTopics, densityScore };
        } catch (err) {
            console.warn('⚠️ Document analysis fallback:', err.message);
            return defaultBlueprint;
        }
    }

    _sanitizeTutorHistory(history) {
        if (!Array.isArray(history)) return [];

        return history
            .filter((item) => item && typeof item === 'object')
            .map((item) => {
                const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
                const content = typeof item.content === 'string' ? item.content.trim() : '';
                if (!role || !content) return null;
                return {
                    role,
                    content: this._truncateText(content, MAX_TUTOR_HISTORY_MESSAGE_LENGTH),
                };
            })
            .filter(Boolean)
            .slice(-MAX_TUTOR_HISTORY_MESSAGES);
    }

    _buildTutorContext(extractedText, question, maxLength = MAX_TUTOR_CONTEXT_LENGTH) {
        const normalizedText = this._normalizeExtractedText(extractedText);
        if (!normalizedText) return '';
        
        const safeMax = Number.isFinite(Number(maxLength)) ? Math.max(2000, Number(maxLength)) : MAX_TUTOR_CONTEXT_LENGTH;
        if (normalizedText.length <= safeMax) return normalizedText;

        const tokens = this._extractQueryTokens(question);

        if (tokens.length === 0) {
            return normalizedText.slice(-safeMax);
        }

        const chunkSize = Math.min(2600, safeMax);
        const step = Math.max(900, Math.floor(chunkSize * 0.6));
        const chunks = [];

        for (let start = 0; start < normalizedText.length; start += step) {
            const text = normalizedText.slice(start, start + chunkSize);
            const haystack = text.toLowerCase();
            const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
            chunks.push({ start, score, text });
        }

        const ranked = chunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score);

        if (ranked.length === 0) {
            return normalizedText.slice(-safeMax);
        }

        const selected = [];
        for (const candidate of ranked) {
            if (selected.length >= 10) break;
            const overlaps = selected.some((s) => Math.abs(s.start - candidate.start) < step);
            if (!overlaps) selected.push(candidate);
        }

        selected.sort((a, b) => a.start - b.start);

        let stitched = '';
        for (const chunk of selected) {
            const separator = stitched.length ? '\n\n---\n\n' : '';
            if (stitched.length + separator.length + chunk.text.length > safeMax) break;
            stitched += separator + chunk.text.trim();
        }

        return stitched || normalizedText.slice(-safeMax);
    }

    _extractQueryTokens(question) {
        if (!question || typeof question !== 'string') return [];

        const stopwords = new Set([
            'come', 'cosa', 'cos', 'che', 'per', 'una', 'uno', 'dei', 'del', 'della',
            'delle', 'degli', 'gli', 'alla', 'alle', 'allo', 'sul', 'sulla', 'sulle',
            'nel', 'nella', 'nelle', 'dai', 'dal', 'dallo', 'ai', 'al', 'allo',
            'il', 'lo', 'la', 'le', 'i', 'e', 'o', 'di', 'da', 'in', 'su', 'con',
            'spiega', 'spiegami', 'spiegare', 'pagina', 'pagine',
        ]);

        return question
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .map((t) => t.trim())
            .filter((t) => t.length >= 4 && !stopwords.has(t))
            .slice(0, 20);
    }

    _normalizeExtractedText(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * 📄 Formatta il testo PDF con marker di pagina standardizzati
     * Formato: --- PAGE {n} ---\n{text}\n--- END PAGE {n} ---
     * Questo formato permette all'AI di identificare esattamente la pagina e il testo originale
     */
    _formatPdfTextWithPages(pdfTextResult) {
        const pages = Array.isArray(pdfTextResult?.pages) ? pdfTextResult.pages : [];
        const fallback = typeof pdfTextResult?.text === 'string' ? pdfTextResult.text : '';

        if (pages.length === 0) {
            // Se non abbiamo pagine separate, proviamo a estrarre dal testo completo
            // e aggiungiamo un marker per la pagina 1
            if (fallback) {
                return `--- PAGE 1 ---\n${fallback}\n--- END PAGE 1 ---`;
            }
            return fallback;
        }

        return pages
            .map((page, index) => {
                // Usa page.num se disponibile (1-based), altrimenti index + 1
                const pageNumber = Number.isFinite(Number(page?.num)) ? Number(page.num) : index + 1;
                const text = typeof page?.text === 'string' ? page.text.trim() : '';
                // Formato standardizzato: --- PAGE {n} ---\n{text}\n--- END PAGE {n} ---
                return `--- PAGE ${pageNumber} ---\n${text}\n--- END PAGE ${pageNumber} ---`;
            })
            .join('\n\n');
    }

    _truncateText(text, maxLength, suffix = '') {
        if (!text || typeof text !== 'string') return '';
        if (!Number.isFinite(maxLength) || maxLength <= 0) return '';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + (typeof suffix === 'string' ? suffix : '');
    }

    _buildQuizOptions(correctAnswer, allAnswers = []) {
        const normalizedCorrect = this._normalizeAnswerValue(correctAnswer);
        const candidates = allAnswers
            .filter(answer => typeof answer === 'string' && answer.trim().length > 0)
            .filter(answer => this._normalizeAnswerValue(answer) !== normalizedCorrect);

        const shuffledCandidates = this._shuffleArray([...candidates]);
        const options = [];
        const seen = new Set();

        if (correctAnswer !== undefined && correctAnswer !== null) {
            options.push(String(correctAnswer));
            seen.add(normalizedCorrect);
        }

        for (const answer of shuffledCandidates) {
            const normalized = this._normalizeAnswerValue(answer);
            if (!normalized || seen.has(normalized)) continue;
            options.push(answer);
            seen.add(normalized);
            if (options.length === 4) break;
        }

        if (options.length < 4) {
            for (const fallback of QUIZ_FALLBACK_OPTIONS) {
                const normalized = this._normalizeAnswerValue(fallback);
                if (seen.has(normalized)) continue;
                options.push(fallback);
                seen.add(normalized);
                if (options.length === 4) break;
            }
        }

        while (options.length < 4) {
            options.push('Nessuna delle precedenti');
        }

        return this._shuffleArray(options);
    }

    _normalizeAnswerValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim().toLowerCase();
    }

    _shuffleArray(values = []) {
        const arr = [...values];
        for (let i = arr.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _calculateSessionXpBreakdown(metadata = {}) {
        const correctCount = this._toNumber(metadata.correctCount, 0);
        const wrongCount = this._toNumber(metadata.wrongCount, 0);
        const timeSpentSeconds = this._toNumber(metadata.timeSpentSeconds, 0);
        const totalCards = this._toNumber(metadata.totalCards, correctCount + wrongCount);
        const streakBonus = this._toNumber(metadata.streakBonus, 0);

        const timePerCard = totalCards > 0 ? timeSpentSeconds / totalCards : 0;
        const speedBonus = timePerCard > 0
            ? Math.max(0, Math.round(10 - timePerCard / 3))
            : 0;

        const correctXp = correctCount * 2;
        const total = SESSION_BASE_XP + correctXp + speedBonus + streakBonus;

        return {
            base: SESSION_BASE_XP,
            correct: correctXp,
            speedBonus,
            streakBonus,
            total,
        };
    }

    _toNumber(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    _updateDeckAnalytics(deck, quality, sessionMeta = null) {
        if (!deck.analytics) {
            deck.analytics = {
                totalReviews: 0,
                averageTimePerCard: 0,
                retentionRate: 0,
                lastStudied: null,
                studyStreak: 0,
            };
        }

        const analytics = deck.analytics;
        analytics.totalReviews = (analytics.totalReviews || 0) + 1;
        analytics.lastStudied = new Date();

        const isCorrect = quality >= 3;
        const previousTotal = analytics.totalReviews - 1 || 1;
        const previousCorrect = Math.round((analytics.retentionRate || 0) * previousTotal);
        const newCorrect = previousCorrect + (isCorrect ? 1 : 0);
        analytics.retentionRate = newCorrect / analytics.totalReviews;

        if (sessionMeta?.timePerCard && Number.isFinite(sessionMeta.timePerCard)) {
            const previousAvg = analytics.averageTimePerCard || 0;
            const newAvg = (previousAvg * previousTotal + sessionMeta.timePerCard) / analytics.totalReviews;
            analytics.averageTimePerCard = newAvg;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastStudied = analytics.lastStudied ? new Date(analytics.lastStudied) : null;
        if (lastStudied) {
            lastStudied.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastStudied) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) {
                // Stesso giorno
            } else if (daysDiff === 1) {
                analytics.studyStreak = (analytics.studyStreak || 0) + 1;
            } else {
                analytics.studyStreak = 1;
            }
        } else {
            analytics.studyStreak = 1;
        }
    }
}

module.exports = new StudyService();
