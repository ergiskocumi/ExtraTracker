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
const Exam = require('../models/Exam');
const AppError = require('../utils/AppError');
const { checkAnswerSimilarity } = require('../utils/stringAnalysis');
const sseManager = require('../utils/SSEManager');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const pdfCacheService = require('./pdfCacheService');
const fs = require('fs/promises');
const path = require('path');
const vectorStoreService = require('./vectorStoreService');
const { AlgorithmFactory } = require('./spacedRepetitionAlgorithms');

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
const QUIZ_FALLBACK_OPTIONS = [
    'Nessuna delle precedenti',
    'Altro',
    'Non specificato',
    'Informazione non presente',
];

// =========================================
// 🆕 SMART GENERATION V3 - OPTIMIZED CONFIGURATION
// =========================================

// Semantic chunking: chunk PIÙ GRANDI per batch processing
const SEMANTIC_CHUNK_SIZE = 12000;    // 12k caratteri (era 6k)
const SEMANTIC_CHUNK_OVERLAP = 500;   // Overlap su confini paragrafo (era 200)
const MIN_SEMANTIC_CHUNK = 300;       // Minimo basso per non perdere pagine introduttive
const MIN_CHUNK_LENGTH = 200;         // Ignora solo chunk vuoti/titoli

// Batch processing: 2 chunk per chiamata API
const BATCH_SIZE = 2;

// Target dinamico - qualità > quantità
const MIN_CARDS_PER_CHUNK = 2;        // Minimo 2 card per chunk (qualità)
const MAX_CARDS_PER_CHUNK = 10;       // Massimo 10 card per singola chiamata
const MAX_TOTAL_CARDS = 80;           // Cap totale (meno card ma migliori)

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

    /**
     * ✏️ Aggiorna solo la risposta (back) di una flashcard
     * @param {object} tenantScope - Scope del tenant
     * @param {string} deckId - ID del deck
     * @param {string} cardId - ID della card
     * @param {string} answer - Nuova risposta
     * @returns {Promise<object>} - Deck aggiornato
     */
    async updateCardAnswer(tenantScope, deckId, cardId, answer) {
        const userId = this._getUserId(tenantScope);

        // Validazione
        if (!answer || typeof answer !== 'string') {
            throw AppError.validation('La risposta è obbligatoria');
        }
        if (answer.trim().length < 10) {
            throw AppError.validation('La risposta deve contenere almeno 10 caratteri');
        }
        if (answer.trim().length > 1000) {
            throw AppError.validation('La risposta non può superare 1000 caratteri');
        }

        const deck = await Deck.findOneAndUpdate(
            {
                _id: deckId,
                user: userId,
                'cards._id': cardId,
            },
            {
                $set: {
                    'cards.$.back': answer.trim(),
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

        // SAFETY CHECK: Verifica che nessuna card sia undefined (defensive programming)
        const hasUndefined = reorderedCards.some(card => card === undefined);
        if (hasUndefined) {
            throw AppError.internal({ message: 'Errore interno nel riordinamento delle card' });
        }

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
        
        // Gestione del cambio di esame (examId)
        if (updates.examId !== undefined) {
            console.log('[StudyService] updateDeck: Updating examId', {
                currentExamId: deck.examId ? deck.examId.toString() : null,
                newExamId: updates.examId,
            });
            
            if (updates.examId !== null && updates.examId !== '') {
                const exam = await Exam.findOne({ _id: updates.examId, user: userId });
                if (!exam) {
                    throw AppError.notFound('Esame non trovato');
                }
                deck.examId = updates.examId;
                console.log('[StudyService] updateDeck: Exam verified, setting examId');
            } else {
                // Se examId è null o stringa vuota, rimuovi il riferimento
                deck.examId = null;
                console.log('[StudyService] updateDeck: Setting examId to null');
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
        // FIXED: Usava deckObj ma ritornava deck.toJSON()
        if (deck.toJSON) {
            return deck.toJSON();
        }
        return deck.toObject ? deck.toObject() : deck;
    }

    // =========================================
    // STUDY SESSION (invariato)
    // =========================================

    async getStudySession(tenantScope, deckId, options = {}) {
        const userId = this._getUserId(tenantScope);
        const config = typeof options === 'string' ? { mode: options } : (options || {});

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

        const mode = this._normalizeStudyMode(config.mode);
        const normalizedFocus = this._normalizeSessionFocus(config.focus);
        const focus = mode === 'exam' ? 'all' : mode === 'focus' ? 'weak' : normalizedFocus;
        const direction = this._normalizeSessionDirection(config.direction);
        const requestedLimit = this._toNumber(config.limit, 0);
        const requestedQuestions = this._toNumber(config.questionCount, 0);
        const timeLimitMinutes = this._toNumber(config.timeLimitMinutes, 0);

        const dueCards = cards.filter(card => {
            const nextReview = new Date(card.nextReviewDate);
            return nextReview <= now;
        });

        const defaultLimit = this._getDefaultSessionLimit(mode);
        const sessionLimit = Math.min(
            requestedLimit > 0
                ? requestedLimit
                : mode === 'exam' && requestedQuestions > 0
                    ? requestedQuestions
                    : defaultLimit,
            cards.length
        );

        const sessionCards = this._selectSessionCards({
            cards,
            dueCards,
            mode,
            focus,
            limit: sessionLimit,
            now,
        });

        const cardModes = this._buildCardModes(mode, sessionCards);
        const allAnswers = cards
            .map(card => card.back)
            .filter(answer => typeof answer === 'string' && answer.trim().length > 0);

        const enrichedCards = sessionCards.map(card => {
            const cardId = this._resolveCardId(card);
            const cardMode = cardModes?.[cardId] || mode;
            if (cardMode === 'quiz') {
                return {
                    ...card,
                    options: this._buildQuizOptions(card.back, allAnswers),
                };
            }
            return card;
        });

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
            cardModes,
            meta: {
                focus,
                limit: sessionLimit || cards.length,
                timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : undefined,
                questionCount: mode === 'exam' ? sessionLimit : undefined,
                direction,
            },
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

        // Calcola accuratezza
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

        await deck.save();

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
            const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
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

        // 5. 🆕 SEMANTIC CHUNKING V3
        console.log('📦 FASE 2: Semantic chunking...');
        const semanticChunks = this._createSemanticChunks(normalizedText);
        console.log(`📊 Creati ${semanticChunks.length} chunk semantici da ~${SEMANTIC_CHUNK_SIZE} caratteri`);
        
        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'chunking',
            totalChunks: semanticChunks.length,
            message: `Diviso in ${semanticChunks.length} sezioni`
        });

        // 6. 🆕 ESTRAZIONE CONCETTI LOCALE (senza AI)
        console.log('🔑 FASE 3: Estrazione concetti (locale)...');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'concepts', message: 'Estraggo concetti chiave...' });

        const globalConcepts = this._extractConceptsLocally(normalizedText);
        console.log(`🎯 Estratti ${globalConcepts.length} concetti chiave (locale)`);

        // 7. 🆕 BATCH GENERATION V3 - Process chunks in batches
        console.log('✨ FASE 4: Generazione flashcard (batch)...');
        let allGeneratedCards = [];
        const usedConcepts = new Set(globalConcepts.slice(0, 10)); // Pre-popola con top 10 concetti

        // Crea batches di BATCH_SIZE chunks
        const batches = [];
        for (let i = 0; i < semanticChunks.length; i += BATCH_SIZE) {
            batches.push(semanticChunks.slice(i, i + BATCH_SIZE));
        }

        console.log(`📦 Creati ${batches.length} batch da ${BATCH_SIZE} chunk ciascuno`);

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
            const batch = batches[batchIdx];
            const batchStartChunk = batchIdx * BATCH_SIZE;

            // Calcola target cards per questo batch
            const totalBatchChars = batch.reduce((sum, c) => sum + c.text.length, 0);
            const targetCards = this._calculateBatchTarget(batch);

            console.log(`🔄 Batch ${batchIdx + 1}/${batches.length}: ${batch.length} chunk, ${totalBatchChars} chars, target ${targetCards} cards`);

            sseManager.sendToUser(userId, 'pdf-progress', {
                step: 'generating',
                currentChunk: batchStartChunk + 1,
                totalChunks: semanticChunks.length,
                generatedSoFar: allGeneratedCards.length,
                message: `Elaboro batch ${batchIdx + 1}/${batches.length}...`
            });

            try {
                const batchCards = await this._generateCardsBatch(
                    batch,
                    blueprint,
                    targetCards,
                    usedConcepts,
                    batchIdx,
                    batches.length
                );

                // Aggiungi concetti usati al set globale
                batchCards.forEach(card => {
                    const conceptKey = this._extractConceptKey(card.front);
                    if (conceptKey) usedConcepts.add(conceptKey);
                });

                allGeneratedCards.push(...batchCards);
                console.log(`✅ Batch ${batchIdx + 1}: Generate ${batchCards.length} card (totale: ${allGeneratedCards.length})`);

            } catch (err) {
                console.error(`❌ Errore batch ${batchIdx + 1}:`, err.message);
                // Fallback: processa chunk singolarmente
                for (let i = 0; i < batch.length; i++) {
                    try {
                        const chunk = batch[i];
                        const singleTarget = this._calculateChunkTarget(chunk.text.length, chunk.hasTitles);
                        const singleCards = await this._generateCardsSingle(
                            chunk,
                            blueprint,
                            singleTarget,
                            usedConcepts,
                            batchStartChunk + i,
                            semanticChunks.length
                        );
                        allGeneratedCards.push(...singleCards);
                    } catch (singleErr) {
                        console.error(`❌ Fallback singolo fallito:`, singleErr.message);
                    }
                }
            }

            // Rate limiting: pausa tra chiamate API
            if (batchIdx < batches.length - 1) {
                await this._sleep(300);
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
                    card.sourceMetadata.originalText.trim().length >= 150) {
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
                totalChunks: semanticChunks.length,
                totalBatches: batches.length,
                duplicatesRemoved: removedCount,
                conceptsExtracted: globalConcepts.length,
            }
        };
    }

    // =========================================
    // 🆕 SMART GENERATION V2 - HELPER METHODS
    // =========================================

    /**
     * 🔪 Semantic Chunking V3 - Ottimizzato
     * Divide il testo in chunk semantici rispettando confini naturali
     * - Mai taglia a metà frase
     * - Priorità: pagina > sezione > paragrafo > frase
     * - Estrae numero pagina per ogni chunk
     */
    _createSemanticChunks(text) {
        if (!text || text.length <= SEMANTIC_CHUNK_SIZE) {
            return [{
                text,
                hasTitles: this._detectTitles(text),
                pageNumbers: this._extractPageNumbers(text),
            }];
        }

        const chunks = [];
        let start = 0;
        let iterations = 0;
        const MAX_ITERATIONS = 100; // Safeguard contro loop infiniti

        while (start < text.length && iterations < MAX_ITERATIONS) {
            iterations++;
            let end = Math.min(start + SEMANTIC_CHUNK_SIZE, text.length);

            // Trova il miglior punto di interruzione (solo se non siamo alla fine)
            if (end < text.length) {
                const searchStart = Math.max(start, end - 2000);
                const searchZone = text.slice(searchStart, end);

                // Priorità: 1. Marker pagina, 2. Doppio a capo, 3. Fine frase, 4. Punto
                let bestBreak = -1;

                // 1. Marker di pagina
                const pageIdx = Math.max(
                    searchZone.lastIndexOf('--- PAGE'),
                    searchZone.lastIndexOf('--- Pagina')
                );
                if (pageIdx > 100) {
                    bestBreak = pageIdx;
                }

                // 2. Doppio a capo (paragrafo)
                if (bestBreak === -1) {
                    const doubleNewline = searchZone.lastIndexOf('\n\n');
                    if (doubleNewline > 100) {
                        bestBreak = doubleNewline + 2;
                    }
                }

                // 3. Fine frase (punto + spazio + maiuscola)
                if (bestBreak === -1) {
                    const sentenceEnd = searchZone.lastIndexOf('. ');
                    if (sentenceEnd > 100) {
                        bestBreak = sentenceEnd + 2;
                    }
                }

                if (bestBreak > 0) {
                    end = searchStart + bestBreak;
                }
            }

            // Assicurati che end > start (evita chunk vuoti)
            if (end <= start) {
                end = Math.min(start + SEMANTIC_CHUNK_SIZE, text.length);
            }

            const chunkText = text.slice(start, end).trim();

            // Aggiungi chunk se ha contenuto sufficiente
            if (chunkText.length >= MIN_SEMANTIC_CHUNK) {
                chunks.push({
                    text: chunkText,
                    hasTitles: this._detectTitles(chunkText),
                    pageNumbers: this._extractPageNumbers(chunkText),
                });
            }

            // IMPORTANTE: Avanza sempre di almeno (SEMANTIC_CHUNK_SIZE - OVERLAP)
            // per evitare loop infiniti
            const minAdvance = SEMANTIC_CHUNK_SIZE - SEMANTIC_CHUNK_OVERLAP;
            const newStart = end - SEMANTIC_CHUNK_OVERLAP;

            // Assicurati di avanzare sempre di almeno minAdvance caratteri
            start = Math.max(newStart, start + minAdvance);

            // Se siamo vicini alla fine, esci
            if (start >= text.length - MIN_SEMANTIC_CHUNK) {
                break;
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            console.warn('⚠️ Chunking: raggiunto limite iterazioni, potrebbe esserci un problema');
        }

        return chunks.length > 0 ? chunks : [{
            text,
            hasTitles: this._detectTitles(text),
            pageNumbers: this._extractPageNumbers(text),
        }];
    }

    /**
     * 📄 Estrae numeri di pagina dal testo del chunk
     */
    _extractPageNumbers(text) {
        if (!text) return [];

        // OTTIMIZZATO: Usa Set per O(1) lookup invece di includes() O(n)
        const pageNumbers = new Set();
        const pageRegex = /--- PAGE (\d+) ---/g;
        const pageRegexOld = /--- Pagina (\d+) ---/g;

        let match;
        while ((match = pageRegex.exec(text)) !== null) {
            pageNumbers.add(parseInt(match[1], 10));
        }
        while ((match = pageRegexOld.exec(text)) !== null) {
            pageNumbers.add(parseInt(match[1], 10));
        }

        return Array.from(pageNumbers).sort((a, b) => a - b);
    }

    /**
     * 🔑 Estrazione Concetti Chiave (per evitare duplicati cross-chunk)
     * @deprecated V3: Ora usa solo estrazione locale (TF-IDF) per risparmiare API calls
     */
    _extractKeyConcepts(text, _blueprint) {
        // V3: Usa solo estrazione locale (elimina 1 chiamata AI per PDF)
        return this._extractConceptsLocally(text);
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
    /**
     * @deprecated Usa _generateCardsBatch o _generateCardsSingle
     * Mantenuto per backward compatibility
     */
    async _generateCardsV2(chunkText, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks) {
        // Redirect to optimized single chunk method
        const chunk = {
            text: chunkText,
            hasTitles: this._detectTitles(chunkText),
            pageNumbers: this._extractPageNumbers(chunkText),
        };
        return this._generateCardsSingle(chunk, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks);
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
        // Base: 1 card ogni 1200 caratteri (qualità > quantità)
        let target = Math.ceil(chunkLength / 1200);

        // Bonus se ha titoli (contenuto più strutturato)
        if (hasTitles) target = Math.ceil(target * 1.1);

        // Applica limiti
        return Math.max(MIN_CARDS_PER_CHUNK, Math.min(MAX_CARDS_PER_CHUNK, target));
    }

    /**
     * 📊 Calcola target card per batch di chunk
     */
    _calculateBatchTarget(batch) {
        let totalTarget = 0;
        for (const chunk of batch) {
            totalTarget += this._calculateChunkTarget(chunk.text.length, chunk.hasTitles);
        }
        // Cap a MAX_CARDS_PER_CHUNK * 2 per batch di 2 chunk
        return Math.min(totalTarget, MAX_CARDS_PER_CHUNK * BATCH_SIZE);
    }

    /**
     * ✨ Generazione Flashcard BATCH V3 - Ottimizzato
     * Processa 2 chunk in una singola chiamata API
     */
    async _generateCardsBatch(chunks, blueprint, targetCount, usedConcepts, batchIndex, totalBatches) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        // Costruisci avoid list
        const avoidList = usedConcepts.size > 0
            ? `\n⚠️ EVITA domande su questi concetti già trattati: ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        // Seleziona tipi di domande per varietà
        const questionTypes = this._selectQuestionTypes(batchIndex, totalBatches);

        // Combina testo dei chunk con separatori
        const combinedText = chunks.map((chunk, idx) => {
            const pageInfo = chunk.pageNumbers?.length > 0
                ? `[Pagine: ${chunk.pageNumbers.join(', ')}]`
                : '';
            return `=== SEZIONE ${idx + 1} ${pageInfo} ===\n${chunk.text}`;
        }).join('\n\n');

        // Prompt QUALITÀ V4 - Copertura completa + Elenchi
        const systemPrompt = `Sei un ESPERTO CREATORE DI FLASHCARD per studenti universitari che devono RIPASSARE per un esame.
Lo studente deve memorizzare TUTTO il contenuto del documento. Ogni concetto importante deve avere almeno una flashcard.

📚 CONTESTO DOCUMENTO: "${globalContext}"
📄 TIPO: ${documentType}

🎯 CREA ${targetCount} FLASHCARD seguendo queste REGOLE FONDAMENTALI:

⚠️ REGOLA COPERTURA COMPLETA:
- Devi coprire TUTTE le pagine del testo, incluse le prime pagine introduttive
- NON saltare nessuna sezione importante
- Ogni definizione, concetto chiave, processo deve avere una flashcard

⚠️ REGOLA ELENCHI/LISTE:
- Quando nel testo c'è un ELENCO (es: "I 5 tipi di X sono: A, B, C, D, E"), crea UNA flashcard che chiede TUTTI gli elementi
- Esempio corretto: "Quali sono i 5 tipi di X?" → "I 5 tipi sono: A, B, C, D, E"
- NON creare 5 domande separate per ogni elemento dell'elenco

TIPI DI DOMANDE (varietà obbligatoria):
${questionTypes}

📏 FORMATO:
- FRONT: Domanda specifica, min 10 parole. Deve testare COMPRENSIONE, non memoria superficiale.
- BACK: Risposta COMPLETA con tutti i dettagli rilevanti. Min 20 parole. Se è un elenco, includi TUTTI i punti.
${avoidList}

❌ EVITA ASSOLUTAMENTE:
- Domande su siti web, link, bibliografia, numeri pagina
- Domande generiche "Cos'è X?" senza contesto
- Domande sì/no
- Domande su dettagli irrilevanti (date pubblicazione, autori citati)
- Due domande sullo stesso concetto
- Chiedere UN SOLO elemento di un elenco invece di tutti

✅ PRIVILEGIA:
- "Quali sono tutti i tipi/elementi/fasi di X?" - elenchi completi
- "Perché X causa Y?" - causa-effetto
- "Qual è la differenza tra X e Y?" - confronti
- "Come funziona il processo di X?" - meccanismi
- "Quali sono le caratteristiche principali di X?" - definizioni complete

📌 SOURCE METADATA (obbligatorio per ogni flashcard):
- page_number: numero pagina (intero)
- original_quote: CITAZIONE LUNGA dal testo originale (MINIMO 150-250 caratteri, circa 1-2 righe complete)
  DEVE essere un PARAGRAFO COMPLETO o più FRASI CONSECUTIVE che contengano il concetto.
  L'utente userà questa citazione per trovare il passaggio nel PDF, quindi deve essere abbastanza lunga.

OUTPUT JSON:
{"cards":[{"front":"...","back":"...","source_metadata":{"page_number":N,"original_quote":"paragrafo completo di 150-250 caratteri..."}}]}`;

        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const completion = await openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: combinedText }
                    ],
                    temperature: attempt === 1 ? 0.5 : 0.3,
                    max_completion_tokens: 4000,
                    response_format: { type: 'json_object' },
                });

                // Log token usage per monitoraggio costi
                if (completion.usage) {
                    console.log(`📊 Batch ${batchIndex + 1} tokens: in=${completion.usage.prompt_tokens}, out=${completion.usage.completion_tokens}`);
                }

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
                console.error(`❌ Batch generation attempt ${attempt} failed:`, err.message);
                if (attempt === MAX_RETRIES) throw err; // Throw per attivare fallback
                await this._sleep(1000);
            }
        }
        return [];
    }

    /**
     * ✨ Generazione Flashcard SINGOLA - Fallback
     * Usa prompt di qualità per singolo chunk
     */
    async _generateCardsSingle(chunk, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        const avoidList = usedConcepts.size > 0
            ? `\n⚠️ EVITA domande su questi concetti già trattati: ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        // Seleziona tipi di domande per varietà
        const questionTypes = this._selectQuestionTypes(chunkIndex, totalChunks);

        // Prompt QUALITÀ V4 - Copertura completa + Elenchi
        const systemPrompt = `Sei un ESPERTO CREATORE DI FLASHCARD per studenti che devono RIPASSARE per un esame.
Lo studente deve memorizzare TUTTO. Ogni concetto importante deve avere almeno una flashcard.

📚 CONTESTO: "${globalContext}"
📄 TIPO: ${documentType} | SEZIONE: ${chunkIndex + 1}/${totalChunks}

🎯 CREA ${targetCount} FLASHCARD seguendo queste REGOLE:

⚠️ REGOLA ELENCHI: Se c'è un ELENCO (es: "I tipi di X sono: A, B, C"), crea UNA flashcard che chiede TUTTI gli elementi, non domande separate.

TIPI DI DOMANDE:
${questionTypes}

📏 FORMATO:
- FRONT: Domanda specifica, min 10 parole.
- BACK: Risposta COMPLETA con tutti i dettagli. Min 20 parole. Se è un elenco, includi TUTTI i punti.
${avoidList}

❌ EVITA: siti web, link, bibliografia, domande generiche, sì/no, dettagli irrilevanti, chiedere UN SOLO elemento di un elenco.

✅ PRIVILEGIA: "Quali sono tutti i tipi/fasi di X?", causa-effetto, confronti, meccanismi.

📌 SOURCE: Per ogni card includi page_number + original_quote (PARAGRAFO COMPLETO, min 150-250 char = 1-2 righe del PDF).

OUTPUT JSON: {"cards":[{"front":"...","back":"...","source_metadata":{"page_number":N,"original_quote":"paragrafo di 150-250 caratteri..."}}]}`;

        try {
            const completion = await openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: chunk.text }
                ],
                temperature: 0.5,
                max_completion_tokens: 2500,
                response_format: { type: 'json_object' },
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) return [];

            const cleaned = this._cleanJSON(response);
            const parsed = JSON.parse(cleaned);
            const cards = this._extractGeneratedCards(parsed);

            return cards
                .map(c => this._normalizeGeneratedCard(c))
                .filter(c => c.front && c.back);

        } catch (err) {
            console.error(`❌ Single generation failed:`, err.message);
            return [];
        }
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
                const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
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

    /**
     * 📚 TUTOR ACCADEMICO - Risponde a domande d'esame usando ESCLUSIVAMENTE il contesto fornito
     * @param {object} tenantScope - Scope del tenant
     * @param {string} deckId - ID del deck
     * @param {string} question - Domanda esatta da rispondere
     * @returns {Promise<object>} - Risposta con { answer, foundInContext, relatedTopics }
     */
    async answerExamQuestion(tenantScope, deckId, question) {
        const userId = this._getUserId(tenantScope);

        if (!question || typeof question !== 'string') {
            throw AppError.validation('La domanda è obbligatoria');
        }

        const cleanQuestion = question.trim();
        if (!cleanQuestion) {
            throw AppError.validation('La domanda non può essere vuota');
        }
        if (cleanQuestion.length > MAX_TUTOR_MESSAGE_LENGTH) {
            throw AppError.validation(`Domanda troppo lunga (max ${MAX_TUTOR_MESSAGE_LENGTH} caratteri)`);
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
                console.error('❌ PDF Read Error (Exam Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('PDF non trovato sul server. Ricaricalo e riprova.');
                }
                return null;
            }

            let pdfText;
            try {
                const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
                pdfText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Exam Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('Impossibile leggere il PDF.');
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
            const matches = await vectorStoreService.queryDeck(deckId, cleanQuestion, 8);
            if (Array.isArray(matches) && matches.length > 0) {
                context = matches.join('\n\n---\n\n');
            }
        } catch (err) {
            console.error('⚠️ Vector query error:', err.message);
        }

        if (!context && extractedText) {
            try {
                await vectorStoreService.ingestDeck(deckId, extractedText);
                const matches = await vectorStoreService.queryDeck(deckId, cleanQuestion, 8);
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
            context = this._buildTutorContext(extractedText, cleanQuestion, contextLimit);
        }

        if (!context || context.trim().length < 20) {
            throw AppError.validation('Non ci sono abbastanza dati nel materiale per rispondere.');
        }

        context = this._truncateText(context, contextLimit, '\n\n[...contesto troncato...]');

        // Prompt rigoroso per risposte d'esame
        const systemPrompt = `Sei un TUTOR ACCADEMICO che aiuta studenti a preparare esami.

IL TUO COMPITO: Rispondere alla domanda usando ESCLUSIVAMENTE il contesto fornito.

═══════════════════════════════════════════════════════════════════
REGOLE CRITICHE:
═══════════════════════════════════════════════════════════════════

1. USA SOLO IL CONTESTO: 
   - Ogni informazione nella tua risposta DEVE provenire dal contesto
   - NON usare conoscenze esterne
   - NON inventare dati, date, nomi, numeri

2. SE LA RISPOSTA NON È NEL CONTESTO:
   - Rispondi con: "⚠️ RISPOSTA NON TROVATA NEL MATERIALE FORNITO"
   - Poi suggerisci: "Argomenti correlati trovati: [lista]" (se ce ne sono)

3. FORMATO RISPOSTA:
   - Concisa ma completa (50-150 parole ideali)
   - Usa elenchi puntati se appropriato
   - Cita parti specifiche del contesto quando utile

4. QUALITÀ:
   - Rispondi come se dovessi scrivere su un compito d'esame
   - Sii preciso e tecnico dove richiesto
   - Evita ripetizioni e filler

CONTESTO (DAL LIBRO/SLIDE DELLO STUDENTE):
"""
${context}
"""

DOMANDA DA RISPONDERE:
"""
${cleanQuestion}
"""

GENERA LA RISPOSTA:`;

        let aiResponse;
        try {
            const completion = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: cleanQuestion },
                ],
                temperature: 0.1, // Più basso per risposte più precise
                max_completion_tokens: 800, // Più spazio per risposte complete
            });

            aiResponse = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error('❌ OpenAI Exam Tutor Error:', err.message);
            
            if (err.code === 'insufficient_quota') {
                throw AppError.validation('Quota OpenAI esaurita.');
            }
            throw AppError.validation('Errore nella risposta AI. Riprova.');
        }

        const answer = typeof aiResponse === 'string' ? aiResponse.trim() : '';
        if (!answer) {
            throw AppError.validation('Risposta AI vuota. Riprova.');
        }

        // Determina se la risposta è stata trovata nel contesto
        const foundInContext = !answer.includes('⚠️ RISPOSTA NON TROVATA');

        // Estrai argomenti correlati se presenti
        const relatedTopicsMatch = answer.match(/Argomenti correlati trovati:\s*(.+)/i);
        const relatedTopics = relatedTopicsMatch 
            ? relatedTopicsMatch[1].split(/[,;]/).map(t => t.trim()).filter(Boolean)
            : [];

        return { 
            answer,
            foundInContext,
            relatedTopics: relatedTopics.length > 0 ? relatedTopics : null
        };
    }

    /**
     * 📋 ESTRAZIONE DOMANDE - Estrae domande da un documento
     * @param {object} tenantScope - Scope del tenant
     * @param {string} questionsFilePath - Path al file con le domande (PDF o TXT)
     * @returns {Promise<object>} - Array di domande estratte
     */
    async extractExamQuestions(tenantScope, questionsFilePath) {
        console.log('📋 Estrazione domande...');
        let questionsText = '';

        // Determina se è PDF o TXT
        const questionsIsPdf = questionsFilePath.toLowerCase().endsWith('.pdf');
        
        if (questionsIsPdf) {
            // Leggi e parsa PDF
            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(questionsFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }

            try {
                const pdfData = await pdfCacheService.parsePDF(questionsFilePath, pdfBuffer);
                questionsText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande. Assicurati che sia un PDF valido.');
            }
        } else {
            // Leggi file TXT
            try {
                questionsText = await fs.readFile(questionsFilePath, 'utf-8');
            } catch (err) {
                console.error('❌ TXT Read Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }
        }

        if (!questionsText || questionsText.trim().length < 50) {
            throw AppError.validation('Il file delle domande non contiene abbastanza testo.');
        }

        const normalizedQuestionsText = this._normalizeExtractedText(questionsText);
        
        // Estrai domande usando OpenAI
        const extractionPrompt = `Sei un EXTRACTION AGENT. Estrai TUTTE le domande dal testo.

REGOLE CRITICHE:

COPIA LETTERALE: Non modificare, non parafrasare, non correggere errori
IDENTIFICA come domande: frasi con "?", numerate (1. 2. 3.), imperativi (Spiega, Definisci, Descrivi)
OUTPUT: JSON array {"questions": ["testo esatto 1", "testo esatto 2"]}

TESTO:
"""
${this._truncateText(normalizedQuestionsText, 50000, '\n\n[...testo troncato...]')}
"""

Estrai TUTTE le domande e restituisci SOLO JSON valido:`;

        let questions = [];
        try {
            const extractionCompletion = await openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages: [
                    { role: 'system', content: 'Sei un agente di estrazione specializzato. Restituisci SOLO JSON valido.' },
                    { role: 'user', content: extractionPrompt },
                ],
                temperature: 0.1,
                max_completion_tokens: 4000,
                response_format: { type: 'json_object' },
            });

            const extractionResponse = extractionCompletion.choices[0]?.message?.content;
            if (extractionResponse) {
                try {
                    const parsed = JSON.parse(extractionResponse);
                    if (Array.isArray(parsed.questions)) {
                        questions = parsed.questions.filter(q => q && typeof q === 'string' && q.trim().length > 0);
                    } else if (Array.isArray(parsed)) {
                        questions = parsed.filter(q => q && typeof q === 'string' && q.trim().length > 0);
                    }
                } catch (parseErr) {
                    console.error('❌ JSON Parse Error (Questions):', parseErr.message);
                    // Fallback: cerca pattern comuni nel testo
                    questions = this._extractQuestionsFallback(normalizedQuestionsText);
                }
            }
        } catch (err) {
            console.error('❌ OpenAI Extraction Error:', err.message);
            // Fallback: estrazione pattern-based
            questions = this._extractQuestionsFallback(normalizedQuestionsText);
        }

        if (questions.length === 0) {
            throw AppError.validation('Nessuna domanda trovata nel documento. Verifica che il file contenga domande d\'esame.');
        }

        console.log(`✅ Estratte ${questions.length} domande`);

        return { questions };
    }

    /**
     * 🤖 GENERAZIONE RISPOSTE - Genera risposte per domande selezionate
     * @param {object} tenantScope - Scope del tenant
     * @param {string} sourceFilePath - Path al file con il materiale di studio (PDF)
     * @param {string[]} selectedQuestions - Array di domande selezionate dall'utente
     * @param {object} options - Opzioni { deckId?, title?, examId? }
     * @param {function} onProgress - Callback opzionale per inviare progress: (progress) => void
     * @returns {Promise<object>} - Deck e statistiche
     */
    async generateExamAnswers(tenantScope, sourceFilePath, selectedQuestions, options = {}, onProgress = null) {
        const startTime = Date.now();
        const userId = this._getUserId(tenantScope);
        const { deckId, title, examId } = options;

        if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
            throw AppError.validation('Devi selezionare almeno una domanda');
        }

        // =========================================
        // STEP 1: ESTRAZIONE TESTO dal Documento B
        // =========================================
        console.log('📚 Estrazione materiale di studio...');
        let sourceBuffer;
        try {
            sourceBuffer = await fs.readFile(sourceFilePath);
        } catch (err) {
            console.error('❌ PDF Read Error (Source):', err.message);
            throw AppError.validation('Impossibile leggere il file del materiale di studio.');
        }

        let sourceText = '';
        try {
            const pdfData = await pdfCacheService.parsePDF(sourceFilePath, sourceBuffer);
            sourceText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            console.error('❌ PDF Parse Error (Source):', err.message);
            throw AppError.validation('Impossibile leggere il file del materiale di studio. Assicurati che sia un PDF valido.');
        }

        if (!sourceText || sourceText.trim().length < 100) {
            throw AppError.validation('Il file del materiale di studio non contiene abbastanza testo.');
        }

        const normalizedSourceText = this._normalizeExtractedText(sourceText);
        
        // =========================================
        // STEP 2: CHUNKING INTELLIGENTE (Livello 3)
        // =========================================
        console.log('🧠 Chunking intelligente per documenti lunghi...');
        let useSmartChunking = normalizedSourceText.length > 20000; // Attiva per documenti > 20k caratteri
        
        let sourceTextForContext = '';
        let tempDeckId = null;
        
        if (useSmartChunking) {
            // Usa chunking semantico con vectorStoreService
            // Crea un deck temporaneo per l'ingestione (stesso ID per tutto il processo)
            tempDeckId = `temp-exam-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            try {
                await vectorStoreService.ingestDeck(tempDeckId, normalizedSourceText);
                console.log('✅ Materiale ingerito nel vector store (chunking intelligente attivo)');
            } catch (err) {
                console.warn('⚠️ Vector ingest error (fallback a testo completo):', err.message);
                useSmartChunking = false;
                tempDeckId = null;
            }
        }
        
        if (!useSmartChunking) {
            sourceTextForContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');
        }

        console.log(`✅ Materiale estratto: ${normalizedSourceText.length} caratteri${useSmartChunking ? ' (chunking intelligente attivo)' : ''}`);

        // =========================================
        // STEP 3: GENERAZIONE BATCH delle risposte
        // =========================================
        console.log('🤖 Generazione risposte...');

        // Configurazione batch processing
        const BATCH_SIZE = 10; // Processa 10 domande alla volta
        const PARALLEL_BATCHES = 3; // 3 batch in parallelo (30 domande)
        const SLEEP_BETWEEN_PARALLEL = 200; // Ridotto da 500ms
        const MAX_RETRIES = 3; // Retry automatico su errore

        const allFlashcards = [];
        let answersFound = 0;
        let answersNotFound = 0;
        const totalQuestions = selectedQuestions.length;

        // Crea array di batch
        const batches = [];
        for (let i = 0; i < selectedQuestions.length; i += BATCH_SIZE) {
            batches.push({
                questions: selectedQuestions.slice(i, i + BATCH_SIZE),
                startIndex: i,
            });
        }

        console.log(`📊 Totale batch: ${batches.length} (${PARALLEL_BATCHES} in parallelo)`);

        // Helper: recupera contesto per batch (con vector queries parallele)
        const getBatchContext = async (batch) => {
            let batchContext = sourceTextForContext;
            if (useSmartChunking && tempDeckId) {
                try {
                    // Query in parallelo per tutte le domande del batch
                    const queryPromises = batch.questions.map(question =>
                        vectorStoreService.queryDeck(tempDeckId, question, 3)
                            .catch(err => {
                                console.warn(`⚠️ Vector query error per domanda:`, err.message);
                                return []; // Fallback: array vuoto
                            })
                    );

                    const results = await Promise.all(queryPromises);

                    // Merge e deduplica chunks
                    const relevantChunks = [];
                    for (const matches of results) {
                        if (Array.isArray(matches) && matches.length > 0) {
                            relevantChunks.push(...matches);
                        }
                    }

                    const uniqueChunks = [...new Set(relevantChunks)];
                    batchContext = uniqueChunks.join('\n\n---\n\n');

                    if (!batchContext || batchContext.trim().length < 100) {
                        // Fallback a testo completo se non trova chunk rilevanti
                        batchContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');
                    }
                } catch (err) {
                    console.warn('⚠️ getBatchContext error, using fallback:', err.message);
                    batchContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');
                }
            }
            return batchContext;
        };

        // Helper: processa singolo batch con retry
        const processBatchWithRetry = async (batch, batchIndex) => {
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const batchNumber = batchIndex + 1;
                    const totalBatches = batches.length;
                    console.log(`🔄 Processando batch ${batchNumber}/${totalBatches} (${batch.questions.length} domande, tentativo ${attempt + 1})`);

                    // Recupera contesto (con vector queries parallele)
                    const batchContext = await getBatchContext(batch);

                    const batchPrompt = `Sei un TUTOR ACCADEMICO. Per OGNI domanda, genera una risposta usando SOLO il contesto.

CONTESTO:
"""
${batchContext}
"""

DOMANDE:
${batch.questions.map((q, idx) => `${batch.startIndex + idx + 1}. ${q}`).join('\n')}

REGOLE:

Il campo "front" deve contenere la domanda ESATTA (copiata letteralmente)
Il campo "back" contiene la risposta (max 150 parole)
Se la risposta non è nel contesto: back = "⚠️ Risposta non trovata nel materiale fornito"
Il campo "found" indica se la risposta è stata trovata (true/false)

OUTPUT JSON:
{"flashcards": [{"front": "domanda esatta", "back": "risposta", "found": true/false}]}

Genera una risposta per OGNI domanda nella lista.`;

                    const batchCompletion = await openai.chat.completions.create({
                        model: ACTIVE_AI_MODEL,
                        messages: [
                            { role: 'system', content: 'Sei un tutor accademico. Restituisci SOLO JSON valido.' },
                            { role: 'user', content: batchPrompt },
                        ],
                        temperature: 0.1,
                        max_completion_tokens: 4000,
                        response_format: { type: 'json_object' },
                    });

                    const batchResponse = batchCompletion.choices[0]?.message?.content;
                    if (!batchResponse) {
                        throw new Error('Empty response from OpenAI');
                    }

                    const parsed = JSON.parse(batchResponse);
                    const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];

                    if (flashcards.length === 0) {
                        throw new Error('No flashcards returned');
                    }

                    return { flashcards, batch };

                } catch (err) {
                    const isLastAttempt = attempt === MAX_RETRIES - 1;

                    if (isLastAttempt) {
                        console.error(`❌ Batch ${batchIndex + 1} fallito dopo ${MAX_RETRIES} tentativi:`, err.message);
                        // Ritorna placeholder cards
                        const placeholderCards = batch.questions.map(q => ({
                            front: q.trim(),
                            back: '⚠️ Errore nella generazione (max retry raggiunto)',
                            found: false,
                            confidence: 0,
                        }));
                        return { flashcards: placeholderCards, batch };
                    }

                    // Retry con exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    console.log(`⚠️ Batch ${batchIndex + 1} fallito (tentativo ${attempt + 1}/${MAX_RETRIES}), retry in ${delay}ms...`);
                    await this._sleep(delay);
                }
            }
        };

        // Loop parallelo sui batch
        for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
            const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
            console.log(`\n⚡ Processando ${parallelBatches.length} batch in parallelo...`);

            // Processa PARALLEL_BATCHES batch in parallelo
            const results = await Promise.all(
                parallelBatches.map((batch, idx) =>
                    processBatchWithRetry(batch, i + idx)
                )
            );

            // Merge risultati e invia progress
            for (let j = 0; j < results.length; j++) {
                const { flashcards, batch } = results[j];

                for (let cardIdx = 0; cardIdx < flashcards.length; cardIdx++) {
                    const card = flashcards[cardIdx];
                    if (card && card.front && card.back) {
                        // Estrai confidence (default 0 se non trovata, 50 se trovata ma non specificata)
                        let confidence = 0;
                        if (card.found === true || card.found === 'true') {
                            confidence = typeof card.confidence === 'number' && Number.isFinite(card.confidence)
                                ? Math.max(0, Math.min(100, Math.round(card.confidence)))
                                : 50; // Default per risposte trovate
                        } else {
                            confidence = typeof card.confidence === 'number' && Number.isFinite(card.confidence)
                                ? Math.max(0, Math.min(100, Math.round(card.confidence)))
                                : 0; // Default per risposte non trovate
                        }

                        // Estrai sourceSnippet
                        const sourceSnippet = typeof card.sourceSnippet === 'string' && card.sourceSnippet.trim()
                            ? card.sourceSnippet.trim().substring(0, 200)
                            : undefined;

                        // Estrai pageNumber (dall'AI o dal sourceSnippet se contiene marker)
                        let pageNumber = undefined;
                        if (typeof card.pageNumber === 'number' && Number.isFinite(card.pageNumber) && card.pageNumber > 0) {
                            pageNumber = Math.round(card.pageNumber);
                        } else if (sourceSnippet) {
                            // Prova a estrarre dal marker "--- PAGE {n} ---" nel sourceSnippet
                            const pageMatch = sourceSnippet.match(/---\s*PAGE\s+(\d+)\s+---/i);
                            if (pageMatch && pageMatch[1]) {
                                const extractedPage = parseInt(pageMatch[1], 10);
                                if (Number.isFinite(extractedPage) && extractedPage > 0) {
                                    pageNumber = extractedPage;
                                }
                            }
                        }

                        const flashcard = {
                            front: String(card.front).trim(),
                            back: String(card.back).trim(),
                            found: card.found === true || card.found === 'true',
                            confidence,
                            sourceSnippet,
                            pageNumber,
                        };

                        allFlashcards.push(flashcard);

                        if (card.found === true || card.found === 'true') {
                            answersFound++;
                        } else {
                            answersNotFound++;
                        }

                        // Invia eventi SSE
                        const currentIndex = batch.startIndex + cardIdx + 1;
                        if (onProgress && currentIndex <= totalQuestions) {
                            // Progress event
                            onProgress({
                                type: 'progress',
                                current: currentIndex,
                                total: totalQuestions,
                                question: flashcard.front,
                            });

                            // Flashcard event (STREAMING!)
                            onProgress({
                                type: 'flashcard',
                                flashcard: flashcard,
                                index: currentIndex,
                                total: totalQuestions,
                            });
                        }
                    }
                }
            }

            // Sleep ridotto tra batch paralleli
            if (i + PARALLEL_BATCHES < batches.length) {
                await this._sleep(SLEEP_BETWEEN_PARALLEL);
            }
        }

        if (allFlashcards.length === 0) {
            throw AppError.validation('Nessuna flashcard generata. Riprova con documenti diversi.');
        }

        console.log(`✅ Generate ${allFlashcards.length} flashcard (${answersFound} trovate, ${answersNotFound} non trovate)`);

        // =========================================
        // STEP 4: SALVATAGGIO
        // =========================================
        console.log('💾 Salvataggio...');

        let deck;
        if (deckId) {
            // Aggiorna deck esistente
            deck = await Deck.findOne({ _id: deckId, user: userId });
            if (!deck) {
                throw AppError.notFound('Mazzo');
            }
        } else {
            // Crea nuovo deck
            if (!title || typeof title !== 'string') {
                throw AppError.validation('Il titolo del mazzo è obbligatorio per creare un nuovo deck');
            }
            if (examId) {
                await this._validateExamOwnership(tenantScope, examId);
            }
            deck = await this.create(tenantScope, {
                examId: examId || null,
                title,
                description: `Generato automaticamente da Exam Solver - ${new Date().toLocaleDateString('it-IT')}`,
                tags: [],
            });
        }

        // Aggiungi le flashcard al deck
        const cardsToAdd = allFlashcards.map(card => ({
            front: card.front,
            back: card.back,
            easinessFactor: DEFAULT_EASINESS_FACTOR,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(),
            status: 'new',
        }));

        deck.cards.push(...cardsToAdd);
        
        // Salva anche il testo estratto del materiale di studio
        deck.extractedText = this._truncateText(normalizedSourceText, MAX_EXTRACTED_TEXT_STORE_LENGTH);
        
        // Salva il PDF del materiale se non esiste già
        if (!deck.pdfUrl) {
            const sourceFileName = path.basename(sourceFilePath);
            deck.pdfUrl = `/uploads/pdfs/${sourceFileName}`;
        }

        await deck.save();

        // Ingestione vettoriale (background, non bloccante)
        try {
            await vectorStoreService.ingestDeck(deck._id.toString(), normalizedSourceText);
        } catch (err) {
            console.warn('⚠️ Vector ingest error (non bloccante):', err.message);
        }

        const processingTimeMs = Date.now() - startTime;

        // Prepara flashcard con ID per il frontend (per editing manuale)
        // Ricarica il deck per ottenere gli ID delle card appena aggiunte
        const savedDeck = await Deck.findById(deck._id);
        if (!savedDeck) {
            throw AppError.notFound('Mazzo');
        }

        // Le card sono state aggiunte alla fine, quindi prendiamo le ultime N card
        const totalCardsBefore = savedDeck.cards.length - allFlashcards.length;
        const flashcardsWithIds = savedDeck.cards
            .slice(totalCardsBefore) // Prendi solo le card appena aggiunte
            .map((card, idx) => ({
                id: card._id.toString(),
                front: card.front,
                back: card.back,
                found: allFlashcards[idx]?.found || false,
                confidence: allFlashcards[idx]?.confidence ?? 0,
                sourceSnippet: allFlashcards[idx]?.sourceSnippet,
                pageNumber: allFlashcards[idx]?.pageNumber,
            }));

        return {
            deck: savedDeck.toJSON(),
            flashcards: flashcardsWithIds, // Aggiungi flashcard con ID
            stats: {
                questionsExtracted: selectedQuestions.length,
                answersFound,
                answersNotFound,
                totalFlashcards: allFlashcards.length,
                processingTimeMs,
            },
        };
    }

    /**
     * 🎯 EXAM SOLVER - Risolve esami estraendo domande e generando risposte (LEGACY - usa extractExamQuestions + generateExamAnswers)
     * @param {object} tenantScope - Scope del tenant
     * @param {string} questionsFilePath - Path al file con le domande (PDF o TXT)
     * @param {string} sourceFilePath - Path al file con il materiale di studio (PDF)
     * @param {object} options - Opzioni { deckId?, title?, examId? }
     * @returns {Promise<object>} - Deck e statistiche
     */
    async examSolver(tenantScope, questionsFilePath, sourceFilePath, options = {}) {
        const startTime = Date.now();
        const userId = this._getUserId(tenantScope);
        const { deckId, title, examId } = options;

        // Validazione input
        if (!questionsFilePath || typeof questionsFilePath !== 'string') {
            throw AppError.validation('Path file domande non valido');
        }
        if (!sourceFilePath || typeof sourceFilePath !== 'string') {
            throw AppError.validation('Path file materiale non valido');
        }

        // =========================================
        // STEP 1: ESTRAZIONE DOMANDE dal Documento A
        // =========================================
        console.log('📋 STEP 1: Estrazione domande...');
        let questionsText = '';

        // Determina se è PDF o TXT
        const questionsIsPdf = questionsFilePath.toLowerCase().endsWith('.pdf');
        
        if (questionsIsPdf) {
            // Leggi e parsa PDF
            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(questionsFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }

            try {
                const pdfData = await pdfCacheService.parsePDF(questionsFilePath, pdfBuffer);
                questionsText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande. Assicurati che sia un PDF valido.');
            }
        } else {
            // Leggi file TXT
            try {
                questionsText = await fs.readFile(questionsFilePath, 'utf-8');
            } catch (err) {
                console.error('❌ TXT Read Error (Questions):', err.message);
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }
        }

        if (!questionsText || questionsText.trim().length < 50) {
            throw AppError.validation('Il file delle domande non contiene abbastanza testo.');
        }

        const normalizedQuestionsText = this._normalizeExtractedText(questionsText);
        
        // Estrai domande usando OpenAI
        const extractionPrompt = `Sei un EXTRACTION AGENT. Estrai TUTTE le domande dal testo.

REGOLE CRITICHE:

COPIA LETTERALE: Non modificare, non parafrasare, non correggere errori
IDENTIFICA come domande: frasi con "?", numerate (1. 2. 3.), imperativi (Spiega, Definisci, Descrivi)
OUTPUT: JSON array {"questions": ["testo esatto 1", "testo esatto 2"]}

TESTO:
"""
${this._truncateText(normalizedQuestionsText, 50000, '\n\n[...testo troncato...]')}
"""

Estrai TUTTE le domande e restituisci SOLO JSON valido:`;

        let questions = [];
        try {
            const extractionCompletion = await openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages: [
                    { role: 'system', content: 'Sei un agente di estrazione specializzato. Restituisci SOLO JSON valido.' },
                    { role: 'user', content: extractionPrompt },
                ],
                temperature: 0.1,
                max_completion_tokens: 4000,
                response_format: { type: 'json_object' },
            });

            const extractionResponse = extractionCompletion.choices[0]?.message?.content;
            if (extractionResponse) {
                try {
                    const parsed = JSON.parse(extractionResponse);
                    if (Array.isArray(parsed.questions)) {
                        questions = parsed.questions.filter(q => q && typeof q === 'string' && q.trim().length > 0);
                    } else if (Array.isArray(parsed)) {
                        questions = parsed.filter(q => q && typeof q === 'string' && q.trim().length > 0);
                    }
                } catch (parseErr) {
                    console.error('❌ JSON Parse Error (Questions):', parseErr.message);
                    // Fallback: cerca pattern comuni nel testo
                    questions = this._extractQuestionsFallback(normalizedQuestionsText);
                }
            }
        } catch (err) {
            console.error('❌ OpenAI Extraction Error:', err.message);
            // Fallback: estrazione pattern-based
            questions = this._extractQuestionsFallback(normalizedQuestionsText);
        }

        if (questions.length === 0) {
            throw AppError.validation('Nessuna domanda trovata nel documento. Verifica che il file contenga domande d\'esame.');
        }

        console.log(`✅ Estratte ${questions.length} domande`);

        // =========================================
        // STEP 2: ESTRAZIONE TESTO dal Documento B
        // =========================================
        console.log('📚 STEP 2: Estrazione materiale di studio...');
        let sourceBuffer;
        try {
            sourceBuffer = await fs.readFile(sourceFilePath);
        } catch (err) {
            console.error('❌ PDF Read Error (Source):', err.message);
            throw AppError.validation('Impossibile leggere il file del materiale di studio.');
        }

        let sourceText = '';
        try {
            const pdfData = await pdfCacheService.parsePDF(sourceFilePath, sourceBuffer);
            sourceText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            console.error('❌ PDF Parse Error (Source):', err.message);
            throw AppError.validation('Impossibile leggere il file del materiale di studio. Assicurati che sia un PDF valido.');
        }

        if (!sourceText || sourceText.trim().length < 100) {
            throw AppError.validation('Il file del materiale di studio non contiene abbastanza testo.');
        }

        const normalizedSourceText = this._normalizeExtractedText(sourceText);
        const sourceTextForContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');

        console.log(`✅ Materiale estratto: ${normalizedSourceText.length} caratteri`);

        // =========================================
        // STEP 3: GENERAZIONE BATCH delle risposte
        // =========================================
        console.log('🤖 STEP 3: Generazione risposte...');
        
        // Processa in batch per evitare token limit
        const BATCH_SIZE = 10; // Processa 10 domande alla volta
        const allFlashcards = [];
        let answersFound = 0;
        let answersNotFound = 0;

        for (let i = 0; i < questions.length; i += BATCH_SIZE) {
            const batch = questions.slice(i, i + BATCH_SIZE);
            console.log(`🔄 Processando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)} (${batch.length} domande)`);

            const batchPrompt = `Sei un TUTOR ACCADEMICO. Per OGNI domanda, genera una risposta usando SOLO il contesto.

CONTESTO:
"""
${sourceTextForContext}
"""

DOMANDE:
${batch.map((q, idx) => `${i + idx + 1}. ${q}`).join('\n')}

REGOLE:

Il campo "front" deve contenere la domanda ESATTA (copiata letteralmente)
Il campo "back" contiene la risposta (max 150 parole)
Se la risposta non è nel contesto: back = "⚠️ Risposta non trovata nel materiale fornito"
Il campo "found" indica se la risposta è stata trovata (true/false)

OUTPUT JSON:
{"flashcards": [{"front": "domanda esatta", "back": "risposta", "found": true/false}]}

Genera una risposta per OGNI domanda nella lista.`;

            try {
                const batchCompletion = await openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages: [
                        { role: 'system', content: 'Sei un tutor accademico. Restituisci SOLO JSON valido.' },
                        { role: 'user', content: batchPrompt },
                    ],
                    temperature: 0.1,
                    max_completion_tokens: 4000,
                    response_format: { type: 'json_object' },
                });

                const batchResponse = batchCompletion.choices[0]?.message?.content;
                if (batchResponse) {
                    try {
                        const parsed = JSON.parse(batchResponse);
                        const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
                        
                        for (const card of flashcards) {
                            if (card && card.front && card.back) {
                                allFlashcards.push({
                                    front: String(card.front).trim(),
                                    back: String(card.back).trim(),
                                    found: card.found === true || card.found === 'true',
                                });
                                
                                if (card.found === true || card.found === 'true') {
                                    answersFound++;
                                } else {
                                    answersNotFound++;
                                }
                            }
                        }
                    } catch (parseErr) {
                        console.error('❌ JSON Parse Error (Batch):', parseErr.message);
                    }
                }
            } catch (err) {
                console.error(`❌ OpenAI Batch Error (${i}-${i + batch.length}):`, err.message);
                // Crea card placeholder per questo batch
                for (const question of batch) {
                    allFlashcards.push({
                        front: question.trim(),
                        back: '⚠️ Errore nella generazione della risposta',
                        found: false,
                    });
                    answersNotFound++;
                }
            }

            // Piccola pausa tra batch per evitare rate limiting
            if (i + BATCH_SIZE < questions.length) {
                await this._sleep(500);
            }
        }

        if (allFlashcards.length === 0) {
            throw AppError.validation('Nessuna flashcard generata. Riprova con documenti diversi.');
        }

        console.log(`✅ Generate ${allFlashcards.length} flashcard (${answersFound} trovate, ${answersNotFound} non trovate)`);

        // =========================================
        // STEP 4: SALVATAGGIO
        // =========================================
        console.log('💾 STEP 4: Salvataggio...');

        let deck;
        if (deckId) {
            // Aggiorna deck esistente
            deck = await Deck.findOne({ _id: deckId, user: userId });
            if (!deck) {
                throw AppError.notFound('Mazzo');
            }
        } else {
            // Crea nuovo deck
            if (!title || typeof title !== 'string') {
                throw AppError.validation('Il titolo del mazzo è obbligatorio per creare un nuovo deck');
            }
            if (examId) {
                await this._validateExamOwnership(tenantScope, examId);
            }
            deck = await this.create(tenantScope, {
                examId: examId || null,
                title,
                description: `Generato automaticamente da Exam Solver - ${new Date().toLocaleDateString('it-IT')}`,
                tags: [],
            });
        }

        // Aggiungi le flashcard al deck
        const cardsToAdd = allFlashcards.map(card => ({
            front: card.front,
            back: card.back,
            easinessFactor: DEFAULT_EASINESS_FACTOR,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(),
            status: 'new',
        }));

        deck.cards.push(...cardsToAdd);
        
        // Salva anche il testo estratto del materiale di studio
        deck.extractedText = this._truncateText(normalizedSourceText, MAX_EXTRACTED_TEXT_STORE_LENGTH);
        
        // Salva il PDF del materiale se non esiste già
        if (!deck.pdfUrl) {
            const sourceFileName = path.basename(sourceFilePath);
            deck.pdfUrl = `/uploads/pdfs/${sourceFileName}`;
        }

        await deck.save();

        // Ingestione vettoriale (background, non bloccante)
        try {
            await vectorStoreService.ingestDeck(deck._id.toString(), normalizedSourceText);
        } catch (err) {
            console.warn('⚠️ Vector ingest error (non bloccante):', err.message);
        }

        const processingTimeMs = Date.now() - startTime;

        return {
            deck: deck.toJSON(),
            stats: {
                questionsExtracted: questions.length,
                answersFound,
                answersNotFound,
                totalFlashcards: allFlashcards.length,
                processingTimeMs,
            },
        };
    }

    /**
     * Fallback per estrazione domande pattern-based
     * @private
     */
    _extractQuestionsFallback(text) {
        const questions = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Pattern: frasi con "?"
            if (line.includes('?') && line.length > 10) {
                questions.push(line);
                continue;
            }

            // Pattern: numerate (1. 2. 3. oppure a) b) c))
            if (/^(\d+\.|[a-z]\))\s+/.test(line) && line.length > 15) {
                questions.push(line);
                continue;
            }

            // Pattern: imperativi comuni
            const imperativePatterns = /^(Spiega|Definisci|Descrivi|Elenca|Confronta|Illustra|Parlare|Trattare)/i;
            if (imperativePatterns.test(line) && line.length > 15) {
                questions.push(line);
            }
        }

        return questions;
    }

    /**
     * Sleep utility per pause tra batch
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateCardsFromAI(_tenantScope, _payload) {
        return null;
    }

    // =========================================
    // PRIVATE HELPERS
    // =========================================

    async _validateExamOwnership(tenantScope, examId) {
        const userId = this._getUserId(tenantScope);
        const exam = await Exam.findOne({ _id: examId, user: userId });
        if (!exam) {
            throw AppError.notFound('Esame non trovato');
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

                // Valida che abbiamo almeno page_number e original_quote (min 150 char = 1-2 righe)
                if (pageNumber !== null && pageNumber > 0 && originalQuote && originalQuote.length >= 150) {
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

    /**
     * 🏗️ Analisi Struttura Documento - LOCALE (senza AI)
     * Usa pattern matching per identificare tipo documento e contesto
     */
    _analyzeDocumentStructure(extractedText) {
        const defaultBlueprint = {
            documentType: 'other',
            densityScore: 0.5,
            globalContext: 'Documento generico',
            mainTopics: [],
        };

        if (!extractedText || typeof extractedText !== 'string') {
            return defaultBlueprint;
        }

        const sampleText = this._truncateText(extractedText, 25000);
        if (!sampleText || sampleText.trim().length === 0) {
            return defaultBlueprint;
        }

        // 1. Rileva tipo documento tramite pattern matching
        const documentType = this._detectDocumentType(sampleText);

        // 2. Estrai contesto globale dai primi header/titoli
        const globalContext = this._extractGlobalContext(sampleText);

        // 3. Estrai topic principali dagli header
        const mainTopics = this._extractMainTopics(sampleText);

        // 4. Calcola densità contenuto
        const densityScore = this._calculateDensityScore(sampleText);

        console.log(`📋 Blueprint locale: ${documentType}, density: ${densityScore.toFixed(2)}`);

        return { documentType, globalContext, mainTopics, densityScore };
    }

    /**
     * 📄 Rileva tipo documento tramite pattern
     */
    _detectDocumentType(text) {
        const patterns = {
            textbook: [
                /capitolo\s+\d+/gi,
                /chapter\s+\d+/gi,
                /sezione\s+\d+/gi,
                /eserciz[io]/gi,
                /definizione/gi,
                /teorema/gi,
                /dimostrazione/gi,
                /corollario/gi,
                /lemma/gi,
            ],
            slide_deck: [
                /slide\s+\d+/gi,
                /\bppt\b/gi,
                /•\s+/g, // Bullet points frequenti
                /→|⇒|➔/g, // Frecce frequenti
            ],
            research_paper: [
                /abstract/gi,
                /introduction/gi,
                /methodology/gi,
                /results/gi,
                /conclusion/gi,
                /references/gi,
                /bibliography/gi,
                /et al\./gi,
                /\[\d+\]/g, // Citations [1], [2]
            ],
            exam_text: [
                /esame/gi,
                /exam/gi,
                /domand[ae]/gi,
                /question/gi,
                /risposta/gi,
                /answer/gi,
                /punti:/gi,
                /points:/gi,
                /voto/gi,
                /grade/gi,
            ],
            notes: [
                /appunt[io]/gi,
                /notes/gi,
                /lezione/gi,
                /lecture/gi,
                /corso/gi,
                /course/gi,
            ],
        };

        const scores = {};
        for (const [type, typePatterns] of Object.entries(patterns)) {
            let count = 0;
            for (const pattern of typePatterns) {
                const matches = text.match(pattern);
                if (matches) count += matches.length;
            }
            scores[type] = count;
        }

        // Trova il tipo con più match (soglia minima 3)
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (sorted[0][1] >= 3) {
            return sorted[0][0];
        }

        return 'other';
    }

    /**
     * 📝 Estrai contesto globale COMPLETO dal documento
     * Crea un riassunto dettagliato per dare contesto all'AI
     */
    _extractGlobalContext(text) {
        // Limita testo per evitare problemi di memoria
        const sampleText = text.slice(0, 50000);
        const contextParts = [];

        // 1. Cerca titolo principale (prima riga significativa o header)
        const titlePatterns = [
            /^#\s+(.+)$/m,
            /^([A-Z][A-Z\s]{5,60})$/m, // Titolo in maiuscolo
            /^(Capitolo|Chapter)\s+\d+[:\s-]+(.+)$/im,
            /^(Corso|Course|Materia|Subject)[:\s]+(.+)$/im,
        ];

        let mainTitle = '';
        for (const pattern of titlePatterns) {
            const match = sampleText.match(pattern);
            if (match) {
                mainTitle = (match[2] || match[1]).trim();
                if (mainTitle.length > 5) break;
            }
        }
        if (mainTitle) contextParts.push(mainTitle);

        // 2. Estrai TUTTI i titoli/sezioni per capire la struttura
        const sectionTitles = [];
        const sectionPatterns = [
            /^#+\s+(.{5,80})$/gm,
            /^(\d+\.[\d.]*)\s+([A-Z][^\n]{5,60})$/gm,
            /^(•|▪|➤|-)\s*([A-Z][^\n]{10,60})$/gm,
        ];

        for (const pattern of sectionPatterns) {
            let match;
            pattern.lastIndex = 0; // Reset regex
            while ((match = pattern.exec(sampleText)) !== null && sectionTitles.length < 10) {
                const title = (match[2] || match[1]).trim();
                if (title.length > 5 && !sectionTitles.includes(title)) {
                    sectionTitles.push(title);
                }
            }
        }
        if (sectionTitles.length > 0) {
            contextParts.push(`Argomenti trattati: ${sectionTitles.join(', ')}`);
        }

        // 3. Estrai parole chiave tecniche dal testo (frequenza alta)
        const technicalTerms = this._extractTechnicalTerms(sampleText);
        if (technicalTerms.length > 0) {
            contextParts.push(`Termini chiave: ${technicalTerms.slice(0, 15).join(', ')}`);
        }

        // 4. Identifica il campo/materia dal contenuto
        const field = this._identifyField(sampleText);
        if (field) {
            contextParts.push(`Campo: ${field}`);
        }

        // Combina tutto in un contesto ricco
        const fullContext = contextParts.join('. ');
        return fullContext.length > 10 ? fullContext : 'Documento di studio';
    }

    /**
     * 🔬 Estrai termini tecnici dal testo (con limite memoria)
     */
    _extractTechnicalTerms(text) {
        // Limita testo per evitare problemi di memoria
        const sampleText = text.slice(0, 50000);

        // Stopwords italiane e inglesi
        const stopwords = new Set([
            'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da',
            'in', 'con', 'su', 'per', 'tra', 'fra', 'che', 'non', 'come', 'anche',
            'più', 'dove', 'quando', 'essere', 'avere', 'fare', 'dire', 'questo',
            'quello', 'suo', 'loro', 'tutto', 'ogni', 'altro', 'molto', 'poco',
            'nel', 'nella', 'dello', 'della', 'degli', 'delle', 'sono', 'sia',
            'hanno', 'può', 'deve', 'quindi', 'perché', 'page', 'end', 'the', 'and',
            'that', 'with', 'from', 'this', 'which', 'about', 'into', 'through',
            'dell', 'all', 'alla', 'alle', 'agli', 'agli', 'nei', 'nelle', 'sui',
            'sulla', 'sulle', 'dagli', 'dalle', 'quali', 'quale', 'quanto', 'quanti',
            'stata', 'stato', 'stati', 'state', 'viene', 'vengono', 'fatto', 'fatta',
            'essere', 'stata', 'stato', 'come', 'così', 'dopo', 'prima', 'ancora',
            'sempre', 'solo', 'senza', 'verso', 'oltre', 'sotto', 'sopra', 'mentre'
        ]);

        // Conta frequenza parole significative (4+ caratteri, non stopword)
        const wordFreq = {};
        const words = sampleText.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/);

        for (const word of words) {
            if (word.length >= 4 && !stopwords.has(word) && !/^\d+$/.test(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        }

        // Ordina per frequenza e prendi i top termini (min 3 occorrenze)
        return Object.entries(wordFreq)
            .filter(([_, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    /**
     * 🎓 Identifica il campo/materia del documento
     */
    _identifyField(text) {
        // Limita testo per evitare problemi di memoria
        const lowerText = text.slice(0, 50000).toLowerCase();

        const fieldIndicators = {
            'Economia e Finanza': ['bilancio', 'economia', 'finanza', 'mercato', 'investimento', 'capitale', 'debito', 'credito', 'banca', 'fiscale', 'tributario', 'imposta'],
            'Diritto': ['legge', 'norma', 'giuridico', 'contratto', 'diritto', 'costituzione', 'codice', 'sentenza', 'tribunale', 'giudice'],
            'Medicina e Biologia': ['cellula', 'organismo', 'malattia', 'sintomo', 'diagnosi', 'terapia', 'farmaco', 'anatomia', 'fisiologia', 'patologia'],
            'Informatica': ['algoritmo', 'programmazione', 'software', 'database', 'rete', 'sistema operativo', 'codice', 'variabile', 'funzione'],
            'Ingegneria': ['progettazione', 'struttura', 'materiale', 'meccanica', 'elettronica', 'circuito', 'sistema', 'energia'],
            'Matematica': ['teorema', 'dimostrazione', 'funzione', 'equazione', 'derivata', 'integrale', 'matrice', 'vettore'],
            'Fisica': ['forza', 'energia', 'massa', 'velocità', 'accelerazione', 'campo', 'onda', 'particella'],
            'Chimica': ['molecola', 'atomo', 'reazione', 'elemento', 'composto', 'soluzione', 'acido', 'base'],
            'Scienze Politiche': ['stato', 'governo', 'parlamento', 'democrazia', 'politica', 'elezione', 'partito', 'pubblico', 'amministrazione'],
            'Psicologia': ['comportamento', 'cognizione', 'emozione', 'personalità', 'sviluppo', 'apprendimento', 'memoria'],
        };

        let bestField = '';
        let maxScore = 0;

        for (const [field, keywords] of Object.entries(fieldIndicators)) {
            let score = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'gi');
                const matches = lowerText.match(regex);
                if (matches) score += matches.length;
            }
            if (score > maxScore) {
                maxScore = score;
                bestField = field;
            }
        }

        return maxScore >= 5 ? bestField : '';
    }

    /**
     * 📚 Estrai topic principali dagli header - MIGLIORATO
     */
    _extractMainTopics(text) {
        const topics = [];

        // Pattern per trovare titoli e sezioni
        const headerPatterns = [
            /^#+\s+(.{5,80})$/gm,                          // Markdown headers
            /^(\d+\.[\d.]*)\s+([^\n]{5,60})$/gm,           // Numbered sections
            /^(Capitolo|Chapter)\s+\d+[:\s-]+(.+)$/gim,
            /^(Sezione|Section)\s+[\d.]+[:\s-]+(.+)$/gim,
            /^([A-Z][A-Z\s]{5,50}):?\s*$/gm,               // ALL CAPS titles
            /^(•|▪|➤|►)\s*([A-Z][^\n]{10,60})$/gm,        // Bullet points
        ];

        for (const pattern of headerPatterns) {
            let match;
            pattern.lastIndex = 0; // Reset regex
            while ((match = pattern.exec(text)) !== null && topics.length < 15) {
                const topic = (match[2] || match[1]).trim();
                if (topic.length > 5 && topic.length < 80) {
                    const cleaned = topic.replace(/^[\d.\s:•▪➤►-]+/, '').trim();
                    if (cleaned.length > 5 && !topics.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
                        topics.push(cleaned);
                    }
                }
            }
        }

        return topics.slice(0, 10);
    }

    /**
     * 📊 Calcola densità contenuto
     */
    _calculateDensityScore(text) {
        // Fattori che aumentano la densità:
        // - Presenza di definizioni, teoremi, formule
        // - Rapporto parole/caratteri
        // - Presenza di terminologia tecnica

        const definitionCount = (text.match(/definizione|teorema|lemma|corollario|propriet[àa]/gi) || []).length;
        const formulaCount = (text.match(/[=+\-*/^√∫∑∏]/g) || []).length;
        const wordCount = text.split(/\s+/).length;
        const charCount = text.length;

        // Rapporto definizioni per 1000 parole
        const defDensity = Math.min(1, (definitionCount / wordCount) * 100);

        // Rapporto formule per 1000 caratteri
        const formulaDensity = Math.min(1, (formulaCount / charCount) * 50);

        // Densità media parole (più corte = più dense)
        const avgWordLength = charCount / Math.max(1, wordCount);
        const wordDensity = avgWordLength > 6 ? 0.7 : avgWordLength > 5 ? 0.5 : 0.3;

        // Score finale
        const score = (defDensity * 0.4) + (formulaDensity * 0.3) + (wordDensity * 0.3);
        return Math.max(0.2, Math.min(1, score));
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

    _normalizeStudyMode(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'flashcard';
        const allowed = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
        return allowed.includes(normalized) ? normalized : 'flashcard';
    }

    _normalizeSessionFocus(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'smart';
        const allowed = ['smart', 'due', 'weak', 'all'];
        return allowed.includes(normalized) ? normalized : 'smart';
    }

    _normalizeSessionDirection(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'front';
        const allowed = ['front', 'back', 'mixed'];
        return allowed.includes(normalized) ? normalized : 'front';
    }

    _getDefaultSessionLimit(mode) {
        const defaults = {
            flashcard: 20,
            quiz: 20,
            typing: 20,
            mix: 30,
            sprint: 15,
            focus: 20,
            exam: 30,
        };
        return defaults[mode] || 20;
    }

    _resolveCardId(card) {
        if (!card) return '';
        return String(card.id || card._id || '');
    }

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
    }

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
    }

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
    }

    _buildCardModes(mode, cards) {
        if (mode !== 'mix' && mode !== 'exam') return undefined;
        const cycle = mode === 'exam'
            ? ['quiz', 'typing', 'quiz', 'flashcard', 'typing']
            : ['quiz', 'typing', 'flashcard'];
        return cards.reduce((acc, card, index) => {
            acc[this._resolveCardId(card)] = cycle[index % cycle.length];
            return acc;
        }, {});
    }

    _selectSessionCards({ cards, dueCards, mode, focus, limit, now }) {
        let selection = [];

        if (mode === 'exam') {
            selection = this._buildExamSelection(cards, limit || cards.length);
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

    _toNumber(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    // =========================================
    // RECOVERY PLAN - Reset Cards & AI Generation
    // =========================================

    /**
     * Resetta le carte di tutti i deck associati a un esame
     * @param {object} tenantScope - Scope del tenant
     * @param {string} examId - ID dell'esame
     * @param {string} type - 'all' per reset completo, 'hard-only' per solo carte difficili
     * @returns {Promise<object>} - Statistiche del reset
     */
    async resetExamCards(tenantScope, examId, type = 'all') {
        console.log('[StudyService] resetExamCards chiamato:', { examId, type });
        const userId = this._getUserId(tenantScope);
        console.log('[StudyService] userId:', userId);

        // Verifica che l'esame esista e appartenga all'utente
        const exam = await Exam.findOne({ _id: examId, user: userId });
        if (!exam) {
            console.error('[StudyService] Esame non trovato:', { examId, userId });
            throw AppError.notFound('Esame non trovato');
        }
        console.log('[StudyService] Esame trovato:', exam.title);

        // Trova tutti i deck associati a questo esame
        const decks = await Deck.find({ examId, user: userId });
        console.log('[StudyService] Trovati', decks.length, 'deck per l\'esame');
        if (decks.length === 0) {
            console.warn('[StudyService] Nessun mazzo trovato per esame:', examId);
            throw AppError.notFound('Nessun mazzo trovato per questo esame');
        }

        let totalReset = 0;
        let hardReset = 0;

        for (const deck of decks) {
            let cardsToReset = [];

            if (type === 'all') {
                // Reset tutte le carte
                cardsToReset = deck.cards;
            } else if (type === 'hard-only') {
                // Reset solo carte difficili (status: 'learning' o con basso easinessFactor)
                cardsToReset = deck.cards.filter(card => {
                    const isHard = card.status === 'learning' || 
                                   card.easinessFactor < 2.0 || 
                                   card.repetitions === 0 ||
                                   (card.reviewHistory && card.reviewHistory.length > 0 && 
                                    card.reviewHistory.slice(-3).some(r => r.rating < 3));
                    return isHard;
                });
            }

            // Reset delle carte selezionate
            for (const card of cardsToReset) {
                card.easinessFactor = DEFAULT_EASINESS_FACTOR;
                card.interval = 0;
                card.repetitions = 0;
                card.nextReviewDate = new Date();
                card.status = 'new';
                card.lastReviewed = null;
                // Mantieni reviewHistory per storico, ma resetta i parametri SM-2
            }

            if (type === 'all') {
                totalReset += cardsToReset.length;
            } else {
                hardReset += cardsToReset.length;
            }

            await deck.save();
        }

        const result = {
            decksAffected: decks.length,
            cardsReset: type === 'all' ? totalReset : hardReset,
            type,
        };
        console.log('[StudyService] resetExamCards completato:', result);
        return result;
    }

    /**
     * Genera domande AI di approfondimento basate sulle difficoltà segnalate
     * @param {object} tenantScope - Scope del tenant
     * @param {string} examId - ID dell'esame
     * @param {string[]} difficulties - Array di difficoltà segnalate (es. ['concepts', 'time'])
     * @returns {Promise<object>} - Statistiche della generazione
     */
    async generateRecoveryQuestions(tenantScope, examId, difficulties = []) {
        console.log('[StudyService] generateRecoveryQuestions chiamato:', { examId, difficulties });
        const userId = this._getUserId(tenantScope);
        console.log('[StudyService] userId:', userId);

        // Verifica che l'esame esista e appartenga all'utente
        const exam = await Exam.findOne({ _id: examId, user: userId });
        if (!exam) {
            console.error('[StudyService] Esame non trovato:', { examId, userId });
            throw AppError.notFound('Esame non trovato');
        }
        console.log('[StudyService] Esame trovato:', exam.title);

        // Trova tutti i deck associati a questo esame
        const decks = await Deck.find({ examId, user: userId });
        console.log('[StudyService] Trovati', decks.length, 'deck per l\'esame');
        if (decks.length === 0) {
            console.warn('[StudyService] Nessun mazzo trovato per esame:', examId);
            throw AppError.notFound('Nessun mazzo trovato per questo esame');
        }

        // Mappa delle difficoltà a descrizioni
        const difficultyMap = {
            concepts: 'concetti difficili e complessi',
            time: 'gestione del tempo e velocità di risposta',
            anxiety: 'ansia e vuoti di memoria',
            unexpected: 'domande impreviste e argomenti non preparati',
        };

        const difficultyDescriptions = difficulties
            .map(d => difficultyMap[d] || d)
            .filter(Boolean);

        const contextPrompt = difficultyDescriptions.length > 0
            ? `L'utente ha riscontrato difficoltà con: ${difficultyDescriptions.join(', ')}.`
            : 'L\'utente ha bisogno di approfondire gli argomenti dell\'esame.';

        let totalGenerated = 0;
        const generatedByDeck = [];

        for (const deck of decks) {
            // Prepara il contesto per la generazione
            const deckContext = deck.extractedText || '';
            const existingCards = deck.cards || [];
            
            // Estrai argomenti dalle carte esistenti per contesto
            const topics = existingCards
                .slice(0, 20) // Limita a prime 20 carte per contesto
                .map(c => c.front)
                .join('\n');

            const prompt = `Sei un tutor esperto che aiuta studenti a prepararsi per esami universitari.

${contextPrompt}

CONTESTO ESAME: "${exam.title}"
${exam.description ? `DESCRIZIONE: ${exam.description}` : ''}

ARGOMENTI ESISTENTI NEL MAZZO:
${topics || 'Nessun argomento specifico'}

${deckContext ? `\nCONTENUTO DEL DOCUMENTO:\n${deckContext.substring(0, 5000)}` : ''}

IL TUO COMPITO:
Genera esattamente 10 nuove flashcard di approfondimento che aiutino l'utente a:
1. Comprendere meglio i concetti difficili
2. Prepararsi per domande impreviste
3. Rafforzare la memoria e ridurre l'ansia
4. Gestire meglio il tempo durante l'esame

REGOLE:
- Le domande devono essere SPECIFICHE e AZIONABILI
- Le risposte devono essere COMPLETE ma CONCISE (minimo 30 parole)
- Evita duplicati con le carte esistenti
- Focus su approfondimento e comprensione profonda
- Usa esempi pratici quando possibile

FORMATO JSON:
{
  "cards": [
    {
      "front": "Domanda specifica e approfondita...",
      "back": "Risposta completa con spiegazione dettagliata..."
    }
  ]
}`;

            try {
                const completion = await openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Sei un esperto tutor universitario. Generi flashcard di alta qualità per aiutare gli studenti a superare esami difficili. Rispondi SOLO con JSON valido, senza markdown, senza testo extra.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 3000,
                });

                const content = completion.choices[0]?.message?.content || '';
                const parsed = this._parseJSONResponse(content);
                const generatedCards = this._extractGeneratedCards(parsed);

                if (generatedCards.length === 0) {
                    console.warn(`[StudyService] generateRecoveryQuestions: Nessuna carta generata per deck ${deck._id}`);
                    continue;
                }

                // Limita a 10 carte come richiesto
                const cardsToAdd = generatedCards.slice(0, 10).map(card => ({
                    front: (card.front || card.question || '').trim(),
                    back: (card.back || card.answer || '').trim(),
                    easinessFactor: DEFAULT_EASINESS_FACTOR,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date(),
                    status: 'new',
                })).filter(c => c.front.length > 10 && c.back.length > 20);

                if (cardsToAdd.length > 0) {
                    deck.cards.push(...cardsToAdd);
                    await deck.save();
                    totalGenerated += cardsToAdd.length;
                    generatedByDeck.push({
                        deckId: deck._id.toString(),
                        deckTitle: deck.title,
                        count: cardsToAdd.length,
                    });
                }
            } catch (error) {
                console.error(`[StudyService] generateRecoveryQuestions: Errore per deck ${deck._id}:`, error.message);
                // Continua con gli altri deck anche se uno fallisce
            }
        }

        const result = {
            decksAffected: generatedByDeck.length,
            totalGenerated,
            generatedByDeck,
        };
        console.log('[StudyService] generateRecoveryQuestions completato:', result);
        return result;
    }

    /**
     * Helper per parsare risposte JSON dall'AI
     */
    _parseJSONResponse(content) {
        if (!content || typeof content !== 'string') return null;

        // Rimuovi markdown code blocks se presenti
        const cleaned = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch (e) {
            // Prova a estrarre JSON da stringhe che contengono altro testo
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    console.warn('[StudyService] _parseJSONResponse: Fallito parsing JSON:', e2.message);
                }
            }
            return null;
        }
    }
}

module.exports = new StudyService();
