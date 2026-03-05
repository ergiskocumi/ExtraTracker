/**
 * 🔄 RECOVERY PLAN SERVICE
 * =========================
 * Service autonomo per reset carte e generazione domande di recupero AI.
 * Dipende da: BaseService, helpers, recoveryPlan
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const recoveryPlan = require('./recoveryPlan');

class RecoveryPlanService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(RecoveryPlanService.prototype, helpers);
Object.assign(RecoveryPlanService.prototype, recoveryPlan);

module.exports = new RecoveryPlanService();
