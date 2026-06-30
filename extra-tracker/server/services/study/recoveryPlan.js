/**
 * 🔄 STUDY SERVICE - Recovery Plan
 * ========================================
 * Reset exam cards & AI-powered recovery question generation.
 */

const AppError = require('../../utils/AppError');
const examRepository = require('../../repositories/ExamRepository');
const {
    createCompletion,
    ACTIVE_AI_MODEL,
    DEFAULT_EASINESS_FACTOR,
} = require('./constants');
const aiUsageService = require('../aiUsageService');
const logger = require('../../utils/logger');

module.exports = {

    /**
     * Resetta le carte di tutti i deck associati a un esame
     * @param {object} tenantScope - Scope del tenant
     * @param {string} examId - ID dell'esame
     * @param {string} type - 'all' per reset completo, 'hard-only' per solo carte difficili
     * @returns {Promise<object>} - Statistiche del reset
     */
    async resetExamCards(tenantScope, examId, type = 'all') {
        logger.info('RecoveryPlan', 'resetExamCards chiamato', { examId, type });

        // Verifica che l'esame esista e appartenga all'utente
        const exam = await examRepository.findById(tenantScope, examId, { throwIfNotFound: true });
        logger.debug('RecoveryPlan', 'Esame trovato', { title: exam.title });

        // Trova tutti i deck associati a questo esame
        const decks = await this.find(tenantScope, { examId });
        logger.debug('RecoveryPlan', `Trovati ${decks.length} deck per l'esame`);
        if (decks.length === 0) {
            logger.warn('RecoveryPlan', 'Nessun mazzo trovato per esame', { examId });
            throw AppError.notFound('Nessun mazzo trovato per questo esame');
        }

        let totalReset = 0;
        let hardReset = 0;

        for (const deck of decks) {
            let cardsToReset = [];

            if (type === 'all') {
                // Reset tutte le carte
                cardsToReset = deck.cards;
            } else if (type === 'hard-only') {
                // Reset solo carte difficili (status: 'learning' o con basso easinessFactor)
                cardsToReset = deck.cards.filter(card => {
                    const isHard = card.status === 'learning' || 
                                   card.easinessFactor < 2.0 || 
                                   card.repetitions === 0 ||
                                   (card.reviewHistory && card.reviewHistory.length > 0 && 
                                    card.reviewHistory.slice(-3).some(r => r.rating < 3));
                    return isHard;
                });
            }

            // Reset delle carte selezionate
            for (const card of cardsToReset) {
                card.easinessFactor = DEFAULT_EASINESS_FACTOR;
                card.interval = 0;
                card.repetitions = 0;
                card.nextReviewDate = new Date();
                card.status = 'new';
                card.lastReviewed = null;
                // Mantieni reviewHistory per storico, ma resetta i parametri SM-2
            }

            if (type === 'all') {
                totalReset += cardsToReset.length;
            } else {
                hardReset += cardsToReset.length;
            }

            await deck.save();
        }

        const result = {
            decksAffected: decks.length,
            cardsReset: type === 'all' ? totalReset : hardReset,
            type,
        };
        logger.info('RecoveryPlan', 'resetExamCards completato', result);
        return result;
    },

    /**
     * Genera domande AI di approfondimento basate sulle difficoltà segnalate
     * @param {object} tenantScope - Scope del tenant
     * @param {string} examId - ID dell'esame
     * @param {string[]} difficulties - Array di difficoltà segnalate (es. ['concepts', 'time'])
     * @returns {Promise<object>} - Statistiche della generazione
     */
    async generateRecoveryQuestions(tenantScope, examId, difficulties = []) {
        logger.info('RecoveryPlan', 'generateRecoveryQuestions chiamato', { examId, difficulties });
        const userId = this._getUserId(tenantScope);

        // Verifica che l'esame esista e appartenga all'utente
        const exam = await examRepository.findById(tenantScope, examId, { throwIfNotFound: true });
        logger.debug('RecoveryPlan', 'Esame trovato', { title: exam.title });

        // Trova tutti i deck associati a questo esame
        const decks = await this.find(tenantScope, { examId });
        logger.debug('RecoveryPlan', `Trovati ${decks.length} deck per l'esame`);
        if (decks.length === 0) {
            logger.warn('RecoveryPlan', 'Nessun mazzo trovato per esame', { examId });
            throw AppError.notFound('Nessun mazzo trovato per questo esame');
        }

        // Mappa delle difficoltà a descrizioni
        const difficultyMap = {
            concepts: 'concetti difficili e complessi',
            time: 'gestione del tempo e velocità di risposta',
            anxiety: 'ansia e vuoti di memoria',
            unexpected: 'domande impreviste e argomenti non preparati',
        };

        const difficultyDescriptions = difficulties
            .map(d => difficultyMap[d] || d)
            .filter(Boolean);

        const contextPrompt = difficultyDescriptions.length > 0
            ? `L'utente ha riscontrato difficoltà con: ${difficultyDescriptions.join(', ')}.`
            : 'L\'utente ha bisogno di approfondire gli argomenti dell\'esame.';

        let totalGenerated = 0;
        const generatedByDeck = [];

        for (const deck of decks) {
            // Prepara il contesto per la generazione
            const deckContext = deck.extractedText || '';
            const existingCards = deck.cards || [];
            
            // Estrai argomenti dalle carte esistenti per contesto
            const topics = existingCards
                .slice(0, 20) // Limita a prime 20 carte per contesto
                .map(c => c.front)
                .join('\n');

            const prompt = `Sei un tutor esperto che aiuta studenti a prepararsi per esami universitari.

${contextPrompt}

CONTESTO ESAME: "${exam.title}"
${exam.description ? `DESCRIZIONE: ${exam.description}` : ''}

ARGOMENTI ESISTENTI NEL MAZZO:
${topics || 'Nessun argomento specifico'}

${deckContext ? `\nCONTENUTO DEL DOCUMENTO:\n${deckContext.substring(0, 5000)}` : ''}

IL TUO COMPITO:
Genera esattamente 10 nuove flashcard di approfondimento che aiutino l'utente a:
1. Comprendere meglio i concetti difficili
2. Prepararsi per domande impreviste
3. Rafforzare la memoria e ridurre l'ansia
4. Gestire meglio il tempo durante l'esame

REGOLE:
- Le domande devono essere SPECIFICHE e AZIONABILI
- Le risposte devono essere COMPLETE ma CONCISE (minimo 30 parole)
- Evita duplicati con le carte esistenti
- Focus su approfondimento e comprensione profonda
- Usa esempi pratici quando possibile

FORMATO JSON:
{
  "cards": [
    {
      "front": "Domanda specifica e approfondita...",
      "back": "Risposta completa con spiegazione dettagliata..."
    }
  ]
            }`;

            try {
                const messages = [
                    {
                        role: 'system',
                        content: 'Sei un esperto tutor universitario. Generi flashcard di alta qualità per aiutare gli studenti a superare esami difficili. Rispondi SOLO con JSON valido, senza markdown, senza testo extra.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ];

                const completion = await aiUsageService.runTrackedChatCompletion({
                    userId,
                    mode: 'recovery',
                    feature: 'recovery_questions_generation',
                    model: ACTIVE_AI_MODEL,
                    messages,
                    promptLengthChars: prompt.length,
                    metadata: {
                        examId: String(examId),
                        deckId: String(deck._id),
                        difficultiesCount: Array.isArray(difficulties) ? difficulties.length : 0,
                    },
                }, () => createCompletion({
                    model: ACTIVE_AI_MODEL,
                    messages,
                    temperature: 0.7,
                    max_tokens: 4096,
                }));

                const content = completion.choices[0]?.message?.content || '';
                const parsed = this._parseJSONResponse(content);
                const generatedCards = this._extractGeneratedCards(parsed);

                if (generatedCards.length === 0) {
                    logger.warn('RecoveryPlan', `Nessuna carta generata per deck ${deck._id}`);
                    continue;
                }

                // Limita a 10 carte come richiesto
                const cardsToAdd = generatedCards.slice(0, 10).map(card => ({
                    front: (card.front || card.question || '').trim(),
                    back: (card.back || card.answer || '').trim(),
                    easinessFactor: DEFAULT_EASINESS_FACTOR,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date(),
                    status: 'new',
                })).filter(c => c.front.length > 10 && c.back.length > 20);

                if (cardsToAdd.length > 0) {
                    deck.cards.push(...cardsToAdd);
                    await deck.save();
                    totalGenerated += cardsToAdd.length;
                    generatedByDeck.push({
                        deckId: deck._id.toString(),
                        deckTitle: deck.title,
                        count: cardsToAdd.length,
                    });
                }
            } catch (error) {
                logger.error('RecoveryPlan', `Errore generateRecoveryQuestions per deck ${deck._id}`, { message: error.message });
                // Continua con gli altri deck anche se uno fallisce
            }
        }

        const result = {
            decksAffected: generatedByDeck.length,
            totalGenerated,
            generatedByDeck,
        };
        logger.info('RecoveryPlan', 'generateRecoveryQuestions completato', result);
        return result;
    },
};
