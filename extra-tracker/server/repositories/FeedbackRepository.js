const BaseService = require('../services/BaseService');
const Feedback = require('../models/Feedback');

class FeedbackRepository extends BaseService {
    constructor() {
        super(Feedback, { entityName: 'Feedback' });
    }
}

module.exports = new FeedbackRepository();
