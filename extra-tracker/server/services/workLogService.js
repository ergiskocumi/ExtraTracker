/**
 * ⏱️ WORKLOG SERVICE - Multi-Tenant (Ibrido)
 * ===========================================
 * 
 * Service layer per la gestione unificata di log di lavoro e note.
 * Supporta sia inserimenti "Timer" (con orari) che "Journal" (solo testo).
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
const eventBus = require('../utils/eventBus');

class WorkLogService extends BaseService {
    constructor() {
        super(WorkLog, {
            searchFields: ['title', 'description'], // Aggiunto title per ricerca
            defaultSort: { date: -1, createdAt: -1 }, // Ordinamento timeline-friendly
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
            { $sort: { date: -1, createdAt: -1 } }, // Timeline-friendly sort
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

    /**
     * Feed Workspace: timeline unificata con filtri avanzati.
     * 
     * Permette di filtrare per projectId, date (o range), e tags.
     * Ritorna log ordinati per data decrescente e poi createdAt decrescente.
     * 
     * Questo metodo serve alla **Vista Operativa (Workspace)**.
     * Quando l'utente clicca su un progetto nella dashboard, il frontend chiama:
     * `GET /api/worklogs/feed?projectId=123`
     * 
     * @param {Object} tenantScope - Contesto tenant
     * @param {Object} filters - Filtri opzionali
     * @param {string} filters.projectId - Filtra per progetto
     * @param {string} filters.date - Filtra per data specifica (YYYY-MM-DD)
     * @param {string} filters.startDate - Inizio range date (YYYY-MM-DD)
     * @param {string} filters.endDate - Fine range date (YYYY-MM-DD)
     * @param {string|string[]} filters.tags - Filtra per tag (singolo o array)
     * @param {Object} options - Opzioni aggiuntive (limit, skip, etc.)
     * @returns {Promise<Array>} Array di worklog ordinati
     */
    async getWorkspaceFeed(tenantScope, filters = {}, options = {}) {
        const userId = this._getUserId(tenantScope);
        
        // Costruisci filtro base con user
        const queryFilter = { user: userId };
        
        // Filtro per progetto
        if (filters.projectId) {
            queryFilter.projectId = filters.projectId;
        }
        
        // Filtro per data (singola o range)
        if (filters.date) {
            queryFilter.date = filters.date;
        } else if (filters.startDate || filters.endDate) {
            queryFilter.date = {};
            if (filters.startDate) {
                queryFilter.date.$gte = filters.startDate;
            }
            if (filters.endDate) {
                queryFilter.date.$lte = filters.endDate;
            }
        }
        
        // Filtro per tag
        if (filters.tags) {
            const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
            queryFilter.tags = { $in: tagsArray };
        }
        
        // Opzioni di ordinamento (timeline-friendly)
        const sortOptions = {
            date: -1,
            createdAt: -1,
        };
        
        // Esegui query con filtri e ordinamento
        return this.find(tenantScope, queryFilter, {
            ...options,
            sort: sortOptions,
        });
    }

    /**
     * Statistiche progetto per Vista Amministrativa (Dashboard Progetti).
     * 
     * Questo metodo serve alla **Vista Amministrativa (Control Room)**.
     * Calcola metriche finanziarie e di progresso per un progetto specifico:
     * - Totale ore lavorate
     * - Revenue totale (ore × tariffa)
     * - Burn rate (ore consumate / ore stimate)
     * - Ultima attività
     * 
     * @param {Object} tenantScope - Contesto tenant
     * @param {string} projectId - ID del progetto
     * @returns {Promise<Object>} Statistiche progetto
     * @returns {number} totalHours - Ore totali lavorate
     * @returns {number} totalRevenue - Revenue totale (ore × rate)
     * @returns {number} burnRate - Percentuale ore consumate (0-100+)
     * @returns {string|null} lastActivity - Data ultima attività (YYYY-MM-DD)
     * @returns {number} entriesCount - Numero totale di log/note
     * @returns {number} billableHours - Ore fatturabili
     * @returns {number} nonBillableHours - Ore non fatturabili
     */
    async getProjectStats(tenantScope, projectId) {
        const userId = this._getUserId(tenantScope);
        
        // 1. Verifica ownership progetto
        await this.validateProjectOwnership(tenantScope, projectId);
        
        // 2. Recupera progetto per ottenere rate e estimatedHours
        const project = await Project.findOne({ _id: projectId, user: userId });
        if (!project) {
            throw AppError.notFound('Progetto');
        }
        
        // 3. Aggrega tutti i worklogs per questo progetto
        const results = await WorkLog.aggregate([
            {
                $match: {
                    user: userId,
                    projectId: projectId,
                },
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$durationMinutes' },
                    billableMinutes: {
                        $sum: {
                            $cond: [
                                { $ne: ['$isBillable', false] },
                                '$durationMinutes',
                                0,
                            ],
                        },
                    },
                    nonBillableMinutes: {
                        $sum: {
                            $cond: [
                                { $eq: ['$isBillable', false] },
                                '$durationMinutes',
                                0,
                            ],
                        },
                    },
                    entriesCount: { $sum: 1 },
                    lastActivityDate: { $max: '$date' },
                },
            },
        ]);
        
        const stats = results[0] || {
            totalMinutes: 0,
            billableMinutes: 0,
            nonBillableMinutes: 0,
            entriesCount: 0,
            lastActivityDate: null,
        };
        
        // 4. Calcola metriche
        const totalHours = (stats.totalMinutes / 60).toFixed(2);
        const billableHours = (stats.billableMinutes / 60).toFixed(2);
        const nonBillableHours = (stats.nonBillableMinutes / 60).toFixed(2);
        
        // Revenue = ore fatturabili × tariffa
        const totalRevenue = (stats.billableMinutes / 60) * (project.rate || 0);
        
        // Burn rate = (ore consumate / ore stimate) × 100
        // Se estimatedHours è 0 o null, burnRate è null (non calcolabile)
        let burnRate = null;
        if (project.estimatedHours && project.estimatedHours > 0) {
            burnRate = ((stats.totalMinutes / 60) / project.estimatedHours) * 100;
            burnRate = Math.round(burnRate * 100) / 100; // Arrotonda a 2 decimali
        }
        
        return {
            projectId: projectId.toString(),
            projectName: project.name,
            projectCode: project.code,
            totalHours: parseFloat(totalHours),
            billableHours: parseFloat(billableHours),
            nonBillableHours: parseFloat(nonBillableHours),
            totalRevenue: Math.round(totalRevenue * 100) / 100, // Arrotonda a 2 decimali
            burnRate, // Può essere null se estimatedHours non è impostato
            lastActivity: stats.lastActivityDate || null,
            entriesCount: stats.entriesCount,
            projectRate: project.rate,
            estimatedHours: project.estimatedHours || null,
        };
    }

    // =========================================
    // LIFECYCLE HOOKS
    // =========================================

    /**
     * Validazione pre-creazione:
     * - Verifica che il progetto appartenga allo stesso utente (IDOR prevention)
     * - Se presenti orari, valida che siano coerenti
     * - Se non presenti orari, permette creazione (nota/journal)
     */
    async beforeCreate(tenantScope, data) {
        // 1. Validazione ownership progetto (sempre richiesta)
        await this.validateProjectOwnership(tenantScope, data.projectId);
        
        // 2. Validazione orari (solo se presenti entrambi)
        // Se startTime o endTime sono presenti, devono essere entrambi presenti e validi
        if (data.startTime || data.endTime) {
            if (!data.startTime || !data.endTime) {
                throw AppError.validation(
                    'Se specifichi un orario, devi fornire sia startTime che endTime'
                );
            }
            this.validateTimeRange(data.startTime, data.endTime);
        }
        // Se non ci sono orari, è una nota/journal - va bene, durationMinutes sarà 0
        
        return data;
    }

    /**
     * Override create per gestire logica ibrida e registrare attività.
     * 
     * Gestisce sia inserimenti "Timer" (con orari) che "Journal" (solo testo).
     * - Se ci sono startTime e endTime: valida e calcola durata (Model lo fa automaticamente)
     * - Se non ci sono orari: permette creazione come nota/journal (durationMinutes = 0)
     * 
     * Pattern Observer: emette evento invece di chiamare direttamente ActivityService.
     * Questo decoupling permette:
     * - Fire and forget: non blocca la risposta HTTP
     * - Gestione errori in background (subscriber)
     * - Facile aggiungere altri subscriber per altri eventi
     */
    async create(tenantScope, data) {
        // La validazione è già fatta in beforeCreate()
        // Il Model calcola durationMinutes automaticamente se orari presenti
        
        const created = await super.create(tenantScope, data);
        const userId = this._getUserId(tenantScope);

        // Emetti evento per activity tracking (Pattern Observer)
        // Il subscriber gestirà la chiamata a ActivityService in background
        // Non blocca la risposta HTTP al client
        eventBus.emit('worklog.created', {
            userId,
            workLog: created,
        });

        return created;
    }

    /**
     * Override update per emettere evento worklog.updated
     */
    async update(tenantScope, id, data, options = {}) {
        // Recupera il worklog precedente per confronto
        const previous = await this.findById(tenantScope, id, { throwIfNotFound: true });
        
        // Esegui update normale
        const updated = await super.update(tenantScope, id, data, options);
        
        const userId = this._getUserId(tenantScope);
        
        // Emetti evento per activity tracking (Pattern Observer)
        eventBus.emit('worklog.updated', {
            userId,
            workLog: updated,
            previousWorkLog: previous,
        });

        return updated;
    }

    /**
     * Validazione pre-update:
     * - Se si cambia progetto, verifica ownership
     * - Se si modificano orari, valida coerenza (solo se entrambi presenti)
     */
    async beforeUpdate(tenantScope, id, data) {
        if (data.projectId) {
            await this.validateProjectOwnership(tenantScope, data.projectId);
        }
        
        // Validazione orari: se si modifica uno, deve essere presente anche l'altro
        if (data.startTime || data.endTime) {
            const existing = await this.findById(tenantScope, id);
            const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
            const endTime = data.endTime !== undefined ? data.endTime : existing.endTime;
            
            // Se si sta cercando di impostare solo uno dei due, errore
            if ((data.startTime && !endTime) || (data.endTime && !startTime)) {
                throw AppError.validation(
                    'Se modifichi gli orari, devi fornire sia startTime che endTime'
                );
            }
            
            // Se entrambi sono presenti, valida
            if (startTime && endTime) {
                this.validateTimeRange(startTime, endTime);
            }
            // Se entrambi vengono rimossi (null/undefined), va bene (diventa nota/journal)
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

    _getTimeOfDayLabel(date) {
        const hour = date.getHours();

        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
}

module.exports = new WorkLogService();
