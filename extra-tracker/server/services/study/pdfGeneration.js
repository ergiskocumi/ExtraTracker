/**
 * 📄 STUDY SERVICE - PDF Card Generation (V4: Page-First)
 * ========================================================
 * Generate flashcards from PDF documents using AI.
 * Page-first chunking, one formula, zero recovery.
 */

const path = require('path');
const fs = require('fs/promises');
const AppError = require('../../utils/AppError');
const pdfCacheService = require('../pdfCacheService');
const vectorStoreService = require('../vectorStoreService');
const aiUsageService = require('../aiUsageService');
const sseManager = require('../../utils/SSEManager');
const {
    createCompletion,
    ACTIVE_AI_MODEL,
    DEFAULT_EASINESS_FACTOR,
    MAX_EXTRACTED_TEXT_STORE_LENGTH,
    PAGE_CHUNK_BUDGET,
    CHARS_PER_CARD_BASE,
    MIN_CHUNK_LENGTH,
    BATCH_SIZE,
    MIN_CARDS_PER_CHUNK,
    MAX_CARDS_PER_CHUNK,
    SIMILARITY_THRESHOLD,
} = require('./constants');
const logger = require('../../utils/logger');

let hasLoggedVectorStoreDisabled = false;
const MIN_PAGE_TEXT_FOR_COVERAGE = 80;

module.exports = {

    // =========================================
    // MAIN ORCHESTRATION (6 steps)
    // =========================================

    async generateCardsFromPDF(tenantScope, deckId, pdfFilePath, options = {}) {
        const userId = this._getUserId(tenantScope);
        const deck = await this.findById(tenantScope, deckId, { throwIfNotFound: true });

        if (!pdfFilePath || typeof pdfFilePath !== 'string') {
            throw AppError.validation('Path PDF non valido');
        }

        const nextPdfUrl = `/uploads/pdfs/${path.basename(pdfFilePath)}`;

        sseManager.sendToUser(userId, 'pdf-progress', { step: 'analyzing', message: 'Analisi documento...' });

        // Step 1: Parse PDF
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

        // Step 2: Blueprint analysis
        logger.info('PdfGeneration', 'FASE 1: Analisi strutturale');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'blueprint', message: 'Identifico struttura documento...' });

        const blueprint = await this._analyzeDocumentStructure(normalizedText);
        logger.debug('PdfGeneration', 'Blueprint', blueprint);

        // Vector ingest (fire-and-forget)
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

        // Step 3: Page-first chunking
        logger.info('PdfGeneration', 'FASE 2: Page-first chunking');
        const chunks = this._createPageFirstChunks(normalizedText);
        logger.info('PdfGeneration', `Creati ${chunks.length} chunk page-first`);

        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'chunking',
            totalChunks: chunks.length,
            message: `Diviso in ${chunks.length} sezioni`
        });

        // Step 4: Concept extraction
        logger.info('PdfGeneration', 'FASE 3: Estrazione concetti');
        sseManager.sendToUser(userId, 'pdf-progress', { step: 'concepts', message: 'Estraggo concetti chiave...' });

        const globalConcepts = this._extractConceptsLocally(normalizedText);
        logger.info('PdfGeneration', `Estratti ${globalConcepts.length} concetti chiave`);

        // Step 5: Batch generation
        logger.info('PdfGeneration', 'FASE 4: Generazione flashcard (batch parallelo)');
        const allGeneratedCards = [];
        const usedConcepts = new Set();

        const batches = [];
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            batches.push(chunks.slice(i, i + BATCH_SIZE));
        }

        sseManager.sendToUser(userId, 'pdf-progress', {
            step: 'generating',
            currentChunk: 1,
            totalChunks: chunks.length,
            generatedSoFar: 0,
            message: `Genero flashcard da ${batches.length} batch in parallelo...`
        });

        const batchPromises = batches.map((batch, batchIdx) => {
            const cardTarget = this._calculateBatchCardTarget(batch, blueprint);
            const totalBatchChars = batch.reduce((sum, c) => sum + (c?.text?.length || 0), 0);
            logger.debug('PdfGeneration', `Batch ${batchIdx + 1}/${batches.length}`, {
                chunks: batch.length,
                chars: totalBatchChars,
                cardTarget,
            });

            return this._generateCardsBatch(
                batch,
                blueprint,
                cardTarget,
                usedConcepts,
                batchIdx,
                batches.length,
                { userId, deckId }
            ).catch(err => {
                logger.error('PdfGeneration', `Errore batch ${batchIdx + 1}`, err);
                return [];
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
                currentChunk: Math.min((i + 1) * BATCH_SIZE, chunks.length),
                totalChunks: chunks.length,
                generatedSoFar: allGeneratedCards.length,
                message: `Completato batch ${i + 1}/${batches.length}...`
            });
        }

        logger.info('PdfGeneration', `Totale card pre-deduplica: ${allGeneratedCards.length}`);

        // Step 6: Deduplication + Validation + Save
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

        const validCards = cardsWithoutExistingDuplicates
            .filter(card => this._validateCardQuality(card))
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

        // Ordina per pagina PDF (cronologico) — card senza pagina vanno in fondo
        validCards.sort((a, b) => {
            const pageA = a.sourceMetadata?.pageNumber ?? Infinity;
            const pageB = b.sourceMetadata?.pageNumber ?? Infinity;
            return pageA - pageB;
        });

        this._logPageCoverageDiagnostics(pdfData, validCards);

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
                totalChunks: chunks.length,
                totalBatches: batches.length,
                duplicatesRemoved: removedCount + removedExisting,
                conceptsExtracted: globalConcepts.length,
                generationMode: 'page-first-v4',
            }
        };
    },

    // =========================================
    // PAGE-FIRST CHUNKING
    // =========================================

    _createPageFirstChunks(text) {
        if (!text || typeof text !== 'string') {
            return [{ text: '', hasTitles: false, pageNumbers: [] }];
        }

        const pageSections = this._splitTextIntoPageSections(text);

        if (pageSections.length === 0) {
            return this._chunkPlainText(text);
        }

        const chunks = [];
        let currentParts = [];
        let currentPages = [];
        let currentLength = 0;

        for (const section of pageSections) {
            const pageBlock = `--- PAGE ${section.pageNumber} ---\n${section.text}`;

            if (pageBlock.length > PAGE_CHUNK_BUDGET) {
                // Flush current accumulator first
                if (currentParts.length > 0) {
                    chunks.push(this._buildChunk(currentParts, currentPages));
                    currentParts = [];
                    currentPages = [];
                    currentLength = 0;
                }
                // Split large page by paragraphs
                const subChunks = this._splitLargePageByParagraphs(section, PAGE_CHUNK_BUDGET);
                chunks.push(...subChunks);
                continue;
            }

            if (currentLength > 0 && currentLength + pageBlock.length > PAGE_CHUNK_BUDGET) {
                chunks.push(this._buildChunk(currentParts, currentPages));
                currentParts = [];
                currentPages = [];
                currentLength = 0;
            }

            currentParts.push(pageBlock);
            currentPages.push(section.pageNumber);
            currentLength += pageBlock.length;
        }

        if (currentParts.length > 0) {
            chunks.push(this._buildChunk(currentParts, currentPages));
        }

        this._logChunkingDiagnostics({
            totalChars: text.length,
            detectedPageNumbers: pageSections.map(s => s.pageNumber),
            chunks,
        });

        return chunks.length > 0 ? chunks : [{ text, hasTitles: this._detectTitles(text), pageNumbers: [] }];
    },

    _splitLargePageByParagraphs(section, budget) {
        const paragraphs = section.text.split(/\n\n+/).filter(p => p.trim());
        const chunks = [];
        let currentParts = [];
        let currentLength = 0;
        const pageHeader = `--- PAGE ${section.pageNumber} ---\n`;
        const headerLen = pageHeader.length;

        for (const paragraph of paragraphs) {
            const trimmed = paragraph.trim();
            if (!trimmed) continue;

            const candidateLen = currentLength + (currentParts.length > 0 ? 2 : headerLen) + trimmed.length;

            if (currentParts.length > 0 && candidateLen > budget) {
                chunks.push({
                    text: pageHeader + currentParts.join('\n\n'),
                    hasTitles: this._detectTitles(currentParts.join('\n\n')),
                    pageNumbers: [section.pageNumber],
                });
                currentParts = [];
                currentLength = headerLen;
            }

            if (currentParts.length === 0) {
                currentLength = headerLen;
            }

            currentParts.push(trimmed);
            currentLength += trimmed.length + (currentParts.length > 1 ? 2 : 0);
        }

        if (currentParts.length > 0) {
            chunks.push({
                text: pageHeader + currentParts.join('\n\n'),
                hasTitles: this._detectTitles(currentParts.join('\n\n')),
                pageNumbers: [section.pageNumber],
            });
        }

        return chunks;
    },

    _chunkPlainText(text) {
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
        if (paragraphs.length === 0) return [{ text, hasTitles: false, pageNumbers: [] }];

        const chunks = [];
        let currentParts = [];
        let currentLength = 0;

        for (const paragraph of paragraphs) {
            const trimmed = paragraph.trim();
            if (!trimmed) continue;

            if (currentLength > 0 && currentLength + trimmed.length + 2 > PAGE_CHUNK_BUDGET) {
                const chunkText = currentParts.join('\n\n');
                chunks.push({
                    text: chunkText,
                    hasTitles: this._detectTitles(chunkText),
                    pageNumbers: this._extractPageNumbers(chunkText),
                });
                currentParts = [];
                currentLength = 0;
            }

            currentParts.push(trimmed);
            currentLength += trimmed.length + 2;
        }

        if (currentParts.length > 0) {
            const chunkText = currentParts.join('\n\n');
            chunks.push({
                text: chunkText,
                hasTitles: this._detectTitles(chunkText),
                pageNumbers: this._extractPageNumbers(chunkText),
            });
        }

        return chunks.length > 0 ? chunks : [{ text, hasTitles: false, pageNumbers: [] }];
    },

    _buildChunk(parts, pageNumbers) {
        const text = parts.join('\n\n').trim();
        return {
            text,
            hasTitles: this._detectTitles(text),
            pageNumbers: [...new Set(pageNumbers)].sort((a, b) => a - b),
        };
    },

    _splitTextIntoPageSections(text) {
        if (!text || typeof text !== 'string') return [];

        const markerRegex = /---\s*(?:PAGE|Pagina)\s+(\d+)\s*---/g;
        const matches = [];
        let match;

        while ((match = markerRegex.exec(text)) !== null) {
            matches.push({
                index: match.index,
                markerLength: match[0].length,
                pageNumber: parseInt(match[1], 10),
            });
        }

        if (matches.length === 0) return [];

        return matches.map((current, index) => {
            const contentStart = current.index + current.markerLength;
            const contentEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
            return {
                pageNumber: current.pageNumber,
                text: text.slice(contentStart, contentEnd).trim(),
            };
        }).filter(s => s.text.length >= MIN_PAGE_TEXT_FOR_COVERAGE);
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

    // =========================================
    // CARD COUNT FORMULA (ONE FORMULA)
    // =========================================

    _calculateCardTarget(chunkChars, densityScore) {
        const densityMultiplier = 0.8 + ((densityScore || 0.5) * 0.5);
        const raw = Math.ceil(chunkChars / CHARS_PER_CARD_BASE * densityMultiplier);
        return Math.max(MIN_CARDS_PER_CHUNK, Math.min(MAX_CARDS_PER_CHUNK, raw));
    },

    _calculateBatchCardTarget(batch, blueprint) {
        let total = 0;
        for (const chunk of batch) {
            total += this._calculateCardTarget(chunk.text.length, blueprint?.densityScore);
        }
        return total;
    },


    // =========================================
    // CONCEPT EXTRACTION
    // =========================================

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

        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([word]) => word);
    },

    // =========================================
    // BATCH GENERATION
    // =========================================

    async _generateCardsBatch(chunks, blueprint, cardTarget, usedConcepts, batchIndex, totalBatches, telemetry = {}) {
        const globalContext = blueprint?.globalContext || 'Documento accademico';
        const documentType = blueprint?.documentType || 'other';

        const avoidList = usedConcepts.size > 0
            ? `\nCONCETTI GIÀ TRATTATI (non ripetere): ${[...usedConcepts].slice(-20).join(', ')}`
            : '';

        const combinedText = chunks.map((chunk, idx) => {
            const pageInfo = chunk.pageNumbers?.length > 0
                ? `[Pagine: ${chunk.pageNumbers.join(', ')}]`
                : '';
            return `=== SEZIONE ${idx + 1} ${pageInfo} ===\n${chunk.text}`;
        }).join('\n\n');

        const systemPrompt = `# RUOLO
Agisci come un Professore Universitario esperto in didattica. Il tuo obiettivo è trasformare il materiale di studio in Flashcard di ALTO LIVELLO per un ripasso concettuale profondo.

📚 CONTESTO DOCUMENTO: "${globalContext}"
📄 TIPO: ${documentType}

# OBIETTIVO E COPERTURA
- Analizza l'INTERO testo fornito (dalla prima all'ultima riga).
- Estrai ogni concetto, teoria, processo o classificazione.
- Ignora calcoli numerici specifici, dati puramente statistici di esempi o esercizi svolti. Focalizzati sulla LOGICA dietro di essi.
- Genera esattamente ${cardTarget} flashcard.
${avoidList}

# REGOLE DI SCRITTURA (STILE ESPOSITIVO)
1. LINGUAGGIO AUTONOMO: Non fare mai riferimento al file (EVITA: "come dice il testo", "nel pdf", "l'autore sostiene"). La flashcard deve essere un'unità di conoscenza a sé stante.
2. NESSUN ESEMPIO SPECIFICO: Se il testo presenta un esempio (es. "Il caso della ditta Rossi"), estrai la regola generale che l'esempio illustra, ma non citare il caso specifico nella domanda.
3. RISPOSTE DISCORSIVE: Ogni risposta deve essere un mini-discorso di senso compiuto (minimo 3-4 frasi articolate). Deve permettere allo studente di simulare una risposta orale all'esame.
4. ELENCHI COMPLETI: Se un concetto è diviso in punti, la risposta DEVE elencarli tutti.

# STRUTTURA OUTPUT (JSON FORMAT)
Genera le flashcard nel seguente formato JSON:
{"flashcards":[{"front":"Domanda concettuale e stimolante","back":"Risposta esaustiva, tecnica e articolata","source_metadata":{"page_number":N,"original_quote":"estratto testuale dal materiale (50-200 caratteri)","key_concept":"Il nucleo teorico toccato"}}]}

- "page_number": numero della pagina da cui è tratto il concetto (null se non identificabile).
- "original_quote": citazione LETTERALE dal testo fornito (minimo 50 caratteri, idealmente 100-200). Deve essere un estratto reale, non una parafrasi.

# COSA EVITARE
- Domande mnemoniche su date, nomi di autori minori o bibliografia.
- Domande che richiedono la conoscenza di un esempio specifico per rispondere.
- Risposte telegrafiche o semplici definizioni da dizionario.`;

        const MAX_RETRIES = 2;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const temperature = attempt === 1 ? 0.1 : 0.05;
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
                            cardTarget,
                            retryAttempt: attempt,
                            chunkCount: chunks.length,
                        },
                    },
                    () => createCompletion({
                        model: ACTIVE_AI_MODEL,
                        messages,
                        temperature,
                        max_tokens: 4096,
                        response_format: { type: 'json_object' },
                    })
                );

                if (completion.usage) {
                    logger.debug('PdfGeneration', `Batch ${batchIndex + 1} tokens`, {
                        promptTokens: completion.usage.prompt_tokens,
                        completionTokens: completion.usage.completion_tokens,
                    });
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
                    logger.warn('PdfGeneration', `Batch ${batchIndex + 1}: risposta senza card`, { attempt });
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

        if (front.length < 15 || back.length < 50) return false;

        const frontWords = front.split(/\s+/).length;
        const backWords = back.split(/\s+/).length;
        if (frontWords < 5 || backWords < 15) return false;

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

    // =========================================
    // DIAGNOSTICS
    // =========================================

    _logChunkingDiagnostics({ totalChars = 0, detectedPageNumbers = [], chunks = [] } = {}) {
        const chunkSummaries = (Array.isArray(chunks) ? chunks : []).map((chunk, index) => ({
            index: index + 1,
            chars: chunk?.text?.length || 0,
            pages: Array.isArray(chunk?.pageNumbers) ? chunk.pageNumbers : [],
            hasTitles: Boolean(chunk?.hasTitles),
        }));
        const expectedPages = Array.isArray(detectedPageNumbers) ? detectedPageNumbers.filter(p => Number.isFinite(p)) : [];
        const coveredPages = Array.from(new Set(chunkSummaries.flatMap(c => c.pages))).sort((a, b) => a - b);
        const missingPages = expectedPages.filter(p => !coveredPages.includes(p));

        logger.info('PdfGeneration', 'Chunking diagnostics', {
            totalChars,
            totalPagesDetected: expectedPages.length,
            coveredPages,
            missingPages,
            totalChunks: chunkSummaries.length,
            chunkBudget: PAGE_CHUNK_BUDGET,
        });

        for (const chunk of chunkSummaries) {
            logger.debug('PdfGeneration', `Chunk ${chunk.index}`, chunk);
        }
    },

    _logPageCoverageDiagnostics(pdfData, validCards) {
        const pages = Array.isArray(pdfData?.pages) ? pdfData.pages : [];
        const meaningfulPages = pages
            .filter(p => (typeof p?.text === 'string' ? p.text.trim().length : 0) >= MIN_PAGE_TEXT_FOR_COVERAGE)
            .map(p => Number(p.num))
            .filter(n => Number.isFinite(n) && n > 0);

        if (meaningfulPages.length === 0) return;

        const coveredPages = new Set();
        for (const card of validCards) {
            const pageNumber = Number(card?.sourceMetadata?.pageNumber);
            if (Number.isFinite(pageNumber) && pageNumber > 0) {
                coveredPages.add(pageNumber);
            }
        }

        const uncoveredPages = meaningfulPages.filter(p => !coveredPages.has(p));

        if (uncoveredPages.length > 0) {
            logger.warn('PdfGeneration', 'Pagine senza card dopo generazione (diagnostico, nessuna azione)', {
                totalMeaningfulPages: meaningfulPages.length,
                coveredPages: coveredPages.size,
                uncoveredPages,
            });
        } else {
            logger.info('PdfGeneration', 'Copertura pagine completa', {
                totalMeaningfulPages: meaningfulPages.length,
                totalCards: validCards.length,
            });
        }
    },
};
