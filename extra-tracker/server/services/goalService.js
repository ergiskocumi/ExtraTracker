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
const eventBus = require('../utils/eventBus');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

    /**
     * Bulk delete goals con verifica ownership e cascade delete dei check-in.
     *
     * 🔒 SICUREZZA ESPLICITA: Verifica che tutti i goal appartengano all'utente
     *
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Array<string>} goalIds - Lista ID dei goal da eliminare
     * @returns {Promise<{deletedGoals: number, deletedCheckIns: number}>}
     */
    async bulkDelete(tenantScope, goalIds = []) {
        const userId = this._getUserId(tenantScope);

        if (!Array.isArray(goalIds) || goalIds.length === 0) {
            throw AppError.validation('Seleziona almeno un obiettivo');
        }

        const uniqueGoalIds = [...new Set(goalIds.map(id => String(id)))];

        // 🔒 SICUREZZA: Verifica ownership per tutti i goal richiesti
        const ownedGoals = await Goal.find({
            _id: { $in: uniqueGoalIds },
            user: userId,
        }).select('_id');

        if (ownedGoals.length !== uniqueGoalIds.length) {
            throw AppError.notFound('Obiettivo');
        }

        // Cascade delete dei check-in associati
        const checkInResult = await CheckIn.deleteMany({
            user: userId,
            goalId: { $in: uniqueGoalIds },
        });

        const goalResult = await Goal.deleteMany({
            user: userId,
            _id: { $in: uniqueGoalIds },
        });

        return {
            deletedGoals: goalResult.deletedCount || 0,
            deletedCheckIns: checkInResult.deletedCount || 0,
        };
    }

    /**
     * Override create per registrare GOAL_CREATED.
     */
    async create(tenantScope, data) {
        const created = await super.create(tenantScope, data);

        const userId = this._getUserId(tenantScope);
        try {
            const metadata = {
                entityId: created._id,
                deadline: created.deadline,
                category: created.category,
            };
            if (created.priority != null) {
                metadata.priority = created.priority;
            }

            await activityService.recordActivity(userId, 'GOAL_CREATED', {
                entityId: created._id,
                category: created.category,
                metadata,
            });
        } catch (err) {
            console.error('❌ Activity log error (GOAL_CREATED):', err.message);
        }

        return created;
    }

    /**
     * Override update per registrare eventi di completion/archiviazione.
     */
    async update(tenantScope, id, data, options = {}) {
        const previous = await this.findById(tenantScope, id, { throwIfNotFound: true });
        const updated = await super.update(tenantScope, id, data, options);

        await this._recordGoalUpdateActivity(tenantScope, previous, updated);

        return updated;
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

    // =========================================
    // MILESTONE METHODS
    // =========================================

    /**
     * Elimina una milestone specifica (operazione atomica).
     * Usa $pull per rimuovere l'embedded document.
     *
     * 🔒 SICUREZZA ESPLICITA: Filtro per user + goalId + milestoneId
     */
    async deleteMilestone(tenantScope, goalId, milestoneId) {
        const userId = this._getUserId(tenantScope);

        const updatedGoal = await Goal.findOneAndUpdate(
            {
                _id: goalId,
                user: userId,
                'milestones._id': milestoneId,
            },
            {
                $pull: { milestones: { _id: milestoneId } },
            },
            { new: true }
        );

        if (!updatedGoal) {
            throw AppError.notFound('Obiettivo o milestone');
        }

        return updatedGoal;
    }

    /**
     * Elimina più milestones in una singola query atomica.
     *
     * 🔒 SICUREZZA ESPLICITA: Verifica ownership del goal e milestoneId presenti
     */
    async bulkDeleteMilestones(tenantScope, goalId, milestoneIds = []) {
        const userId = this._getUserId(tenantScope);

        if (!Array.isArray(milestoneIds) || milestoneIds.length === 0) {
            throw AppError.validation('Seleziona almeno una milestone');
        }

        const uniqueMilestoneIds = [...new Set(milestoneIds.map(id => String(id)))];

        const goal = await Goal.findOne({
            _id: goalId,
            user: userId,
        }).select('milestones');

        if (!goal) {
            throw AppError.notFound('Obiettivo');
        }

        const milestoneIdSet = new Set(goal.milestones.map(m => m._id.toString()));
        const missing = uniqueMilestoneIds.filter(id => !milestoneIdSet.has(id));

        if (missing.length > 0) {
            throw AppError.notFound('Milestone');
        }

        const updatedGoal = await Goal.findOneAndUpdate(
            {
                _id: goalId,
                user: userId,
            },
            {
                $pull: { milestones: { _id: { $in: uniqueMilestoneIds } } },
            },
            { new: true }
        );

        if (!updatedGoal) {
            throw AppError.notFound('Obiettivo');
        }

        return updatedGoal;
    }

    /**
     * Toggle isCompleted di una specifica milestone.
     * Usa l'operatore posizionale $ di MongoDB per update atomico.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user + goalId + milestoneId
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {string} goalId - ID del goal
     * @param {string} milestoneId - ID della milestone
     * @returns {Promise<Goal>} Goal aggiornato
     * @throws {AppError} Se goal o milestone non trovati
     */
    async toggleMilestone(tenantScope, goalId, milestoneId) {
        const userId = this._getUserId(tenantScope);
        
        // Prima trova il goal per verificare ownership e stato attuale
        const goal = await Goal.findOne({ 
            _id: goalId, 
            user: userId,
            'milestones._id': milestoneId
        });
        
        if (!goal) {
            throw AppError.notFound('Obiettivo o milestone');
        }
        
        // Trova la milestone corrente per invertire lo stato
        const milestone = goal.milestones.id(milestoneId);
        if (!milestone) {
            throw AppError.notFound('Milestone');
        }
        
        const newIsCompleted = !milestone.isCompleted;
        const completedAt = newIsCompleted ? new Date() : null;

        // Keep actionSteps in sync if they exist (so UI + progress stay consistent)
        if (Array.isArray(milestone.actionSteps) && milestone.actionSteps.length > 0) {
            milestone.actionSteps = milestone.actionSteps.map((step) => {
                if (typeof step === 'string') {
                    return { title: step, isCompleted: newIsCompleted };
                }
                return {
                    title: step?.title,
                    isCompleted: newIsCompleted,
                };
            });
        }
        
        // Save through Mongoose so legacy actionSteps are normalized correctly
        milestone.isCompleted = newIsCompleted;
        milestone.completedAt = completedAt;
        await goal.save();
        return goal;
    }

    /**
     * Toggle completion di un action step specifico di una milestone.
     *
     * Body: { stepIndex: number, isCompleted: boolean }
     *
     * 🔒 SICUREZZA ESPLICITA: Filtro per user + goalId + milestoneId
     */
    async toggleMilestoneStep(tenantScope, goalId, milestoneId, stepIndex, isCompleted) {
        const userId = this._getUserId(tenantScope);

        const goal = await Goal.findOne({
            _id: goalId,
            user: userId,
            'milestones._id': milestoneId,
        });

        if (!goal) {
            throw AppError.notFound('Obiettivo o milestone');
        }

        const milestone = goal.milestones.id(milestoneId);
        if (!milestone) {
            throw AppError.notFound('Milestone');
        }

        // Ensure actionSteps exist and are normalized
        if (!Array.isArray(milestone.actionSteps)) {
            milestone.actionSteps = [];
        }

        milestone.actionSteps = milestone.actionSteps
            .map((s) => {
                if (typeof s === 'string') {
                    return { title: s, isCompleted: false };
                }
                return {
                    title: s?.title,
                    isCompleted: Boolean(s?.isCompleted),
                };
            })
            .filter((s) => typeof s.title === 'string' && s.title.trim().length > 0)
            .map((s) => ({ title: s.title.trim(), isCompleted: Boolean(s.isCompleted) }));

        const idx = Number(stepIndex);
        if (!Number.isInteger(idx) || idx < 0) {
            throw AppError.validation('stepIndex non valido');
        }

        if (idx >= milestone.actionSteps.length) {
            throw AppError.validation('stepIndex fuori range');
        }

        milestone.actionSteps[idx].isCompleted = Boolean(isCompleted);

        // Auto-complete milestone when all steps completed
        const totalSteps = milestone.actionSteps.length;
        const completedSteps = milestone.actionSteps.filter(s => s && s.isCompleted).length;
        const shouldCompleteMilestone = totalSteps > 0 && completedSteps === totalSteps;

        milestone.isCompleted = shouldCompleteMilestone;
        milestone.completedAt = shouldCompleteMilestone ? (milestone.completedAt || new Date()) : null;

        await goal.save();
        return goal;
    }

    /**
     * Aggiorna campi di una milestone (es. notes).
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user + goalId + milestoneId
     */
    async updateMilestone(tenantScope, goalId, milestoneId, updates = {}) {
        const userId = this._getUserId(tenantScope);

        const normalize = (value) => {
            if (typeof value !== 'string') return '';
            // Normalize newlines + collapse whitespace for duplicate detection
            return value.replace(/\r\n/g, '\n').trim().replace(/\s+/g, ' ');
        };

        // Load current milestone once to support duplicate detection
        const currentGoal = await Goal.findOne({
            _id: goalId,
            user: userId,
            'milestones._id': milestoneId,
        });

        if (!currentGoal) {
            throw AppError.notFound('Obiettivo o milestone');
        }

        const currentMilestone = currentGoal.milestones.id(milestoneId);
        if (!currentMilestone) {
            throw AppError.notFound('Milestone');
        }

        // Consenti solo campi whitelistati
        const $set = {};
        const $push = {};
        if (typeof updates.notes === 'string') {
            const incomingRaw = updates.notes;
            const incomingNorm = normalize(incomingRaw);
            const currentNorm = normalize(currentMilestone.notes || '');

            // If nothing really changed, return current goal without writing
            if (incomingNorm === currentNorm) {
                return currentGoal;
            }

            // Avoid duplicate history entries (compare with last history entry)
            const history = Array.isArray(currentMilestone.notesHistory)
                ? currentMilestone.notesHistory
                : [];
            const last = history.length > 0 ? history[history.length - 1] : null;
            const lastNorm = last ? normalize(last.text) : null;

            $set['milestones.$.notes'] = incomingRaw;
            $set['milestones.$.notesUpdatedAt'] = new Date();

            if (lastNorm == null || lastNorm !== incomingNorm) {
                $push['milestones.$.notesHistory'] = { text: incomingRaw, savedAt: new Date() };
            }
        }

        if (Object.keys($set).length === 0) {
            throw AppError.validation('Nessun campo valido da aggiornare');
        }

        const update = { $set };
        if (Object.keys($push).length > 0) {
            update.$push = $push;
        }

        const updatedGoal = await Goal.findOneAndUpdate(
            {
                _id: goalId,
                user: userId,
                'milestones._id': milestoneId,
            },
            update,
            { new: true }
        );

        if (!updatedGoal) {
            throw AppError.notFound('Obiettivo o milestone');
        }

        return updatedGoal;
    }

    _calculateDaysDiff(startDate, endDate) {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.max(0, Math.ceil((end - start) / MS_PER_DAY));
    }

    async _recordGoalUpdateActivity(tenantScope, previous, updated) {
        if (!previous || !updated) return;
        if (previous.status === updated.status) return;

        const status = updated.status;
        
        // Emetti evento solo per goal completati (Pattern Observer)
        if (status === 'completed') {
            const userId = this._getUserId(tenantScope);
            eventBus.emit('goal.completed', {
                userId,
                goal: updated,
            });
        }
        // Nota: GOAL_ARCHIVED può essere gestito in futuro se necessario
    }
}

module.exports = new GoalService();
