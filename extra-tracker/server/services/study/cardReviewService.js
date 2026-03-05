/**
 * 📝 CARD REVIEW SERVICE
 * =======================
 * Service autonomo per la review SM-2, verifica risposta e progresso esame.
 * Dipende da: BaseService, helpers, reviewLogic
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const reviewLogic = require('./reviewLogic');

class CardReviewService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(CardReviewService.prototype, helpers);
Object.assign(CardReviewService.prototype, reviewLogic);

module.exports = new CardReviewService();
