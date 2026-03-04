/**
 * 🤖 AI USAGE LOG MODEL - Multi-Tenant
 * =====================================
 * Traccia tutte le richieste AI (chat + embedding) per analisi consumi.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const aiUsageLogSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            default: 'openai',
            trim: true,
            index: true,
        },
        modality: {
            type: String,
            enum: ['chat', 'embedding', 'other'],
            default: 'chat',
            index: true,
        },
        mode: {
            type: String,
            default: 'unknown',
            trim: true,
            index: true,
        },
        feature: {
            type: String,
            default: 'generic',
            trim: true,
            index: true,
        },
        model: {
            type: String,
            default: '',
            trim: true,
            index: true,
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
            index: true,
        },
        status: {
            type: String,
            enum: ['success', 'error'],
            default: 'success',
            index: true,
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
