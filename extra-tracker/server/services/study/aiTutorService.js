/**
 * 🤖 AI TUTOR SERVICE
 * ====================
 * Service autonomo per il tutor AI e le risposte alle domande d'esame.
 * Estratto dal mixin aiTutor per avere un confine di dominio netto.
 *
 * Dipende da: BaseService, helpers (utilities condivise), aiTutor (logica AI)
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const aiTutor = require('./aiTutor');

class AiTutorService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(AiTutorService.prototype, helpers);
Object.assign(AiTutorService.prototype, aiTutor);

module.exports = new AiTutorService();
