const BaseService = require('../services/BaseService');
const WorkLog = require('../models/WorkLog');

class WorkLogRepository extends BaseService {
    constructor() {
        super(WorkLog, {
            entityName: 'WorkLog',
            defaultSort: { date: -1 },
        });
    }
}

module.exports = new WorkLogRepository();
