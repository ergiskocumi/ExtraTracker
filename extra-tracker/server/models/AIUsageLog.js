/**
 * 🤖 AI USAGE LOG MODEL - Multi-Tenant
 * =====================================
 * Traccia tutte le richieste AI (chat + embedding) per analisi consumi.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const aiUsageLogSchema = new mongoose.Schema(
    {
        // ⚠️ Single-field indexes removed intentionally.
        // Compound indexes on (user + field + createdAt) below cover all query patterns.
        // These single-field indexes only added write overhead with no query benefit.
        provider: {
            type: String,
            default: 'openai',
            trim: true,
        },
        modality: {
            type: String,
            enum: ['chat', 'embedding', 'other'],
            default: 'chat',
        },
        mode: {
            type: String,
            default: 'unknown',
            trim: true,
        },
        feature: {
            type: String,
            default: 'generic',
            trim: true,
        },
        model: {
            type: String,
            default: '',
            trim: true,
        },
        promptLengthChars: {
            type: Number,
            default: 0,
            min: 0,
        },
        inputTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        outputTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        inputCostUsd: {
            type: Number,
            default: 0,
            min: 0,
        },
        outputCostUsd: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCostUsd: {
            type: Number,
            default: 0,
            min: 0,
        },
        costEstimated: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ['success', 'error'],
            default: 'success',
        },
        latencyMs: {
            type: Number,
            default: 0,
            min: 0,
        },
        errorMessage: {
            type: String,
            default: '',
            trim: true,
            maxlength: [800, 'errorMessage non può superare 800 caratteri'],
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

aiUsageLogSchema.index({ user: 1, createdAt: -1 });
aiUsageLogSchema.index({ user: 1, mode: 1, createdAt: -1 });
aiUsageLogSchema.index({ user: 1, feature: 1, createdAt: -1 });
aiUsageLogSchema.index({ user: 1, model: 1, createdAt: -1 });
aiUsageLogSchema.index({ user: 1, status: 1, createdAt: -1 });

aiUsageLogSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

aiUsageLogSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    },
});

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
