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

        const count = Math.max(1, Math.min(20, Math.floor(questionCount)));

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
                                required: ['questionText', 'correctAnswer', 'distractors', 'explanations'],
                                properties: {
                                    questionText: { type: 'string' },
                                    correctAnswer: { type: 'string' },
                                    distractors: {
                                        type: 'array',
                                        description: 'Esattamente 3 distrattori (max 20 parole ciascuno).',
                                        items: { type: 'string' },
                                    },
                                    explanations: {
                                        type: 'array',
                                        description: 'Esattamente 3 spiegazioni brevi (1 per distrattore, max 15 parole).',
                                        items: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };

        const systemPrompt = `Agisci come un esperto di Instructional Design, Cognitive Load Theory e Psicometria. Riceverai un estratto da un testo universitario.
Il tuo compito è generare ${count} domande a risposta multipla basate esclusivamente su questo testo, progettate per misurare la padronanza concettuale profonda e non la memoria di lavoro.

REGOLE PSICOMETRICHE E PEDAGOGICHE TASSATIVE:
1. DOMANDA AUTOSUFFICIENTE (The "Cover-the-options" rule): La domanda (stem) deve esporre un problema o uno scenario applicativo chiaro. Lo studente deve capire esattamente cosa viene chiesto PRIMA di leggere le opzioni. Evita formulazioni pigre come "Cosa si evince dal testo riguardo a X?" o "Quale affermazione è vera?".
2. DOMANDE IN POSITIVO E DI RAGIONAMENTO: Formula domande sui "perché/come" o su relazioni causa-effetto. Evita il recupero mnemonico di definizioni. NON usare formulazioni negative ("Quale di questi NON è...") a meno che non sia strettamente necessario, poiché testano l'attenzione alla lettura e non la competenza.
3. SINTESI ESTREMA (Micro-copy): Le opzioni di risposta (corretta e distrattori) devono essere brevissime, dirette e indipendenti. MASSIMO 20 PAROLE per opzione. Vai dritto al nucleo logico.
4. DIVIETO DI RIPETIZIONE: Non iniziare le opzioni con frasi introduttive (es. "Nel contesto descritto...", "La ragione è..., "Secondo il testo...", "Nel testo dice...""). Rimuovi ogni formalismo burocratico. Scrivi solo l'informazione cruda.
5. ANATOMIA DEI DISTRATTORI: Devono intercettare i "misconcetti comuni" per risultare attraenti a chi ha studiato in modo superficiale. Usa questi tre modelli logici:
   - Il Competitivo (Errore Causale): Logicamente vicino alla verità, ma inverte la causa con l'effetto, o confonde una condizione necessaria con una sufficiente.
   - Il Terminologico (Il falso amico): Usa un termine tecnico reale presente nel testo, ma lo inserisce in un contesto logico o fenomeno completamente sbagliato.
   - L'Inversione (o Estremizzazione): Afferma l'esatto opposto del meccanismo reale, oppure trasforma una regola generale e sfumata in un dogma assoluto (es. usando parole come "sempre", "mai", "totalmente").
6. OMOGENEITÀ VISIVA: Le 4 opzioni devono avere lunghezza, grammatica e tono identici. Nessuna opzione deve "spiccare" o sembrare visivamente la risposta corretta. Nessun meta-commento o spiegazione dentro le opzioni.`;

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
                { timeout: 60000 },
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
