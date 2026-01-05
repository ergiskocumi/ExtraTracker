/**
 * 🏠 WORKSPACE SERVICE - Multi-Tenant
 * ===================================
 * 
 * Service layer per la gestione del Work Journal (Workspace).
 * Gestisce sia WorkProject che WorkEntry.
 * 
 * ⚠️ SICUREZZA RELAZIONI:
 * Quando crei un WorkEntry con un project, verifichiamo che
 * il progetto appartenga allo stesso utente (no IDOR cross-tenant).
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const BaseService = require('./BaseService');
const WorkProject = require('../models/WorkProject');
const WorkEntry = require('../models/WorkEntry');
const AppError = require('../utils/AppError');
const activityService = require('./activityService');

// =========================================
// WORK PROJECT SERVICE
// =========================================

class WorkProjectService extends BaseService {
    constructor() {
        super(WorkProject, {
            searchFields: ['name', 'description'],
            defaultSort: { name: 1 },
            entityName: 'Progetto Workspace',
        });
    }

    /**
     * Trova solo i progetti attivi.
     */
    async findActive(tenantScope, options = {}) {
        return this.find(tenantScope, { status: 'active' }, options);
    }

    /**
     * Trova progetti con conteggio entries.
     */
    async findWithEntryCount(tenantScope, options = {}) {
        const userId = this._getUserId(tenantScope);
        
        return WorkProject.aggregate([
            { $match: { user: userId } },
            {
                $lookup: {
                    from: 'workentries',
                    localField: '_id',
                    foreignField: 'project',
                    as: 'entries',
                },
            },
            {
                $addFields: {
                    entriesCount: { $size: '$entries' },
                    lastEntryDate: {
                        $max: '$entries.date',
                    },
                },
            },
            {
                $project: {
                    entries: 0, // Rimuovi array entries dal risultato
                },
            },
            { $sort: { name: 1 } },
        ]);
    }

    /**
     * Override delete per verificare che non ci siano entries associate.
     */
    async delete(tenantScope, id) {
        const userId = this._getUserId(tenantScope);
        
        // Verifica che il progetto esista e appartenga all'utente
        const project = await this.findById(tenantScope, id, { throwIfNotFound: true });
        
        // Verifica che non ci siano entries associate
        const entriesCount = await WorkEntry.countDocuments({
            user: userId,
            project: id,
        });
        
        if (entriesCount > 0) {
            throw AppError.validation(
                `Impossibile eliminare: ci sono ${entriesCount} entries associate a questo progetto. ` +
                `Elimina prima le entries o archivia il progetto.`
            );
        }
        
        return super.delete(tenantScope, id);
    }
}

// =========================================
// WORK ENTRY SERVICE
// =========================================

class WorkEntryService extends BaseService {
    constructor() {
        super(WorkEntry, {
            searchFields: ['title', 'content'],
            defaultSort: { date: -1, createdAt: -1 },
            populateFields: ['project'],
            entityName: 'Entry Workspace',
        });
    }

    /**
     * Trova entries di un mese specifico.
     */
    async findByMonth(tenantScope, year, month) {
        const monthStr = String(month).padStart(2, '0');
        const pattern = new RegExp(`^${year}-${monthStr}-`);
        
        return this.find(tenantScope, { date: pattern });
    }

    /**
     * Trova entries di un progetto specifico.
     */
    async findByProject(tenantScope, projectId, options = {}) {
        return this.find(tenantScope, { project: projectId }, options);
    }

    /**
     * Trova entries per categoria.
     */
    async findByCategory(tenantScope, category, options = {}) {
        return this.find(tenantScope, { category }, options);
    }

    /**
     * Raggruppa entries per data (per vista timeline).
     * 
     * 🔒 SICUREZZA ESPLICITA: Filtro per user
     */
    async groupByDate(tenantScope, limit = 30) {
        const userId = this._getUserId(tenantScope);
        
        return WorkEntry.aggregate([
            { $match: { user: userId } },
            { $sort: { date: -1, createdAt: -1 } },
            {
                $lookup: {
                    from: 'workprojects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectData',
                },
            },
            { $unwind: { path: '$projectData', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$date',
                    entries: { $push: '$$ROOT' },
                    totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
                },
            },
            { $sort: { _id: -1 } },
            { $limit: limit },
        ]);
    }

    /**
     * Statistiche entries per progetto.
     */
    async getStatsByProject(tenantScope) {
        const userId = this._getUserId(tenantScope);
        
        return WorkEntry.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: '$project',
                    entriesCount: { $sum: 1 },
                    totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
                    lastEntryDate: { $max: '$date' },
                },
            },
            {
                $lookup: {
                    from: 'workprojects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'project',
                },
            },
            { $unwind: '$project' },
            { $sort: { lastEntryDate: -1 } },
        ]);
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Validazione pre-creazione:
     * - Verifica che il progetto appartenga allo stesso utente (IDOR prevention)
     * - Valida templateData in base alla categoria
     */
    async beforeCreate(tenantScope, data) {
        // 1. Validazione ownership progetto
        await this.validateProjectOwnership(tenantScope, data.project);
        
        // 2. Validazione templateData (se presente)
        if (data.templateData && Object.keys(data.templateData).length > 0) {
            this.validateTemplateData(data.category, data.templateData);
        }
        
        return data;
    }

    /**
     * Override create per registrare WORK_ENTRY_CREATED.
     */
    async create(tenantScope, data) {
        const created = await super.create(tenantScope, data);
        const userId = this._getUserId(tenantScope);

        try {
            await activityService.recordActivity(userId, 'WORK_ENTRY_CREATED', {
                entityId: created._id,
                category: 'work',
                metadata: {
                    entityId: created._id,
                    projectId: created.project,
                    category: created.category,
                    title: created.title,
                    date: created.date,
                },
            });
        } catch (err) {
            console.error('❌ Activity log error (WORK_ENTRY_CREATED):', err.message);
        }

        return created;
    }

    /**
     * Validazione pre-update:
     * - Se si cambia progetto, verifica ownership
     * - Valida templateData se modificato
     */
    async beforeUpdate(tenantScope, id, data) {
        if (data.project) {
            await this.validateProjectOwnership(tenantScope, data.project);
        }
        
        if (data.templateData && Object.keys(data.templateData).length > 0) {
            const category = data.category;
            if (!category) {
                // Recupera categoria esistente se non fornita
                const existing = await this.findById(tenantScope, id);
                this.validateTemplateData(existing.category, data.templateData);
            } else {
                this.validateTemplateData(category, data.templateData);
            }
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
     * @throws {AppError} Se il progetto non esiste o non appartiene all'utente
     */
    async validateProjectOwnership(tenantScope, projectId) {
        if (!projectId) {
            throw AppError.validation('Il progetto è obbligatorio');
        }

        const userId = this._getUserId(tenantScope);
        
        // 🔒 Query diretta con filtro esplicito
        const project = await WorkProject.findOne({ _id: projectId, user: userId });
        
        if (!project) {
            // ATTENZIONE: Non rivelare se il progetto esiste ma appartiene ad altri!
            throw AppError.notFound('Progetto');
        }
    }

    /**
     * Valida templateData in base alla categoria.
     * 
     * Questo è un validatore "soft" - accetta qualsiasi struttura JSON,
     * ma può essere esteso per validazioni più rigide per categoria.
     */
    validateTemplateData(category, templateData) {
        if (!category || !templateData) return;
        
        // Validazione base: deve essere un oggetto
        if (typeof templateData !== 'object' || Array.isArray(templateData)) {
            throw AppError.validation('templateData deve essere un oggetto');
        }
        
        // Validazioni specifiche per categoria (opzionali, estendibili)
        switch (category) {
            case 'development':
                // Esempio: se presenti, devono essere stringhe
                if (templateData.branch && typeof templateData.branch !== 'string') {
                    throw AppError.validation('templateData.branch deve essere una stringa');
                }
                break;
            case 'ticket':
                if (templateData.ticketId && typeof templateData.ticketId !== 'string') {
                    throw AppError.validation('templateData.ticketId deve essere una stringa');
                }
                break;
            // Altre categorie possono avere validazioni specifiche
        }
    }
}

// =========================================
// EXPORT
// =========================================

module.exports = {
    projects: new WorkProjectService(),
    entries: new WorkEntryService(),
};
