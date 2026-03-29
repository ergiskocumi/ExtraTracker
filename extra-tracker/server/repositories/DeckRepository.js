const BaseService = require('../services/BaseService');
const Deck = require('../models/Deck');

class DeckRepository extends BaseService {
    constructor() {
        super(Deck, {
            entityName: 'Mazzo',
            searchFields: ['title', 'description'],
            defaultSort: { createdAt: -1 },
        });
    }
}

module.exports = new DeckRepository();
