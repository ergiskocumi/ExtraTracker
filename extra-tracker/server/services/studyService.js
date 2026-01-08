/**
 * 🧠 STUDY SERVICE - Learning & Flashcards (SM-2)
 * ===============================================
 *
 * Service layer per la gestione dei mazzi di flashcard
 * e del scheduling SM-2.
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

const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
// Adaptive Chunking Configuration - Tiers
const TIER_S_THRESHOLD = 30000; // Fascia S (Corto/Slide): < 30k caratteri
const TIER_M_THRESHOLD = 100000; // Fascia M (Capitolo/Tesina): 30k - 100k caratteri
const TIER_L_THRESHOLD = 100000; // Fascia L (Libro/Manuale): > 100k caratteri

// Configurazioni per fascia
const TIER_S_CONFIG = {
    chunkSize: null, // Singolo chunk (tutto il testo)
    targetCardsTotal: 20, // Alta densità per file piccoli
    cardsPerChunk: 20,
};

const TIER_M_CONFIG = {
    chunkSize: 40000,
    targetCardsTotal: 35,
    cardsPerChunk: null, // Calcolato dinamicamente
};

const TIER_L_CONFIG = {
    chunkSize: 50000, // Più stabile per gpt-4o-mini con output JSON
    targetCardsTotal: null, // Calcolato dinamicamente (50+)
    cardsPerChunk: null, // Calcolato dinamicamente
};

const OVERLAP = 500; // Sovrapposizione per non perdere frasi a metà
// Safety Cap: Limite massimo di flashcard per singola chiamata API
// Previene errori JSON.parse() dovuti a output token limit (gpt-4o-mini ha ~4k-16k token output max)
// Una flashcard JSON occupa ~80-100 token, quindi 30 card = ~3000 token (sicuro)
const MAX_CARDS_PER_REQUEST = 30;
const MAX_EXTRACTED_TEXT_STORE_LENGTH = 200000; // Limite DB: evita documenti enormi
const MAX_PDF_TEXT_LENGTH = 15000; // DEPRECATO: mantenuto per retrocompatibilità
const MAX_TUTOR_CONTEXT_LENGTH = 50000; // Default sicuro (override per modelli più piccoli)
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

// Inizializza OpenAI client
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
    // CRUD BASE
    // =========================================

    /**
     * Crea un nuovo mazzo collegato a un goal dell'utente.
     */
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

    /**
     * Aggiunge una nuova card a un mazzo esistente.
     */
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

    /**
     * Modifica una card esistente in un mazzo.
     */
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
     * Elimina una card da un mazzo.
     */
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
     * Elimina un mazzo (e tutte le sue card).
     */
    async deleteDeck(tenantScope, deckId) {
        return this.delete(tenantScope, deckId);
    }

    /**
     * Restituisce un singolo mazzo con tutte le sue carte.
     * Usato per il refresh della sessione di studio.
     */
    /**
     * Aggiorna le impostazioni di un deck (algoritmo e AI)
     */
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

    /**
     * Ottiene analytics dettagliate per un deck
     */
    async getDeckAnalytics(tenantScope, deckId) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        const cards = Array.isArray(deck.cards) ? deck.cards : [];
        const now = new Date();

        // Calcola statistiche dalle carte
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

        // Analytics del deck
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
        return deck.toJSON();
    }

    // =========================================
    // STUDY SESSION
    // =========================================

    /**
     * Restituisce una sessione di studio per un mazzo specifico.
     * Supporta modes: flashcard | quiz | typing
     */
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
    // DASHBOARD
    // =========================================

    /**
     * Restituisce TUTTI i deck dell'utente per la dashboard.
     * Calcola quante carte sono in scadenza per ogni mazzo.
     *
     * @param {Object} tenantScope
     * @returns {Promise<Object>} { decks, dueCardCount }
     */
    async getAllDecks(tenantScope) {
        const userId = this._getUserId(tenantScope);
        const now = new Date();

        // Recupera TUTTI i mazzi dell'utente
        const decks = await Deck.find({ user: userId })
            .sort({ createdAt: -1 });

        let totalDueCount = 0;

        const normalizedDecks = decks.map(deck => {
            const deckJson = deck.toJSON();
            const cards = Array.isArray(deckJson.cards) ? deckJson.cards : [];
            
            // Calcola carte in scadenza
            const dueCards = cards.filter(card => {
                const nextReview = new Date(card.nextReviewDate);
                return nextReview <= now;
            });

            totalDueCount += dueCards.length;

            return {
                ...deckJson,
                totalCards: cards.length,
                dueCount: dueCards.length,
                // NON filtrare le carte qui, restituisci il totale
            };
        });

        return {
            decks: normalizedDecks,
            dueCardCount: totalDueCount,
        };
    }

    /**
     * Restituisce tutti i deck che hanno card in scadenza.
     * @deprecated Usa getAllDecks per la dashboard
     *
     * @param {Object} tenantScope
     * @returns {Promise<Array<Object>>} Deck con sole card in scadenza
     */
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
    // TYPING MODE - ANSWER VERIFY
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
    // SESSION COMPLETE (GAMIFICATION)
    // =========================================

    /**
     * Registra la fine di una sessione di studio e assegna XP.
     *
     * @param {Object} tenantScope
     * @param {string} deckId
     * @param {Object} sessionData
     * @returns {Promise<Object>}
     */
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
    // SM-2 REVIEW LOGIC
    // =========================================

    /**
     * Processa una review con algoritmo SM-2.
     *
     * Algoritmo SM-2 (SuperMemo 2):
     * 1) Aggiorna EF (Easiness Factor):
     *    EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
     *    con EF minimo = 1.3
     * 2) Calcola il nuovo intervallo (in giorni):
     *    - rep = 0  -> 1 giorno
     *    - rep = 1  -> 6 giorni
     *    - rep > 1  -> interval * EF
     * 3) Se rating < 3: resetta repetitions = 0 e interval = 1
     * 4) nextReviewDate = oggi + interval (in giorni)
     *
     * @param {Object} tenantScope - req.tenantScope
     * @param {string} deckId - ID del mazzo
     * @param {string} cardId - ID della card
     * @param {number} rating - 1..5 (1=Forgot, 3=Good, 5=Easy)
     * @param {Object} sessionMeta - opzionale, usato a fine sessione
     * @returns {Promise<{card: Object, stats: Object}>}
     */
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

        // Usa l'algoritmo configurato per il deck (default: sm2)
        const algorithmName = deck.algorithm || 'sm2';
        const algorithmResult = AlgorithmFactory.processReview(card, quality, algorithmName);

        // Aggiorna la card con i risultati dell'algoritmo
        if (algorithmResult.easinessFactor !== undefined) {
            card.easinessFactor = algorithmResult.easinessFactor;
        }
        // I campi stability e box sono opzionali (solo per FSRS e Leitner)
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

        // Aggiorna reviewHistory per tracciare le performance
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

        // Mantieni solo le ultime 50 review per evitare documenti troppo grandi
        if (card.reviewHistory.length > 50) {
            card.reviewHistory = card.reviewHistory.slice(-50);
        }

        // Status progression - passa anche la card per analizzare la storia
        const status = this._resolveCardStatus({
            quality,
            repetitions: algorithmResult.repetitions,
            interval: algorithmResult.interval,
            card: card, // Passa la card per analizzare reviewHistory
        });
        card.status = status;

        // Aggiorna analytics del deck
        this._updateDeckAnalytics(deck, quality, sessionMeta);

        await deck.save();

        let gamification = null;
        const shouldRecord = sessionMeta?.isComplete || sessionMeta?.completed;
        if (shouldRecord) {
            // Emetti evento per activity tracking (Pattern Observer)
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

    /**
     * 🪄 MAGIC GENERATE - Genera flashcards da PDF usando OpenAI
     * 
     * Pipeline RAG semplificata:
     * 1. Estrae testo dal PDF (pdf-parse)
     * 2. Taglia se troppo lungo (max 15k caratteri)
     * 3. Invia a OpenAI con prompt specifico
     * 4. Parsa JSON response e salva le carte
     * 
     * @param {Object} tenantScope
     * @param {string} deckId - ID del mazzo dove aggiungere le carte
     * @param {string} pdfFilePath - Path del file PDF salvato su disco
     * @returns {Promise<{deck: Object, generatedCount: number}>}
     */
    async generateCardsFromPDF(tenantScope, deckId, pdfFilePath) {
        const userId = this._getUserId(tenantScope);

        // 1. Verifica che il mazzo esista e appartenga all'utente
        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        if (!pdfFilePath || typeof pdfFilePath !== 'string') {
            throw AppError.validation('Path PDF non valido');
        }

        const pdfFileName = path.basename(pdfFilePath);
        const pdfUrl = `/uploads/pdfs/${pdfFileName}`;

        // Collega subito il PDF al deck (anche se la generazione fallisce, il file resta accessibile).
        deck.pdfUrl = pdfUrl;
        await deck.save({ validateModifiedOnly: true });

        sseManager.sendToUser(userId, 'pdf-progress', { step: 'analyzing' });

        let pdfBuffer;
        try {
            pdfBuffer = await fs.readFile(pdfFilePath);
        } catch (err) {
            console.error('❌ PDF Read Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF caricato. Riprova.');
        }

        // 2. Estrai testo dal PDF
        let pdfText;
        try {
            const pdfData = await pdfParse(pdfBuffer);
            pdfText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            console.error('❌ PDF Parse Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF. Assicurati che sia un file PDF valido e non protetto.');
        }

        if (!pdfText || pdfText.trim().length < 50) {
            throw AppError.validation('Il PDF non contiene abbastanza testo da elaborare.');
        }

        const normalizedExtracted = this._normalizeExtractedText(pdfText);
        deck.extractedText = this._truncateText(
            normalizedExtracted,
            MAX_EXTRACTED_TEXT_STORE_LENGTH,
            '\n\n[...testo troncato per limiti di storage...]'
        );
        await deck.save({ validateModifiedOnly: true });

        // 2.b FASE ARCHITETTO: Analisi Strutturale
        console.log('🏗️ Avvio analisi strutturale AI...');
        const blueprint = await this._analyzeDocumentStructure(normalizedExtracted);
        console.log('📋 Blueprint Generato:', JSON.stringify(blueprint, null, 2));
        const globalContext = blueprint?.globalContext || 'Documento generico';
        const blueprintTopics = Array.isArray(blueprint?.mainTopics) ? blueprint.mainTopics : [];
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'blueprint', blueprint });

        // 2.c Ingestione vettoriale (best-effort, non blocca l'utente)
        try {
            await vectorStoreService.ingestDeck(deckId, normalizedExtracted);
        } catch (err) {
            console.error('⚠️ Vector ingest error:', err.message);
        }

        // 3. Adaptive Strategy: Calcola parametri in base alla lunghezza
        const totalLength = normalizedExtracted.length;
        const adaptiveParams = this._calculateAdaptiveParams(totalLength);
        
        console.log(`📊 PDF Analisi: ${totalLength} caratteri totali`);
        console.log(`🎯 Strategia Adattiva: Fascia ${adaptiveParams.tier} - ${adaptiveParams.chunkSize ? `Chunk da ${adaptiveParams.chunkSize} caratteri` : 'Singolo chunk'}, Target: ${adaptiveParams.targetCardsTotal || 'dinamico'} card totali`);

        // 4. Smart Chunking: Divide il testo in chunk logici
        const textChunks = adaptiveParams.chunkSize 
            ? this._splitTextIntoChunks(normalizedExtracted, adaptiveParams.chunkSize, OVERLAP)
            : [normalizedExtracted]; // Fascia S: singolo chunk
        
        console.log(`📦 Chunk creati: ${textChunks.length}`);
        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'chunking',
            totalChunks: textChunks.length,
            strategy: adaptiveParams.tier,
        });

        // 5. Generazione flashcard per ogni chunk con target dinamico
        let allGeneratedCards = [];
        
        // Calcola target per chunk (distribuisce il target totale tra i chunk)
        let targetCardsPerChunk = adaptiveParams.cardsPerChunk || 
            Math.ceil((adaptiveParams.targetCardsTotal || 50) / textChunks.length);
        
        // Safety Cap: Limita il numero di card per richiesta per evitare output token limit
        // Previene JSON troncati che causerebbero JSON.parse() errors
        if (targetCardsPerChunk > MAX_CARDS_PER_REQUEST) {
            console.warn(`⚠️ Target ${targetCardsPerChunk} card per chunk troppo alto per singola chiamata. Limitato a ${MAX_CARDS_PER_REQUEST} per sicurezza.`);
            targetCardsPerChunk = MAX_CARDS_PER_REQUEST;
        }

        // Processa chunk sequenzialmente per evitare rate limiting OpenAI
        for (const [index, chunk] of textChunks.entries()) {
            try {
                console.log(`🔄 Elaborazione chunk ${index + 1}/${textChunks.length} (${chunk.length} caratteri, target: ${targetCardsPerChunk} card)...`);
                
                const chunkCards = await this._generateCardsForChunk(
                    chunk,
                    deck,
                    targetCardsPerChunk,
                    index,
                    textChunks.length,
                    globalContext
                );
                
                allGeneratedCards = [...allGeneratedCards, ...chunkCards];
                console.log(`✅ Chunk ${index + 1}/${textChunks.length}: Generate ${chunkCards.length} flashcard`);
                const currentTopic = blueprintTopics.length > 0
                    ? blueprintTopics[index % blueprintTopics.length]
                    : null;
                sseManager.sendToUser(userId, 'pdf-progress', {
                    step: 'generating',
                    currentChunk: index + 1,
                    totalChunks: textChunks.length,
                    generatedSoFar: allGeneratedCards.length,
                    currentTopic,
                });
            } catch (error) {
                console.error(`❌ Errore nel chunk ${index + 1}/${textChunks.length}:`, error.message);
                // Continuiamo con gli altri chunk invece di fallire tutto
                // Se è l'unico chunk e fallisce, lanciamo l'errore
                if (textChunks.length === 1) {
                    throw error;
                }
            }
        }

        // 5. Valida e normalizza tutte le carte generate
        const validCards = allGeneratedCards
            .filter(card => card && card.front && card.back && 
                           typeof card.front === 'string' && 
                           typeof card.back === 'string' &&
                           card.front.trim().length > 0 &&
                           card.back.trim().length > 0);

        if (validCards.length === 0) {
            const warningMessage = 'Nessuna flashcard valida generata. Il PDF potrebbe essere troppo breve o non contenere contenuto analizzabile.';
            console.warn(`⚠️ ${warningMessage}`);
            sseManager.sendToUser(userId, 'pdf-progress', { step: 'completed', totalCards: 0 });
            return {
                deck: deck.toJSON(),
                generatedCount: 0,
                totalChunks: textChunks.length,
                totalTextLength: totalLength,
                strategy: adaptiveParams.tier,
                warning: warningMessage,
            };
        }

        // 6. Aggiungi le carte al mazzo (bulk)
        deck.cards.push(...validCards);
        await deck.save();

        console.log(`✨ Generated ${validCards.length} flashcards totali per deck ${deckId} (da ${textChunks.length} chunk, strategia: ${adaptiveParams.tier})`);
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'completed', totalCards: validCards.length });

        return {
            deck: deck.toJSON(),
            generatedCount: validCards.length,
            totalChunks: textChunks.length, // Info utile per il frontend
            totalTextLength: totalLength, // Info per analytics
            strategy: adaptiveParams.tier, // Info strategia adattiva usata
        };
    }

    /**
     * 🤖 AI TUTOR - Chat contestuale con PDF (RAG Lite)
     *
     * @param {Object} tenantScope
     * @param {string} deckId
     * @param {string} message
     * @param {Array<{role: 'user'|'assistant', content: string}>} history
     * @returns {Promise<{reply: string}>}
     */
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

        // ⚠️ BUG FIX: extractedText ha select:false → serve includerlo esplicitamente
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
                    throw AppError.validation('Impossibile leggere il PDF per la chat. Riprova con un PDF valido.');
                }
                return null;
            }

            const normalizedExtracted = this._normalizeExtractedText(pdfText);
            if (!normalizedExtracted || normalizedExtracted.length < 50) {
                if (strict) {
                    throw AppError.validation(
                        'Il PDF non contiene testo leggibile (potrebbe essere una scansione immagine). ' +
                        'Prova un PDF con testo selezionabile oppure usa OCR.'
                    );
                }
                return null;
            }

            deck.extractedText = this._truncateText(
                normalizedExtracted,
                MAX_EXTRACTED_TEXT_STORE_LENGTH,
                '\n\n[...testo troncato per limiti di storage...]'
            );
            await deck.save({ validateModifiedOnly: true });
            extractedText = deck.extractedText;

            return extractedText;
        };

        // Fallback: vecchi deck potrebbero non avere extractedText salvato
        if (!extractedText || extractedText.trim().length < 50) {
            await extractAndStorePdfText({ strict: true });
        } else if (!hasPageMarkers) {
            // Upgrade best-effort: aggiungi marker di pagina per domande tipo "pagina X"
            await extractAndStorePdfText({ strict: false });
        }

        // Recupera contesto dai vettori (RAG)
        let context = '';
        try {
            const matches = await vectorStoreService.queryDeck(deckId, cleanMessage, 5);
            if (Array.isArray(matches) && matches.length > 0) {
                context = matches.join('\n\n---\n\n');
            }
        } catch (err) {
            console.error('⚠️ Vector query error:', err.message);
        }

        // Se il vettore non esiste o è vuoto, prova a creare sul momento
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

        const model = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const contextLimit = model.includes('gpt-3.5')
            ? 15000
            : model.includes('gpt-4o-mini') || model.includes('gpt-4o')
                ? 50000
                : MAX_TUTOR_CONTEXT_LENGTH;

        // Fallback: usa extractedText se RAG non ha dato risultati
        if (!context) {
            const built = this._buildTutorContext(extractedText, cleanMessage, contextLimit);
            context = built;
        }

        if (!context || context.trim().length < 20) {
            throw AppError.validation(
                'Non ci sono abbastanza dati per rispondere: prova a rigenerare il PDF con testo selezionabile o ripeti la domanda con più dettagli.'
            );
        }

        context = this._truncateText(context, contextLimit, '\n\n[...contesto troncato per limiti di token...]');

        const systemPrompt =
            'Sei Silvi, un Tutor Esperto e Socratico: chiaro, rigoroso e incoraggiante.\n' +
            'Rispondi alla domanda dell\'utente basandoti ESCLUSIVAMENTE sul CONTESTO fornito.\n' +
            'Se la risposta non è nel contesto, dillo chiaramente e chiedi all\'utente di incollare il passaggio rilevante.\n' +
            'Non inventare informazioni non presenti nel contesto.\n\n' +
            'CONTESTO (estratto dal PDF):\n' +
            '"""\n' +
            `${context}\n` +
            '"""\n\n' +
            'Regole:\n' +
            '- Rispondi in italiano.\n' +
            '- Se utile, cita brevi frasi dal contesto tra virgolette.\n' +
            '- Se l\'utente chiede “pagina X” ma nel contesto non ci sono numeri di pagina, spiega il limite e guida la domanda.';

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
            const errorMessage = err?.message || '';
            const errorCode = err?.code || err?.error?.code || err?.type;

            console.error('❌ OpenAI Tutor Error:', errorMessage);

            if (errorCode === 'insufficient_quota') {
                throw AppError.validation('Quota OpenAI esaurita. Riprova più tardi o contatta l\'amministratore.');
            }

            if (
                errorCode === 'context_length_exceeded' ||
                errorMessage.toLowerCase().includes('context length') ||
                errorMessage.toLowerCase().includes('maximum context') ||
                errorMessage.toLowerCase().includes('tokens')
            ) {
                throw AppError.validation(
                    'Il documento è troppo lungo per essere analizzato in una sola richiesta. ' +
                    'Prova con una domanda più specifica o con un PDF più breve.'
                );
            }

            throw AppError.validation('Errore nella risposta AI. Riprova più tardi.');
        }

        const reply = typeof aiResponse === 'string' ? aiResponse.trim() : '';
        if (!reply) {
            throw AppError.validation('Risposta AI vuota. Riprova.');
        }

        return { reply };
    }

    /**
     * Placeholder per future integrazioni AI (generation).
     * @param {Object} _tenantScope
     * @param {Object} _payload
     */
    async generateCardsFromAI(_tenantScope, _payload) {
        // TODO: integrare generazione automatica card da AI
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

    /**
     * Determina lo status di una card basandosi su qualità, ripetizioni, intervallo e storia
     * Logica migliorata per una progressione più accurata
     */
    _resolveCardStatus({ quality, repetitions, interval, card = null }) {
        // Se la risposta è insufficiente (quality < 3), torna sempre in learning
        if (quality < 3) {
            return 'learning';
        }

        // Card nuova o con poche ripetizioni → learning
        if (repetitions <= 1) {
            return 'learning';
        }

        // Analizza la storia delle review se disponibile
        let recentQuality = quality;
        let consecutiveGood = 1; // Conta quante risposte buone consecutive
        let totalReviews = 1;

        if (card && Array.isArray(card.reviewHistory) && card.reviewHistory.length > 0) {
            totalReviews = card.reviewHistory.length + 1; // +1 per la review corrente
            const recentHistory = card.reviewHistory.slice(-5); // Ultime 5 review
            
            // Conta risposte consecutive buone (quality >= 3) partendo dalla più recente
            for (let i = recentHistory.length - 1; i >= 0; i--) {
                if (recentHistory[i].rating >= 3) {
                    consecutiveGood++;
                } else {
                    break; // Interrompi se trovi una risposta insufficiente
                }
            }

            // Calcola qualità media delle ultime 3 review
            const lastThree = recentHistory.slice(-3);
            if (lastThree.length > 0) {
                const avgQuality = lastThree.reduce((sum, r) => sum + (r.rating || 0), 0) / lastThree.length;
                recentQuality = (avgQuality + quality) / 2; // Media tra storico e attuale
            }
        }

        // CRITERI PER MASTERED (Padroneggiata):
        // 1. Almeno 5 ripetizioni totali
        // 2. Intervallo >= 30 giorni (dimostra ritenzione a lungo termine)
        // 3. Almeno 3 risposte consecutive buone (quality >= 3)
        // 4. Qualità media recente >= 3.5 (buone performance consistenti)
        const isMastered = 
            repetitions >= 5 &&
            interval >= 30 &&
            consecutiveGood >= 3 &&
            recentQuality >= 3.5;

        if (isMastered) {
            return 'mastered';
        }

        // CRITERI PER REVIEW (Ripasso):
        // Card che ha superato la fase di learning ma non è ancora padroneggiata
        // - Almeno 2 ripetizioni
        // - Intervallo > 1 giorno (non più in fase iniziale)
        // - Qualità media >= 3 (performance accettabile)
        const isReview = 
            repetitions >= 2 &&
            interval > 1 &&
            recentQuality >= 3;

        if (isReview) {
            return 'review';
        }

        // Default: ancora in learning
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

    _normalizeGeneratedCard(card) {
        if (!card || typeof card !== 'object') return {};
        return {
            front: card.front ?? card.question ?? card.q,
            back: card.back ?? card.answer ?? card.a,
        };
    }

    /**
     * 🧹 JSON Sanitizer: Pulisce la risposta AI da markdown, backticks e testo extra
     * 
     * Gestisce casi comuni:
     * - "Ecco il JSON: ```json {...} ```"
     * - "```json\n{...}\n```"
     * - Testo prima/dopo il JSON
     * 
     * @param {string} dirtyJSON - Stringa potenzialmente sporca con JSON
     * @returns {string} JSON pulito pronto per il parsing
     */
    _cleanJSON(dirtyJSON) {
        if (!dirtyJSON || typeof dirtyJSON !== 'string') return '';
        
        let cleaned = dirtyJSON.trim();
        
        // Rimuovi markdown code blocks (```json ... ```)
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/g, '');
        
        // Rimuovi prefissi comuni
        cleaned = cleaned.replace(/^(Ecco|Here|JSON|Risposta|Response):\s*/i, '');
        cleaned = cleaned.replace(/^(Il|The)\s+(JSON|risultato|result):\s*/i, '');
        
        // Trova la prima { e l'ultima } per isolare l'oggetto JSON
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        
        // Rimuovi spazi e newline eccessivi
        cleaned = cleaned.trim();
        
        return cleaned;
    }

    /**
     * 🪄 Genera flashcard per un singolo chunk di testo
     * * BULLETPROOF V2: Prompt semplificato per evitare conflitti con JSON mode
     */
    async _generateCardsForChunk(chunkText, deck, targetCount, chunkIndex, totalChunks, globalContext) {
        const aiSettings = deck.aiSettings || {};
        const style = aiSettings.style || 'comprehensive';
        const difficulty = aiSettings.difficulty || 'medium';
        const questionTypes = Array.isArray(aiSettings.questionTypes) && aiSettings.questionTypes.length > 0
            ? aiSettings.questionTypes
            : ['definition', 'concept', 'relationship'];

        const stylePrompts = {
            comprehensive: 'Bilanciate tra teoria e pratica.',
            conceptual: 'Focus su concetti, principi e relazioni profonde.',
            factual: 'Focus su fatti, definizioni precise e memorizzazione.',
            application: 'Focus su scenari pratici e applicazione delle conoscenze.',
        };

        const difficultyPrompts = {
            easy: 'Semplici e dirette, per principianti.',
            medium: 'Di media difficoltà, richiedono ragionamento.',
            hard: 'Complesse, richiedono analisi profonda.',
            mixed: 'Mix di difficoltà.',
        };

        // Prompt semplificato e diretto per evitare "Empty Response"
        const safeGlobalContext = typeof globalContext === 'string' && globalContext.trim().length > 0
            ? globalContext.trim()
            : 'Contesto accademico generico';

        const systemPrompt = `SEI UN GENERATORE DI FLASHCARD JSON.
CONTESTO DEL DOCUMENTO: "${safeGlobalContext}"

Il tuo compito è analizzare la PARTE ${chunkIndex + 1} di ${totalChunks} del testo fornito e generare flashcard.

CONFIGURAZIONE:
- Target: circa ${targetCount} flashcard.
- Stile: ${stylePrompts[style] || stylePrompts.comprehensive}
- Difficoltà: ${difficultyPrompts[difficulty] || difficultyPrompts.medium}
- Tipi domande: ${questionTypes.join(', ')}

ISTRUZIONI CHIAVE:
1. Estrai i concetti chiave, definizioni e relazioni dal testo fornito.
2. Genera domande (front) chiare e risposte (back) concise ma complete.
3. Se il testo è irrilevante (es. indice, bibliografia), restituisci un array vuoto "cards": [].
4. IMPORTANTE: Non bloccarti a pensare. Genera direttamente l'output.

FORMATO RISPOSTA OBBLIGATORIO (JSON):
{
  "cards": [
    {
      "front": "Domanda...",
      "back": "Risposta..."
    }
  ]
}`;

        // Retry logic: max 2 tentativi
        const MAX_RETRIES = 2;
        let lastError = null;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Chiamata OpenAI
                let aiResponse;
                try {
                    const completion = await openai.chat.completions.create({
                        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `TESTO DA ANALIZZARE:\n\n${chunkText}` }
                        ],
                        // Temperatura media per bilanciare creatività e formato
                        temperature: attempt === 1 ? 0.5 : 0.3,
                        max_completion_tokens: 4000, // Aumentato per sicurezza
                        response_format: { type: 'json_object' },
                    });

                    aiResponse = completion.choices[0]?.message?.content;
                } catch (err) {
                    console.error(`❌ OpenAI API Error (chunk ${chunkIndex + 1}, tentativo ${attempt}):`, err.message);
                    
                    if (err.code === 'insufficient_quota') {
                        throw AppError.internal({ message: 'Quota OpenAI esaurita.' }, err, {});
                    }
                    
                    if (attempt === MAX_RETRIES) throw err;
                    lastError = err;
                    continue;
                }

                // Controllo risposta vuota con log esplicito
                if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
                    console.warn(`⚠️ Risposta AI vuota (chunk ${chunkIndex + 1}, tentativo ${attempt}). Length: 0`);
                    if (attempt === MAX_RETRIES) {
                        return []; 
                    }
                    continue;
                }

                // Sanitizza JSON
                const cleanedJSON = this._cleanJSON(aiResponse);
                
                if (!cleanedJSON || cleanedJSON.length === 0) {
                    console.warn(`⚠️ JSON pulito vuoto (chunk ${chunkIndex + 1}, tentativo ${attempt})`);
                    if (attempt === MAX_RETRIES) return [];
                    continue;
                }

                // Parsa la risposta JSON
                let parsed;
                try {
                    parsed = JSON.parse(cleanedJSON);
                } catch (parseErr) {
                    console.error(`❌ JSON Parse Error (chunk ${chunkIndex + 1}, tentativo ${attempt})`);
                    if (attempt === MAX_RETRIES) return [];
                    lastError = parseErr;
                    continue; 
                }

                // Estrai cards
                let generatedCards = this._extractGeneratedCards(parsed);

                // Se l'array è vuoto ma il JSON è valido, potrebbe essere intenzionale (es. testo inutile)
                // Accettiamo il risultato se è valido
                if (!Array.isArray(generatedCards)) {
                     if (attempt === MAX_RETRIES) return [];
                     continue;
                }

                // Successo! Normalizza e ritorna le card
                return generatedCards
                    .map((card) => this._normalizeGeneratedCard(card))
                    .filter(card => card.front && card.back && typeof card.front === 'string' && typeof card.back === 'string')
                    .map(card => ({
                        front: card.front.trim(),
                        back: card.back.trim(),
                        status: 'new',
                        nextReviewDate: new Date(),
                        easinessFactor: DEFAULT_EASINESS_FACTOR,
                        interval: 0,
                        repetitions: 0,
                    }));

            } catch (err) {
                if (err instanceof AppError && err.statusCode >= 500) throw err;
                
                lastError = err;
                if (attempt === MAX_RETRIES) {
                    console.error(`❌ Errore finale chunk ${chunkIndex + 1}:`, err.message);
                    return [];
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        return [];
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
        const truncatedSuffix = '\n\n[...contesto parziale...]';

        if (tokens.length === 0) {
            // Fallback: usa la parte finale (spesso corrisponde alle pagine "avanti")
            const tail = normalizedText.slice(-safeMax);
            return `${tail}${truncatedSuffix}`;
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

        const ranked = chunks
            .filter((chunk) => chunk.score > 0)
            .sort((a, b) => b.score - a.score);

        if (ranked.length === 0) {
            const tail = normalizedText.slice(-safeMax);
            return `${tail}${truncatedSuffix}`;
        }

        const selected = [];
        for (const candidate of ranked) {
            if (selected.length >= 10) break;
            const overlaps = selected.some((s) => Math.abs(s.start - candidate.start) < step);
            if (overlaps) continue;
            selected.push(candidate);
        }

        selected.sort((a, b) => a.start - b.start);

        let stitched = '';
        for (const chunk of selected) {
            const piece = chunk.text.trim();
            const separator = stitched.length ? '\n\n---\n\n' : '';
            if (stitched.length + separator.length + piece.length > safeMax) break;
            stitched += separator + piece;
        }

        if (!stitched) {
            const tail = normalizedText.slice(-safeMax);
            return `${tail}${truncatedSuffix}`;
        }

        return `${stitched}${truncatedSuffix}`;
    }

    _extractQueryTokens(question) {
        if (!question || typeof question !== 'string') return [];

        const stopwords = new Set([
            'come',
            'cosa',
            'cos',
            'che',
            'per',
            'una',
            'uno',
            'dei',
            'del',
            'della',
            'delle',
            'degli',
            'gli',
            'alla',
            'alle',
            'allo',
            'sul',
            'sulla',
            'sulle',
            'nel',
            'nella',
            'nelle',
            'dai',
            'dal',
            'dallo',
            'ai',
            'al',
            'allo',
            'il',
            'lo',
            'la',
            'le',
            'i',
            'e',
            'o',
            'di',
            'da',
            'in',
            'su',
            'con',
            'spiega',
            'spiegami',
            'spiegare',
            'pagina',
            'pagine',
        ]);

        const tokens = question
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .map((t) => t.trim())
            .filter((t) => t.length >= 4 && !stopwords.has(t));

        return [...new Set(tokens)].slice(0, 20);
    }

    /**
     * 🏗️ Document Structure Analyzer: genera un blueprint iniziale del documento
     * 
     * @param {string} extractedText - Testo estratto dal PDF (normalizzato)
     * @returns {Promise<{documentType: string, globalContext: string, mainTopics: string[], densityScore: number}>}
     */
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

            const systemPrompt = `Agisci come un analista editoriale senior. Analizza il testo fornito e restituisci SOLO JSON valido.
OUTPUT RICHIESTO:
{
  "documentType": "textbook" | "slide_deck" | "research_paper" | "exam_text" | "notes" | "other",
  "globalContext": "Una frase riassuntiva molto concisa del contenuto (max 20 parole).",
  "mainTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "densityScore": 0.0 to 1.0
}
Se non sei sicuro, usa "other" e una lista vuota di mainTopics.`;

            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Testo da analizzare:\n\n${sampleText}` },
                ],
                temperature: 0.2,
                max_completion_tokens: 500,
                response_format: { type: 'json_object' },
            });

            const aiResponse = completion.choices[0]?.message?.content;
            if (!aiResponse || typeof aiResponse !== 'string') {
                return defaultBlueprint;
            }

            const cleanedJSON = this._cleanJSON(aiResponse);
            if (!cleanedJSON) {
                return defaultBlueprint;
            }

            let parsed;
            try {
                parsed = JSON.parse(cleanedJSON);
            } catch (parseErr) {
                console.warn('⚠️ Blueprint JSON parse error:', parseErr.message);
                return defaultBlueprint;
            }

            const allowedTypes = new Set([
                'textbook',
                'slide_deck',
                'research_paper',
                'exam_text',
                'notes',
                'other',
            ]);

            const rawType = typeof parsed?.documentType === 'string' ? parsed.documentType.trim() : '';
            const documentType = allowedTypes.has(rawType) ? rawType : defaultBlueprint.documentType;

            const rawContext = typeof parsed?.globalContext === 'string' ? parsed.globalContext.trim() : '';
            const contextWords = rawContext ? rawContext.split(/\s+/).slice(0, 20) : [];
            const globalContext = contextWords.length > 0 ? contextWords.join(' ') : defaultBlueprint.globalContext;

            const rawTopics = Array.isArray(parsed?.mainTopics) ? parsed.mainTopics : [];
            const mainTopics = rawTopics
                .filter(topic => typeof topic === 'string')
                .map(topic => topic.trim())
                .filter(Boolean)
                .slice(0, 5);

            const rawDensity = parsed?.densityScore;
            const densityValue = Number.isFinite(Number(rawDensity)) ? Number(rawDensity) : defaultBlueprint.densityScore;
            const densityScore = Math.max(0, Math.min(1, densityValue));

            return {
                documentType,
                globalContext,
                mainTopics,
                densityScore,
            };
        } catch (err) {
            console.warn('⚠️ Document analysis fallback:', err.message);
            return defaultBlueprint;
        }
    }

    /**
     * 🧠 Adaptive Strategy Calculator: Determina parametri in base alla lunghezza del testo
     * 
     * @param {number} textLength - Lunghezza totale del testo in caratteri
     * @returns {Object} Configurazione adattiva {tier, chunkSize, targetCardsTotal, cardsPerChunk}
     */
    _calculateAdaptiveParams(textLength) {
        if (textLength < TIER_S_THRESHOLD) {
            // Fascia S: Corto/Slide (< 30k caratteri)
            return {
                tier: 'S',
                chunkSize: null, // Singolo chunk
                targetCardsTotal: TIER_S_CONFIG.targetCardsTotal,
                cardsPerChunk: TIER_S_CONFIG.cardsPerChunk,
            };
        } else if (textLength < TIER_M_THRESHOLD) {
            // Fascia M: Capitolo/Tesina (30k - 100k caratteri)
            return {
                tier: 'M',
                chunkSize: TIER_M_CONFIG.chunkSize,
                targetCardsTotal: TIER_M_CONFIG.targetCardsTotal,
                cardsPerChunk: null, // Calcolato dinamicamente
            };
        } else {
            // Fascia L: Libro/Manuale (> 100k caratteri)
            // Calcola target dinamico: ~1 card ogni 2000 caratteri, minimo 50
            const estimatedChunks = Math.ceil(textLength / TIER_L_CONFIG.chunkSize);
            const targetTotal = Math.max(50, Math.floor(textLength / 2000));
            
            return {
                tier: 'L',
                chunkSize: TIER_L_CONFIG.chunkSize,
                targetCardsTotal: targetTotal,
                cardsPerChunk: null, // Calcolato dinamicamente
            };
        }
    }

    /**
     * 📦 Smart Chunking: Divide il testo in chunk logici mantenendo il senso
     * 
     * FIX CRITICO: L'indice ora avanza correttamente usando `start = end - overlap`
     * 
     * Evita di tagliare frasi a metà cercando punti di interruzione naturali
     * (punti, a capo) vicini alla fine del chunk.
     * 
     * @param {string} text - Testo da dividere
     * @param {number} chunkSize - Dimensione target del chunk
     * @param {number} overlap - Sovrapposizione tra chunk adiacenti
     * @returns {Array<string>} Array di chunk di testo
     */
    _splitTextIntoChunks(text, chunkSize, overlap = OVERLAP) {
        if (!text || typeof text !== 'string') return [];
        if (text.length <= chunkSize) return [text];

        const chunks = [];
        let start = 0;
        
        while (start < text.length) {
            // Calcola fine del chunk
            let end = Math.min(start + chunkSize, text.length);
            
            // Cerca l'ultimo punto di interruzione naturale per non tagliare frasi a metà
            if (end < text.length) {
                const searchStart = Math.max(start, end - chunkSize * 0.2); // Cerca negli ultimi 20% del chunk
                const lastPeriod = text.lastIndexOf('.', end);
                const lastNewline = text.lastIndexOf('\n', end);
                const lastPageMarker = text.lastIndexOf('--- Pagina', end);
                
                // Preferisci il punto se è nella zona di ricerca
                if (lastPeriod >= searchStart && lastPeriod > start + chunkSize * 0.7) {
                    end = lastPeriod + 1;
                } else if (lastNewline >= searchStart && lastNewline > start + chunkSize * 0.7) {
                    end = lastNewline + 1;
                } else if (lastPageMarker >= searchStart && lastPageMarker > start + chunkSize * 0.6) {
                    // Se c'è un marker di pagina, preferisci quello
                    end = lastPageMarker;
                }
            }

            // Aggiungi chunk
            chunks.push(text.slice(start, end));
            
            // FIX CRITICO: Avanza correttamente usando start = end - overlap
            // Assicurati che start avanzi sempre (almeno del 50% del chunkSize)
            const nextStart = end - overlap;
            start = Math.max(start + Math.floor(chunkSize * 0.5), nextStart);
            
            // Safety check: se start non avanza, forza avanzamento minimo
            if (start >= end) {
                start = end;
            }
        }
        
        return chunks;
    }

    _normalizeExtractedText(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    _formatPdfTextWithPages(pdfTextResult) {
        const pages = Array.isArray(pdfTextResult?.pages) ? pdfTextResult.pages : [];
        const fallback = typeof pdfTextResult?.text === 'string' ? pdfTextResult.text : '';

        if (pages.length === 0) return fallback;

        return pages
            .map((page, index) => {
                const pageNumber = Number.isFinite(Number(page?.num)) ? Number(page.num) : index + 1;
                const text = typeof page?.text === 'string' ? page.text : '';
                return `\n--- Pagina ${pageNumber} ---\n${text}`;
            })
            .join('\n');
    }

    _truncateText(text, maxLength, suffix = '') {
        if (!text || typeof text !== 'string') return '';
        if (!Number.isFinite(maxLength) || maxLength <= 0) return '';
        if (text.length <= maxLength) return text;
        const safeSuffix = typeof suffix === 'string' ? suffix : '';
        return text.slice(0, maxLength) + safeSuffix;
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

    /**
     * Aggiorna le analytics del deck dopo una review
     */
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

        // Calcola retention rate (percentuale di risposte corrette)
        // Assumiamo che quality >= 3 sia "corretto"
        const isCorrect = quality >= 3;
        const previousTotal = analytics.totalReviews - 1 || 1;
        const previousCorrect = Math.round((analytics.retentionRate || 0) * previousTotal);
        const newCorrect = previousCorrect + (isCorrect ? 1 : 0);
        analytics.retentionRate = newCorrect / analytics.totalReviews;

        // Aggiorna tempo medio se disponibile
        if (sessionMeta?.timePerCard && Number.isFinite(sessionMeta.timePerCard)) {
            const previousAvg = analytics.averageTimePerCard || 0;
            const newAvg = (previousAvg * previousTotal + sessionMeta.timePerCard) / analytics.totalReviews;
            analytics.averageTimePerCard = newAvg;
        }

        // Aggiorna streak (giorni consecutivi di studio)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastStudied = analytics.lastStudied ? new Date(analytics.lastStudied) : null;
        if (lastStudied) {
            lastStudied.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastStudied) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) {
                // Stesso giorno, mantieni streak
            } else if (daysDiff === 1) {
                // Giorno successivo, incrementa streak
                analytics.studyStreak = (analytics.studyStreak || 0) + 1;
            } else {
                // Streak rotto, reset
                analytics.studyStreak = 1;
            }
        } else {
            analytics.studyStreak = 1;
        }
    }
}

module.exports = new StudyService();
