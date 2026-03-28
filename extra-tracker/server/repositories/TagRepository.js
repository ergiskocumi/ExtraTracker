const BaseService = require('../services/BaseService');
const Tag = require('../models/Tag');

class TagRepository extends BaseService {
    constructor() {
        super(Tag, {
            entityName: 'Tag',
            searchFields: ['name'],
            defaultSort: { order: 1, createdAt: 1 },
        });
    }
}

module.exports = new TagRepository();
