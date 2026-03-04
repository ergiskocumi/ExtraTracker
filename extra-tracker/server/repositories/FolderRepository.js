const BaseService = require('../services/BaseService');
const Folder = require('../models/Folder');

class FolderRepository extends BaseService {
    constructor() {
        super(Folder, { entityName: 'Cartella' });
    }
}

module.exports = new FolderRepository();
