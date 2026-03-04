/**
 * 🤖 STUDY SERVICE - AI Tutor
 * ========================================
 * Chatbot tutore con contesto PDF, domande d'esame.
 */

const path = require('path');
const fs = require('fs/promises');
const Deck = require('../../models/Deck');
const AppError = require('../../utils/AppError');
const pdfCacheService = require('../pdfCacheService');
const vectorStoreService = require('../vectorStoreService');
const aiUsageService = require('../aiUsageService');
const {
    openai,
    getValidModel,
    MAX_TUTOR_MESSAGE_LENGTH,
    MAX_EXTRACTED_TEXT_STORE_LENGTH,
    PDF_UPLOADS_DIR,
} = require('./constants');

module.exports = {

    /**
     * 💬 ASK TUTOR - Chat con tutor AI basato sul contesto del PDF
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

        const deck = await Deck.findOne({ _id: deckId, user: userId })
            .select('+extractedText');

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        let extractedText = typeof deck.extractedText === 'string' ? deck.extractedText : '';
        const hasPageMarkers = /--- PAGE \d+ ---|--- Pagina \d+ ---/.test(extractedText);

        const extractAndStorePdfText = async ({ strict = true } = {}) => {
            if (!deck.pdfUrl || typeof deck.pdfUrl !== 'string') {
                if (strict) {
                    throw AppError.validation('Nessun PDF collegato a questo mazzo');
                }
                return null;
            }

            const pdfFileName = path.basename(deck.pdfUrl);
            const pdfFilePath = path.join(PDF_UPLOADS_DIR, pdfFileName);

            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(pdfFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('PDF non trovato sul server. Ricaricalo e riprova.');
                }
                return null;
            }

            let pdfText;
            try {
                const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
                pdfText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('Impossibile leggere il PDF per la chat.');
                }
                return null;
            }

            const normalizedExtracted = this._normalizeExtractedText(pdfText);
            if (!normalizedExtracted || normalizedExtracted.length < 50) {
                if (strict) {
                    throw AppError.validation('Il PDF non contiene testo leggibile.');
                }
                return null;
            }

            deck.extractedText = this._truncateText(
                normalizedExtracted,
                MAX_EXTRACTED_TEXT_STORE_LENGTH,
                '\n\n[...testo troncato...]'
            );
            await deck.save({ validateModifiedOnly: true });
            extractedText = deck.extractedText;

            return extractedText;
        };

        if (!extractedText || extractedText.trim().length < 50) {
            await extractAndStorePdfText({ strict: true });
        } else if (!hasPageMarkers) {
            await extractAndStorePdfText({ strict: false });
        }

        let context = '';
        try {
            const matches = await vectorStoreService.queryDeck(deckId, cleanMessage, 5, {
                userId,
                mode: 'tutor',
                feature: 'tutor_vector_query',
            });
            if (Array.isArray(matches) && matches.length > 0) {
                context = matches.join('\n\n---\n\n');
            }
        } catch (err) {
            console.error('⚠️ Vector query error:', err.message);
        }

        if (!context && extractedText) {
            try {
                await vectorStoreService.ingestDeck(deckId, extractedText, {
                    userId,
                    mode: 'tutor',
                    feature: 'tutor_vector_ingest_fallback',
                });
                const matches = await vectorStoreService.queryDeck(deckId, cleanMessage, 5, {
                    userId,
                    mode: 'tutor',
                    feature: 'tutor_vector_query_fallback',
                });
                if (Array.isArray(matches) && matches.length > 0) {
                    context = matches.join('\n\n---\n\n');
                }
            } catch (err) {
                console.error('⚠️ Vector ingest+query fallback error:', err.message);
            }
        }

        const model = getValidModel(process.env.OPENAI_CHAT_MODEL);
        const contextLimit = model.includes('gpt-3.5') ? 15000 : 50000;

        if (!context) {
            context = this._buildTutorContext(extractedText, cleanMessage, contextLimit);
        }

        if (!context || context.trim().length < 20) {
            throw AppError.validation('Non ci sono abbastanza dati per rispondere.');
        }

        context = this._truncateText(context, contextLimit, '\n\n[...contesto troncato...]');

        const systemPrompt =
            'Sei Silvi, un Tutor Esperto e Socratico: chiaro, rigoroso e incoraggiante.\n' +
            'Rispondi alla domanda dell\'utente basandoti ESCLUSIVAMENTE sul CONTESTO fornito.\n' +
            'Se la risposta non è nel contesto, dillo chiaramente.\n\n' +
            'CONTESTO:\n"""\n' + context + '\n"""\n\n' +
            'Rispondi in italiano. Se utile, cita brevi frasi tra virgolette.';

        const safeHistory = this._sanitizeTutorHistory(history);

        let aiResponse;
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...safeHistory,
                { role: 'user', content: cleanMessage },
            ];

            const completion = await aiUsageService.runTrackedChatCompletion({
                userId,
                mode: 'tutor',
                feature: 'tutor_chat_answer',
                model,
                messages,
                promptLengthChars: systemPrompt.length + cleanMessage.length,
                metadata: {
                    deckId: String(deckId),
                    historyMessages: safeHistory.length,
                },
            }, () => openai.chat.completions.create({
                model,
                messages,
                temperature: 0.2,
                max_completion_tokens: 600,
            }));

            aiResponse = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error('❌ OpenAI Tutor Error:', err.message);

            if (err.code === 'insufficient_quota') {
                throw AppError.validation('Quota OpenAI esaurita.');
            }
            throw AppError.validation('Errore nella risposta AI. Riprova.');
        }

        const reply = typeof aiResponse === 'string' ? aiResponse.trim() : '';
        if (!reply) {
            throw AppError.validation('Risposta AI vuota. Riprova.');
        }

        return { reply };
    },

    /**
     * 📚 ANSWER EXAM QUESTION - Risponde a domande d'esame usando il contesto del PDF
     */
    async answerExamQuestion(tenantScope, deckId, question) {
        const userId = this._getUserId(tenantScope);

        if (!question || typeof question !== 'string') {
            throw AppError.validation('La domanda è obbligatoria');
        }

        const cleanQuestion = question.trim();
        if (!cleanQuestion) {
            throw AppError.validation('La domanda non può essere vuota');
        }
        if (cleanQuestion.length > MAX_TUTOR_MESSAGE_LENGTH) {
            throw AppError.validation(`Domanda troppo lunga (max ${MAX_TUTOR_MESSAGE_LENGTH} caratteri)`);
        }

        const deck = await Deck.findOne({ _id: deckId, user: userId })
            .select('+extractedText');

        if (!deck) {
            throw AppError.notFound('Mazzo');
        }

        let extractedText = typeof deck.extractedText === 'string' ? deck.extractedText : '';
        const hasPageMarkers = /--- PAGE \d+ ---|--- Pagina \d+ ---/.test(extractedText);

        const extractAndStorePdfText = async ({ strict = true } = {}) => {
            if (!deck.pdfUrl || typeof deck.pdfUrl !== 'string') {
                if (strict) {
                    throw AppError.validation('Nessun PDF collegato a questo mazzo');
                }
                return null;
            }

            const pdfFileName = path.basename(deck.pdfUrl);
            const pdfFilePath = path.join(PDF_UPLOADS_DIR, pdfFileName);

            let pdfBuffer;
            try {
                pdfBuffer = await fs.readFile(pdfFilePath);
            } catch (err) {
                console.error('❌ PDF Read Error (Exam Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('PDF non trovato sul server. Ricaricalo e riprova.');
                }
                return null;
            }

            let pdfText;
            try {
                const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
                pdfText = this._formatPdfTextWithPages(pdfData);
            } catch (err) {
                console.error('❌ PDF Parse Error (Exam Tutor):', err.message);
                if (strict) {
                    throw AppError.validation('Impossibile leggere il PDF.');
                }
                return null;
            }

            const normalizedExtracted = this._normalizeExtractedText(pdfText);
            if (!normalizedExtracted || normalizedExtracted.length < 50) {
                if (strict) {
                    throw AppError.validation('Il PDF non contiene testo leggibile.');
                }
                return null;
            }

            deck.extractedText = this._truncateText(
                normalizedExtracted,
                MAX_EXTRACTED_TEXT_STORE_LENGTH,
                '\n\n[...testo troncato...]'
            );
            await deck.save({ validateModifiedOnly: true });
            extractedText = deck.extractedText;

            return extractedText;
        };

        if (!extractedText || extractedText.trim().length < 50) {
            await extractAndStorePdfText({ strict: true });
        } else if (!hasPageMarkers) {
            await extractAndStorePdfText({ strict: false });
        }

        let context = '';
        try {
            const matches = await vectorStoreService.queryDeck(deckId, cleanQuestion, 8, {
                userId,
                mode: 'tutor',
                feature: 'exam_tutor_vector_query',
            });
            if (Array.isArray(matches) && matches.length > 0) {
                context = matches.join('\n\n---\n\n');
            }
        } catch (err) {
            console.error('⚠️ Vector query error:', err.message);
        }

        if (!context && extractedText) {
            try {
                await vectorStoreService.ingestDeck(deckId, extractedText, {
                    userId,
                    mode: 'tutor',
                    feature: 'exam_tutor_vector_ingest_fallback',
                });
                const matches = await vectorStoreService.queryDeck(deckId, cleanQuestion, 8, {
                    userId,
                    mode: 'tutor',
                    feature: 'exam_tutor_vector_query_fallback',
                });
                if (Array.isArray(matches) && matches.length > 0) {
                    context = matches.join('\n\n---\n\n');
                }
            } catch (err) {
                console.error('⚠️ Vector ingest+query fallback error:', err.message);
            }
        }

        const model = getValidModel(process.env.OPENAI_CHAT_MODEL);
        const contextLimit = model.includes('gpt-3.5') ? 15000 : 50000;

        if (!context) {
            context = this._buildTutorContext(extractedText, cleanQuestion, contextLimit);
        }

        if (!context || context.trim().length < 20) {
            throw AppError.validation('Non ci sono abbastanza dati nel materiale per rispondere.');
        }

        context = this._truncateText(context, contextLimit, '\n\n[...contesto troncato...]');

        const systemPrompt = `Sei un TUTOR ACCADEMICO che aiuta studenti a preparare esami.

IL TUO COMPITO: Rispondere alla domanda usando ESCLUSIVAMENTE il contesto fornito.

═══════════════════════════════════════════════════════════════════
REGOLE CRITICHE:
═══════════════════════════════════════════════════════════════════

1. USA SOLO IL CONTESTO: 
   - Ogni informazione nella tua risposta DEVE provenire dal contesto
   - NON usare conoscenze esterne
   - NON inventare dati, date, nomi, numeri

2. SE LA RISPOSTA NON È NEL CONTESTO:
   - Rispondi con: "⚠️ RISPOSTA NON TROVATA NEL MATERIALE FORNITO"
   - Poi suggerisci: "Argomenti correlati trovati: [lista]" (se ce ne sono)

3. FORMATO RISPOSTA:
   - Concisa ma completa (50-150 parole ideali)
   - Usa elenchi puntati se appropriato
   - Cita parti specifiche del contesto quando utile

4. QUALITÀ:
   - Rispondi come se dovessi scrivere su un compito d'esame
   - Sii preciso e tecnico dove richiesto
   - Evita ripetizioni e filler

CONTESTO (DAL LIBRO/SLIDE DELLO STUDENTE):
"""
${context}
"""

DOMANDA DA RISPONDERE:
"""
${cleanQuestion}
"""

GENERA LA RISPOSTA:`;

        let aiResponse;
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cleanQuestion },
            ];

            const completion = await aiUsageService.runTrackedChatCompletion({
                userId,
                mode: 'tutor',
                feature: 'exam_tutor_answer',
                model,
                messages,
                promptLengthChars: systemPrompt.length + cleanQuestion.length,
                metadata: {
                    deckId: String(deckId),
                },
            }, () => openai.chat.completions.create({
                model,
                messages,
                temperature: 0.1,
                max_completion_tokens: 800,
            }));

            aiResponse = completion.choices[0]?.message?.content;
        } catch (err) {
            console.error('❌ OpenAI Exam Tutor Error:', err.message);

            if (err.code === 'insufficient_quota') {
                throw AppError.validation('Quota OpenAI esaurita.');
            }
            throw AppError.validation('Errore nella risposta AI. Riprova.');
        }

        const answer = typeof aiResponse === 'string' ? aiResponse.trim() : '';
        if (!answer) {
            throw AppError.validation('Risposta AI vuota. Riprova.');
        }

        const foundInContext = !answer.includes('⚠️ RISPOSTA NON TROVATA');

        const relatedTopicsMatch = answer.match(/Argomenti correlati trovati:\s*(.+)/i);
        const relatedTopics = relatedTopicsMatch
            ? relatedTopicsMatch[1].split(/[,;]/).map(t => t.trim()).filter(Boolean)
            : [];

        return {
            answer,
            foundInContext,
            relatedTopics: relatedTopics.length > 0 ? relatedTopics : null,
        };
    },
};
