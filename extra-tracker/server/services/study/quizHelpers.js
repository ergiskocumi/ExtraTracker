/**
 * 🧩 STUDY SERVICE - Quiz Helpers
 * ========================================
 * PDF-based quiz generation (AI), session card mapping, true/false transform.
 */

const { openai, DISTRACTOR_AI_MODEL, QUIZ_DEBUG_LOGS } = require('./constants');

module.exports = {

    // =========================================
    // DEBUG & METRICS
    // =========================================

    _logQuizDebug(event, payload = {}) {
        if (!QUIZ_DEBUG_LOGS) return;
        try {
            console.log(`[StudyService.quiz] ${event}`, JSON.stringify(payload));
        } catch {
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

    _countWords(value = '') {
        if (typeof value !== 'string') return 0;
        return value.trim().split(/\s+/).filter(Boolean).length;
    },

    // =========================================
    // AI QUIZ GENERATION FROM PDF TEXT
    // =========================================

    async generateQuizFromPDFText(pdfTextChunk, questionCount = 5, previousQuestions = []) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY non configurata');
        }
        if (!pdfTextChunk || typeof pdfTextChunk !== 'string' || pdfTextChunk.trim().length < 100) {
            throw new Error('Testo PDF non valido o troppo breve per generare domande');
        }

        const count = Math.max(1, Math.floor(questionCount));

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
        const systemPrompt = `Agisci come un esperto di Instructional Design, Cognitive Load Theory e Psicometria. Riceverai dei contenuti da studiare.
        Il tuo compito è generare ${count} domande a risposta multipla che testano la padronanza concettuale profonda, NON la memoria di lavoro.

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
        - Stem di 1 frase, concetto singolo, risposta diretta.
        - Opzioni max 20 parole ciascuna.

        DOMANDE "hard":
        - Stem di 2-3 frasi che costruiscono uno scenario applicativo o mettono in relazione 2+ concetti.
        - Chiedono sintesi, applicazione o ragionamento causale multi-step.
        - Opzioni max 30 parole ciascuna, più sfumate e difficili da distinguere.
        - I distrattori devono essere attraenti anche per chi ha studiato bene, non solo per chi ha studiato in modo superficiale.

        ━━━ REGOLE PSICOMETRICHE (per tutti i livelli) ━━━
        1. DOMANDA AUTOSUFFICIENTE: Lo studente deve capire cosa viene chiesto PRIMA di leggere le opzioni. Vietato: "Quale affermazione è vera?" o "Cosa si può dire di X?".
        2. RAGIONAMENTO, NON MEMORIA: Formula domande su "perché/come" o relazioni causa-effetto. Evita il recupero mnemonico di definizioni.
        3. OPZIONI PULITE: Non iniziare le opzioni con frasi introduttive ("La ragione è...", "Perché...", "In questo caso..."). Solo l'informazione cruda.
        4. ANATOMIA DEI DISTRATTORI — usa questi tre modelli:
        - Errore Causale: inverte causa/effetto o confonde condizione necessaria con sufficiente.
        - Falso Amico: usa un termine tecnico reale nel contesto sbagliato.
        - Inversione/Estremizzazione: afferma l'opposto del meccanismo reale o usa "sempre"/"mai"/"totalmente".
        5. OMOGENEITÀ VISIVA: Le 4 opzioni devono avere lunghezza, grammatica e tono simili. Nessuna deve spiccare visivamente.

        ━━━ SPIEGAZIONI ━━━
        6. correctAnswerExplanation: 2-3 frasi che spiegano il meccanismo concettuale profondo della risposta corretta. Parla direttamente allo studente ("Questo accade perché...", "Il motivo è..."). Mai riferimenti al testo.
        7. explanations (per i distrattori): 1-2 frasi per ciascuno. Nomina l'errore concettuale specifico ("Qui si confonde X con Y", "Questo inverte causa ed effetto"). Tono: tutor paziente, non freddo.`;

        const previousBlock = previousQuestions.length > 0
            ? `\n\n⛔ DOMANDE GIÀ GENERATE (da NON riproporre, nemmeno su concetti simili):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
            : '';

        const userPrompt = `Genera ${count} domande a risposta multipla basate ESCLUSIVAMENTE sul seguente testo:${previousBlock}\n\n${pdfTextChunk}`;

        const isReasoningModel = /^o\d/.test(DISTRACTOR_AI_MODEL);
        this._logQuizDebug('quiz-from-pdf-start', {
            questionCount: count,
            textLength: pdfTextChunk.length,
            previousQuestionsCount: previousQuestions.length,
        });

        let completion;
        try {
            completion = await openai.chat.completions.create(
                {
                    model: DISTRACTOR_AI_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    response_format: responseFormat,
                    ...(isReasoningModel
                        ? { reasoning_effort: 'high' }
                        : { temperature: 0.35 }),
                },
                { timeout: 120000 },
            );
        } catch (apiError) {
            this._logQuizDebug('quiz-from-pdf-api-error', { error: apiError.message });
            throw apiError;
        }

        const content = completion.choices[0]?.message?.content || '';
        this._logQuizDebug('quiz-from-pdf-raw', {
            finishReason: completion.choices[0]?.finish_reason,
            contentLength: content.length,
        });

        const parsed = this._parseJSONResponse(content);
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            throw new Error('Risposta AI non valida: nessuna domanda generata');
        }

        const questions = parsed.questions
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
                console.log(`[StudyService._transformToTrueFalse] Sample card #${index + 1}:`, {
                    statement: statement.substring(0, 80) + '...',
                    correctAnswer,
                    isTrue,
                });
            }

            return transformedCard;
        });
    },
};
