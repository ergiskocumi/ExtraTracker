/**
 * 🔀 TRUE/FALSE AI GENERATOR
 * ===========================
 * Generates True/False statements from extractedText (PDF) via OpenAI structured output.
 * Follows the same chunking + tracking pattern as MCQ generation in quizHelpers.js.
 */

const {
    openai,
    DISTRACTOR_AI_MODEL,
    QUIZ_DEBUG_LOGS,
    CHUNK_AI_TIMEOUT_MS,
    TF_MIN_TEXT_CHARS,
    TF_CHARS_PER_STATEMENT,
    TF_MIN_STATEMENTS,
    TF_MAX_STATEMENTS,
    TF_TEMPERATURE,
} = require('./constants');
const aiUsageService = require('../aiUsageService');
const logger = require('../../utils/logger');
const { buildChunkStatementCounts } = require('./trueFalseChunking');

// =========================================
// JSON SCHEMA (OpenAI Structured Output)
// =========================================

const buildResponseFormat = (count) => ({
    type: 'json_schema',
    json_schema: {
        name: 'true_false_quiz',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['statements'],
            properties: {
                statements: {
                    type: 'array',
                    description: `Esattamente ${count} affermazioni Vero/Falso.`,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['statement', 'isTrue', 'explanation', 'correctStatement', 'difficulty', 'distortionPattern'],
                        properties: {
                            statement: {
                                type: 'string',
                                description: 'Affermazione chiara e autosufficiente da valutare come Vera o Falsa.',
                            },
                            isTrue: {
                                type: 'boolean',
                                description: 'Se l\'affermazione è fattualmente corretta.',
                            },
                            explanation: {
                                type: 'string',
                                description: 'Spiegazione pedagogica (1-3 frasi) di perché è vera o falsa.',
                            },
                            correctStatement: {
                                type: ['string', 'null'],
                                description: 'Per affermazioni FALSE: la versione corretta. Null per le TRUE.',
                            },
                            difficulty: {
                                type: 'string',
                                enum: ['standard', 'hard'],
                            },
                            distortionPattern: {
                                type: ['string', 'null'],
                                enum: [
                                    'causal_inversion',
                                    'quantitative_distortion',
                                    'category_confusion',
                                    'overgeneralization',
                                    'temporal_displacement',
                                    'mechanism_swap',
                                    null,
                                ],
                                description: 'Per le FALSE: quale pattern di distorsione è usato. Null per le TRUE.',
                            },
                        },
                    },
                },
            },
        },
    },
});

// =========================================
// SYSTEM PROMPT
// =========================================

const buildSystemPrompt = (count) => {
    const hardCount = Math.max(1, Math.round(count * 0.3));
    return `Sei un esperto di Instructional Design, Cognitive Load Theory e Psicometria specializzato nella creazione di test Vero/Falso per esami universitari.

Il tuo compito: generare ${count} affermazioni Vero/Falso dal testo accademico fornito.

━━━ REGOLA ZERO — DIVIETO ASSOLUTO DI RIFERIMENTI ALLA FONTE ━━━
⛔ È VIETATO in qualsiasi campo usare frasi come:
"nel testo", "il testo afferma", "secondo il testo", "come descritto", "stando al testo",
"il documento", "il brano", "il paragrafo", "come indicato", "il materiale".
Le affermazioni devono sembrare scritte da un esperto della materia.

━━━ QUALITÀ AFFERMAZIONI ━━━
1. Ogni affermazione DEVE essere autosufficiente e comprensibile SENZA il testo originale
2. Testa la COMPRENSIONE, non la memorizzazione di formulazioni esatte
3. Le affermazioni devono essere INEQUIVOCABILI — una sola risposta corretta
4. Evita termini assoluti ("sempre", "mai", "tutti", "nessuno") a meno che il materiale non li supporti esplicitamente
5. Evita doppie negazioni
6. Ogni affermazione deve testare UN SOLO concetto

━━━ DESIGN AFFERMAZIONI FALSE (CRITICO) ━━━
Le affermazioni false devono contenere errori PLAUSIBILI. Usa questi pattern di distorsione:
- **Inversione Causale** (causal_inversion): Scambia causa ed effetto
- **Distorsione Quantitativa** (quantitative_distortion): Cambia numeri, percentuali, quantità leggermente
- **Confusione di Categoria** (category_confusion): Attribuisci una proprietà del concetto A al concetto B
- **Sovrageneralizzazione** (overgeneralization): Trasforma una verità specifica in un'affermazione universale
- **Spostamento Temporale** (temporal_displacement): Cambia l'ordine o la tempistica di eventi/processi
- **Scambio di Meccanismo** (mechanism_swap): Sostituisci il meccanismo corretto con uno correlato ma errato

Pattern di distorsione VIETATI:
- Contraddizioni ovvie che qualsiasi studente noterebbe
- Aggiungere "non" a un'affermazione vera
- Cambiare nomi con concetti completamente estranei
- Affermazioni assurde scollegate dalla materia

━━━ DISTRIBUZIONE ━━━
- Genera circa 50% Vero e 50% Falso (varianza: ±10%)
- Difficoltà: ~${count - hardCount} "standard" e ~${hardCount} "hard"
- Le affermazioni "hard" usano distorsioni sottili che richiedono comprensione profonda

━━━ SPIEGAZIONI ━━━
- Per affermazioni VERE: Spiega PERCHÉ è vera con contesto aggiuntivo
- Per affermazioni FALSE: Spiega COSA è sbagliato E fornisci la versione corretta in "correctStatement"
- 1-3 frasi, tono da tutor paziente. Mai riferimenti al testo.`;
};

// =========================================
// HELPERS
// =========================================

function _logDebug(event, payload = {}) {
    if (!QUIZ_DEBUG_LOGS) return;
    logger.debug('TrueFalseGenerator', event, payload);
}

function _parseJSONResponse(content) {
    if (!content || typeof content !== 'string') return null;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        logger.warn('TrueFalseGenerator', '_parseJSONResponse failed', {
            message: e.message,
            preview: cleaned.slice(0, 240),
        });
        return null;
    }
}

// =========================================
// VALIDATION
// =========================================

function _validateOutput(output, requestedCount) {
    const checks = [];
    if (!output || !Array.isArray(output.statements) || output.statements.length === 0) {
        checks.push({ level: 'error', msg: 'Nessun statement generato' });
        return checks;
    }

    if (output.statements.length < requestedCount * 0.7) {
        checks.push({ level: 'warning', msg: `AI ha generato ${output.statements.length}/${requestedCount} statements` });
    }

    const trueCount = output.statements.filter(s => s.isTrue).length;
    const ratio = trueCount / output.statements.length;
    if (output.statements.length >= 4 && (ratio < 0.2 || ratio > 0.8)) {
        checks.push({ level: 'error', msg: `Sbilanciamento V/F critico: ${Math.round(ratio * 100)}% veri (min 20%, max 80%)` });
    } else if (output.statements.length >= 4 && (ratio < 0.3 || ratio > 0.7)) {
        checks.push({ level: 'warning', msg: `Sbilanciamento V/F: ${Math.round(ratio * 100)}% veri` });
    }

    for (const s of output.statements) {
        if (!s.isTrue && !s.correctStatement) {
            checks.push({ level: 'warning', msg: `Statement falso senza correctStatement: "${(s.statement || '').slice(0, 50)}..."` });
        }
        if (!s.explanation || s.explanation.length < 20) {
            checks.push({ level: 'warning', msg: `Spiegazione troppo corta per: "${(s.statement || '').slice(0, 50)}..."` });
        }
    }

    // Duplicate check
    const seen = new Set();
    for (const s of output.statements) {
        const normalized = (s.statement || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalized)) {
            checks.push({ level: 'warning', msg: `Statement duplicato rimosso: "${(s.statement || '').slice(0, 50)}..."` });
        }
        seen.add(normalized);
    }

    return checks;
}

// =========================================
// MAP STATEMENTS → CARD SHAPE
// =========================================

function _mapStatementsToCards(statements) {
    return statements.map((s, index) => ({
        _id: `quiz_tf_${index}_${Date.now()}`,
        front: s.statement,
        back: s.isTrue ? 'Vero' : 'Falso',
        canonicalBack: s.isTrue ? 'Vero' : 'Falso',
        options: ['Vero', 'Falso'],
        isTrueFalse: true,
        isAiGenerated: true,
        difficulty: s.difficulty || 'standard',
        explanation: s.explanation || '',
        correctAnswerExplanation: s.explanation || '',
        correctStatement: s.correctStatement || null,
        distortionPattern: s.distortionPattern || null,
        distractorExplanations: {},
    }));
}

// =========================================
// SINGLE CHUNK GENERATION
// =========================================

async function _generateChunk(textChunk, count, previousStatements = [], telemetry = {}) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY non configurata');
    }
    if (!textChunk || typeof textChunk !== 'string' || textChunk.trim().length < 100) {
        throw new Error('Testo troppo breve per generare affermazioni V/F');
    }

    const safeCount = Math.max(1, Math.min(TF_MAX_STATEMENTS, Math.floor(count)));
    const systemPrompt = buildSystemPrompt(safeCount);

    const previousBlock = previousStatements.length > 0
        ? `\n\nIMPORTANTE: Evita di generare affermazioni simili a queste già generate:\n${previousStatements.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : '';

    const userPrompt = `Genera ${safeCount} affermazioni Vero/Falso basate ESCLUSIVAMENTE sul seguente testo:${previousBlock}\n\n--- INIZIO TESTO ---\n${textChunk}\n--- FINE TESTO ---`;

    _logDebug('chunk-start', {
        count: safeCount,
        textLength: textChunk.length,
        previousCount: previousStatements.length,
    });

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];

    const completion = await aiUsageService.runTrackedChatCompletion(
        {
            userId: telemetry?.userId,
            mode: 'quiz',
            feature: 'true_false_generation_chunk',
            model: DISTRACTOR_AI_MODEL,
            messages,
            promptLengthChars: systemPrompt.length + userPrompt.length,
            metadata: {
                deckId: telemetry?.deckId ? String(telemetry.deckId) : '',
                chunkIndex: telemetry?.chunkIndex ?? null,
                totalChunks: telemetry?.totalChunks ?? null,
                statementCount: safeCount,
                previousStatementsCount: previousStatements.length,
            },
        },
        () => openai.chat.completions.create(
            {
                model: DISTRACTOR_AI_MODEL,
                messages,
                response_format: buildResponseFormat(safeCount),
                temperature: TF_TEMPERATURE,
            },
            { timeout: CHUNK_AI_TIMEOUT_MS },
        ),
    );

    const content = completion.choices[0]?.message?.content || '';
    _logDebug('chunk-raw', {
        finishReason: completion.choices[0]?.finish_reason,
        contentLength: content.length,
    });

    const parsed = _parseJSONResponse(content);
    if (!parsed || !Array.isArray(parsed.statements) || parsed.statements.length === 0) {
        throw new Error('Risposta AI non valida: nessun statement V/F generato');
    }

    // Validate
    const checks = _validateOutput(parsed, safeCount);
    const errors = checks.filter(c => c.level === 'error');
    const warnings = checks.filter(c => c.level === 'warning');

    if (warnings.length > 0) {
        _logDebug('chunk-warnings', { warnings: warnings.map(w => w.msg) });
    }
    if (errors.length > 0) {
        _logDebug('chunk-errors', { errors: errors.map(e => e.msg) });
    }

    // Filter valid statements (deduplicate)
    const seen = new Set();
    const validStatements = parsed.statements.filter(s => {
        if (!s.statement || typeof s.statement !== 'string') return false;
        if (typeof s.isTrue !== 'boolean') return false;
        const normalized = s.statement.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    }).map(s => ({
        statement: s.statement.trim(),
        isTrue: s.isTrue,
        explanation: typeof s.explanation === 'string' ? s.explanation.trim() : '',
        correctStatement: typeof s.correctStatement === 'string' ? s.correctStatement.trim() : null,
        difficulty: s.difficulty === 'hard' ? 'hard' : 'standard',
        distortionPattern: s.distortionPattern || null,
    }));

    _logDebug('chunk-success', { generated: validStatements.length });
    return validStatements;
}

// =========================================
// FULL TEXT ORCHESTRATOR
// =========================================

/**
 * Generate True/False statements from extracted PDF text.
 * Splits text into chunks and generates statements for each chunk.
 *
 * @param {string} extractedText - Full text extracted from PDF
 * @param {number} questionCount - Total number of statements to generate
 * @param {string[]} previousStatements - Previously generated statement texts to avoid duplicates
 * @param {object} telemetry - { userId, deckId }
 * @param {function} splitTextFn - Reference to _splitTextIntoChunks from quizHelpers (injected to avoid circular deps)
 * @returns {object[]} Array of card-shaped objects ready for QuizView
 */
async function generateTrueFalseFromText(extractedText, questionCount, previousStatements = [], telemetry = {}, splitTextFn) {
    if (!extractedText || extractedText.trim().length < TF_MIN_TEXT_CHARS) {
        throw new Error(`Testo troppo breve per generare V/F (minimo ${TF_MIN_TEXT_CHARS} caratteri)`);
    }

    const safeCount = Math.max(TF_MIN_STATEMENTS, Math.min(TF_MAX_STATEMENTS, questionCount));
    const chunks = splitTextFn(extractedText, 5000, 500);

    if (chunks.length === 0) {
        throw new Error('Testo PDF non valido o vuoto');
    }

    const counts = buildChunkStatementCounts(chunks.length, safeCount);

    _logDebug('orchestrator-start', {
        totalChunks: chunks.length,
        totalRequested: safeCount,
        distribution: counts,
        textLength: extractedText.length,
    });

    const allStatements = [];

    for (let i = 0; i < chunks.length; i++) {
        const countForChunk = counts[i];
        if (countForChunk === 0) continue;

        const seenStatements = [
            ...previousStatements,
            ...allStatements.map(s => s.statement),
        ];

        try {
            const statements = await _generateChunk(chunks[i], countForChunk, seenStatements, {
                ...telemetry,
                chunkIndex: i + 1,
                totalChunks: chunks.length,
            });
            allStatements.push(...statements);
        } catch (err) {
            _logDebug('orchestrator-chunk-error', {
                chunkIndex: i,
                error: err.message,
            });
            // Graceful degradation: partial results > total crash
        }

        // Rate-limit protection between chunks
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    _logDebug('orchestrator-success', {
        totalRequested: safeCount,
        totalGenerated: allStatements.length,
    });

    if (allStatements.length >= 4) {
        const totalTrueCount = allStatements.filter((statement) => statement.isTrue).length;
        const totalRatio = totalTrueCount / allStatements.length;
        if (totalRatio < 0.3 || totalRatio > 0.7) {
            _logDebug('orchestrator-warnings', {
                warnings: [`Sbilanciamento V/F finale: ${Math.round(totalRatio * 100)}% veri`],
            });
        }
    }

    if (allStatements.length === 0) {
        throw new Error('Generazione V/F fallita: nessun statement valido prodotto');
    }

    return _mapStatementsToCards(allStatements);
}

async function generateTrueFalseStatementsFromText(extractedText, questionCount, previousStatements = [], telemetry = {}, splitTextFn) {
    if (!extractedText || extractedText.trim().length < TF_MIN_TEXT_CHARS) {
        throw new Error(`Testo troppo breve per generare V/F (minimo ${TF_MIN_TEXT_CHARS} caratteri)`);
    }

    const safeCount = Math.max(TF_MIN_STATEMENTS, Math.min(TF_MAX_STATEMENTS, questionCount));
    const chunks = splitTextFn(extractedText, 5000, 500);

    if (chunks.length === 0) {
        throw new Error('Testo PDF non valido o vuoto');
    }

    const counts = buildChunkStatementCounts(chunks.length, safeCount);
    const allStatements = [];

    for (let i = 0; i < chunks.length; i++) {
        const countForChunk = counts[i];
        if (countForChunk === 0) continue;

        const seenStatements = [
            ...previousStatements,
            ...allStatements.map(s => s.statement),
        ];

        try {
            const statements = await _generateChunk(chunks[i], countForChunk, seenStatements, {
                ...telemetry,
                chunkIndex: i + 1,
                totalChunks: chunks.length,
            });
            allStatements.push(...statements);
        } catch (err) {
            _logDebug('orchestrator-chunk-error', {
                chunkIndex: i,
                error: err.message,
            });
        }

        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    if (allStatements.length >= 4) {
        const totalTrueCount = allStatements.filter((statement) => statement.isTrue).length;
        const totalRatio = totalTrueCount / allStatements.length;
        if (totalRatio < 0.3 || totalRatio > 0.7) {
            _logDebug('orchestrator-warnings', {
                warnings: [`Sbilanciamento V/F finale: ${Math.round(totalRatio * 100)}% veri`],
            });
        }
    }

    if (allStatements.length === 0) {
        throw new Error('Generazione V/F fallita: nessun statement valido prodotto');
    }

    return allStatements;
}

module.exports = {
    generateTrueFalseFromText,
    generateTrueFalseStatementsFromText,
    // Exported for testing
    _generateChunk,
    _validateOutput,
    _mapStatementsToCards,
};
