/**
 * 🧩 STUDY SERVICE - Quiz Helpers
 * ========================================
 * Distractor generation, quiz option building, true/false transform,
 * option harmonization & balancing.
 */

const Deck = require('../../models/Deck');
const {
    openai,
    DISTRACTOR_AI_MODEL,
    QUIZ_FALLBACK_OPTIONS,
    QUIZ_OPTION_WORD_MIN,
    QUIZ_OPTION_WORD_MAX,
    QUIZ_OPTION_LENGTH_MIN_RATIO,
    QUIZ_OPTION_LENGTH_MAX_RATIO,
    QUIZ_OPTION_WORD_SPREAD_MAX,
    QUIZ_DEBUG_LOGS,
    INCOMPLETE_TRAILING_WORDS,
    QUIZ_PADDING_SEGMENTS,
} = require('./constants');

module.exports = {

    // =========================================
    // DEBUG & METRICS
    // =========================================

    _logQuizDebug(event, payload = {}) {
        if (!QUIZ_DEBUG_LOGS) return;
        try {
            console.log(`[StudyService.quiz] ${event}`, JSON.stringify(payload));
        } catch (error) {
            console.log(`[StudyService.quiz] ${event}`, payload);
        }
    },

    _getOptionMetrics(options = []) {
        if (!Array.isArray(options)) return [];
        return options.map((option, index) => ({
            index: index + 1,
            words: this._countWords(option),
            chars: typeof option === 'string' ? option.length : 0,
            preview: typeof option === 'string' ? option.slice(0, 120) : '',
        }));
    },

    // =========================================
    // NORMALIZATION & COUNTING
    // =========================================

    _normalizeDistractors(rawDistractors, correctAnswer = '') {
        if (!Array.isArray(rawDistractors)) return [];

        const normalizedCorrect = this._normalizeAnswerValue(correctAnswer);
        const result = [];
        const seen = new Set();

        for (const value of rawDistractors) {
            if (typeof value !== 'string') continue;
            const trimmed = value.trim();
            const normalized = this._normalizeAnswerValue(trimmed);
            if (!normalized || normalized === normalizedCorrect || seen.has(normalized)) continue;
            result.push(trimmed);
            seen.add(normalized);
            if (result.length === 3) break;
        }

        return result;
    },

    _normalizeQuizAnswerVariant(rawVariant, correctAnswer = '') {
        const fallback = typeof correctAnswer === 'string' ? correctAnswer.trim() : '';
        if (typeof rawVariant !== 'string') return fallback;
        const trimmed = rawVariant.trim();
        return trimmed.length > 0 ? trimmed : fallback;
    },

    _countWords(value = '') {
        if (typeof value !== 'string') return 0;
        return value
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;
    },

    // =========================================
    // TARGET & BALANCE CHECKS
    // =========================================

    _resolveQuizTargetWordCount(correctAnswer = '') {
        const rawCount = this._countWords(correctAnswer);
        const base = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 16;
        return Math.max(14, Math.min(44, Math.round(base)));
    },

    _isOptionLengthBalanced(option = '', targetWords = QUIZ_OPTION_WORD_MIN) {
        const words = this._countWords(option);
        const minWords = Math.max(QUIZ_OPTION_WORD_MIN, Math.floor(targetWords * QUIZ_OPTION_LENGTH_MIN_RATIO));
        const maxWords = Math.min(QUIZ_OPTION_WORD_MAX, Math.ceil(targetWords * QUIZ_OPTION_LENGTH_MAX_RATIO));
        return words >= minWords && words <= maxWords;
    },

    _areQuizOptionsBalanced(options = [], correctAnswer = '') {
        if (!Array.isArray(options) || options.length === 0) return false;
        const targetWords = this._resolveQuizTargetWordCount(correctAnswer);
        const hasBalancedLengths = options.every(option => this._isOptionLengthBalanced(option, targetWords));
        if (!hasBalancedLengths) return false;

        const counts = options.map(option => this._countWords(option)).filter(count => count > 0);
        if (counts.length === 0) return false;

        const spread = Math.max(...counts) - Math.min(...counts);
        return spread <= QUIZ_OPTION_WORD_SPREAD_MAX;
    },

    // =========================================
    // OPTION CLOSURE / PADDING / HARMONIZATION
    // =========================================

    _fitOptionToTargetLength(option = '', targetWords = QUIZ_OPTION_WORD_MIN) {
        const raw = this._ensureOptionClosure(option);
        if (!raw) return raw;

        const minWords = Math.max(QUIZ_OPTION_WORD_MIN, Math.floor(targetWords * QUIZ_OPTION_LENGTH_MIN_RATIO));
        return this._padOptionToWordFloor(raw, minWords);
    },

    _ensureOptionClosure(option = '') {
        const raw = typeof option === 'string' ? option.trim() : '';
        if (!raw) return raw;

        const words = raw.split(/\s+/).filter(Boolean);
        const lastWord = words.length > 0
            ? this._normalizeAnswerValue(words[words.length - 1]).replace(/[.,;:!?]+$/g, '')
            : '';
        const hasPunctuation = /[.!?]$/.test(raw);

        if (INCOMPLETE_TRAILING_WORDS.has(lastWord)) {
            return `${raw} in modo coerente con il contesto.`;
        }

        if (!hasPunctuation) {
            return `${raw}.`;
        }

        return raw;
    },

    _hasLikelyTruncatedEnding(option = '') {
        const raw = typeof option === 'string' ? option.trim() : '';
        if (!raw) return false;

        const words = raw.split(/\s+/).filter(Boolean);
        if (words.length === 0) return false;

        const lastWord = this._normalizeAnswerValue(words[words.length - 1]).replace(/[.,;:!?]+$/g, '');
        if (INCOMPLETE_TRAILING_WORDS.has(lastWord)) return true;

        return !/[.!?]$/.test(raw);
    },

    _padOptionToWordFloor(option = '', floorWords = QUIZ_OPTION_WORD_MIN) {
        const raw = typeof option === 'string' ? option.trim() : '';
        if (!raw) return raw;

        let enriched = this._ensureOptionClosure(raw);
        let cursor = 0;
        while (this._countWords(enriched) < floorWords && cursor < QUIZ_PADDING_SEGMENTS.length) {
            const clean = enriched.replace(/[.!?]+$/g, '');
            enriched = `${clean}, ${QUIZ_PADDING_SEGMENTS[cursor]}.`;
            cursor += 1;
        }
        return this._ensureOptionClosure(enriched);
    },

    _harmonizeQuizOptions(options = [], targetWords = QUIZ_OPTION_WORD_MIN) {
        const normalized = Array.isArray(options)
            ? options
                .map(option => this._ensureOptionClosure(option))
                .filter(Boolean)
            : [];
        if (normalized.length === 0) return [];

        const baseMinWords = Math.max(QUIZ_OPTION_WORD_MIN, Math.floor(targetWords * QUIZ_OPTION_LENGTH_MIN_RATIO));
        let harmonized = normalized.map(option => this._padOptionToWordFloor(option, baseMinWords));

        const counts = harmonized.map(option => this._countWords(option));
        const maxWords = counts.length > 0 ? Math.max(...counts) : baseMinWords;
        const minFloor = Math.max(baseMinWords, maxWords - QUIZ_OPTION_WORD_SPREAD_MAX);
        harmonized = harmonized.map(option => this._padOptionToWordFloor(option, minFloor));

        return harmonized.map(option => this._ensureOptionClosure(option));
    },

    // =========================================
    // FALLBACK DISTRACTOR COLLECTION
    // =========================================

    _collectFallbackDistractors(targetCard, chapterCards = [], targetWords = 0) {
        const targetCardId = this._resolveCardId(targetCard);
        const normalizedCorrect = this._normalizeAnswerValue(targetCard?.back);
        const expectedWords = targetWords > 0
            ? targetWords
            : this._resolveQuizTargetWordCount(targetCard?.back);
        const candidates = [];
        const seen = new Set();

        for (const card of this._shuffleArray(chapterCards)) {
            const candidateCardId = this._resolveCardId(card);
            if (candidateCardId && candidateCardId === targetCardId) continue;

            const candidate = typeof card?.back === 'string' ? card.back.trim() : '';
            const normalized = this._normalizeAnswerValue(candidate);
            if (!normalized || normalized === normalizedCorrect || seen.has(normalized)) continue;
            if (!this._isOptionLengthBalanced(candidate, expectedWords)) continue;

            candidates.push(candidate);
            seen.add(normalized);
            if (candidates.length === 3) break;
        }

        return candidates;
    },

    _needsDistractorGeneration(card) {
        if (!card) return false;
        if (card.aiDistractorsFailed) return false;
        const normalized = this._normalizeDistractors(card.distractors, card.back);
        if (normalized.length < 3) return true;

        const quizAnswerVariant = this._normalizeQuizAnswerVariant(card.quizAnswerVariant, card.back);
        const options = [quizAnswerVariant, ...normalized];
        if (options.some(option => this._hasLikelyTruncatedEnding(option))) {
            return true;
        }

        return !this._areQuizOptionsBalanced(options, card.back);
    },

    // =========================================
    // GENERATE & PERSIST DISTRACTORS
    // =========================================

    async _generateAndPersistDistractors({ userId, deckId, card }) {
        const cardId = this._resolveCardId(card);
        const question = typeof card?.front === 'string' ? card.front.trim() : '';
        const correctAnswer = typeof card?.back === 'string' ? card.back.trim() : '';
        if (!cardId || !question || !correctAnswer) return;

        this._logQuizDebug('distractor-prewarm-start', {
            deckId,
            cardId,
            answerWords: this._countWords(correctAnswer),
            answerChars: correctAnswer.length,
        });

        try {
            const payload = await this._generateDistractorsWithAI(question, correctAnswer);
            const distractors = payload.distractors;
            const quizAnswerVariant = payload.correctAnswerVariant;
            const explanations = payload.explanations || [];

            card.distractors = distractors;
            card.quizAnswerVariant = quizAnswerVariant;
            card.distractorExplanations = explanations;
            card.aiDistractorsFailed = false;

            await Deck.updateOne(
                { _id: deckId, user: userId, 'cards._id': cardId },
                {
                    $set: {
                        'cards.$.distractors': distractors,
                        'cards.$.quizAnswerVariant': quizAnswerVariant,
                        'cards.$.distractorExplanations': explanations,
                        'cards.$.aiDistractorsFailed': false,
                    },
                }
            );

            this._logQuizDebug('distractor-prewarm-success', {
                deckId,
                cardId,
                balanced: this._areQuizOptionsBalanced([quizAnswerVariant, ...distractors], quizAnswerVariant),
                explanationsCount: explanations.filter(Boolean).length,
                metrics: this._getOptionMetrics([quizAnswerVariant, ...distractors]),
            });
        } catch (error) {
            console.warn('[StudyService] Distractor generation failed in quiz prewarm:', error.message);
            card.distractors = [];
            card.quizAnswerVariant = '';
            card.distractorExplanations = [];
            card.aiDistractorsFailed = true;

            await Deck.updateOne(
                { _id: deckId, user: userId, 'cards._id': cardId },
                {
                    $set: {
                        'cards.$.distractors': [],
                        'cards.$.quizAnswerVariant': '',
                        'cards.$.distractorExplanations': [],
                        'cards.$.aiDistractorsFailed': true,
                    },
                }
            ).catch(() => {});

            this._logQuizDebug('distractor-prewarm-failed', {
                deckId,
                cardId,
                reason: error?.message || 'unknown',
            });
        }
    },

    async _ensureDistractorsForQuizCards({ userId, deckId, cards = [] }) {
        const candidates = cards.filter(card => this._needsDistractorGeneration(card));
        if (candidates.length === 0) return;

        const queue = [...candidates];
        const concurrency = Math.min(3, queue.length);

        const workers = Array.from({ length: concurrency }, async () => {
            while (queue.length > 0) {
                const card = queue.shift();
                if (!card) continue;
                await this._generateAndPersistDistractors({ userId, deckId, card });
            }
        });

        await Promise.all(workers);
    },

    // =========================================
    // BUILD QUIZ OPTIONS
    // =========================================

    _buildQuizOptions(card, chapterCards = []) {
        const canonicalCorrectAnswer = typeof card?.back === 'string' ? card.back.trim() : '';
        const correctAnswer = this._normalizeQuizAnswerVariant(card?.quizAnswerVariant, canonicalCorrectAnswer);
        const targetWords = this._resolveQuizTargetWordCount(canonicalCorrectAnswer || correctAnswer);
        const normalizedCorrect = this._normalizeAnswerValue(correctAnswer);
        const options = [];
        const explanationMap = new Map(); // opzione normalizzata → spiegazione
        const seen = new Set();

        // Prepara la mappa spiegazioni dai distrattori AI salvati
        const rawDistractors = Array.isArray(card?.distractors) ? card.distractors : [];
        const rawExplanations = Array.isArray(card?.distractorExplanations) ? card.distractorExplanations : [];
        rawDistractors.forEach((d, i) => {
            const norm = this._normalizeAnswerValue(d);
            if (norm && rawExplanations[i]) {
                explanationMap.set(norm, rawExplanations[i]);
            }
        });

        if (correctAnswer) {
            options.push(correctAnswer);
            seen.add(normalizedCorrect);
        }

        const aiDistractors = this._normalizeDistractors(rawDistractors, canonicalCorrectAnswer);
        const wrongOptions = [...aiDistractors];

        if (card?.aiDistractorsFailed) {
            const fallbackDistractors = this._collectFallbackDistractors(card, chapterCards, targetWords);
            wrongOptions.push(...fallbackDistractors);
        }

        for (const option of wrongOptions) {
            const normalized = this._normalizeAnswerValue(option);
            if (!normalized || seen.has(normalized)) continue;
            options.push(option);
            seen.add(normalized);
            if (options.length === 4) break;
        }

        if (options.length < 4) {
            for (const fallback of QUIZ_FALLBACK_OPTIONS) {
                const normalized = this._normalizeAnswerValue(fallback);
                if (!normalized || seen.has(normalized)) continue;
                options.push(fallback);
                seen.add(normalized);
                if (options.length === 4) break;
            }
        }

        while (options.length < 4) {
            options.push('Nessuna delle precedenti');
        }

        const normalizedOptions = this._harmonizeQuizOptions(options.slice(0, 4), targetWords);
        const normalizedCorrectAnswer = normalizedOptions[0] || this._fitOptionToTargetLength(correctAnswer, targetWords);

        // Shuffle e ricostruisci le spiegazioni nell'ordine shuffled
        const shuffledOptions = this._shuffleArray(normalizedOptions);
        const distractorExplanations = {};
        shuffledOptions.forEach((opt, i) => {
            const norm = this._normalizeAnswerValue(opt);
            if (norm !== this._normalizeAnswerValue(normalizedCorrectAnswer) && explanationMap.has(norm)) {
                distractorExplanations[i] = explanationMap.get(norm);
            }
        });

        const balanced = this._areQuizOptionsBalanced(normalizedOptions, normalizedCorrectAnswer);
        this._logQuizDebug('options-built', {
            cardId: this._resolveCardId(card),
            aiDistractorsFailed: Boolean(card?.aiDistractorsFailed),
            targetWords,
            balanced,
            hasExplanations: Object.keys(distractorExplanations).length > 0,
            likelyTruncated: normalizedOptions.some(option => this._hasLikelyTruncatedEnding(option)),
            metrics: this._getOptionMetrics(normalizedOptions),
        });

        return {
            correctAnswer: normalizedCorrectAnswer,
            options: shuffledOptions,
            distractorExplanations,
        };
    },

    // =========================================
    // TRUE/FALSE TRANSFORM
    // =========================================

    _transformToTrueFalse(cards, allAnswers = []) {
        console.log(`[StudyService._transformToTrueFalse] Transforming ${cards.length} cards to TRUE/FALSE format`);

        return cards.map((card, index) => {
            const isTrue = Math.random() < 0.5;

            let statement;
            let correctAnswer;

            if (isTrue) {
                statement = `${card.front} → ${card.back}`;
                correctAnswer = 'Vero';
            } else {
                const wrongAnswers = allAnswers.filter(answer =>
                    this._normalizeAnswerValue(answer) !== this._normalizeAnswerValue(card.back)
                );
                const randomWrong = wrongAnswers.length > 0
                    ? wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)]
                    : 'risposta errata';

                statement = `${card.front} → ${randomWrong}`;
                correctAnswer = 'Falso';
            }

            const transformedCard = {
                ...card,
                front: statement,
                back: correctAnswer,
                options: ['Vero', 'Falso'],
                isTrueFalse: true,
                originalFront: card.front,
                originalBack: card.back,
            };

            if (index < 3) {
                console.log(`[StudyService._transformToTrueFalse] Sample card #${index + 1}:`, {
                    statement: statement.substring(0, 80) + '...',
                    correctAnswer,
                    isTrue,
                });
            }

            return transformedCard;
        });
    },

    // =========================================
    // BACKGROUND DISTRACTOR GENERATION
    // =========================================

    _generateDistractorsForCardInBackground({ userId, deckId, cardId, front, back }) {
        if (!userId || !deckId || !cardId) return;
        const question = typeof front === 'string' ? front.trim() : '';
        const correctAnswer = typeof back === 'string' ? back.trim() : '';
        if (!question || !correctAnswer) return;

        setImmediate(async () => {
            try {
                const payload = await this._generateDistractorsWithAI(question, correctAnswer);
                const distractors = payload.distractors;
                const quizAnswerVariant = payload.correctAnswerVariant;
                const explanations = payload.explanations || [];
                await Deck.updateOne(
                    { _id: deckId, user: userId, 'cards._id': cardId },
                    {
                        $set: {
                            'cards.$.distractors': distractors,
                            'cards.$.quizAnswerVariant': quizAnswerVariant,
                            'cards.$.distractorExplanations': explanations,
                            'cards.$.aiDistractorsFailed': false,
                        },
                    }
                );
            } catch (error) {
                console.warn('[StudyService] Distractor AI generation failed, fallback attivo:', error.message);
                await Deck.updateOne(
                    { _id: deckId, user: userId, 'cards._id': cardId },
                    {
                        $set: {
                            'cards.$.distractors': [],
                            'cards.$.quizAnswerVariant': '',
                            'cards.$.distractorExplanations': [],
                            'cards.$.aiDistractorsFailed': true,
                        },
                    }
                ).catch(() => {});
            }
        });
    },

    // =========================================
    // AI DISTRACTOR GENERATION (Pedagogical V2)
    // =========================================

    async _generateDistractorsWithAI(question, correctAnswer) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY non configurata');
        }

        const targetWords = this._resolveQuizTargetWordCount(correctAnswer);
        const responseFormat = {
            type: 'json_schema',
            json_schema: {
                name: 'quiz_options_pedagogical',
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['correctAnswerVariant', 'distractors', 'explanations'],
                    properties: {
                        correctAnswerVariant: { type: 'string' },
                        distractors: {
                            type: 'array',
                            minItems: 3,
                            maxItems: 3,
                            items: { type: 'string' },
                        },
                        explanations: {
                            type: 'array',
                            minItems: 3,
                            maxItems: 3,
                            items: { type: 'string' },
                        },
                    },
                },
            },
        };

        const minWords = Math.max(QUIZ_OPTION_WORD_MIN, Math.floor(targetWords * QUIZ_OPTION_LENGTH_MIN_RATIO));
        const maxWords = Math.min(QUIZ_OPTION_WORD_MAX, Math.ceil(targetWords * QUIZ_OPTION_LENGTH_MAX_RATIO));

        for (let attempt = 0; attempt < 4; attempt += 1) {
            this._logQuizDebug('ai-generate-attempt', {
                attempt: attempt + 1,
                targetWords,
                minWords,
                maxWords,
                questionPreview: question.slice(0, 120),
            });

            const prompt = `Agisci come un esperto in progettazione pedagogica e creazione di test universitari.
Riceverai una domanda e la sua risposta corretta canonica.
Il tuo obiettivo è generare opzioni di risposta ad alta qualità che misurino la reale comprensione concettuale, NON la memoria pura.

═══ REGOLE PEDAGOGICHE (CONTENUTO) ═══

1) "correctAnswerVariant": Rielabora il concetto corretto usando sinonimi e parafrasi.
   NON copiare testualmente la risposta originale. Lo studente deve dimostrare di aver capito, non di aver memorizzato.

2) Distrattore 1 — IL COMPETITIVO ("Quasi Corretto"):
   Deve essere parzialmente vero o riferirsi a un concetto molto vicino, ma con una sfumatura che lo rende sbagliato.
   Esempio di errore: confondere causa con effetto, scambiare condizione necessaria con sufficiente.

3) Distrattore 2 — IL TERMINOLOGICO:
   Usa termini tecnici corretti e pertinenti al contesto, ma inseriti in un ragionamento o applicazione errata.
   Serve a verificare se lo studente conosce il significato delle parole o le "riconosce" e basta.

4) Distrattore 3 — L'INVERSIONE:
   Descrive esattamente l'opposto del concetto corretto, oppure scambia le definizioni tra due termini simili trattati nello stesso argomento.

5) PLAUSIBILITÀ OBBLIGATORIA:
   - Nessun distrattore deve essere palesemente assurdo.
   - Ogni opzione deve rappresentare un "sentiero logico" distinto.
   - MAI creare due opzioni che dicono la stessa cosa con parole diverse.
   - Tutte le opzioni devono sembrare plausibili a chi non ha studiato bene.

═══ SPIEGAZIONI DIDATTICHE ═══

6) Per CIASCUN distrattore, genera una spiegazione breve (1-2 frasi, max 40 parole) che spiega
   PERCHÉ quella risposta è sbagliata e quale errore concettuale rappresenta.
   Queste spiegazioni verranno mostrate allo studente quando sbaglia, per aiutarlo a capire l'errore.

═══ REGOLE FORMATO (CODICE) ═══

7) Restituisci SOLO ed ESCLUSIVAMENTE JSON valido nel seguente formato esatto:
{
  "correctAnswerVariant": "stringa",
  "distractors": ["competitivo", "terminologico", "inversione"],
  "explanations": ["perché competitivo è sbagliato", "perché terminologico è sbagliato", "perché inversione è sbagliata"]
}
8) Tutte e 4 le opzioni (correctAnswerVariant + 3 distractors) devono avere lunghezza, struttura sintattica e registro linguistico OMOGENEI per non fornire indizi visivi sulla risposta corretta.
9) Ogni opzione deve avere tra ${minWords} e ${maxWords} parole, rigorosamente.
10) Ogni stringa deve essere UNA singola frase completa e sensata, terminata con punto.
11) Nessuna stringa deve contenere ritorni a capo, tabulazioni o caratteri di controllo.
${attempt > 0 ? '12) ⚠️ ATTENZIONE: il precedente output era non valido o sbilanciato. Rispetta RIGOROSAMENTE il numero di parole, genera JSON puro e assicurati che le frasi siano complete e non troncate.' : ''}

═══ INPUT ═══
Domanda: ${question}
Risposta corretta canonica: ${correctAnswer}`;

            const completion = await openai.chat.completions.create(
                {
                    model: DISTRACTOR_AI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Sei un esperto in psicometria e progettazione pedagogica di test universitari. Genera esclusivamente JSON valido secondo lo schema fornito, senza markdown, senza commenti e senza testo extra. Ogni distrattore deve testare un tipo diverso di errore concettuale.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    response_format: responseFormat,
                    temperature: 0.35,
                    max_tokens: 1400,
                },
                {
                    timeout: 20000,
                }
            );

            const content = completion.choices[0]?.message?.content || '';
            const finishReason = completion.choices[0]?.finish_reason || 'unknown';
            this._logQuizDebug('ai-generate-raw', {
                attempt: attempt + 1,
                finishReason,
                contentLength: content.length,
                contentPreview: typeof content === 'string' ? content.slice(0, 300) : '',
            });
            const parsed = this._parseJSONResponse(content);
            if (!parsed) {
                this._logQuizDebug('ai-generate-parse-null', {
                    attempt: attempt + 1,
                    finishReason,
                });
                continue;
            }

            let rawDistractors = [];
            let rawCorrectAnswerVariant = '';
            let rawExplanations = [];
            if (Array.isArray(parsed)) {
                rawDistractors = parsed;
            } else if (parsed && Array.isArray(parsed.distractors)) {
                rawDistractors = parsed.distractors;
                rawCorrectAnswerVariant = typeof parsed.correctAnswerVariant === 'string'
                    ? parsed.correctAnswerVariant
                    : '';
                rawExplanations = Array.isArray(parsed.explanations) ? parsed.explanations : [];
            } else if (parsed && Array.isArray(parsed.options)) {
                rawDistractors = parsed.options;
                rawCorrectAnswerVariant = typeof parsed.correctAnswerVariant === 'string'
                    ? parsed.correctAnswerVariant
                    : '';
                rawExplanations = Array.isArray(parsed.explanations) ? parsed.explanations : [];
            }

            let distractors = this._normalizeDistractors(rawDistractors, correctAnswer);
            let correctAnswerVariant = this._normalizeQuizAnswerVariant(rawCorrectAnswerVariant, correctAnswer);

            // Normalizza le spiegazioni mantenendo la corrispondenza 1:1 con i distrattori
            const explanations = distractors.map((_d, i) => {
                const raw = rawExplanations[i];
                if (typeof raw === 'string' && raw.trim().length > 5) return raw.trim();
                return '';
            });

            const harmonizedOptions = this._harmonizeQuizOptions(
                [correctAnswerVariant, ...distractors],
                targetWords
            );
            if (harmonizedOptions.length === 4) {
                correctAnswerVariant = harmonizedOptions[0];
                distractors = this._normalizeDistractors(harmonizedOptions.slice(1), correctAnswerVariant);
            }

            const allOptions = [correctAnswerVariant, ...distractors];
            const balanced = this._areQuizOptionsBalanced(allOptions, correctAnswer);
            const likelyTruncated = allOptions.some(option => this._hasLikelyTruncatedEnding(option));

            this._logQuizDebug('ai-generate-result', {
                attempt: attempt + 1,
                distractorsCount: distractors.length,
                explanationsCount: explanations.filter(Boolean).length,
                balanced,
                likelyTruncated,
                metrics: this._getOptionMetrics(allOptions),
            });

            if (distractors.length === 3 && balanced && !likelyTruncated) {
                return {
                    distractors,
                    correctAnswerVariant,
                    explanations,
                };
            }
        }

        throw new Error('Distractors AI non validi o sbilanciati');
    },
};
