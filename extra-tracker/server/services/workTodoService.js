/**
 * ✅ WORK TODO SERVICE - Multi-Tenant
 * ===================================
 * 
 * Service layer per la gestione dei TODO workspace.
 */

const BaseService = require('./BaseService');
const WorkTodo = require('../models/WorkTodo');
const AppError = require('../utils/AppError');

class WorkTodoService extends BaseService {
    constructor() {
        super(WorkTodo, {
            searchFields: ['title', 'description'],
            defaultSort: { order: 1, priority: -1, createdAt: -1 },
            entityName: 'TODO Workspace',
        });
    }

    /**
     * Trova tutti i TODO di un progetto.
     */
    async findByProject(tenantScope, projectId, options = {}) {
        return this.find(tenantScope, { project: projectId }, options);
    }

    /**
     * Trova TODO per stato.
     */
    async findByStatus(tenantScope, status, options = {}) {
        return this.find(tenantScope, { status }, options);
    }

    /**
     * Trova TODO in scadenza (prossimi N giorni).
     */
    async findUpcoming(tenantScope, days = 7) {
        const userId = this._getUserId(tenantScope);
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        return WorkTodo.find({
            user: userId,
            status: { $in: ['pending', 'in-progress'] },
            dueDate: {
                $gte: today,
                $lte: futureDateStr,
            },
        }).populate('project').sort({ dueDate: 1, priority: -1 });
    }

    /**
     * Trova TODO completati di un progetto.
     */
    async findCompletedByProject(tenantScope, projectId, limit = 10) {
        return this.find(tenantScope, { 
            project: projectId, 
            status: 'completed' 
        }, { 
            limit,
            sort: { completedAt: -1 },
        });
    }

    /**
     * Conta TODO per stato in un progetto.
     */
    async countByStatus(tenantScope, projectId) {
        const userId = this._getUserId(tenantScope);
        
        // ATTENZIONE: Il filtro { user: userId } deve SEMPRE essere nel $match — il plugin multi-tenancy non si applica a aggregate()
        const counts = await WorkTodo.aggregate([
            { $match: { user: userId, project: projectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        
        const result = {
            pending: 0,
            'in-progress': 0,
            completed: 0,
            cancelled: 0,
        };
        
        counts.forEach(item => {
            result[item._id] = item.count;
        });
        
        return result;
    }

    /**
     * Completa un TODO.
     */
    async complete(tenantScope, id) {
        const todo = await this.findById(tenantScope, id, { throwIfNotFound: true });
        
        if (todo.status === 'completed') {
            throw AppError.validation('Il TODO è già completato');
        }
        
        return this.update(tenantScope, id, {
            status: 'completed',
            completedAt: new Date(),
        });
    }

    /**
     * Riattiva un TODO completato.
     */
    async reopen(tenantScope, id) {
        const todo = await this.findById(tenantScope, id, { throwIfNotFound: true });
        
        if (todo.status !== 'completed') {
            throw AppError.validation('Il TODO non è completato');
        }
        
        return this.update(tenantScope, id, {
            status: 'pending',
            completedAt: undefined,
        });
    }

    /**
     * Valida ownership del progetto prima di creare/aggiornare.
     */
    async beforeCreate(tenantScope, data) {
        if (!data.project) {
            throw AppError.validation('Il progetto è obbligatorio');
        }
        
        // Valida e converte projectId
        const projectId = await this.validateAndConvertProjectId(tenantScope, data.project);
        data.project = projectId;
        
        // Valori di default
        if (!data.priority) {
            data.priority = 'medium';
        }
        if (!data.status) {
            data.status = 'pending';
        }
        if (data.order === undefined) {
            data.order = 0;
        }
        
        return data;
    }

    async beforeUpdate(tenantScope, id, data) {
        if (data.project) {
            const projectId = await this.validateAndConvertProjectId(tenantScope, data.project);
            data.project = projectId;
        }
        return data;
    }

    /**
     * Valida e converte projectId in ObjectId.
     */
    async validateAndConvertProjectId(tenantScope, projectId) {
        if (!projectId) {
            throw AppError.validation('Il progetto è obbligatorio');
        }
        
        const mongoose = require('mongoose');
        
        // Converti in ObjectId
        let projectObjectId;
        try {
            if (typeof projectId === 'string') {
                // Verifica che sia un ObjectId valido
                if (!mongoose.Types.ObjectId.isValid(projectId)) {
                    throw AppError.validation('ID progetto non valido');
                }
                projectObjectId = new mongoose.Types.ObjectId(projectId);
            } else if (projectId instanceof mongoose.Types.ObjectId) {
                projectObjectId = projectId;
            } else {
                throw AppError.validation('Formato ID progetto non valido');
            }
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw AppError.validation('ID progetto non valido');
        }
        
        return projectObjectId;
    }
}

module.exports = new WorkTodoService();
