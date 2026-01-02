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
const OpenAI = require('openai');
const { PDFParse } = require('pdf-parse');

const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
const MAX_PDF_TEXT_LENGTH = 15000; // Limite caratteri per evitare costi eccessivi

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
     * @returns {Promise<{card: Object, stats: Object}>}
     */
    async processCardReview(tenantScope, deckId, cardId, rating) {
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
     * @param {Buffer} pdfBuffer - Buffer del file PDF
     * @returns {Promise<{deck: Object, generatedCount: number}>}
     */
    async generateCardsFromPDF(tenantScope, deckId, pdfBuffer) {
        const userId = this._getUserId(tenantScope);

        // 1. Verifica che il mazzo esista e appartenga all'utente
        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
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

        // 3. Taglia il testo se troppo lungo
        const truncatedText = pdfText.length > MAX_PDF_TEXT_LENGTH 
            ? pdfText.slice(0, MAX_PDF_TEXT_LENGTH) + '\n\n[...testo troncato per limiti di elaborazione...]'
            : pdfText;

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
    _normalizeGeneratedCard(card) {
        if (!card || typeof card !== 'object') return {};
        return {
            front: card.front ?? card.question ?? card.q,
            back: card.back ?? card.answer ?? card.a,
        };
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

};

module.exports = new StudyService();
