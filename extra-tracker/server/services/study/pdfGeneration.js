/**
 * 📄 STUDY SERVICE - PDF Card Generation
 * ========================================
 * Generate flashcards from PDF documents using AI.
 * Semantic chunking, concept extraction, batch generation, deduplication.
 */

const path = require('path');
const fs = require('fs/promises');
const Deck = require('../../models/Deck');
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
    SEMANTIC_CHUNK_SIZE,
    SEMANTIC_CHUNK_OVERLAP,
    MIN_SEMANTIC_CHUNK,
    BATCH_SIZE,
    MIN_CARDS_PER_CHUNK,
    MAX_CARDS_PER_CHUNK,
    MAX_TOTAL_CARDS,
    SIMILARITY_THRESHOLD,
    QUESTION_TYPES,
} = require('./constants');
const logger = require('../../utils/logger');

let hasLoggedVectorStoreDisabled = false;

module.exports = {

    // =========================================
    // MAGIC GENERATE V2
    // =========================================

    async generateCardsFromPDF(tenantScope, deckId, pdfFilePath, options = {}) {
        const userId = this._getUserId(tenantScope);

        const deck = await Deck.findOne({ _id: deckId, user: userId });
        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        if (!pdfFilePath || typeof pdfFilePath !== 'string') {
            throw AppError.validation('Path PDF non valido');
        }

        const nextPdfUrl = `/uploads/pdfs/${path.basename(pdfFilePath)}`;

        sseManager.sendToUser(userId, 'pdf-progress', { step: 'analyzing', message: 'Analisi documento...' });

        let pdfBuffer;
        try {
            pdfBuffer = await fs.readFile(pdfFilePath);
        } catch (err) {
            logger.error('PdfGeneration', 'PDF Read Error', err);
            throw AppError.validation('Impossibile leggere il PDF caricato.');
        }

        let pdfText;
        let pdfData;
        try {
            pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
            pdfText = this._formatPdfTextWithPages(pdfData);
        } catch (err) {
            logger.error('PdfGeneration', 'PDF Parse Error', err);
            if (/password/i.test(err.message || '')) {
                throw AppError.validation('Il PDF è protetto da password. Rimuovi la password e riprova.');
            }
            if (/struttura non valida|invalid pdf structure/i.test(err.message || '')) {
                throw AppError.validation('Il PDF risulta corrotto o non valido. Prova a riesportarlo.');
            }
            throw AppError.validation('Impossibile leggere il PDF. Assicurati che sia valido e non protetto.');
        }

        if (!pdfText || pdfText.trim().length < 100) {
            throw AppError.validation('Il PDF non contiene abbastanza testo da elaborare.');
        }

        const normalizedText = this._normalizeExtractedText(pdfText);
        this._logExtractionQuality(pdfData, normalizedText);
        deck.pdfUrl = nextPdfUrl;
        deck.extractedText = this._truncateText(normalizedText, MAX_EXTRACTED_TEXT_STORE_LENGTH);
        await deck.save({ validateModifiedOnly: true });

        // Blueprint analysis
        logger.info('PdfGeneration', 'FASE 1: Analisi strutturale');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'blueprint', message: 'Identifico struttura documento...' });

        const blueprint = await this._analyzeDocumentStructure(normalizedText);
        logger.debug('PdfGeneration', 'Blueprint', blueprint);

        // Vector ingest (fire-and-forget). Non blocca la generazione flashcard.
        if (typeof vectorStoreService.isConfigured === 'function' && !vectorStoreService.isConfigured()) {
            if (!hasLoggedVectorStoreDisabled) {
                logger.info('PdfGeneration', 'Vector store disabilitato: ingest saltato');
                hasLoggedVectorStoreDisabled = true;
            }
        } else {
            vectorStoreService.ingestDeck(deckId, normalizedText, {
                userId,
                mode: 'flashcards',
                feature: 'flashcards_vector_ingest',
            }).catch(err => {
                const reason = err?.details?.message || err.message;
                logger.warn('PdfGeneration', 'Vector ingest error (non bloccante)', reason);
            });
        }

        // Semantic chunking
        logger.info('PdfGeneration', 'FASE 2: Semantic chunking');
        const semanticChunks = this._createSemanticChunks(normalizedText);
        logger.info('PdfGeneration', `Creati ${semanticChunks.length} chunk semantici`);

        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'chunking',
            totalChunks: semanticChunks.length,
            message: `Diviso in ${semanticChunks.length} sezioni`
        });

        // Local concept extraction
        logger.info('PdfGeneration', 'FASE 3: Estrazione concetti');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'concepts', message: 'Estraggo concetti chiave...' });

        const globalConcepts = this._extractConceptsLocally(normalizedText);
        logger.info('PdfGeneration', `Estratti ${globalConcepts.length} concetti chiave`);

        // Auto card cap
        const autoCardCap = this._estimateOptimalGenerationCardCap({
            textLength: normalizedText.length,
            densityScore: blueprint?.densityScore,
            chunkCount: semanticChunks.length,
            conceptCount: globalConcepts.length,
        });
        const generationCardCap = this._resolveGenerationCardCap(options?.maxCards, autoCardCap);
        const generationBudget = this._resolveGenerationBudget(generationCardCap, semanticChunks.length);

        logger.debug('PdfGeneration', 'Target card', { autoCardCap, generationCardCap, generationBudget });

        // Batch generation
        logger.info('PdfGeneration', 'FASE 4: Generazione flashcard (batch parallelo)');
        let allGeneratedCards = [];
        const usedConcepts = new Set();

        const batches = [];
        for (let i = 0; i < semanticChunks.length; i += BATCH_SIZE) {
            batches.push(semanticChunks.slice(i, i + BATCH_SIZE));
        }

        const batchTargets = this._allocateBatchTargets(batches, generationBudget);
        const plannedTotal = batchTargets.reduce((sum, value) => sum + value, 0);

        logger.debug('PdfGeneration', 'Batch processing', { batches: batches.length, batchSize: BATCH_SIZE, plannedTotal });

        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'generating',
            currentChunk: 1,
            totalChunks: semanticChunks.length,
            generatedSoFar: 0,
            message: `Genero flashcard da ${batches.length} sezioni in parallelo (target automatico)...`
        });

        const batchPromises = batches.map((batch, batchIdx) => {
                const targetCards = batchTargets[batchIdx] || this._calculateBatchTarget(batch);
                const totalBatchChars = batch.reduce((sum, c) => sum + (c?.text?.length || 0), 0);
                logger.debug('PdfGeneration', `Batch ${batchIdx + 1}/${batches.length}`, { chunks: batch.length, chars: totalBatchChars, targetCards });

                return this._generateCardsBatch(
                    batch,
                    blueprint,
                    targetCards,
                    usedConcepts,
                    batchIdx,
                    batches.length,
                    { userId, deckId }
                ).catch(async (err) => {
                    logger.error('PdfGeneration', `Errore batch ${batchIdx + 1}`, err);
                    const fallbackCards = [];
                    for (const chunk of batch) {
                        try {
                            const singleTarget = this._calculateChunkTarget(chunk.text.length, chunk.hasTitles);
                            const singleCards = await this._generateCardsSingle(
                                chunk, blueprint, singleTarget, usedConcepts,
                                batchIdx * BATCH_SIZE, semanticChunks.length,
                                { userId, deckId }
                            );
                            fallbackCards.push(...singleCards);
                        } catch (singleErr) {
                            logger.error('PdfGeneration', 'Fallback singolo fallito', singleErr);
                        }
                }
                return fallbackCards;
            });
        });

        const batchResults = await Promise.allSettled(batchPromises);

        for (let i = 0; i < batchResults.length; i++) {
            const result = batchResults[i];
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                allGeneratedCards.push(...result.value);
                logger.debug('PdfGeneration', `Batch ${i + 1} completato`, { cards: result.value.length });
            } else if (result.status === 'rejected') {
                logger.error('PdfGeneration', `Batch ${i + 1} rifiutato`, result.reason);
            }

            sseManager.sendToUser(userId, 'pdf-progress', {
                step: 'generating',
                currentChunk: Math.min((i + 1) * BATCH_SIZE, semanticChunks.length),
                totalChunks: semanticChunks.length,
                generatedSoFar: allGeneratedCards.length,
                message: `Completato batch ${i + 1}/${batches.length}...`
            });
        }

        logger.info('PdfGeneration', `Totale card pre-deduplica: ${allGeneratedCards.length}`);

        // Deduplication
        logger.info('PdfGeneration', 'FASE 5: Deduplica semantica');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'deduplicating', message: 'Rimuovo duplicati...' });

        const beforeDedup = allGeneratedCards.length;
        const uniqueCards = this._deduplicateCards(allGeneratedCards);
        const removedCount = beforeDedup - uniqueCards.length;
        logger.info('PdfGeneration', `Deduplica: ${removedCount} rimossi (${beforeDedup} → ${uniqueCards.length})`);

        const cardsWithoutExistingDuplicates = this._deduplicateAgainstExistingCards(uniqueCards, deck.cards || []);
        const removedExisting = uniqueCards.length - cardsWithoutExistingDuplicates.length;
        if (removedExisting > 0) {
            logger.info('PdfGeneration', `Rimossi ${removedExisting} duplicati esistenti`);
        }

        // Validation & save
        const validCards = cardsWithoutExistingDuplicates
            .filter(card => this._validateCardQuality(card))
            .slice(0, generationCardCap)
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

                if (card.sourceMetadata &&
                    typeof card.sourceMetadata === 'object' &&
                    Number.isFinite(card.sourceMetadata.pageNumber) &&
                    card.sourceMetadata.pageNumber > 0 &&
                    typeof card.sourceMetadata.originalText === 'string' &&
                    card.sourceMetadata.originalText.trim().length >= 50) {
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

        logger.info('PdfGeneration', `Completato: ${validCards.length} flashcard per deck ${deckId}`);
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
                duplicatesRemoved: removedCount + removedExisting,
                conceptsExtracted: globalConcepts.length,
                autoTargetCards: autoCardCap,
                generationBudget,
                maxCardsApplied: generationCardCap,
            }
        };
    },

    // =========================================
    // CHUNKING & CONCEPT EXTRACTION
    // =========================================

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
        const MAX_ITERATIONS = 200;

        while (start < text.length && iterations < MAX_ITERATIONS) {
            iterations++;
            let end = Math.min(start + SEMANTIC_CHUNK_SIZE, text.length);

            if (end < text.length) {
                const searchStart = Math.max(start, end - 2000);
                const searchZone = text.slice(searchStart, end);

                let bestBreak = -1;

                const pageIdx = Math.max(
                    searchZone.lastIndexOf('--- PAGE'),
                    searchZone.lastIndexOf('--- Pagina')
                );
                if (pageIdx > 100) {
                    bestBreak = pageIdx;
                }

                if (bestBreak === -1) {
                    const doubleNewline = searchZone.lastIndexOf('\n\n');
                    if (doubleNewline > 100) {
                        bestBreak = doubleNewline + 2;
                    }
                }

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

            if (end <= start) {
                end = Math.min(start + SEMANTIC_CHUNK_SIZE, text.length);
            }

            const chunkText = text.slice(start, end).trim();

            if (chunkText.length >= MIN_SEMANTIC_CHUNK) {
                chunks.push({
                    text: chunkText,
                    hasTitles: this._detectTitles(chunkText),
                    pageNumbers: this._extractPageNumbers(chunkText),
                });
            }

            const newStart = end - SEMANTIC_CHUNK_OVERLAP;
            const minAdvance = Math.min(SEMANTIC_CHUNK_SIZE - SEMANTIC_CHUNK_OVERLAP, end - start);

            start = Math.max(newStart, start + minAdvance);
            if (start > end) start = end;

            if (start >= text.length - MIN_SEMANTIC_CHUNK) {
                break;
            }
        }

        if (iterations >= MAX_ITERATIONS) {
            logger.warn('PdfGeneration', 'Chunking: raggiunto limite iterazioni');
        }

        return chunks.length > 0 ? chunks : [{
            text,
            hasTitles: this._detectTitles(text),
            pageNumbers: this._extractPageNumbers(text),
        }];
    },

    _extractPageNumbers(text) {
        if (!text) return [];

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
    },

    _extractKeyConcepts(text, _blueprint) {
        return this._extractConceptsLocally(text);
    },

    _extractConceptsLocally(text) {
        if (!text || typeof text !== 'string') return [];

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

        const words = text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4 && !stopwords.has(w));

        const freq = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }

        const concepts = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([word]) => word);

        logger.debug('PdfGeneration', `Estratti ${concepts.length} concetti`);
        return concepts;
    },

    // =========================================
    // GENERATION V2 HELPERS
    // =========================================

    async _generateCardsV2(chunkText, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks) {
        const chunk = {
            text: chunkText,
            hasTitles: this._detectTitles(chunkText),
            pageNumbers: this._extractPageNumbers(chunkText),
        };
        return this._generateCardsSingle(chunk, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks);
    },

    _selectQuestionTypes(chunkIndex, totalChunks) {
        const allTypes = Object.entries(QUESTION_TYPES);

        const offset = chunkIndex % allTypes.length;
        const selectedTypes = [];

        for (let i = 0; i < Math.min(4, allTypes.length); i++) {
            const typeIndex = (offset + i) % allTypes.length;
            const [name, config] = allTypes[typeIndex];
            selectedTypes.push(`- ${config.prompt}`);
        }

        return selectedTypes.join('\n');
    },

    _calculateChunkTarget(chunkLength, hasTitles) {
        let target = Math.ceil(chunkLength / 1200);
        if (hasTitles) target = Math.ceil(target * 1.1);
        return Math.max(MIN_CARDS_PER_CHUNK, Math.min(MAX_CARDS_PER_CHUNK, target));
    },

    _calculateBatchTarget(batch) {
        let totalTarget = 0;
        for (const chunk of batch) {
            totalTarget += this._calculateChunkTarget(chunk.text.length, chunk.hasTitles);
        }
        return Math.min(totalTarget, MAX_CARDS_PER_CHUNK * BATCH_SIZE);
    },

    _estimateOptimalGenerationCardCap({ textLength = 0, densityScore = 0.5, chunkCount = 0, conceptCount = 0 } = {}) {
        const safeTextLength = Math.max(0, Math.round(this._toNumber(textLength, 0)));
        const safeChunkCount = Math.max(1, Math.round(this._toNumber(chunkCount, 1)));
        const safeConceptCount = Math.max(0, Math.round(this._toNumber(conceptCount, 0)));
        const safeDensity = Math.min(1, Math.max(0.2, this._toNumber(densityScore, 0.5)));

        const lengthBased = Math.ceil(safeTextLength / 1500);
        const chunkBased = Math.ceil(safeChunkCount * 5.5);
        const conceptBased = Math.ceil(safeConceptCount * 0.9);

        let estimate = Math.max(lengthBased, chunkBased, conceptBased, 18);
        if (safeDensity >= 0.75) estimate = Math.round(estimate * 1.15);
        else if (safeDensity <= 0.35) estimate = Math.round(estimate * 0.85);

        const lowerBound = Math.max(16, Math.min(24, safeChunkCount * 3));
        const upperBound = Math.min(MAX_TOTAL_CARDS, Math.max(48, safeChunkCount * 12));

        return Math.min(upperBound, Math.max(lowerBound, estimate));
    },

    _resolveGenerationBudget(generationCardCap = MAX_TOTAL_CARDS, chunkCount = 0) {
        const cap = Math.min(MAX_TOTAL_CARDS, Math.max(20, Math.round(this._toNumber(generationCardCap, MAX_TOTAL_CARDS))));
        const safeChunkCount = Math.max(1, Math.round(this._toNumber(chunkCount, 1)));
        const buffer = cap <= 40 ? 4 : cap <= 80 ? 6 : 8;
        const minimumCoverage = safeChunkCount * 2;

        return Math.min(MAX_TOTAL_CARDS, Math.max(cap + buffer, minimumCoverage));
    },

    _allocateBatchTargets(batches, generationBudget = MAX_TOTAL_CARDS) {
        if (!Array.isArray(batches) || batches.length === 0) return [];

        const baseTargets = batches.map((batch) => this._calculateBatchTarget(batch));
        const baseTotal = baseTargets.reduce((sum, value) => sum + value, 0);
        const safeBudget = Math.max(batches.length, Math.round(this._toNumber(generationBudget, baseTotal)));

        if (baseTotal <= safeBudget) return baseTargets;

        const rawTargets = baseTargets.map((target, idx) => ({
            idx,
            scaled: (target * safeBudget) / Math.max(1, baseTotal),
        }));

        const allocated = rawTargets.map(({ scaled }) => Math.max(1, Math.floor(scaled)));
        let allocatedTotal = allocated.reduce((sum, value) => sum + value, 0);

        while (allocatedTotal > safeBudget) {
            let candidateIdx = -1;
            let candidateValue = 0;
            for (let i = 0; i < allocated.length; i++) {
                if (allocated[i] > 1 && allocated[i] > candidateValue) {
                    candidateIdx = i;
                    candidateValue = allocated[i];
                }
            }
            if (candidateIdx === -1) break;
            allocated[candidateIdx] -= 1;
            allocatedTotal -= 1;
        }

        if (allocatedTotal < safeBudget) {
            const priorities = rawTargets
                .map(({ idx, scaled }) => ({ idx, fraction: scaled - Math.floor(scaled) }))
                .sort((a, b) => b.fraction - a.fraction);

            let guard = 0;
            while (allocatedTotal < safeBudget && guard < safeBudget * 3) {
                guard += 1;
                let changed = false;
                for (const item of priorities) {
                    if (allocatedTotal >= safeBudget) break;
                    if (allocated[item.idx] >= baseTargets[item.idx]) continue;
                    allocated[item.idx] += 1;
                    allocatedTotal += 1;
                    changed = true;
                }
                if (!changed) break;
            }
        }

        return allocated;
    },

    // =========================================
    // BATCH & SINGLE GENERATION
    // =========================================

    async _generateCardsBatch(chunks, blueprint, targetCount, usedConcepts, batchIndex, totalBatches, telemetry = {}) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        const avoidList = usedConcepts.size > 0
            ? `\n⚠️ EVITA domande su questi concetti già trattati: ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        const questionTypes = this._selectQuestionTypes(batchIndex, totalBatches);

        const combinedText = chunks.map((chunk, idx) => {
            const pageInfo = chunk.pageNumbers?.length > 0
                ? `[Pagine: ${chunk.pageNumbers.join(', ')}]`
                : '';
            return `=== SEZIONE ${idx + 1} ${pageInfo} ===\n${chunk.text}`;
        }).join('\n\n');

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
- original_quote: CITAZIONE dal testo originale (MINIMO 50 caratteri, idealmente 100-200)
  DEVE essere una o più FRASI CONSECUTIVE che contengano il concetto.
  L'utente userà questa citazione per trovare il passaggio nel PDF.

OUTPUT JSON:
{"cards":[{"front":"...","back":"...","source_metadata":{"page_number":N,"original_quote":"citazione di almeno 50 caratteri dal testo..."}}]}`;

        const tokenBudget = Math.min(targetCount * 300 + 200, 16000);

        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const baseTemp = attempt === 1 ? 0.6 : 0.4;
                const tempJitter = (batchIndex * 0.05) + (Math.random() * 0.1);
                const temperature = Math.min(baseTemp + tempJitter, 1.0);
                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: combinedText }
                ];

                const completion = await aiUsageService.runTrackedChatCompletion(
                    {
                        userId: telemetry?.userId,
                        mode: 'flashcards',
                        feature: 'flashcards_batch_generation',
                        model: ACTIVE_AI_MODEL,
                        messages,
                        promptLengthChars: systemPrompt.length + combinedText.length,
                        metadata: {
                            deckId: telemetry?.deckId ? String(telemetry.deckId) : '',
                            batchIndex: batchIndex + 1,
                            totalBatches,
                            targetCount,
                            retryAttempt: attempt,
                            chunkCount: chunks.length,
                        },
                    },
                    () => openai.chat.completions.create({
                        model: ACTIVE_AI_MODEL,
                        messages,
                        temperature,
                        max_completion_tokens: tokenBudget,
                        response_format: { type: 'json_object' },
                    })
                );

                if (completion.usage) {
                    const pct = Math.round((completion.usage.completion_tokens / tokenBudget) * 100);
                    logger.debug('PdfGeneration', `Batch ${batchIndex + 1} tokens`, { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens, tokenBudget, temperature: temperature.toFixed(2) });
                }

                const response = completion.choices[0]?.message?.content;
                if (!response) {
                    if (attempt === MAX_RETRIES) return [];
                    continue;
                }

                const cleaned = this._cleanJSON(response);
                const parsed = JSON.parse(cleaned);
                const cards = this._extractGeneratedCards(parsed);
                const normalizedCards = cards
                    .map(c => this._normalizeGeneratedCard(c))
                    .filter(c => c.front && c.back);

                if (normalizedCards.length === 0 && attempt < MAX_RETRIES) {
                    logger.warn('PdfGeneration', `Batch ${batchIndex + 1}: risposta senza card`, { attempt, maxRetries: MAX_RETRIES });
                    await this._sleep(500);
                    continue;
                }

                return normalizedCards;

            } catch (err) {
                logger.error('PdfGeneration', `Batch generation attempt ${attempt} fallito`, err);
                if (attempt === MAX_RETRIES) throw err;
                await this._sleep(1000);
            }
        }
        return [];
    },

    async _generateCardsSingle(chunk, blueprint, targetCount, usedConcepts, chunkIndex, totalChunks, telemetry = {}) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        const avoidList = usedConcepts.size > 0
            ? `\n⚠️ EVITA domande su questi concetti già trattati: ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        const questionTypes = this._selectQuestionTypes(chunkIndex, totalChunks);

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

📌 SOURCE: Per ogni card includi page_number + original_quote (min 50 char, idealmente 100-200).

OUTPUT JSON: {"cards":[{"front":"...","back":"...","source_metadata":{"page_number":N,"original_quote":"citazione di almeno 50 caratteri dal testo..."}}]}`;

        const tokenBudget = Math.min(targetCount * 300 + 200, 8000);
        const temperature = 0.6 + (Math.random() * 0.15);

        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: chunk.text }
            ];

            const completion = await aiUsageService.runTrackedChatCompletion(
                {
                    userId: telemetry?.userId,
                    mode: 'flashcards',
                    feature: 'flashcards_single_generation',
                    model: ACTIVE_AI_MODEL,
                    messages,
                    promptLengthChars: systemPrompt.length + (chunk?.text?.length || 0),
                    metadata: {
                        deckId: telemetry?.deckId ? String(telemetry.deckId) : '',
                        chunkIndex: chunkIndex + 1,
                        totalChunks,
                        targetCount,
                    },
                },
                () => openai.chat.completions.create({
                    model: ACTIVE_AI_MODEL,
                    messages,
                    temperature: Math.min(temperature, 1.0),
                    max_completion_tokens: tokenBudget,
                    response_format: { type: 'json_object' },
                })
            );

            const response = completion.choices[0]?.message?.content;
            if (!response) return [];

            const cleaned = this._cleanJSON(response);
            const parsed = JSON.parse(cleaned);
            const cards = this._extractGeneratedCards(parsed);

            return cards
                .map(c => this._normalizeGeneratedCard(c))
                .filter(c => c.front && c.back);

        } catch (err) {
            logger.error('PdfGeneration', 'Single generation fallito', err);
            return [];
        }
    },

    // =========================================
    // DEDUPLICATION & VALIDATION
    // =========================================

    _detectTitles(text) {
        const titlePatterns = [
            /^#+\s+.+$/m,
            /^[A-Z]{2,}(?:\s+[A-Z]{2,}){2,}\s*$/m,
            /^\d+\.\s+[A-Z]/m,
            /^Capitolo\s+\d+/im,
            /^Sezione\s+\d+/im,
        ];
        return titlePatterns.some(p => p.test(text));
    },

    _extractConceptKey(question) {
        if (!question || typeof question !== 'string') return null;

        const normalized = question
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 5)
            .sort()
            .join('_');

        return normalized || null;
    },

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
    },

    _deduplicateAgainstExistingCards(generatedCards, existingCards) {
        if (!Array.isArray(generatedCards) || generatedCards.length === 0) return [];
        if (!Array.isArray(existingCards) || existingCards.length === 0) return generatedCards;

        const existingSignatures = new Set();
        const existingTexts = [];

        for (const card of existingCards) {
            const front = typeof card?.front === 'string' ? card.front : '';
            const back = typeof card?.back === 'string' ? card.back : '';
            if (!front || !back) continue;

            const signature = this._buildCardSignature(front, back);
            if (signature) existingSignatures.add(signature);
            existingTexts.push(`${front} ${back}`);
        }

        const filtered = [];
        for (const card of generatedCards) {
            const front = typeof card?.front === 'string' ? card.front : '';
            const back = typeof card?.back === 'string' ? card.back : '';
            if (!front || !back) continue;

            const signature = this._buildCardSignature(front, back);
            if (signature && existingSignatures.has(signature)) continue;

            const nearDuplicate = existingTexts.some((text) => {
                const similarity = this._jaccardSimilarity(text, `${front} ${back}`);
                return similarity > SIMILARITY_THRESHOLD;
            });
            if (nearDuplicate) continue;

            filtered.push(card);
            if (signature) existingSignatures.add(signature);
            existingTexts.push(`${front} ${back}`);
        }

        return filtered;
    },

    _buildCardSignature(front, back) {
        const normalize = (value) => String(value || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const normalizedFront = normalize(front);
        const normalizedBack = normalize(back);
        if (!normalizedFront || !normalizedBack) return '';
        return `${normalizedFront}||${normalizedBack}`;
    },

    _jaccardSimilarity(text1, text2) {
        const toBigrams = (text) => {
            const words = text.toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2);
            if (words.length <= 4) return new Set(words);
            const bigrams = new Set();
            for (let i = 0; i < words.length - 1; i++) {
                bigrams.add(words[i] + ' ' + words[i + 1]);
            }
            return bigrams;
        };

        const set1 = toBigrams(text1);
        const set2 = toBigrams(text2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        if (union.size === 0) return 0;
        return intersection.size / union.size;
    },

    _validateCardQuality(card) {
        if (!card || typeof card !== 'object') return false;

        const front = card.front?.trim() || '';
        const back = card.back?.trim() || '';

        if (front.length < 10 || back.length < 15) return false;

        const wordCount = back.split(/\s+/).length;
        if (wordCount < 3) return false;

        return true;
    },

    // =========================================
    // DOCUMENT ANALYSIS (LOCAL)
    // =========================================

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

        const documentType = this._detectDocumentType(sampleText);
        const globalContext = this._extractGlobalContext(sampleText);
        const mainTopics = this._extractMainTopics(sampleText);
        const densityScore = this._calculateDensityScore(sampleText);

        logger.debug('PdfGeneration', `Blueprint locale: ${documentType}`, { density: densityScore.toFixed(2) });

        return { documentType, globalContext, mainTopics, densityScore };
    },

    _detectDocumentType(text) {
        const patterns = {
            textbook: [
                /capitolo\s+\d+/gi, /chapter\s+\d+/gi, /sezione\s+\d+/gi,
                /eserciz[io]/gi, /definizione/gi, /teorema/gi,
                /dimostrazione/gi, /corollario/gi, /lemma/gi,
            ],
            slide_deck: [
                /slide\s+\d+/gi, /\bppt\b/gi, /•\s+/g, /→|⇒|➔/g,
            ],
            research_paper: [
                /abstract/gi, /introduction/gi, /methodology/gi,
                /results/gi, /conclusion/gi, /references/gi,
                /bibliography/gi, /et al\./gi, /\[\d+\]/g,
            ],
            exam_text: [
                /esame/gi, /exam/gi, /domand[ae]/gi, /question/gi,
                /risposta/gi, /answer/gi, /punti:/gi, /points:/gi,
                /voto/gi, /grade/gi,
            ],
            notes: [
                /appunt[io]/gi, /notes/gi, /lezione/gi,
                /lecture/gi, /corso/gi, /course/gi,
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

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (sorted[0][1] >= 3) {
            return sorted[0][0];
        }

        return 'other';
    },

    _extractGlobalContext(text) {
        const sampleText = text.slice(0, 50000);
        const contextParts = [];

        const titlePatterns = [
            /^#\s+(.+)$/m,
            /^([A-Z][A-Z\s]{5,60})$/m,
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

        const sectionTitles = [];
        const sectionPatterns = [
            /^#+\s+(.{5,80})$/gm,
            /^(\d+\.[\d.]*)\s+([A-Z][^\n]{5,60})$/gm,
            /^(•|▪|➤|-)\s*([A-Z][^\n]{10,60})$/gm,
        ];

        for (const pattern of sectionPatterns) {
            let match;
            pattern.lastIndex = 0;
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

        const technicalTerms = this._extractTechnicalTerms(sampleText);
        if (technicalTerms.length > 0) {
            contextParts.push(`Termini chiave: ${technicalTerms.slice(0, 15).join(', ')}`);
        }

        const field = this._identifyField(sampleText);
        if (field) {
            contextParts.push(`Campo: ${field}`);
        }

        const fullContext = contextParts.join('. ');
        return fullContext.length > 10 ? fullContext : 'Documento di studio';
    },

    _extractTechnicalTerms(text) {
        const sampleText = text.slice(0, 50000);

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

        const wordFreq = {};
        const words = sampleText.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/);

        for (const word of words) {
            if (word.length >= 4 && !stopwords.has(word) && !/^\d+$/.test(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        }

        return Object.entries(wordFreq)
            .filter(([_, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    },

    _identifyField(text) {
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
    },

    _extractMainTopics(text) {
        const topics = [];

        const headerPatterns = [
            /^#+\s+(.{5,80})$/gm,
            /^(\d+\.[\d.]*)\s+([^\n]{5,60})$/gm,
            /^(Capitolo|Chapter)\s+\d+[:\s-]+(.+)$/gim,
            /^(Sezione|Section)\s+[\d.]+[:\s-]+(.+)$/gim,
            /^([A-Z][A-Z\s]{5,50}):?\s*$/gm,
            /^(•|▪|➤|►)\s*([A-Z][^\n]{10,60})$/gm,
        ];

        for (const pattern of headerPatterns) {
            let match;
            pattern.lastIndex = 0;
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
    },

    _calculateDensityScore(text) {
        const definitionCount = (text.match(/definizione|teorema|lemma|corollario|propriet[àa]/gi) || []).length;
        const formulaCount = (text.match(/[=+\-*/^√∫∑∏]/g) || []).length;
        const wordCount = text.split(/\s+/).length;
        const charCount = text.length;

        const defDensity = Math.min(1, (definitionCount / wordCount) * 100);
        const formulaDensity = Math.min(1, (formulaCount / charCount) * 50);
        const avgWordLength = charCount / Math.max(1, wordCount);
        const wordDensity = avgWordLength > 6 ? 0.7 : avgWordLength > 5 ? 0.5 : 0.3;

        const score = (defDensity * 0.4) + (formulaDensity * 0.3) + (wordDensity * 0.3);
        return Math.max(0.2, Math.min(1, score));
    },

    _resolveGenerationCardCap(requestedMaxCards = 0, recommendedMaxCards = MAX_TOTAL_CARDS) {
        const recommended = Math.min(
            MAX_TOTAL_CARDS,
            Math.max(20, Math.round(this._toNumber(recommendedMaxCards, MAX_TOTAL_CARDS)))
        );

        const parsed = this._toNumber(requestedMaxCards, 0);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return recommended;
        }

        return Math.min(MAX_TOTAL_CARDS, Math.max(20, Math.round(parsed)));
    },
};
