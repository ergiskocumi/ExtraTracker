const BaseService = require('../services/BaseService');
const AuditLog = require('../models/AuditLog');

class AuditLogRepository extends BaseService {
    constructor() {
        super(AuditLog, { entityName: 'AuditLog' });
    }
}

module.exports = new AuditLogRepository();
