/**
 * 📦 PROJECT SERVICE - Multi-Tenant
 * ==================================
 * 
 * Service layer per la gestione dei progetti.
 * Estende BaseService con logica specifica.
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 * 
 * ESEMPIO D'USO NEL CONTROLLER:
 * -----------------------------
 * 
 * // GET /api/projects
 * const projects = await projectService.find(req.tenantScope);
 * 
 * // POST /api/projects
 * const project = await projectService.create(req.tenantScope, req.body);
 */

const BaseService = require('./BaseService');
const Project = require('../models/Project');
const WorkLog = require('../models/WorkLog');
const AppError = require('../utils/AppError');

class ProjectService extends BaseService {
    constructor() {
        super(Project, {
            // Campi su cui fare ricerca testuale
            searchFields: ['name', 'code', 'description'],
            
            // Ordinamento di default
            defaultSort: { createdAt: -1 },
            
            // Nome per messaggi di errore
            entityName: 'Progetto',
        });
    }

    // =========================================
    // CUSTOM METHODS
    // =========================================

    /**
     * Trova solo i progetti attivi.
     */
    async findActive(tenantScope, options = {}) {
        return this.find(tenantScope, { status: 'active' }, options);
    }

    /**
     * Trova un progetto per codice (univoco per utente).
     */
    async findByCode(tenantScope, code) {
        return this.findOne(tenantScope, { code: code.toUpperCase() });
    }

    /**
     * Ottiene statistiche per ogni progetto.
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user nelle aggregazioni
     */
    async getProjectStats(tenantScope) {
        const userId = this._getUserId(tenantScope);
        
        // 🔒 SICUREZZA: Filtro esplicito per user
        const stats = await WorkLog.aggregate([
            // PRIMA DI TUTTO: filtro per user
            { $match: { user: userId } },
            // Raggruppa per progetto
            {
                $group: {
                    _id: '$projectId',
                    totalMinutes: { $sum: '$durationMinutes' },
                    logCount: { $sum: 1 },
                    lastLog: { $max: '$date' },
                },
            },
            // Join con i progetti
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'project',
                },
            },
            { $unwind: '$project' },
            // Proietta i campi finali
            {
                $project: {
                    projectId: '$_id',
                    projectName: '$project.name',
                    projectCode: '$project.code',
                    rate: '$project.rate',
                    totalMinutes: 1,
                    totalHours: { $divide: ['$totalMinutes', 60] },
                    logCount: 1,
                    lastLog: 1,
                    totalEarnings: {
                        $multiply: [
                            { $divide: ['$totalMinutes', 60] },
                            '$project.rate',
                        ],
                    },
                },
            },
            { $sort: { totalMinutes: -1 } },
        ]);

        return stats;
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Validazione pre-creazione:
     * - Verifica che il codice non esista già per questo utente
     */
    async beforeCreate(tenantScope, data) {
        if (data.code) {
            const existing = await this.findByCode(tenantScope, data.code);
            if (existing) {
                throw AppError.validation(
                    `Un progetto con codice "${data.code.toUpperCase()}" esiste già`
                );
            }
        }
        return data;
    }

    /**
     * Validazione pre-delete:
     * - Non eliminare progetti con worklog associati
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user
     */
    async beforeDelete(tenantScope, id) {
        const userId = this._getUserId(tenantScope);
        
        // 🔒 SICUREZZA: Filtro esplicito per user + projectId
        const worklogCount = await WorkLog.countDocuments({ 
            user: userId, 
            projectId: id 
        });
        
        if (worklogCount > 0) {
            throw AppError.validation(
                `Impossibile eliminare: ci sono ${worklogCount} log associati a questo progetto. ` +
                'Elimina prima i log o archivia il progetto.'
            );
        }
    }
}

// Singleton pattern: una sola istanza per l'app
module.exports = new ProjectService();
