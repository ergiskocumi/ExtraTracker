/**
 * 🎯 GOAL SERVICE - Multi-Tenant
 * ==============================
 * 
 * Service layer per la gestione degli obiettivi.
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 * Non ci affidiamo a plugin/proxy che potrebbero fallire silenziosamente.
 */

const BaseService = require('./BaseService');
const Goal = require('../models/Goal');
const CheckIn = require('../models/CheckIn');
const AppError = require('../utils/AppError');

class GoalService extends BaseService {
    constructor() {
        super(Goal, {
            searchFields: ['title', 'description'],
            defaultSort: { deadline: 1 }, // Prima quelli con scadenza più vicina
            entityName: 'Obiettivo',
        });
    }

    // =========================================
    // CUSTOM METHODS
    // =========================================

    /**
     * Trova obiettivi attivi.
     */
    async findActive(tenantScope) {
        return this.find(tenantScope, { status: 'active' });
    }

    /**
     * Trova obiettivi per categoria.
     */
    async findByCategory(tenantScope, category) {
        return this.find(tenantScope, { category });
    }

    /**
     * Calcola il progresso di un obiettivo (con i check-in).
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtriamo sempre per user
     */
    async getGoalWithProgress(tenantScope, goalId) {
        const userId = this._getUserId(tenantScope);
        
        const goal = await this.findById(tenantScope, goalId, {
            throwIfNotFound: true,
        });

        // 🔒 SICUREZZA: Filtro esplicito per user + goalId
        const checkIns = await CheckIn.find({ 
            user: userId,
            goalId 
        }).sort({ date: -1 });

        const totalValue = checkIns.reduce((sum, c) => sum + c.value, 0);

        let progress = 0;
        if (goal.type === 'target' && goal.targetValue > 0) {
            progress = Math.min(100, (totalValue / goal.targetValue) * 100);
        }

        return {
            ...goal.toJSON(),
            checkIns,
            currentValue: totalValue,
            progress: Math.round(progress * 100) / 100,
        };
    }

    /**
     * Dashboard: overview di tutti gli obiettivi con progresso.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtriamo sempre per user
     */
    async getDashboard(tenantScope) {
        const userId = this._getUserId(tenantScope);
        const goals = await this.findActive(tenantScope);
        
        // Per ogni goal, calcola il progresso
        const goalsWithProgress = await Promise.all(
            goals.map(async (goal) => {
                // 🔒 SICUREZZA: Filtro esplicito per user + goalId
                const checkInSum = await CheckIn.aggregate([
                    { $match: { user: userId, goalId: goal._id } },
                    { $group: { _id: null, total: { $sum: '$value' } } },
                ]);

                const currentValue = checkInSum[0]?.total || 0;
                let progress = 0;
                
                if (goal.type === 'target' && goal.targetValue > 0) {
                    progress = Math.min(100, (currentValue / goal.targetValue) * 100);
                }

                return {
                    ...goal.toJSON(),
                    currentValue,
                    progress: Math.round(progress * 100) / 100,
                };
            })
        );

        // Statistiche aggregate
        const stats = {
            total: goals.length,
            byCategory: {},
            avgProgress: 0,
        };

        goalsWithProgress.forEach(g => {
            stats.byCategory[g.category] = (stats.byCategory[g.category] || 0) + 1;
            stats.avgProgress += g.progress;
        });

        if (goals.length > 0) {
            stats.avgProgress = Math.round(stats.avgProgress / goals.length);
        }

        return { goals: goalsWithProgress, stats };
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Pre-delete: elimina anche tutti i check-in associati.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user + goalId
     */
    async beforeDelete(tenantScope, id) {
        const userId = this._getUserId(tenantScope);
        // Cascade delete dei check-in (solo quelli dell'utente corrente)
        await CheckIn.deleteMany({ user: userId, goalId: id });
    }
}

module.exports = new GoalService();
