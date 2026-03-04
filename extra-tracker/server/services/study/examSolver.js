/**
 * 🎯 STUDY SERVICE - Exam Solver
 * ========================================
 * Extract questions, generate answers, legacy exam solver.
 */

const path = require('path');
const fs = require('fs/promises');
const Deck = require('../../models/Deck');
const Exam = require('../../models/Exam');
const AppError = require('../../utils/AppError');
const pdfCacheService = require('../pdfCacheService');
const vectorStoreService = require('../vectorStoreService');
const aiUsageService = require('../aiUsageService');
const sseManager = require('../../utils/SSEManager');
const {
    openai,
    ACTIVE_AI_MODEL,
    DEFAULT_EASINESS_FACTOR,
    MAX_EXTRACTED_TEXT_STORE_LENGTH,
} = require('./constants');
const logger = require('../../utils/logger');

module.exports = {

    /**
     * 📋 EXTRACT EXAM QUESTIONS - Estrae domande da un documento
     */
    async extractExamQuestions(tenantScope, questionsFilePath) {
        logger.info('ExamSolver', 'Estrazione domande...');
        const userId = this._getUserId(tenantScope);
        let questionsText = '';

        const questionsIsPdf = questionsFilePath.toLowerCase().endsWith('.pdf');

        if (questionsIsPdf) {
            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(questionsFilePath);
            } catch (err) {
                logger.error('ExamSolver', 'PDF Read Error (Questions)', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }

            try {
                const pdfData = await pdfCacheService.parsePDF(questionsFilePath, pdfBuffer);
                questionsText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                logger.error('ExamSolver', 'PDF Parse Error (Questions)', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande. Assicurati che sia un PDF valido.');
            }
        } else {
            try {
                questionsText = await fs.readFile(questionsFilePath, 'utf-8');
            } catch (err) {
                logger.error('ExamSolver', 'TXT Read Error (Questions)', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }
        }

        if (!questionsText || questionsText.trim().length < 50) {
            throw AppError.validation('Il file delle domande non contiene abbastanza testo.');
        }

        const normalizedQuestionsText = this._normalizeExtractedText(questionsText);

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
            const messages = [
                { role: 'system', content: 'Sei un agente di estrazione specializzato. Restituisci SOLO JSON valido.' },
                { role: 'user', content: extractionPrompt },
            ];

            const extractionCompletion = await aiUsageService.runTrackedChatCompletion({
                userId,
                mode: 'exam_solver',
                feature: 'extract_exam_questions',
                model: ACTIVE_AI_MODEL,
                messages,
                promptLengthChars: extractionPrompt.length,
                metadata: {
                    sourceType: questionsIsPdf ? 'pdf' : 'text',
                },
            }, () => openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages,
                temperature: 0.1,
                max_completion_tokens: 4000,
                response_format: { type: 'json_object' },
            }));

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
                    logger.error('ExamSolver', 'JSON Parse Error (Questions)', { message: parseErr.message });
                    questions = this._extractQuestionsFallback(normalizedQuestionsText);
                }
            }
        } catch (err) {
            logger.error('ExamSolver', 'OpenAI Extraction Error', { message: err.message });
            questions = this._extractQuestionsFallback(normalizedQuestionsText);
        }

        if (questions.length === 0) {
            throw AppError.validation('Nessuna domanda trovata nel documento. Verifica che il file contenga domande d\'esame.');
        }

        logger.info('ExamSolver', `Estratte ${questions.length} domande`);

        return { questions };
    },

    /**
     * 🤖 GENERATE EXAM ANSWERS - Genera risposte per domande selezionate
     */
    async generateExamAnswers(tenantScope, sourceFilePath, selectedQuestions, options = {}, onProgress = null) {
        const startTime = Date.now();
        const userId = this._getUserId(tenantScope);
        const { deckId, title, examId } = options;

        if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
            throw AppError.validation('Devi selezionare almeno una domanda');
        }

        // STEP 1: Estrazione testo dal documento sorgente
        logger.info('ExamSolver', 'Estrazione materiale di studio...');
        let sourceBuffer;
        try {
            sourceBuffer = await fs.readFile(sourceFilePath);
        } catch (err) {
            logger.error('ExamSolver', 'PDF Read Error (Source)', { message: err.message });
            throw AppError.validation('Impossibile leggere il file del materiale di studio.');
        }

        let sourceText = '';
        try {
            const pdfData = await pdfCacheService.parsePDF(sourceFilePath, sourceBuffer);
            sourceText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            logger.error('ExamSolver', 'PDF Parse Error (Source)', { message: err.message });
            throw AppError.validation('Impossibile leggere il file del materiale di studio. Assicurati che sia un PDF valido.');
        }

        if (!sourceText || sourceText.trim().length < 100) {
            throw AppError.validation('Il file del materiale di studio non contiene abbastanza testo.');
        }

        const normalizedSourceText = this._normalizeExtractedText(sourceText);

        // STEP 2: Chunking intelligente
        logger.info('ExamSolver', 'Chunking intelligente per documenti lunghi...');
        let useSmartChunking = normalizedSourceText.length > 20000;

        let sourceTextForContext = '';
        let tempDeckId = null;

        if (useSmartChunking) {
            tempDeckId = `temp-exam-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            try {
                await vectorStoreService.ingestDeck(tempDeckId, normalizedSourceText, {
                    userId,
                    mode: 'exam_solver',
                    feature: 'exam_answers_context_ingest',
                });
                logger.info('ExamSolver', 'Materiale ingerito nel vector store (chunking intelligente attivo)');
            } catch (err) {
                logger.warn('ExamSolver', 'Vector ingest error (fallback a testo completo)', { message: err.message });
                useSmartChunking = false;
                tempDeckId = null;
            }
        }

        if (!useSmartChunking) {
            sourceTextForContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');
        }

        logger.info('ExamSolver', `Materiale estratto: ${normalizedSourceText.length} caratteri${useSmartChunking ? ' (chunking intelligente attivo)' : ''}`);

        // STEP 3: Generazione batch risposte
        logger.info('ExamSolver', 'Generazione risposte...');

        const BATCH_SIZE_LOCAL = 10;
        const PARALLEL_BATCHES = 3;
        const SLEEP_BETWEEN_PARALLEL = 200;
        const MAX_RETRIES = 3;

        const allFlashcards = [];
        let answersFound = 0;
        let answersNotFound = 0;
        const totalQuestions = selectedQuestions.length;

        const batches = [];
        for (let i = 0; i < selectedQuestions.length; i += BATCH_SIZE_LOCAL) {
            batches.push({
                questions: selectedQuestions.slice(i, i + BATCH_SIZE_LOCAL),
                startIndex: i,
            });
        }

        logger.debug('ExamSolver', `Totale batch: ${batches.length} (${PARALLEL_BATCHES} in parallelo)`);

        // Helper: recupera contesto per batch
        const getBatchContext = async (batch) => {
            let batchContext = sourceTextForContext;
            if (useSmartChunking && tempDeckId) {
                try {
                    const queryPromises = batch.questions.map(question =>
                        vectorStoreService.queryDeck(tempDeckId, question, 3, {
                            userId,
                            mode: 'exam_solver',
                            feature: 'exam_answers_context_query',
                        })
                            .catch(err => {
                                logger.warn('ExamSolver', 'Vector query error per domanda', { message: err.message });
                                return [];
                            })
                    );

                    const results = await Promise.all(queryPromises);

                    const relevantChunks = [];
                    for (const matches of results) {
                        if (Array.isArray(matches) && matches.length > 0) {
                            relevantChunks.push(...matches);
                        }
                    }

                    const uniqueChunks = [...new Set(relevantChunks)];
                    batchContext = uniqueChunks.join('\n\n---\n\n');

                    if (!batchContext || batchContext.trim().length < 100) {
                        batchContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');
                    }
                } catch (err) {
                    logger.warn('ExamSolver', 'getBatchContext error, using fallback', { message: err.message });
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
                    logger.debug('ExamSolver', `Processando batch ${batchNumber}/${totalBatches} (${batch.questions.length} domande, tentativo ${attempt + 1})`);

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

                    const messages = [
                        { role: 'system', content: 'Sei un tutor accademico. Restituisci SOLO JSON valido.' },
                        { role: 'user', content: batchPrompt },
                    ];

                    const batchCompletion = await aiUsageService.runTrackedChatCompletion({
                        userId,
                        mode: 'exam_solver',
                        feature: 'exam_answers_batch_generation',
                        model: ACTIVE_AI_MODEL,
                        messages,
                        promptLengthChars: batchPrompt.length,
                        metadata: {
                            batchIndex: batchIndex + 1,
                            totalBatches: batches.length,
                            questionCount: batch.questions.length,
                            retryAttempt: attempt + 1,
                        },
                    }, () => openai.chat.completions.create({
                        model: ACTIVE_AI_MODEL,
                        messages,
                        temperature: 0.1,
                        max_completion_tokens: 4000,
                        response_format: { type: 'json_object' },
                    }));

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
                        logger.error('ExamSolver', `Batch ${batchIndex + 1} fallito dopo ${MAX_RETRIES} tentativi`, { message: err.message });
                        const placeholderCards = batch.questions.map(q => ({
                            front: q.trim(),
                            back: '⚠️ Errore nella generazione (max retry raggiunto)',
                            found: false,
                            confidence: 0,
                        }));
                        return { flashcards: placeholderCards, batch };
                    }

                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    logger.warn('ExamSolver', `Batch ${batchIndex + 1} fallito (tentativo ${attempt + 1}/${MAX_RETRIES}), retry in ${delay}ms...`);
                    await this._sleep(delay);
                }
            }
        };

        // Loop parallelo sui batch
        for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
            const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
            logger.debug('ExamSolver', `Processando ${parallelBatches.length} batch in parallelo...`);

            const results = await Promise.all(
                parallelBatches.map((batch, idx) =>
                    processBatchWithRetry(batch, i + idx)
                )
            );

            for (let j = 0; j < results.length; j++) {
                const { flashcards, batch } = results[j];

                for (let cardIdx = 0; cardIdx < flashcards.length; cardIdx++) {
                    const card = flashcards[cardIdx];
                    if (card && card.front && card.back) {
                        let confidence = 0;
                        if (card.found === true || card.found === 'true') {
                            confidence = typeof card.confidence === 'number' && Number.isFinite(card.confidence)
                                ? Math.max(0, Math.min(100, Math.round(card.confidence)))
                                : 50;
                        } else {
                            confidence = typeof card.confidence === 'number' && Number.isFinite(card.confidence)
                                ? Math.max(0, Math.min(100, Math.round(card.confidence)))
                                : 0;
                        }

                        const sourceSnippet = typeof card.sourceSnippet === 'string' && card.sourceSnippet.trim()
                            ? card.sourceSnippet.trim().substring(0, 200)
                            : undefined;

                        let pageNumber = undefined;
                        if (typeof card.pageNumber === 'number' && Number.isFinite(card.pageNumber) && card.pageNumber > 0) {
                            pageNumber = Math.round(card.pageNumber);
                        } else if (sourceSnippet) {
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

                        const currentIndex = batch.startIndex + cardIdx + 1;
                        if (onProgress && currentIndex <= totalQuestions) {
                            onProgress({
                                type: 'progress',
                                current: currentIndex,
                                total: totalQuestions,
                                question: flashcard.front,
                            });

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

            if (i + PARALLEL_BATCHES < batches.length) {
                await this._sleep(SLEEP_BETWEEN_PARALLEL);
            }
        }

        if (allFlashcards.length === 0) {
            throw AppError.validation('Nessuna flashcard generata. Riprova con documenti diversi.');
        }

        logger.info('ExamSolver', `Generate ${allFlashcards.length} flashcard (${answersFound} trovate, ${answersNotFound} non trovate)`);

        // STEP 4: Salvataggio
        logger.info('ExamSolver', 'Salvataggio...');

        let deck;
        if (deckId) {
            deck = await Deck.findOne({ _id: deckId, user: userId });
            if (!deck) {
                throw AppError.notFound('Mazzo');
            }
        } else {
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
        deck.extractedText = this._truncateText(normalizedSourceText, MAX_EXTRACTED_TEXT_STORE_LENGTH);

        const hasValidDeckPdf = await this._isDeckPdfUrlValid(deck.pdfUrl);
        if (!hasValidDeckPdf) {
            deck.pdfUrl = `/uploads/pdfs/${path.basename(sourceFilePath)}`;
        }

        await deck.save();

        try {
            await vectorStoreService.ingestDeck(deck._id.toString(), normalizedSourceText, {
                userId,
                mode: 'exam_solver',
                feature: 'exam_answers_deck_ingest',
            });
        } catch (err) {
            logger.warn('ExamSolver', 'Vector ingest error (non bloccante)', { message: err.message });
        }

        const processingTimeMs = Date.now() - startTime;

        const savedDeck = await Deck.findById(deck._id);
        if (!savedDeck) {
            throw AppError.notFound('Mazzo');
        }

        const totalCardsBefore = savedDeck.cards.length - allFlashcards.length;
        const flashcardsWithIds = savedDeck.cards
            .slice(totalCardsBefore)
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
            flashcards: flashcardsWithIds,
            stats: {
                questionsExtracted: selectedQuestions.length,
                answersFound,
                answersNotFound,
                totalFlashcards: allFlashcards.length,
                processingTimeMs,
            },
        };
    },

    /**
     * 🎯 EXAM SOLVER (LEGACY) - Risolve esami estraendo domande e generando risposte in un unico step
     */
    async examSolver(tenantScope, questionsFilePath, sourceFilePath, options = {}) {
        const startTime = Date.now();
        const userId = this._getUserId(tenantScope);
        const { deckId, title, examId } = options;

        if (!questionsFilePath || typeof questionsFilePath !== 'string') {
            throw AppError.validation('Path file domande non valido');
        }
        if (!sourceFilePath || typeof sourceFilePath !== 'string') {
            throw AppError.validation('Path file materiale non valido');
        }

        // STEP 1: Estrazione domande
        logger.info('ExamSolver', 'STEP 1: Estrazione domande...');
        let questionsText = '';

        const questionsIsPdf = questionsFilePath.toLowerCase().endsWith('.pdf');

        if (questionsIsPdf) {
            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(questionsFilePath);
            } catch (err) {
                logger.error('ExamSolver', 'PDF Read Error (Questions) [legacy]', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }

            try {
                const pdfData = await pdfCacheService.parsePDF(questionsFilePath, pdfBuffer);
                questionsText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                logger.error('ExamSolver', 'PDF Parse Error (Questions) [legacy]', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande. Assicurati che sia un PDF valido.');
            }
        } else {
            try {
                questionsText = await fs.readFile(questionsFilePath, 'utf-8');
            } catch (err) {
                logger.error('ExamSolver', 'TXT Read Error (Questions) [legacy]', { message: err.message });
                throw AppError.validation('Impossibile leggere il file delle domande.');
            }
        }

        if (!questionsText || questionsText.trim().length < 50) {
            throw AppError.validation('Il file delle domande non contiene abbastanza testo.');
        }

        const normalizedQuestionsText = this._normalizeExtractedText(questionsText);

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
            const messages = [
                { role: 'system', content: 'Sei un agente di estrazione specializzato. Restituisci SOLO JSON valido.' },
                { role: 'user', content: extractionPrompt },
            ];

            const extractionCompletion = await aiUsageService.runTrackedChatCompletion({
                userId,
                mode: 'exam_solver',
                feature: 'exam_solver_legacy_extract_questions',
                model: ACTIVE_AI_MODEL,
                messages,
                promptLengthChars: extractionPrompt.length,
                metadata: {
                    sourceType: questionsIsPdf ? 'pdf' : 'text',
                },
            }, () => openai.chat.completions.create({
                model: ACTIVE_AI_MODEL,
                messages,
                temperature: 0.1,
                max_completion_tokens: 4000,
                response_format: { type: 'json_object' },
            }));

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
                    logger.error('ExamSolver', 'JSON Parse Error (Questions) [legacy]', { message: parseErr.message });
                    questions = this._extractQuestionsFallback(normalizedQuestionsText);
                }
            }
        } catch (err) {
            logger.error('ExamSolver', 'OpenAI Extraction Error [legacy]', { message: err.message });
            questions = this._extractQuestionsFallback(normalizedQuestionsText);
        }

        if (questions.length === 0) {
            throw AppError.validation('Nessuna domanda trovata nel documento. Verifica che il file contenga domande d\'esame.');
        }

        logger.info('ExamSolver', `Estratte ${questions.length} domande [legacy]`);

        // STEP 2: Estrazione testo dal materiale
        logger.info('ExamSolver', 'STEP 2: Estrazione materiale di studio...');
        let sourceBuffer;
        try {
            sourceBuffer = await fs.readFile(sourceFilePath);
        } catch (err) {
            logger.error('ExamSolver', 'PDF Read Error (Source) [legacy]', { message: err.message });
            throw AppError.validation('Impossibile leggere il file del materiale di studio.');
        }

        let sourceText = '';
        try {
            const pdfData = await pdfCacheService.parsePDF(sourceFilePath, sourceBuffer);
            sourceText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            logger.error('ExamSolver', 'PDF Parse Error (Source) [legacy]', { message: err.message });
            throw AppError.validation('Impossibile leggere il file del materiale di studio. Assicurati che sia un PDF valido.');
        }

        if (!sourceText || sourceText.trim().length < 100) {
            throw AppError.validation('Il file del materiale di studio non contiene abbastanza testo.');
        }

        const normalizedSourceText = this._normalizeExtractedText(sourceText);
        const sourceTextForContext = this._truncateText(normalizedSourceText, 100000, '\n\n[...materiale troncato...]');

        logger.info('ExamSolver', `Materiale estratto: ${normalizedSourceText.length} caratteri [legacy]`);

        // STEP 3: Generazione batch risposte
        logger.info('ExamSolver', 'STEP 3: Generazione risposte [legacy]...');

        const BATCH_SIZE_LEGACY = 10;
        const allFlashcards = [];
        let answersFound = 0;
        let answersNotFound = 0;

        for (let i = 0; i < questions.length; i += BATCH_SIZE_LEGACY) {
            const batch = questions.slice(i, i + BATCH_SIZE_LEGACY);
            logger.debug('ExamSolver', `Processando batch ${Math.floor(i / BATCH_SIZE_LEGACY) + 1}/${Math.ceil(questions.length / BATCH_SIZE_LEGACY)} (${batch.length} domande) [legacy]`);

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
                const messages = [
                    { role: 'system', content: 'Sei un tutor accademico. Restituisci SOLO JSON valido.' },
                    { role: 'user', content: batchPrompt },
                ];

                const batchCompletion = await aiUsageService.runTrackedChatCompletion({
                    userId,
                    mode: 'exam_solver',
                    feature: 'exam_solver_legacy_batch_generation',
                    model: ACTIVE_AI_MODEL,
                    messages,
                    promptLengthChars: batchPrompt.length,
                    metadata: {
                        batchStartIndex: i,
                        batchQuestionCount: batch.length,
                    },
                }, () => openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages,
                    temperature: 0.1,
                    max_completion_tokens: 4000,
                    response_format: { type: 'json_object' },
                }));

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
                        logger.error('ExamSolver', 'JSON Parse Error (Batch) [legacy]', { message: parseErr.message });
                    }
                }
            } catch (err) {
                logger.error('ExamSolver', `OpenAI Batch Error (${i}-${i + batch.length}) [legacy]`, { message: err.message });
                for (const question of batch) {
                    allFlashcards.push({
                        front: question.trim(),
                        back: '⚠️ Errore nella generazione della risposta',
                        found: false,
                    });
                    answersNotFound++;
                }
            }

            if (i + BATCH_SIZE_LEGACY < questions.length) {
                await this._sleep(500);
            }
        }

        if (allFlashcards.length === 0) {
            throw AppError.validation('Nessuna flashcard generata. Riprova con documenti diversi.');
        }

        logger.info('ExamSolver', `Generate ${allFlashcards.length} flashcard (${answersFound} trovate, ${answersNotFound} non trovate) [legacy]`);

        // STEP 4: Salvataggio
        logger.info('ExamSolver', 'STEP 4: Salvataggio [legacy]...');

        let deck;
        if (deckId) {
            deck = await Deck.findOne({ _id: deckId, user: userId });
            if (!deck) {
                throw AppError.notFound('Mazzo');
            }
        } else {
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
        deck.extractedText = this._truncateText(normalizedSourceText, MAX_EXTRACTED_TEXT_STORE_LENGTH);

        const hasValidDeckPdf = await this._isDeckPdfUrlValid(deck.pdfUrl);
        if (!hasValidDeckPdf) {
            deck.pdfUrl = `/uploads/pdfs/${path.basename(sourceFilePath)}`;
        }

        await deck.save();

        try {
            await vectorStoreService.ingestDeck(deck._id.toString(), normalizedSourceText, {
                userId,
                mode: 'exam_solver',
                feature: 'exam_solver_legacy_deck_ingest',
            });
        } catch (err) {
            logger.warn('ExamSolver', 'Vector ingest error (non bloccante) [legacy]', { message: err.message });
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
    },

    /**
     * Fallback per estrazione domande pattern-based
     * @private
     */
    _extractQuestionsFallback(text) {
        const questions = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.includes('?') && line.length > 10) {
                questions.push(line);
                continue;
            }

            if (/^(\d+\.|[a-z]\))\s+/.test(line) && line.length > 15) {
                questions.push(line);
                continue;
            }

            const imperativePatterns = /^(Spiega|Definisci|Descrivi|Elenca|Confronta|Illustra|Parlare|Trattare)/i;
            if (imperativePatterns.test(line) && line.length > 15) {
                questions.push(line);
            }
        }

        return questions;
    },

    /**
     * Stub per generazione card da AI (non implementato)
     */
    async generateCardsFromAI(_tenantScope, _payload) {
        return null;
    },
};
