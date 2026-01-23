/**
 * 📝 MODELLO FEEDBACK
 *
 * Sistema di ticketing per bug report e feedback utenti.
 * Supporta allegati e gestione admin.
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
    {
        // Riferimento all'utente che ha creato il feedback
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Utente obbligatorio'],
            index: true,
        },

        // Titolo del feedback
        title: {
            type: String,
            required: [true, 'Titolo obbligatorio'],
            trim: true,
            maxlength: [200, 'Titolo troppo lungo (max 200 caratteri)'],
        },

        // Descrizione dettagliata
        description: {
            type: String,
            required: [true, 'Descrizione obbligatoria'],
            trim: true,
            maxlength: [5000, 'Descrizione troppo lunga (max 5000 caratteri)'],
        },

        // Tipo di feedback
        type: {
            type: String,
            enum: ['bug', 'feature', 'improvement', 'question', 'other'],
            default: 'other',
            required: true,
        },

        // Priorità
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },

        // Stato del ticket
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'],
            default: 'open',
            index: true,
        },

        // Allegati (file upload)
        attachments: [{
            filename: {
                type: String,
                required: true,
            },
            originalName: {
                type: String,
                required: true,
            },
            mimetype: {
                type: String,
                required: true,
            },
            size: {
                type: Number,
                required: true,
            },
            path: {
                type: String,
                required: true,
            },
        }],

        // Note dell'admin (visibili solo agli admin)
        adminNotes: {
            type: String,
            maxlength: [2000, 'Note troppo lunghe (max 2000 caratteri)'],
        },

        // Data di risoluzione
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                delete ret.__v;
                return ret;
            },
        },
    }
);

// ==========================================
// INDEXES
// ==========================================

// Index composto per query frequenti
feedbackSchema.index({ user: 1, status: 1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });

// ==========================================
// PRE-SAVE HOOKS
// ==========================================

/**
 * Imposta resolvedAt quando lo status diventa resolved/closed
 */
feedbackSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        if (['resolved', 'closed'].includes(this.status) && !this.resolvedAt) {
            this.resolvedAt = new Date();
        } else if (['open', 'in_progress'].includes(this.status)) {
            this.resolvedAt = null;
        }
    }
    next();
});

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Ottieni statistiche aggregate
 */
feedbackSchema.statics.getStats = async function () {
    const stats = await this.aggregate([
        {
            $facet: {
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],
                byType: [
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                ],
                byPriority: [
                    { $group: { _id: '$priority', count: { $sum: 1 } } },
                ],
                total: [
                    { $count: 'count' },
                ],
                recentWeek: [
                    {
                        $match: {
                            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                        },
                    },
                    { $count: 'count' },
                ],
            },
        },
    ]);

    const result = stats[0];

    return {
        total: result.total[0]?.count || 0,
        recentWeek: result.recentWeek[0]?.count || 0,
        byStatus: result.byStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        byType: result.byType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        byPriority: result.byPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
    };
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
