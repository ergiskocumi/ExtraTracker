/**
 * USER ACTIVITY MODEL
 *
 * Registro eventi di gamification per analisi future.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const userActivitySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                'SESSION_COMPLETE',
                'GOAL_CREATED',
                'GOAL_COMPLETED',
                'GOAL_ARCHIVED',
                'WORK_SESSION_LOGGED',
                'WORK_NOTE_CREATED', // Note/journal senza orari
                'HABIT_CHECKIN',
                'HABIT_SKIPPED',
                'PROJECT_CREATED',
                'PROJECT_COMPLETED',
                'STREAK_BONUS',
            ],
            required: [true, 'Il tipo di attivita e\' obbligatorio'],
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        category: {
            type: String,
            trim: true,
            default: '',
            index: true,
        },
        sentiment: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        xpEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// =========================================
// INDEXES
// =========================================

userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
userActivitySchema.index({ user: 1, category: 1, createdAt: -1 });
userActivitySchema.index({ 'metadata.entityId': 1, createdAt: -1 });

// =========================================
// PLUGINS
// =========================================

userActivitySchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// SERIALIZATION
// =========================================

userActivitySchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
        return ret;
    },
});

module.exports = mongoose.model('UserActivity', userActivitySchema);
