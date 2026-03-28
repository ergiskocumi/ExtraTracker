const BaseService = require('../services/BaseService');
const User = require('../models/User');

class UserRepository extends BaseService {
    constructor() {
        super(User, { entityName: 'Utente' });
    }
}

module.exports = new UserRepository();
