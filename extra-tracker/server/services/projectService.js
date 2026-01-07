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
const activityService = require('./activityService');
const mongoose = require('mongoose');

const MINUTES_IN_HOUR = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HEALTH_CONFIG = {
    warningUsage: 0.75,
    criticalUsage: 1.1,
    inactivityDays: 14,
};

const EMPTY_STATS = {
    projectId: null,
    totalMinutes: 0,
    totalHours: 0,
    totalEarnings: 0,
    logCount: 0,
    lastLog: null,
};

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
     * Trova progetti con conteggio entries e statistiche.
     * 
     * Questo metodo serve al Workspace per mostrare progetti con statistiche.
     * Aggrega WorkLog per calcolare entriesCount, lastEntryDate, totalDuration, streak.
     */
    async findWithEntryCount(tenantScope, options = {}) {
        const userId = this._getUserId(tenantScope);
        
        const projects = await this.Model.aggregate([
            { $match: { user: userId } },
            {
                $lookup: {
                    from: 'worklogs',
                    localField: '_id',
                    foreignField: 'projectId',
                    as: 'entries',
                },
            },
            {
                $addFields: {
                    entriesCount: { $size: '$entries' },
                    lastEntryDate: {
                        $max: '$entries.date',
                    },
                    totalDuration: {
                        $sum: '$entries.durationMinutes',
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

        // Calcola streak per ogni progetto
        const projectIds = projects.map(p => p._id);
        if (projectIds.length > 0) {
            // Recupera tutte le date uniche per tutti i progetti in una query
            const entriesByProject = await WorkLog.aggregate([
                { $match: { projectId: { $in: projectIds }, user: userId } },
                {
                    $group: {
                        _id: '$projectId',
                        dates: { $addToSet: '$date' }
                    }
                }
            ]);
            
            // Crea una mappa progetto -> date
            const datesMap = new Map();
            entriesByProject.forEach(item => {
                datesMap.set(item._id.toString(), new Set(item.dates));
            });
            
            // Calcola streak per ogni progetto
            const today = new Date().toISOString().split('T')[0];
            projects.forEach(project => {
                const projectDates = datesMap.get(project._id.toString());
                if (!projectDates || projectDates.size === 0) {
                    project.streak = 0;
                    return;
                }
                
                // Calcola streak: giorni consecutivi partendo da oggi
                let streak = 0;
                let currentDate = today;
                
                while (projectDates.has(currentDate)) {
                    streak++;
                    // Calcola la data precedente
                    const dateObj = new Date(currentDate);
                    dateObj.setDate(dateObj.getDate() - 1);
                    currentDate = dateObj.toISOString().split('T')[0];
                }
                
                project.streak = streak;
            });
        }

        // Converti _id in id per coerenza con il resto dell'API
        return projects.map(p => ({
            ...p,
            id: p._id.toString(),
            _id: undefined,
        }));
    }

    /**
     * Trova un progetto per codice (univoco per utente).
     */
    async findByCode(tenantScope, code) {
        return this.findOne(tenantScope, { code: code.toUpperCase() });
    }

    /**
     * Ritorna i progetti arricchiti con metriche di salute.
     */
    async findWithHealth(tenantScope) {
        const merged = await this._mergeProjectsWithStats(tenantScope);
        return merged.map(({ project, metrics }) => ({
            ...project,
            metrics,
        }));
    }

    /**
     * Ottiene statistiche e metriche per dashboard o widget.
     */
    async getProjectStats(tenantScope) {
        const merged = await this._mergeProjectsWithStats(tenantScope);
        return merged.map(({ project, metrics, stats }) => ({
            projectId: project.id,
            projectName: project.name,
            projectCode: project.code,
            rate: project.rate,
            estimatedHours: project.estimatedHours || 0,
            description: project.description,
            status: project.status,
            color: project.color,
            stats: {
                ...stats,
                totalHours: stats.totalMinutes / MINUTES_IN_HOUR,
            },
            metrics,
        }));
    }

    // =========================================
    // WRITE OVERRIDES
    // =========================================

    /**
     * Override create per registrare PROJECT_CREATED.
     */
    async create(tenantScope, data) {
        const created = await super.create(tenantScope, data);
        const userId = this._getUserId(tenantScope);

        try {
            await activityService.recordActivity(userId, 'PROJECT_CREATED', {
                entityId: created._id,
                category: 'work',
                metadata: {
                    entityId: created._id,
                    projectName: created.name,
                    projectCode: created.code,
                    status: created.status,
                },
            });
        } catch (err) {
            console.error('❌ Activity log error (PROJECT_CREATED):', err.message);
        }

        return created;
    }

    /**
     * Override update per registrare PROJECT_COMPLETED.
     */
    async update(tenantScope, id, data, options = {}) {
        const previous = await this.findById(tenantScope, id, { throwIfNotFound: true });
        const updated = await super.update(tenantScope, id, data, options);

        await this._recordProjectCompletionActivity(tenantScope, previous, updated);

        return updated;
    }

    // =========================================
    // PRIVATE HELPERS
    // =========================================

    async _mergeProjectsWithStats(tenantScope) {
        const [projects, stats] = await Promise.all([
            this.find(tenantScope),
            this._aggregateWorklogsByProject(tenantScope),
        ]);

        const statsMap = new Map(
            stats.map(stat => [String(stat.projectId), stat])
        );

        return projects.map(doc => {
            const project = doc.toObject({ virtuals: true });
            project.id = project.id || String(project._id);
            delete project._id;
            delete project.user;
            const projectStats = statsMap.get(String(project.id)) || { ...EMPTY_STATS, projectId: project.id };
            const metrics = this._buildHealthSnapshot(project, projectStats);
            return { project, stats: projectStats, metrics };
        });
    }

    async _aggregateWorklogsByProject(tenantScope) {
        const userId = this._getUserId(tenantScope);

        return WorkLog.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: '$projectId',
                    totalMinutes: { $sum: '$durationMinutes' },
                    logCount: { $sum: 1 },
                    lastLog: { $max: '$date' },
                },
            },
            {
                $project: {
                    _id: 0,
                    projectId: '$_id',
                    totalMinutes: 1,
                    logCount: 1,
                    lastLog: 1,
                },
            },
        ]);
    }

    /**
     * Costruisce lo snapshot di salute del progetto basandosi su:
     * - Ore loggatte (totalHours)
     * - Ore stimate (estimatedHours)
     * - Progresso dichiarato (progress %) - serve per calcolare la velocity reale
     * 
     * FORMULA VELOCITY:
     * Se progress > 0: velocity = totalHours / (progress / 100)
     * Significa: "quante ore ci metto per completare l'1%"
     * 
     * projectedHours = velocity * 100 (proiezione finale)
     * 
     * HEALTH STATUS:
     * 🟢 Healthy: projectedHours <= estimatedHours
     * 🟡 Warning: projectedHours > estimatedHours ma < estimatedHours * 1.2 (entro 20%)
     * 🔴 Critical: projectedHours > estimatedHours * 1.2 (oltre 20%)
     */
    _buildHealthSnapshot(project, stats) {
        const totalHours = stats.totalMinutes > 0
            ? stats.totalMinutes / MINUTES_IN_HOUR
            : 0;
        const rate = project.rate || 0;
        const estimatedHours = project.estimatedHours || 0;
        const progress = project.progress || 0;
        const totalEarnings = totalHours * rate;
        
        // Calcolo Velocity basata sul progresso dichiarato
        // velocity = ore spese per fare progress%, proiezione = velocity * 100
        let velocity = null;
        let projectedHours = null;
        let overrunHours = null;
        
        if (progress > 0 && totalHours > 0) {
            velocity = totalHours / (progress / 100); // ore per 1%
            projectedHours = Math.round(velocity * 100);
            if (estimatedHours > 0) {
                overrunHours = projectedHours - estimatedHours;
            }
        }
        
        // Budget usage basato su ore stimate
        const budgetUsagePercent = estimatedHours > 0 
            ? Math.round((totalHours / estimatedHours) * 100)
            : (totalHours > 0 ? 100 : 0);
            
        const hoursRemaining = estimatedHours > 0 
            ? Math.max(estimatedHours - totalHours, 0) 
            : null;
        
        // Date tracking
        const now = new Date();
        const lastLogDate = stats.lastLog ? new Date(stats.lastLog) : null;
        const daysSinceLastLog = lastLogDate
            ? Math.floor((now - lastLogDate) / (1000 * 60 * 60 * 24))
            : null;

        // === CALCOLO HEALTH STATUS ===
        let healthStatus = 'unknown';
        
        if (project.status === 'completed') {
            healthStatus = 'healthy';
        } else if (estimatedHours <= 0 || progress <= 0) {
            // Senza stima o progresso, non posso calcolare nulla
            healthStatus = totalHours > 0 ? 'warning' : 'unknown';
        } else if (projectedHours !== null) {
            // Ho dati sufficienti per calcolare la proiezione
            const threshold20Percent = estimatedHours * 1.2;
            
            if (projectedHours <= estimatedHours) {
                healthStatus = 'healthy'; // 🟢 In linea o in anticipo
            } else if (projectedHours <= threshold20Percent) {
                healthStatus = 'warning'; // 🟡 Sforamento < 20%
            } else {
                healthStatus = 'critical'; // 🔴 Sforamento > 20%
            }
        }

        // Inattività prolungata peggiora lo stato
        if (daysSinceLastLog != null && daysSinceLastLog > HEALTH_CONFIG.inactivityDays) {
            if (healthStatus === 'healthy') healthStatus = 'warning';
        }

        // === VELOCITY MESSAGE ===
        let velocityMessage = 'Nessuna attività registrata';
        
        if (stats.logCount > 0) {
            if (project.status === 'completed') {
                velocityMessage = '✅ Progetto completato, ottimo lavoro!';
            } else if (progress <= 0) {
                velocityMessage = '⚙️ Imposta il progresso % per attivare il monitoraggio';
            } else if (estimatedHours <= 0) {
                velocityMessage = '⚙️ Imposta le ore stimate per vedere le proiezioni';
            } else if (projectedHours !== null) {
                switch (healthStatus) {
                    case 'healthy':
                        if (projectedHours < estimatedHours) {
                            const saved = estimatedHours - projectedHours;
                            velocityMessage = `✅ Ottimo ritmo! Finirai ${saved}h in anticipo sulla stima`;
                        } else {
                            velocityMessage = '✅ In linea con la stima, continua così!';
                        }
                        break;
                    case 'warning':
                        velocityMessage = `⚠️ A questo ritmo, sforerai di ~${Math.round(overrunHours)}h`;
                        break;
                    case 'critical':
                        velocityMessage = `🔴 CRITICO: Proiezione ${projectedHours}h vs stima ${estimatedHours}h (+${Math.round(overrunHours)}h)`;
                        break;
                }
            }
            
            // Override se progetto fermo
            if (daysSinceLastLog != null && daysSinceLastLog > HEALTH_CONFIG.inactivityDays) {
                velocityMessage = `⏸️ Progetto fermo da ${daysSinceLastLog} giorni`;
            }
        }

        return {
            totalMinutes: stats.totalMinutes,
            totalHours,
            totalEarnings,
            logCount: stats.logCount,
            lastLog: stats.lastLog,
            progress,
            budgetUsagePercent,
            velocity,
            projectedHours,
            overrunHours,
            hoursRemaining,
            healthStatus,
            velocityMessage,
            daysSinceLastLog,
        };
    }

    _calculateDaysDiff(startDate, endDate) {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.max(0, Math.ceil((end - start) / MS_PER_DAY));
    }

    async _recordProjectCompletionActivity(tenantScope, previous, updated) {
        if (!previous || !updated) return;
        if (previous.status === updated.status) return;
        if (updated.status !== 'completed') return;

        const userId = this._getUserId(tenantScope);
        const now = new Date();
        const daysToComplete = this._calculateDaysDiff(updated.createdAt, now);

        try {
            await activityService.recordActivity(userId, 'PROJECT_COMPLETED', {
                entityId: updated._id,
                category: 'work',
                metadata: {
                    entityId: updated._id,
                    daysToComplete,
                    status: updated.status,
                },
            });
        } catch (err) {
            console.error('❌ Activity log error (PROJECT_COMPLETED):', err.message);
        }
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
