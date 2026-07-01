/**
 * 🧩 STUDY SERVICE - Quiz Helpers
 * ========================================
 * PDF-based quiz generation (AI), session card mapping, true/false transform.
 */

const { createCompletion, QUIZ_GENERATION_MODEL, QUIZ_DEBUG_LOGS, CHUNK_AI_TIMEOUT_MS, QUIZ_MAX_OUTPUT_TOKENS } = require('./constants');
const aiUsageService = require('../aiUsageService');
const logger = require('../../utils/logger');
const { buildChunkQuestionCounts } = require('./trueFalseChunking');
const {
    buildRepresentativeQuizText,
    shouldUseQuizFastPath,
} = require('./quizTextSelection');
const { parseQuizArrayResponse } = require('./quizJsonParser');

module.exports = {

    // =========================================
    // DEBUG & METRICS
    // =========================================

    _logQuizDebug(event, payload = {}) {
        if (!QUIZ_DEBUG_LOGS) return;
        logger.debug('StudyService.quiz', event, payload);
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

    _countWords(value = '') {
        if (typeof value !== 'string') return 0;
        return value.trim().split(/\s+/).filter(Boolean).length;
    },

    // =========================================
    // AI QUIZ GENERATION FROM PDF TEXT
    // =========================================

    async generateQuizFromPDFText(pdfTextChunk, questionCount = 5, previousQuestions = [], telemetry = {}) {
        if (!process.env.ANTHROPIC_AUTH_TOKEN) {
            throw new Error('ANTHROPIC_AUTH_TOKEN non configurata');
        }
        if (!pdfTextChunk || typeof pdfTextChunk !== 'string' || pdfTextChunk.trim().length < 100) {
            throw new Error('Testo PDF non valido o troppo breve per generare domande');
        }

        const count = Math.max(1, Math.floor(questionCount));
        // Budget generoso: alcuni modelli DeepSeek consumano token in ragionamento
        // interno prima dell'output, quindi un tetto basso tronca il JSON a metà.
        // Overridabile via env QUIZ_MAX_OUTPUT_TOKENS.
        const maxCompletionTokens = Math.min(
            QUIZ_MAX_OUTPUT_TOKENS,
            Math.max(4096, count * 1200),
        );

        const responseFormat = {
            type: 'json_schema',
            json_schema: {
                name: 'quiz_from_pdf',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['questions'],
                    properties: {
                        questions: {
                            type: 'array',
                            description: `Esattamente ${count} domande a risposta multipla.`,
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['questionText', 'correctAnswer', 'distractors', 'explanations', 'correctAnswerExplanation', 'difficulty'],
                                properties: {
                                    questionText: { type: 'string' },
                                    correctAnswer: { type: 'string' },
                                    difficulty: {
                                        type: 'string',
                                        enum: ['standard', 'hard'],
                                        description: 'Livello difficoltà: circa il 25% delle domande deve essere "hard", le restanti "standard".',
                                    },
                                    correctAnswerExplanation: {
                                        type: 'string',
                                        description: 'Spiegazione pedagogica completa (2-3 frasi) di PERCHÉ la risposta corretta è giusta, con il meccanismo concettuale sottostante. Mai riferimenti al testo.',
                                    },
                                    distractors: {
                                        type: 'array',
                                        description: 'Esattamente 3 distrattori (max 20 parole ciascuno per "standard", max 30 per "hard").',
                                        items: { type: 'string' },
                                    },
                                    explanations: {
                                        type: 'array',
                                        description: 'Esattamente 3 spiegazioni (1 per distrattore): spiega in 1-2 frasi naturali perché quel distrattore è sbagliato e quale errore concettuale intercetta.',
                                        items: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };

        const hardCount = Math.max(1, Math.round(count * 0.25));
        logger.debug('StudyService.quiz', `Generating ${count} questions (${hardCount} hard, ${count - hardCount} standard)`, {
            textLength: pdfTextChunk.length,
            previousQuestionsCount: previousQuestions.length,
        });
        const systemPrompt = `Agisci come un esperto di Instructional Design, Cognitive Load Theory e Psicometria. Riceverai dei contenuti da studiare.
        Il tuo compito è generare ${count} domande a risposta multipla che testano la padronanza concettuale profonda, NON la memoria di lavoro.

        ━━━ LINGUA — OBBLIGATORIO ━━━
        Scrivi OGNI campo (questionText, correctAnswer, distractors, explanations, correctAnswerExplanation) ESCLUSIVAMENTE in ITALIANO, indipendentemente dalla lingua del testo sorgente. Nessuna parola o frase in inglese.

        ━━━ REGOLA ZERO — DIVIETO ASSOLUTO DI RIFERIMENTI ALLA FONTE ━━━
        ⛔ È VIETATO in qualsiasi campo (questionText, opzioni, spiegazioni) usare frasi come:
        "nel testo", "il testo afferma", "secondo il testo", "come descritto", "stando al testo",
        "il documento", "il brano", "il paragrafo", "come indicato", "il materiale", o qualsiasi
        altra espressione che rimandi alla fonte scritta.
        Le domande devono sembrare scritte da un esperto della materia, non da chi ha letto un documento.
        Testa il concetto come se fosse conoscenza universale della disciplina.

        ━━━ DISTRIBUZIONE DIFFICOLTÀ ━━━
        Genera esattamente ${hardCount} domande con difficulty="hard" e ${count - hardCount} con difficulty="standard".

        DOMANDE "standard":
        - Stem di 1 frase breve, concetto singolo, risposta diretta.
        - Opzioni max 15 parole ciascuna.

        DOMANDE "hard":
        - Stem di massimo 2 frasi brevi. La seconda frase aggiunge UN elemento di contesto o chiede la relazione tra due concetti. NON costruire scenari narrativi lunghi o situazioni aziendali elaborate.
        - La difficoltà viene dai distrattori sfumati, NON dalla lunghezza dello stem.
        - Opzioni max 20 parole ciascuna, più sfumate e difficili da distinguere.
        - I distrattori devono essere attraenti anche per chi ha studiato bene.

        ━━━ REGOLE PSICOMETRICHE (per tutti i livelli) ━━━
        1. DOMANDA AUTOSUFFICIENTE: Lo studente deve capire cosa viene chiesto PRIMA di leggere le opzioni. Vietato: "Quale affermazione è vera?" o "Cosa si può dire di X?".
        2. RAGIONAMENTO, NON MEMORIA: Formula domande su "perché/come" o relazioni causa-effetto. Evita il recupero mnemonico di definizioni.
        3. OPZIONI PULITE: Non iniziare le opzioni con frasi introduttive ("La ragione è...", "Perché...", "In questo caso..."). Solo l'informazione cruda.
        4. ANATOMIA DEI DISTRATTORI — usa questi tre modelli:
        - Errore Causale: inverte causa/effetto o confonde condizione necessaria con sufficiente.
        - Falso Amico: usa un termine tecnico reale nel contesto sbagliato.
        - Inversione/Estremizzazione: afferma l'opposto del meccanismo reale o usa "sempre"/"mai"/"totalmente".
        5. OMOGENEITÀ VISIVA: Le 4 opzioni devono avere lunghezza, grammatica e tono simili. Nessuna deve spiccare visivamente.

        ━━━ CASI SPECIALI (Applicare se il testo lo richiede) ━━━
        A) DATI QUANTITATIVI E FORMULE (Se il testo contiene numeri o matematica):
        - È SEVERAMENTE VIETATO generare distrattori numerici casuali (es. se la risposta è 10, non mettere 11, 12, 13).
        - Ogni distrattore numerico DEVE essere il risultato plausibile di un tipico errore procedurale dello studente.
        - Esempi di errori da simulare: dimenticare una conversione di unità di misura, invertire un rapporto (numeratore/denominatore), omettere o aggiungere un passaggio della formula, confondere un segno (+ invece di -).
        - Nelle "explanations", devi esplicitare quale errore di calcolo o formula porta a quel numero errato.

        B) PROCESSI, FASI E SEQUENZE STORICHE (Se il testo descrive flussi o step):
        - NON chiedere mai elenchi mnemonici (es. "Qual è la terza fase del processo?").
        - Le domande devono testare le dipendenze logiche tra le fasi.
        - Modelli di domanda ammessi per le sequenze:
          · Cosa comporta l'omissione o il fallimento di una fase specifica?
          · Qual è il prerequisito logico (input) affinché una determinata fase possa iniziare?
          · Se l'obiettivo finale cambia in [Scenario X], quale fase del processo deve essere adattata?

        ━━━ SPIEGAZIONI ━━━
        6. correctAnswerExplanation: 2-3 frasi che spiegano il meccanismo concettuale profondo della risposta corretta. Parla direttamente allo studente ("Questo accade perché...", "Il motivo è..."). Mai riferimenti al testo.
        7. explanations (per i distrattori): 1-2 frasi per ciascuno. Nomina l'errore concettuale specifico ("Qui si confonde X con Y", "Questo inverte causa ed effetto"). Tono: tutor paziente, non freddo.`;

        const previousBlock = previousQuestions.length > 0
            ? `\n\n⛔ DOMANDE GIÀ GENERATE (da NON riproporre, nemmeno su concetti simili):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
            : '';

        const userPrompt = `Genera ${count} domande a risposta multipla basate ESCLUSIVAMENTE sul seguente testo:${previousBlock}\n\n${pdfTextChunk}`;

        const isReasoningModel = /^o\d/.test(QUIZ_GENERATION_MODEL);
        this._logQuizDebug('quiz-from-pdf-start', {
            questionCount: count,
            textLength: pdfTextChunk.length,
            previousQuestionsCount: previousQuestions.length,
        });

        let completion;
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];

            completion = await aiUsageService.runTrackedChatCompletion(
                {
                    userId: telemetry?.userId,
                    mode: 'quiz',
                    feature: 'quiz_generation_pdf_chunk',
                    model: QUIZ_GENERATION_MODEL,
                    messages,
                    promptLengthChars: systemPrompt.length + userPrompt.length,
                    metadata: {
                        deckId: telemetry?.deckId ? String(telemetry.deckId) : '',
                        chunkIndex: telemetry?.chunkIndex ?? null,
                        totalChunks: telemetry?.totalChunks ?? null,
                        questionCount: count,
                        previousQuestionsCount: previousQuestions.length,
                    },
                },
                () => createCompletion(
                    {
                        model: QUIZ_GENERATION_MODEL,
                        messages,
                        response_format: responseFormat,
                        temperature: 0.35,
                        max_tokens: maxCompletionTokens,
                    },
                    { timeout: CHUNK_AI_TIMEOUT_MS },
                ),
            );
        } catch (apiError) {
            logger.warn('StudyService.quiz', 'AI API error', {
                error: apiError.message,
                type: apiError.type || apiError.name,
                status: apiError.status || apiError.statusCode,
            });
            throw apiError;
        }

        const content = completion.choices[0]?.message?.content || '';
        const finishReason = completion.choices[0]?.finish_reason;
        const usage = completion.usage || {};
        const truncated = finishReason === 'length' || finishReason === 'max_tokens';

        // Log diagnostico SEMPRE (non solo in debug): serve per capire cosa fa l'AI.
        logger.info('StudyService.quiz', `MCQ chunk ${count} richieste → risposta AI`, {
            model: QUIZ_GENERATION_MODEL,
            finishReason,
            truncated,
            contentLength: content.length,
            inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
            outputTokens: usage.completion_tokens ?? usage.output_tokens ?? null,
            maxTokens: maxCompletionTokens,
        });

        const { items, recovered } = parseQuizArrayResponse(content, 'questions');
        if (recovered || truncated) {
            logger.warn('StudyService.quiz', 'MCQ: risposta AI troncata/recuperata parzialmente', {
                model: QUIZ_GENERATION_MODEL,
                finishReason,
                recoveredItems: items.length,
                requested: count,
                hint: truncated
                    ? 'Il modello ha esaurito i token di output (max_tokens). Domande complete recuperate dal JSON parziale.'
                    : 'JSON non standard: recuperati gli oggetti completi.',
            });
        }
        if (items.length === 0) {
            logger.warn('StudyService.quiz', 'MCQ: nessuna domanda parsabile', {
                model: QUIZ_GENERATION_MODEL,
                finishReason,
                contentPreview: content.slice(0, 200),
            });
            throw new Error('Risposta AI non valida: nessuna domanda generata');
        }

        const questions = items
            .filter(q =>
                q.questionText && q.correctAnswer &&
                Array.isArray(q.distractors) && q.distractors.length >= 3,
            )
            .map(q => ({
                questionText: q.questionText.trim(),
                correctAnswer: q.correctAnswer.trim(),
                difficulty: q.difficulty === 'hard' ? 'hard' : 'standard',
                correctAnswerExplanation: typeof q.correctAnswerExplanation === 'string' ? q.correctAnswerExplanation.trim() : '',
                distractors: q.distractors.slice(0, 3).map(d => d.trim()),
                explanations: Array.isArray(q.explanations)
                    ? q.explanations.slice(0, 3).map(e => typeof e === 'string' ? e.trim() : '')
                    : ['', '', ''],
            }));

        this._logQuizDebug('quiz-from-pdf-success', { questionsGenerated: questions.length });
        return questions;
    },

    // =========================================
    // TEXT CHUNKING
    // =========================================

    _splitTextIntoChunks(text, chunkSize = 5000, overlap = 500) {
        if (!text || text.length === 0) return [];
        if (text.length <= chunkSize) return [text];

        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length);

            if (end < text.length) {
                // Prefer cutting at a newline or space to avoid mid-word truncation
                const newlineIdx = text.lastIndexOf('\n', end);
                const spaceIdx = text.lastIndexOf(' ', end);
                const cutPoint = Math.max(newlineIdx, spaceIdx);

                // Only use the boundary if it falls in the last 20% of the chunk
                if (cutPoint > start + chunkSize * 0.8) {
                    end = cutPoint + 1;
                }
            }

            // Materialize chunk: Buffer round-trip forces V8 to allocate an independent
            // SeqString, breaking the SlicedString reference to the original backing store.
            // This allows the original 200K+ extractedText to be GC'd after chunking.
            const raw = text.slice(start, end);
            chunks.push(Buffer.from(raw, 'utf8').toString('utf8'));

            if (end >= text.length) break;

            // Next chunk overlaps by `overlap` chars to preserve context across boundaries
            start = end - overlap;
        }

        return chunks;
    },

    // =========================================
    // FULL-PDF ORCHESTRATOR
    // =========================================

    async generateQuizFromFullPDF(fullText, totalQuestionsRequested, previousQuestions = [], telemetry = {}) {
        const originalTextLength = typeof fullText === 'string' ? fullText.length : 0;
        const requestedQuestionCount = Math.max(1, Math.floor(Number(totalQuestionsRequested) || 0));
        const chunks = (shouldUseQuizFastPath(requestedQuestionCount)
            ? [buildRepresentativeQuizText(fullText)]
            : this._splitTextIntoChunks(fullText)).filter(Boolean);
        // Release fullText reference — chunks are now materialized independent strings
        fullText = null;

        if (chunks.length === 0) {
            throw new Error('Testo PDF non valido o vuoto');
        }

        const counts = buildChunkQuestionCounts(chunks.length, requestedQuestionCount);

        this._logQuizDebug('quiz-full-pdf-start', {
            totalChunks: chunks.length,
            totalQuestionsRequested: requestedQuestionCount,
            distribution: counts,
            textLength: originalTextLength,
        });

        const allGeneratedQuestions = [];

        for (let i = 0; i < chunks.length; i++) {
            const countForChunk = counts[i];
            if (countForChunk === 0) continue;

            // Pass all already-generated question texts so the AI skips similar concepts
            const seenQuestions = [
                ...previousQuestions,
                ...allGeneratedQuestions.map(q => q.questionText),
            ];

            try {
                const questions = await this.generateQuizFromPDFText(chunks[i], countForChunk, seenQuestions, {
                    ...telemetry,
                    chunkIndex: i + 1,
                    totalChunks: chunks.length,
                });
                allGeneratedQuestions.push(...questions);
            } catch (err) {
                this._logQuizDebug('quiz-full-pdf-chunk-error', {
                    chunkIndex: i,
                    error: err.message,
                });
                // Graceful degradation: partial results are better than a total crash
            }
        }

        this._logQuizDebug('quiz-full-pdf-success', {
            totalRequested: requestedQuestionCount,
            totalGenerated: allGeneratedQuestions.length,
        });

        return allGeneratedQuestions;
    },

    // =========================================
    // MAP AI QUESTIONS → SESSION CARD SHAPE
    // =========================================

    _mapAiQuestionsToCards(aiQuestions) {
        return aiQuestions.map((q, index) => {
            const options = this._shuffleArray([q.correctAnswer, ...q.distractors]);
            const distractorExplanations = {};
            options.forEach((opt, i) => {
                if (opt === q.correctAnswer) return;
                const distIdx = q.distractors.indexOf(opt);
                if (distIdx !== -1 && q.explanations[distIdx]) {
                    distractorExplanations[i] = q.explanations[distIdx];
                }
            });
            return {
                _id: `quiz_ai_${index}_${Date.now()}`,
                front: q.questionText,
                back: q.correctAnswer,
                canonicalBack: q.correctAnswer,
                difficulty: q.difficulty,
                correctAnswerExplanation: q.correctAnswerExplanation || '',
                options,
                distractorExplanations,
                isAiGenerated: true,
            };
        });
    },

    // =========================================
    // TRUE/FALSE TRANSFORM
    // =========================================

    _transformToTrueFalse(cards, allAnswers = []) {
        logger.debug('StudyService.quiz', `Transforming ${cards.length} cards to TRUE/FALSE format`);

        return cards.map((card, index) => {
            const isTrue = Math.random() < 0.5;

            let statement;
            let correctAnswer;

            if (isTrue) {
                statement = `${card.front} → ${card.back}`;
                correctAnswer = 'Vero';
            } else {
                const wrongAnswers = allAnswers.filter(answer =>
                    this._normalizeAnswerValue(answer) !== this._normalizeAnswerValue(card.back),
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
                logger.debug('StudyService.quiz', `Sample TF card #${index + 1}`, {
                    statement: statement.substring(0, 80) + '...',
                    correctAnswer,
                    isTrue,
                });
            }

            return transformedCard;
        });
    },
};
