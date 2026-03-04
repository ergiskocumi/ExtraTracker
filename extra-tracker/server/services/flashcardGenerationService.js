/**
 * 📄 FLASHCARD GENERATION SERVICE
 * =================================
 * Servizio dedicato alla sola pipeline PDF -> flashcard.
 *
 * Obiettivo: isolare la generazione flashcard dal motore quiz.
 * In questo modo i refactor sul quiz non impattano il flusso
 * di upload/generazione card da PDF.
 */

const BaseService = require('./BaseService');
const Deck = require('../models/Deck');

const helpers = require('./study/helpers');
const pdfGeneration = require('./study/pdfGeneration');

class FlashcardGenerationService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(FlashcardGenerationService.prototype, helpers);
Object.assign(FlashcardGenerationService.prototype, pdfGeneration);

module.exports = new FlashcardGenerationService();
