/**
 * ⏱️ WORKLOG SERVICE - Multi-Tenant
 * ==================================
 * 
 * Service layer per la gestione dei log di lavoro.
 * 
 * ⚠️ SICUREZZA RELAZIONI:
 * Quando crei un WorkLog con un projectId, verifichiamo che
 * il progetto appartenga allo stesso utente (no IDOR cross-tenant).
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const BaseService = require('./BaseService');
const WorkLog = require('../models/WorkLog');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');

class WorkLogService extends BaseService {
    constructor() {
        super(WorkLog, {
            searchFields: ['description'],
            defaultSort: { date: -1, startTime: -1 },
            populateFields: ['projectId'], // Popola automaticamente il progetto
            entityName: 'Log di lavoro',
        });
    }

    // =========================================
    // CUSTOM METHODS
    // =========================================

    /**
     * Trova i log di un mese specifico.
     */
    async findByMonth(tenantScope, year, month) {
        // Costruisce pattern per il mese (YYYY-MM-*)
        const monthStr = String(month).padStart(2, '0');
        const pattern = new RegExp(`^${year}-${monthStr}-`);
        
        return this.find(tenantScope, { date: pattern });
    }

    /**
     * Trova i log di un progetto specifico.
     */
    async findByProject(tenantScope, projectId, options = {}) {
        return this.find(tenantScope, { projectId }, options);
    }

    /**
     * Calcola il totale ore/guadagni per un periodo.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user
     */
    async getTotalsByPeriod(tenantScope, startDate, endDate) {
        const userId = this._getUserId(tenantScope);
        
        // 🔒 SICUREZZA: Filtro esplicito per user
        const results = await WorkLog.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $lookup: {
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project',
                },
            },
            { $unwind: '$project' },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$durationMinutes' },
                    totalEarnings: {
                        $sum: {
                            $multiply: [
                                { $divide: ['$durationMinutes', 60] },
                                '$project.rate',
                            ],
                        },
                    },
                    logCount: { $sum: 1 },
                },
            },
        ]);

        return results[0] || { totalMinutes: 0, totalEarnings: 0, logCount: 0 };
    }

    /**
     * Raggruppa log per data (per vista timeline).
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user
     */
    async groupByDate(tenantScope, limit = 30) {
        const userId = this._getUserId(tenantScope);
        
        // 🔒 SICUREZZA: Filtro esplicito per user
        return WorkLog.aggregate([
            { $match: { user: userId } },
            { $sort: { date: -1 } },
            {
                $group: {
                    _id: '$date',
                    logs: { $push: '$$ROOT' },
                    totalMinutes: { $sum: '$durationMinutes' },
                },
            },
            { $sort: { _id: -1 } },
            { $limit: limit },
        ]);
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Validazione pre-creazione:
     * - Verifica che il progetto appartenga allo stesso utente (IDOR prevention)
     * - Verifica che endTime > startTime
     */
    async beforeCreate(tenantScope, data) {
        // 1. Validazione ownership progetto
        await this.validateProjectOwnership(tenantScope, data.projectId);
        
        // 2. Validazione orari
        this.validateTimeRange(data.startTime, data.endTime);
        
        return data;
    }

    /**
     * Validazione pre-update:
     * - Se si cambia progetto, verifica ownership
     */
    async beforeUpdate(tenantScope, id, data) {
        if (data.projectId) {
            await this.validateProjectOwnership(tenantScope, data.projectId);
        }
        
        if (data.startTime || data.endTime) {
            // Recupera il documento esistente per valori mancanti
            const existing = await this.findById(tenantScope, id);
            const startTime = data.startTime || existing.startTime;
            const endTime = data.endTime || existing.endTime;
            this.validateTimeRange(startTime, endTime);
        }
        
        return data;
    }

    // =========================================
    // PRIVATE HELPERS
    // =========================================

    /**
     * Verifica che un progetto appartenga al tenant corrente.
     * 
     * 🔒 SICUREZZA ESPLICITA: Query diretta con filtro user
     * 
     * PERCHÉ È FONDAMENTALE?
     * Senza questa verifica, un utente malintenzionato potrebbe:
     * 1. Conoscere l'ID di un progetto altrui (es. da URL o leak)
     * 2. Creare un WorkLog associato a quel progetto
     * 3. "Inquinare" i dati di un altro utente
     * 
     * @throws {AppError} Se il progetto non esiste o non appartiene all'utente
     */
    async validateProjectOwnership(tenantScope, projectId) {
        if (!projectId) {
            throw AppError.validation('Il progetto è obbligatorio');
        }

        const userId = this._getUserId(tenantScope);
        
        // 🔒 Query diretta con filtro esplicito
        const project = await Project.findOne({ _id: projectId, user: userId });
        
        if (!project) {
            // ATTENZIONE: Non rivelare se il progetto esiste ma appartiene ad altri!
            throw AppError.notFound('Progetto');
        }
    }

    /**
     * Verifica che l'ora di fine sia successiva all'ora di inizio.
     * (Considera anche il caso di lavoro oltre mezzanotte)
     */
    validateTimeRange(startTime, endTime) {
        if (!startTime || !endTime) return;
        
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        // Permetti lavoro oltre mezzanotte (es. 23:00 - 02:00)
        // ma non intervalli nulli (stesso orario)
        if (startMinutes === endMinutes) {
            throw AppError.validation('L\'ora di fine deve essere diversa dall\'ora di inizio');
        }
    }
}

module.exports = new WorkLogService();
