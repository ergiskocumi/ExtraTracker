/**
 * 📝 FEEDBACK SERVICE
 *
 * Service per gestione feedback/ticket.
 * Estende BaseService con metodi specifici per admin.
 */

const BaseService = require('./BaseService');
const Feedback = require('../models/Feedback');
const AppError = require('../utils/AppError');

class FeedbackService extends BaseService {
    constructor() {
        super(Feedback, {
            searchFields: ['title', 'description'],
            defaultSort: { createdAt: -1 },
            populateFields: [],
            entityName: 'Feedback',
        });
    }

    // =========================================
    // USER METHODS
    // =========================================

    /**
     * Trova tutti i feedback dell'utente corrente
     *
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} options - Opzioni (pagination, sort)
     * @returns {Promise<Array>}
     */
    async findMyFeedback(tenantScope, options = {}) {
        const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;

        return this.paginate(tenantScope, {}, { page, limit, sort });
    }

    /**
     * Crea un nuovo feedback con allegati
     *
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} data - Dati del feedback
     * @param {Array} files - File allegati (da multer)
     * @returns {Promise<Document>}
     */
    async createWithAttachments(tenantScope, data, files = []) {
        const attachments = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
        }));

        return this.create(tenantScope, {
            ...data,
            attachments,
        });
    }

    // =========================================
    // ADMIN METHODS (bypass tenant)
    // =========================================

    /**
     * Trova tutti i feedback (admin only, bypass tenant)
     *
     * @param {Object} filters - Filtri (status, type, priority)
     * @param {Object} options - Opzioni (pagination, sort)
     * @returns {Promise<{data: Array, meta: Object}>}
     */
    async findAllAdmin(filters = {}, options = {}) {
        const {
            page = 1,
            limit = 20,
            sort = { createdAt: -1 },
        } = options;

        // Costruisci filtri
        const query = {};

        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.type) {
            query.type = filters.type;
        }
        if (filters.priority) {
            query.priority = filters.priority;
        }
        if (filters.search) {
            const escapedSearch = this._escapeRegex(filters.search);
            const regex = new RegExp(escapedSearch, 'i');
            query.$or = [
                { title: regex },
                { description: regex },
            ];
        }

        // Clamp valori per sicurezza
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (safePage - 1) * safeLimit;

        const [data, total] = await Promise.all([
            this.Model.find(query)
                .populate('user', 'email profile.firstName profile.lastName profile.displayName')
                .sort(sort)
                .skip(skip)
                .limit(safeLimit)
                .exec(),
            this.Model.countDocuments(query).exec(),
        ]);

        return {
            data,
            meta: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
                hasMore: safePage * safeLimit < total,
            },
        };
    }

    /**
     * Trova un feedback per ID (admin only, bypass tenant)
     *
     * @param {string} id - ID del feedback
     * @returns {Promise<Document>}
     */
    async findByIdAdmin(id) {
        const feedback = await this.Model.findById(id)
            .populate('user', 'email profile.firstName profile.lastName profile.displayName');

        if (!feedback) {
            throw AppError.notFound('Feedback');
        }

        return feedback;
    }

    /**
     * Aggiorna un feedback (admin only, bypass tenant)
     *
     * @param {string} id - ID del feedback
     * @param {Object} updates - Dati da aggiornare
     * @returns {Promise<Document>}
     */
    async updateByAdmin(id, updates) {
        // Campi consentiti per admin
        const allowedFields = ['status', 'priority', 'adminNotes'];
        const safeUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        const feedback = await this.Model.findByIdAndUpdate(
            id,
            { $set: safeUpdates },
            { new: true, runValidators: true }
        ).populate('user', 'email profile.firstName profile.lastName profile.displayName');

        if (!feedback) {
            throw AppError.notFound('Feedback');
        }

        return feedback;
    }

    /**
     * Elimina un feedback (admin only, bypass tenant)
     *
     * @param {string} id - ID del feedback
     * @returns {Promise<Document>}
     */
    async deleteByAdmin(id) {
        const feedback = await this.Model.findByIdAndDelete(id);

        if (!feedback) {
            throw AppError.notFound('Feedback');
        }

        return feedback;
    }

    /**
     * Ottieni statistiche aggregate
     *
     * @returns {Promise<Object>}
     */
    async getStats() {
        return Feedback.getStats();
    }
}

module.exports = new FeedbackService();
