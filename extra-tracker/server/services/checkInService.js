/**
 * ✅ CHECKIN SERVICE - Multi-Tenant
 * ==================================
 * 
 * Service layer per la gestione dei check-in (progressi obiettivi).
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const BaseService = require('./BaseService');
const CheckIn = require('../models/CheckIn');
const Goal = require('../models/Goal');
const AppError = require('../utils/AppError');

class CheckInService extends BaseService {
    constructor() {
        super(CheckIn, {
            searchFields: ['notes'],
            defaultSort: { date: -1 },
            entityName: 'Check-in',
        });
    }

    // =========================================
    // CUSTOM METHODS
    // =========================================

    /**
     * Trova check-in di un goal specifico.
     */
    async findByGoal(tenantScope, goalId) {
        return this.find(tenantScope, { goalId });
    }

    /**
     * Statistiche mood nel tempo.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user
     */
    async getMoodStats(tenantScope, days = 30) {
        const userId = this._getUserId(tenantScope);
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 🔒 SICUREZZA: Filtro esplicito per user
        return CheckIn.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    avgMood: { $avg: '$mood' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Pre-create: verifica che il goal appartenga all'utente.
     */
    async beforeCreate(tenantScope, data) {
        await this.validateGoalOwnership(tenantScope, data.goalId);
        return data;
    }

    /**
     * Verifica che un goal appartenga al tenant corrente.
     * 
     * 🔒 SICUREZZA ESPLICITA: Query diretta con filtro user
     * 
     * @throws {AppError} Se il goal non esiste o non appartiene all'utente
     */
    async validateGoalOwnership(tenantScope, goalId) {
        if (!goalId) {
            throw AppError.validation('L\'obiettivo è obbligatorio');
        }

        const userId = this._getUserId(tenantScope);
        
        // 🔒 Query diretta con filtro esplicito
        const goal = await Goal.findOne({ _id: goalId, user: userId });
        
        if (!goal) {
            throw AppError.notFound('Obiettivo');
        }
    }
}

module.exports = new CheckInService();
