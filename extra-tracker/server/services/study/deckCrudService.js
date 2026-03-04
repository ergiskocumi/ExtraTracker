/**
 * 🗂️ DECK CRUD SERVICE
 * =====================
 * Service autonomo per le operazioni CRUD su deck e card.
 * Estratto dal mixin deckCrud per avere un confine di dominio netto.
 *
 * Dipende da: BaseService, helpers (utilities condivise), deckCrud (metodi CRUD)
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const deckCrud = require('./deckCrud');

class DeckCrudService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(DeckCrudService.prototype, helpers);
Object.assign(DeckCrudService.prototype, deckCrud);

module.exports = new DeckCrudService();
