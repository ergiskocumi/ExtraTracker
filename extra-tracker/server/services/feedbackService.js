/**
 * 📝 FEEDBACK SERVICE
 *
 * Service per gestione feedback/ticket.
 * Estende BaseService con metodi specifici per admin.
 */

const BaseService = require('./BaseService');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { emailService } = require('./emailService');
const mongoose = require('mongoose');

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
        const userId = this._getUserId(tenantScope);
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (safePage - 1) * safeLimit;

        const [data, total] = await Promise.all([
            this.Model.find({ user: userId })
                .select('-adminNotes -activity -assignee')
                .sort(sort)
                .skip(skip)
                .limit(safeLimit)
                .exec(),
            this.Model.countDocuments({ user: userId }).exec(),
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
     * Crea un nuovo feedback con allegati
     *
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} data - Dati del feedback
     * @param {Array} files - File allegati (da multer)
     * @returns {Promise<Document>}
     */
    async createWithAttachments(tenantScope, data, files = []) {
        const userId = this._getUserId(tenantScope);
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
            activity: [{
                type: 'created',
                message: 'Ticket creato',
                performedBy: userId,
                createdAt: new Date(),
            }],
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
        if (filters.assignee === 'unassigned') {
            query.assignee = null;
        } else if (filters.assignee) {
            query.assignee = filters.assignee;
        }
        if (filters.labels && Array.isArray(filters.labels) && filters.labels.length > 0) {
            const normalizedLabels = filters.labels
                .map((label) => (typeof label === 'string' ? label.trim().toLowerCase() : ''))
                .filter(Boolean);
            if (normalizedLabels.length > 0) {
                query.labels = { $in: normalizedLabels };
            }
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
                .populate('assignee', 'email profile.firstName profile.lastName profile.displayName')
                .populate('activity.performedBy', 'email profile.firstName profile.lastName profile.displayName role')
                .populate('comments.author', 'email profile.firstName profile.lastName profile.displayName role')
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
            .populate('user', 'email profile.firstName profile.lastName profile.displayName')
            .populate('assignee', 'email profile.firstName profile.lastName profile.displayName')
            .populate('activity.performedBy', 'email profile.firstName profile.lastName profile.displayName role')
            .populate('comments.author', 'email profile.firstName profile.lastName profile.displayName role');

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
    async updateByAdmin(id, updates, options = {}) {
        // Campi consentiti per admin
        const allowedFields = ['status', 'priority', 'adminNotes'];
        const safeUpdates = {};
        const { comment, labels, assignee } = updates;

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        const feedback = await this.Model.findById(id);

        if (!feedback) {
            throw AppError.notFound('Feedback');
        }

        const performedBy = options.performedBy || null;
        const activityEntries = [];
        const now = new Date();
        let commentAdded = false;
        let statusChanged = false;
        let commentText = null;

        const normalizeLabels = (input) => {
            const raw = Array.isArray(input)
                ? input
                : typeof input === 'string'
                    ? input.split(',')
                    : [];
            const cleaned = raw
                .map((label) => (typeof label === 'string' ? label.trim().toLowerCase() : ''))
                .filter(Boolean)
                .map((label) => label.slice(0, 24));
            return Array.from(new Set(cleaned)).slice(0, 8);
        };

        if (safeUpdates.status !== undefined && safeUpdates.status !== feedback.status) {
            statusChanged = true;
            activityEntries.push({
                type: 'status_change',
                message: `Stato aggiornato: ${feedback.status} → ${safeUpdates.status}`,
                from: feedback.status,
                to: safeUpdates.status,
                performedBy,
                createdAt: now,
            });
        }

        if (safeUpdates.priority !== undefined && safeUpdates.priority !== feedback.priority) {
            activityEntries.push({
                type: 'priority_change',
                message: `Priorità aggiornata: ${feedback.priority} → ${safeUpdates.priority}`,
                from: feedback.priority,
                to: safeUpdates.priority,
                performedBy,
                createdAt: now,
            });
        }

        if (safeUpdates.adminNotes !== undefined) {
            const nextNotes = typeof safeUpdates.adminNotes === 'string'
                ? safeUpdates.adminNotes.trim()
                : safeUpdates.adminNotes;
            const prevNotes = feedback.adminNotes || '';

            safeUpdates.adminNotes = nextNotes;

            if (nextNotes !== prevNotes) {
                const noteType = nextNotes
                    ? (prevNotes ? 'note_updated' : 'note_added')
                    : 'note_cleared';
                const noteMessage = noteType === 'note_added'
                    ? 'Note interne aggiunte'
                    : noteType === 'note_updated'
                        ? 'Note interne aggiornate'
                        : 'Note interne rimosse';

                activityEntries.push({
                    type: noteType,
                    message: noteMessage,
                    performedBy,
                    createdAt: now,
                });
            }
        }

        if (assignee !== undefined) {
            const nextAssignee = assignee === '' || assignee === null ? null : assignee;
            if (nextAssignee && !mongoose.Types.ObjectId.isValid(nextAssignee)) {
                throw AppError.validation('Assignee non valido', {
                    field: 'assignee',
                    code: 'INVALID_ASSIGNEE',
                });
            }

            const currentAssigneeId = feedback.assignee ? String(feedback.assignee) : '';
            const nextAssigneeId = nextAssignee ? String(nextAssignee) : '';

            if (currentAssigneeId !== nextAssigneeId) {
                if (nextAssigneeId) {
                    const isAdmin = await User.exists({ _id: nextAssigneeId, role: 'admin' });
                    if (!isAdmin) {
                        throw AppError.validation('Assignee non valido', {
                            field: 'assignee',
                            code: 'INVALID_ASSIGNEE',
                        });
                    }
                }

                const loadUserName = async (userId) => {
                    if (!userId) return null;
                    const user = await User.findById(userId)
                        .select('email profile.firstName profile.lastName profile.displayName')
                        .exec();
                    if (!user) return null;
                    return (
                        user.profile?.displayName ||
                        `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
                        user.email
                    );
                };

                const [fromName, toName] = await Promise.all([
                    loadUserName(currentAssigneeId),
                    loadUserName(nextAssigneeId),
                ]);

                const message = nextAssigneeId
                    ? (currentAssigneeId
                        ? `Riassegnato: ${fromName || '—'} → ${toName || '—'}`
                        : `Assegnato a ${toName || '—'}`)
                    : `Assegnazione rimossa (${fromName || '—'})`;

                activityEntries.push({
                    type: 'assignee_change',
                    message,
                    from: currentAssigneeId || undefined,
                    to: nextAssigneeId || undefined,
                    performedBy,
                    createdAt: now,
                });

                feedback.assignee = nextAssigneeId ? nextAssignee : null;
            }
        }

        if (labels !== undefined) {
            const nextLabels = normalizeLabels(labels);
            const currentLabels = normalizeLabels(feedback.labels || []);
            const labelsChanged = JSON.stringify(nextLabels) !== JSON.stringify(currentLabels);

            if (labelsChanged) {
                feedback.labels = nextLabels;
                activityEntries.push({
                    type: 'labels_update',
                    message: `Etichette aggiornate: ${nextLabels.length ? nextLabels.join(', ') : 'nessuna'}`,
                    from: currentLabels.join(', '),
                    to: nextLabels.join(', '),
                    performedBy,
                    createdAt: now,
                });
            }
        }

        if (typeof comment === 'string') {
            const trimmedComment = comment.trim();
            if (trimmedComment) {
                if (!performedBy) {
                    throw AppError.validation('Autore commento mancante', {
                        field: 'comment',
                        code: 'COMMENT_AUTHOR_REQUIRED',
                    });
                }
                commentText = trimmedComment;
                feedback.comments = [
                    ...(feedback.comments || []),
                    {
                        author: performedBy,
                        message: trimmedComment,
                        createdAt: now,
                    },
                ];
                commentAdded = true;
                activityEntries.push({
                    type: 'comment_added',
                    message: 'Commento inviato all\'utente',
                    performedBy,
                    createdAt: now,
                });
            }
        }

        Object.assign(feedback, safeUpdates);

        if (activityEntries.length > 0) {
            feedback.activity = [...(feedback.activity || []), ...activityEntries];
        }

        await feedback.save();
        await feedback.populate('user', 'email profile.firstName profile.lastName profile.displayName notifications.email.enabled');
        await feedback.populate('assignee', 'email profile.firstName profile.lastName profile.displayName');
        await feedback.populate('activity.performedBy', 'email profile.firstName profile.lastName profile.displayName role');
        await feedback.populate('comments.author', 'email profile.firstName profile.lastName profile.displayName role');

        if ((statusChanged || commentAdded) && feedback.user?.email) {
            const emailEnabled = feedback.user?.notifications?.email?.enabled !== false;
            if (emailEnabled) {
                const issueKey = `FB-${String(feedback._id).slice(-6).toUpperCase()}`;
                try {
                    await emailService.sendFeedbackUpdateEmail({
                        to: feedback.user.email,
                        userName:
                            feedback.user.profile?.displayName ||
                            `${feedback.user.profile?.firstName || ''} ${feedback.user.profile?.lastName || ''}`.trim(),
                        issueKey,
                        title: feedback.title,
                        status: feedback.status,
                        comment: commentAdded ? commentText : null,
                    });
                } catch (error) {
                    console.error('Errore invio email feedback:', error);
                }
            }
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
