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
const activityService = require('./activityService');
const OpenAI = require('openai');
const { PDFParse } = require('pdf-parse');
const fs = require('fs/promises');
const path = require('path');

const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
const MAX_PDF_TEXT_LENGTH = 15000; // Limite caratteri per evitare costi eccessivi
const MAX_EXTRACTED_TEXT_STORE_LENGTH = 200000; // Limite DB: evita documenti enormi
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

        const previousEF = Number(card.easinessFactor ?? DEFAULT_EASINESS_FACTOR);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // 1) Calcolo nuovo EF
        const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        const updatedEF = Math.max(MIN_EASINESS_FACTOR, previousEF + efDelta);

        // 2) Calcolo nuovo interval + repetitions
        let updatedRepetitions = previousRepetitions;
        let updatedInterval = previousInterval;

        if (quality < 3) {
            updatedRepetitions = 0;
            updatedInterval = 1;
        } else {
            if (previousRepetitions === 0) {
                updatedInterval = 1;
            } else if (previousRepetitions === 1) {
                updatedInterval = 6;
            } else {
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF));
            }
            updatedRepetitions = previousRepetitions + 1;
        }

        // 3) Prossima review
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        // 4) Status progression (semplice, ma estendibile)
        const status = this._resolveCardStatus({
            quality,
            repetitions: updatedRepetitions,
            interval: updatedInterval,
        });

        // Persisti aggiornamenti
        card.easinessFactor = Number(updatedEF.toFixed(2));
        card.interval = updatedInterval;
        card.repetitions = updatedRepetitions;
        card.nextReviewDate = nextReviewDate;
        card.status = status;

        await deck.save();

        let gamification = null;
        const shouldRecord = sessionMeta?.isComplete || sessionMeta?.completed;
        if (shouldRecord) {
            try {
                gamification = await activityService.recordActivity(userId, 'SESSION_COMPLETE', {
                    entityId: deckId,
                    category: 'study',
                    metadata: {
                        ...sessionMeta,
                        deckId,
                    },
                });
            } catch (err) {
                console.error('❌ Gamification error:', err.message);
            }
        }

        const updatedCard = this._serializeCard(card);

        return {
            card: updatedCard,
            stats: {
                rating: quality,
                easinessFactor: updatedCard.easinessFactor,
                interval: updatedInterval,
                repetitions: updatedRepetitions,
                status,
                nextReviewDate,
                nextReviewInDays: updatedInterval,
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

        let pdfBuffer;
        try {
            pdfBuffer = await fs.readFile(pdfFilePath);
        } catch (err) {
            console.error('❌ PDF Read Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF caricato. Riprova.');
        }

        // 2. Estrai testo dal PDF
        let pdfText;
        let parser;
        try {
            parser = new PDFParse({ data: pdfBuffer });
            const pdfData = await parser.getText();
            pdfText = pdfData.text;
        } catch (err) {
            console.error('❌ PDF Parse Error:', err.message);
            throw AppError.validation('Impossibile leggere il PDF. Assicurati che sia un file PDF valido e non protetto.');
        } finally {
            if (parser?.destroy) {
                await parser.destroy();
            }
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

        // 3. Taglia il testo se troppo lungo
        const truncatedText = normalizedExtracted.length > MAX_PDF_TEXT_LENGTH 
            ? normalizedExtracted.slice(0, MAX_PDF_TEXT_LENGTH) + '\n\n[...testo troncato per limiti di elaborazione...]'
            : normalizedExtracted;

        // 4. Chiama OpenAI per generare le flashcards
        const systemPrompt = `Sei un esperto insegnante universitario che si chiama Silvija. Il tuo compito è analizzare il testo fornito e creare flashcard di alta qualità per uno studente che deve preparare un esame.
                REGOLE:
                - Crea tra 10 e 15 flashcard
                - Ogni flashcard deve avere "front" (domanda chiara e specifica) e "back" (risposta concisa ma completa)
                - Le domande devono testare comprensione, non solo memoria
                - Includi definizioni, concetti chiave, relazioni causa-effetto
                - Evita domande troppo generiche o troppo specifiche
                - La risposta deve essere auto-contenuta (comprensibile senza rileggere la domanda)

                FORMATO OUTPUT:
                Rispondi SOLO con JSON valido, senza markdown o testo aggiuntivo, in questo formato:
                {"cards":[{"front":"Domanda 1?","back":"Risposta 1"},{"front":"Domanda 2?","back":"Risposta 2"}]}`;

        let aiResponse;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analizza questo testo e genera le flashcard:\n\n${truncatedText}` }
                ],
                temperature: 0.7,
                max_completion_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            aiResponse = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error('❌ OpenAI API Error:', err.message);
            if (err.code === 'insufficient_quota') {
                throw AppError.internal('Quota OpenAI esaurita. Contatta l\'amministratore.');
            }
            throw AppError.internal('Errore nella generazione AI. Riprova più tardi.');
        }

        // 5. Parsa la risposta JSON
        let generatedCards;
        try {
            const parsed = JSON.parse(aiResponse);
            generatedCards = this._extractGeneratedCards(parsed);
        } catch (err) {
            console.error('❌ JSON Parse Error:', aiResponse);
            throw AppError.internal('Risposta AI non valida. Riprova.');
        }

        if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
            console.error('❌ Empty AI cards response:', aiResponse?.slice?.(0, 500) || aiResponse);
            throw AppError.internal('L\'AI non ha generato flashcard valide. Prova con un PDF diverso.');
        }

        // 6. Valida e normalizza le carte
        const validCards = generatedCards
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

        if (validCards.length === 0) {
            throw AppError.internal('Nessuna flashcard valida generata. Riprova.');
        }

        // 7. Aggiungi le carte al mazzo (bulk)
        deck.cards.push(...validCards);
        await deck.save();

        console.log(`✨ Generated ${validCards.length} flashcards for deck ${deckId}`);

        return {
            deck: deck.toJSON(),
            generatedCount: validCards.length,
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

        // Fallback: vecchi deck potrebbero non avere extractedText salvato
        if (!extractedText || extractedText.trim().length < 50) {
            if (!deck.pdfUrl || typeof deck.pdfUrl !== 'string') {
                throw AppError.validation('Nessun PDF collegato a questo mazzo');
            }

            const pdfFileName = path.basename(deck.pdfUrl);
            const pdfFilePath = path.join(__dirname, '..', 'uploads', 'pdfs', pdfFileName);

            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(pdfFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Tutor):', err.message);
                throw AppError.validation('PDF non trovato sul server. Ricaricalo e riprova.');
            }

            let pdfText;
            let parser;
            try {
                parser = new PDFParse({ data: pdfBuffer });
                const pdfData = await parser.getText();
                pdfText = pdfData.text;
            } catch (err) {
                console.error('❌ PDF Parse Error (Tutor):', err.message);
                throw AppError.validation('Impossibile leggere il PDF per la chat. Riprova con un PDF valido.');
            } finally {
                if (parser?.destroy) {
                    await parser.destroy();
                }
            }

            const normalizedExtracted = this._normalizeExtractedText(pdfText);
            if (!normalizedExtracted || normalizedExtracted.length < 50) {
                throw AppError.validation(
                    'Il PDF non contiene testo leggibile (potrebbe essere una scansione immagine). ' +
                    'Prova un PDF con testo selezionabile oppure usa OCR.'
                );
            }
            deck.extractedText = this._truncateText(
                normalizedExtracted,
                MAX_EXTRACTED_TEXT_STORE_LENGTH,
                '\n\n[...testo troncato per limiti di storage...]'
            );
            await deck.save({ validateModifiedOnly: true });
            extractedText = deck.extractedText;
        }

        const model = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const contextLimit = model.includes('gpt-3.5')
            ? 15000
            : model.includes('gpt-4o-mini') || model.includes('gpt-4o')
                ? 50000
                : MAX_TUTOR_CONTEXT_LENGTH;

        const context = this._buildTutorContext(extractedText, cleanMessage, contextLimit);
        if (!context || context.trim().length < 20) {
            throw AppError.validation(
                'Il PDF non ha testo leggibile per la chat (potrebbe essere una scansione immagine). ' +
                'Prova a caricare un PDF testuale oppure usa OCR.'
            );
        }

        const systemPrompt =
            'Sei un Tutor Esperto e Socratico: chiaro, rigoroso e incoraggiante.\n' +
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

    _resolveCardStatus({ quality, repetitions, interval }) {
        if (quality < 3) return 'learning';
        if (repetitions <= 1) return 'learning';
        if (repetitions >= 5 && interval >= 30) return 'mastered';
        return 'review';
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

    _normalizeExtractedText(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
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
}

module.exports = new StudyService();
