/**
 * 📈 AI USAGE SERVICE
 * ====================
 * Tracking centralizzato richieste AI + aggregazioni dashboard.
 */

const mongoose = require('mongoose');
const AIUsageLog = require('../models/AIUsageLog');
const logger = require('../utils/logger');

const DEFAULT_CHAT_PRICING_PER_1M = {
    default: { input: 1.25, output: 5 },
    'deepseek-v4-pro': { input: 1.25, output: 5 },
    'deepseek-v4-flash': { input: 0.15, output: 0.6 },
    'deepseek-chat': { input: 0.27, output: 1.1 },
    'deepseek-reasoner': { input: 1.25, output: 5 },
};

const DEFAULT_EMBED_PRICING_PER_1M = {
    default: { input: 0.02, output: 0 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 },
};

const MAX_DAYS = 365;

let parsedPricingOverride = null;
let pricingOverrideLoaded = false;

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toSafeInt = (value, fallback = 0) => {
    const n = Math.round(toNumber(value, fallback));
    return Number.isFinite(n) ? Math.max(0, n) : Math.max(0, fallback);
};

const toSafeFloat = (value, fallback = 0) => {
    const n = toNumber(value, fallback);
    return Number.isFinite(n) ? Math.max(0, n) : Math.max(0, fallback);
};

const roundUsd = (value) => Math.round(toSafeFloat(value) * 1000000) / 1000000;

const estimateTokensFromChars = (chars = 0) => {
    const safeChars = toSafeInt(chars, 0);
    if (safeChars === 0) return 0;
    return Math.max(1, Math.ceil(safeChars / 4));
};

const normalizeUserId = (userId) => {
    if (!userId) return null;
    if (userId instanceof mongoose.Types.ObjectId) return userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
        return new mongoose.Types.ObjectId(userId);
    }
    if (userId?.toString && mongoose.Types.ObjectId.isValid(userId.toString())) {
        return new mongoose.Types.ObjectId(userId.toString());
    }
    return null;
};

const loadPricingOverride = () => {
    if (pricingOverrideLoaded) return parsedPricingOverride;
    pricingOverrideLoaded = true;

    const raw = process.env.AI_USAGE_PRICING_JSON;
    if (!raw || typeof raw !== 'string') return null;

    try {
        const parsed = JSON.parse(raw);
        parsedPricingOverride = parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
        logger.warn('AIUsageService', 'Pricing JSON non valido da env var', { error: err.message });
        parsedPricingOverride = null;
    }

    return parsedPricingOverride;
};

const getPricing = (modality = 'chat', model = '') => {
    const normalizedModality = String(modality || 'chat').toLowerCase();
    const normalizedModel = String(model || '').trim();

    const override = loadPricingOverride();
    if (override?.[normalizedModality]) {
        const fromOverride = override[normalizedModality][normalizedModel]
            || override[normalizedModality].default;
        if (fromOverride && Number.isFinite(Number(fromOverride.input))) {
            return {
                input: toSafeFloat(fromOverride.input, 0),
                output: toSafeFloat(fromOverride.output, 0),
                estimated: false,
            };
        }
    }

    const table = normalizedModality === 'embedding'
        ? DEFAULT_EMBED_PRICING_PER_1M
        : DEFAULT_CHAT_PRICING_PER_1M;

    const fromTable = table[normalizedModel] || table.default;
    return {
        input: toSafeFloat(fromTable.input, 0),
        output: toSafeFloat(fromTable.output, 0),
        estimated: true,
    };
};

const estimatePromptLengthFromMessages = (messages = []) => {
    if (!Array.isArray(messages)) return 0;

    let total = 0;
    for (const msg of messages) {
        const content = msg?.content;
        if (typeof content === 'string') {
            total += content.length;
            continue;
        }
        if (Array.isArray(content)) {
            for (const part of content) {
                if (typeof part === 'string') total += part.length;
                if (part && typeof part === 'object' && typeof part.text === 'string') {
                    total += part.text.length;
                }
            }
        }
    }

    return total;
};

const buildRange = ({ days = 30, from, to } = {}) => {
    const safeDays = Math.max(1, Math.min(MAX_DAYS, toSafeInt(days, 30)));

    const now = new Date();
    let toDate = to ? new Date(to) : now;
    if (Number.isNaN(toDate.getTime())) toDate = now;

    let fromDate = from ? new Date(from) : new Date(toDate.getTime() - safeDays * 24 * 60 * 60 * 1000);
    if (Number.isNaN(fromDate.getTime())) {
        fromDate = new Date(toDate.getTime() - safeDays * 24 * 60 * 60 * 1000);
    }

    if (fromDate > toDate) {
        const tmp = fromDate;
        fromDate = toDate;
        toDate = tmp;
    }

    return {
        fromDate,
        toDate,
        days: safeDays,
    };
};

const safeSliceMessage = (value, maxLen = 800) => {
    if (!value) return '';
    const text = String(value);
    return text.length <= maxLen ? text : text.slice(0, maxLen);
};

const computeCosts = ({ modality, model, inputTokens = 0, outputTokens = 0, forceEstimated = false }) => {
    const pricing = getPricing(modality, model);

    const inputCostUsd = (toSafeInt(inputTokens, 0) / 1_000_000) * pricing.input;
    const outputCostUsd = (toSafeInt(outputTokens, 0) / 1_000_000) * pricing.output;

    return {
        inputCostUsd: roundUsd(inputCostUsd),
        outputCostUsd: roundUsd(outputCostUsd),
        totalCostUsd: roundUsd(inputCostUsd + outputCostUsd),
        costEstimated: Boolean(forceEstimated || pricing.estimated),
    };
};

const normalizeTotals = ({ inputTokens, outputTokens, totalTokens, promptLengthChars }) => {
    const promptLength = toSafeInt(promptLengthChars, 0);
    let inTokens = toSafeInt(inputTokens, 0);
    let outTokens = toSafeInt(outputTokens, 0);
    let total = toSafeInt(totalTokens, 0);

    let tokenEstimated = false;

    if (inTokens === 0 && promptLength > 0) {
        inTokens = estimateTokensFromChars(promptLength);
        tokenEstimated = true;
    }

    if (total === 0) {
        total = inTokens + outTokens;
    }

    if (total > 0 && outTokens === 0 && total > inTokens) {
        outTokens = Math.max(0, total - inTokens);
    }

    return {
        promptLengthChars: promptLength,
        inputTokens: inTokens,
        outputTokens: outTokens,
        totalTokens: total,
        tokenEstimated,
    };
};

const basePayload = (payload = {}) => {
    const normalized = normalizeTotals(payload);
    const costs = computeCosts({
        modality: payload.modality,
        model: payload.model,
        inputTokens: normalized.inputTokens,
        outputTokens: normalized.outputTokens,
        forceEstimated: Boolean(payload.costEstimated || normalized.tokenEstimated),
    });

    return {
        provider: payload.provider || 'deepseek',
        modality: payload.modality || 'chat',
        mode: payload.mode || 'unknown',
        feature: payload.feature || 'generic',
        model: payload.model || '',
        promptLengthChars: normalized.promptLengthChars,
        inputTokens: normalized.inputTokens,
        outputTokens: normalized.outputTokens,
        totalTokens: normalized.totalTokens,
        inputCostUsd: costs.inputCostUsd,
        outputCostUsd: costs.outputCostUsd,
        totalCostUsd: costs.totalCostUsd,
        costEstimated: costs.costEstimated,
        status: payload.status === 'error' ? 'error' : 'success',
        latencyMs: toSafeInt(payload.latencyMs, 0),
        errorMessage: safeSliceMessage(payload.errorMessage, 800),
        metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    };
};

// Dashboard "AI Usage" (analisi token/costi) rimossa: il tracking non scrive più
// nel DB. Le funzioni restano attive come no-op per non rompere le chiamate AI
// di quiz/tutor/esami che dipendono dal loro ritorno (runTrackedChatCompletion
// deve continuare a restituire il risultato di operation()).
const TRACKING_ENABLED = false;

async function trackEvent(payload = {}) {
    if (!TRACKING_ENABLED) return null;
    try {
        const userId = normalizeUserId(payload.userId);
        if (!userId) return null;

        return await AIUsageLog.create({
            user: userId,
            ...basePayload(payload),
        });
    } catch (err) {
        logger.warn('AIUsageService', 'trackEvent fallito silenziosamente', { error: err.message });
        return null;
    }
}

async function runTrackedChatCompletion(config, operation) {
    const {
        userId,
        mode = 'unknown',
        feature = 'chat',
        model = '',
        messages = [],
        promptLengthChars = estimatePromptLengthFromMessages(messages),
        metadata = {},
    } = config || {};

    const startedAt = Date.now();

    try {
        const completion = await operation();

        const usage = completion?.usage || {};

        await trackEvent({
            userId,
            provider: 'deepseek',
            modality: 'chat',
            mode,
            feature,
            model: model || completion?.model || '',
            promptLengthChars,
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            latencyMs: Date.now() - startedAt,
            metadata,
            costEstimated: !usage || !Number.isFinite(Number(usage.prompt_tokens)),
            status: 'success',
        });

        return completion;
    } catch (err) {
        await trackEvent({
            userId,
            provider: 'deepseek',
            modality: 'chat',
            mode,
            feature,
            model,
            promptLengthChars,
            latencyMs: Date.now() - startedAt,
            errorMessage: err?.message || 'Unknown AI error',
            metadata,
            status: 'error',
            costEstimated: true,
        });

        throw err;
    }
}

async function trackEmbeddingEvent(config = {}) {
    const {
        userId,
        mode = 'unknown',
        feature = 'embedding',
        model = 'text-embedding-3-small',
        inputChars = 0,
        inputTokens = 0,
        latencyMs = 0,
        status = 'success',
        errorMessage = '',
        metadata = {},
    } = config;

    const estimatedInputTokens = inputTokens > 0
        ? toSafeInt(inputTokens, 0)
        : estimateTokensFromChars(inputChars);

    return trackEvent({
        userId,
        provider: 'deepseek',
        modality: 'embedding',
        mode,
        feature,
        model,
        promptLengthChars: inputChars,
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        totalTokens: estimatedInputTokens,
        latencyMs,
        errorMessage,
        metadata,
        status,
        costEstimated: true,
    });
}

async function getSummary({ userId, days = 30, from, to, mode, feature, modality, model } = {}) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
        return {
            range: { from: null, to: null, days: 0 },
            totals: {
                requests: 0,
                successRequests: 0,
                failedRequests: 0,
                promptChars: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                totalCostUsd: 0,
                avgLatencyMs: 0,
            },
            breakdowns: {
                byMode: [],
                byFeature: [],
                byModality: [],
                byModel: [],
                byStatus: [],
            },
            daily: [],
        };
    }

    const range = buildRange({ days, from, to });

    const match = {
        user: normalizedUserId,
        createdAt: {
            $gte: range.fromDate,
            $lte: range.toDate,
        },
    };

    if (mode) match.mode = String(mode).trim();
    if (feature) match.feature = String(feature).trim();
    if (modality) match.modality = String(modality).trim();
    if (model) match.model = String(model).trim();

    const [aggregated] = await AIUsageLog.aggregate([
        { $match: match },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            requests: { $sum: 1 },
                            successRequests: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                            failedRequests: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
                            promptChars: { $sum: '$promptLengthChars' },
                            inputTokens: { $sum: '$inputTokens' },
                            outputTokens: { $sum: '$outputTokens' },
                            totalTokens: { $sum: '$totalTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                            avgLatencyMs: { $avg: '$latencyMs' },
                        },
                    },
                ],
                byMode: [
                    {
                        $group: {
                            _id: '$mode',
                            requests: { $sum: 1 },
                            totalTokens: { $sum: '$totalTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                        },
                    },
                    { $sort: { requests: -1 } },
                ],
                byFeature: [
                    {
                        $group: {
                            _id: '$feature',
                            requests: { $sum: 1 },
                            totalTokens: { $sum: '$totalTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                        },
                    },
                    { $sort: { requests: -1 } },
                ],
                byModality: [
                    {
                        $group: {
                            _id: '$modality',
                            requests: { $sum: 1 },
                            totalTokens: { $sum: '$totalTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                        },
                    },
                    { $sort: { requests: -1 } },
                ],
                byModel: [
                    {
                        $group: {
                            _id: '$model',
                            requests: { $sum: 1 },
                            totalTokens: { $sum: '$totalTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                        },
                    },
                    { $sort: { requests: -1 } },
                    { $limit: 12 },
                ],
                byStatus: [
                    {
                        $group: {
                            _id: '$status',
                            requests: { $sum: 1 },
                        },
                    },
                    { $sort: { requests: -1 } },
                ],
                daily: [
                    {
                        $group: {
                            _id: {
                                day: {
                                    $dateToString: {
                                        format: '%Y-%m-%d',
                                        date: '$createdAt',
                                    },
                                },
                            },
                            requests: { $sum: 1 },
                            totalTokens: { $sum: '$totalTokens' },
                            inputTokens: { $sum: '$inputTokens' },
                            outputTokens: { $sum: '$outputTokens' },
                            totalCostUsd: { $sum: '$totalCostUsd' },
                        },
                    },
                    { $sort: { '_id.day': 1 } },
                ],
            },
        },
    ]);

    const totals = aggregated?.totals?.[0] || {
        requests: 0,
        successRequests: 0,
        failedRequests: 0,
        promptChars: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        avgLatencyMs: 0,
    };

    const mapBreakdown = (items = []) => items.map((item) => ({
        key: item._id || 'unknown',
        requests: toSafeInt(item.requests, 0),
        totalTokens: toSafeInt(item.totalTokens, 0),
        totalCostUsd: roundUsd(item.totalCostUsd),
    }));

    return {
        range: {
            from: range.fromDate.toISOString(),
            to: range.toDate.toISOString(),
            days: range.days,
        },
        totals: {
            requests: toSafeInt(totals.requests, 0),
            successRequests: toSafeInt(totals.successRequests, 0),
            failedRequests: toSafeInt(totals.failedRequests, 0),
            promptChars: toSafeInt(totals.promptChars, 0),
            inputTokens: toSafeInt(totals.inputTokens, 0),
            outputTokens: toSafeInt(totals.outputTokens, 0),
            totalTokens: toSafeInt(totals.totalTokens, 0),
            totalCostUsd: roundUsd(totals.totalCostUsd),
            avgLatencyMs: toSafeInt(totals.avgLatencyMs, 0),
        },
        breakdowns: {
            byMode: mapBreakdown(aggregated?.byMode || []),
            byFeature: mapBreakdown(aggregated?.byFeature || []),
            byModality: mapBreakdown(aggregated?.byModality || []),
            byModel: mapBreakdown(aggregated?.byModel || []),
            byStatus: (aggregated?.byStatus || []).map((item) => ({
                key: item._id || 'unknown',
                requests: toSafeInt(item.requests, 0),
            })),
        },
        daily: (aggregated?.daily || []).map((item) => ({
            date: item?._id?.day || '',
            requests: toSafeInt(item.requests, 0),
            inputTokens: toSafeInt(item.inputTokens, 0),
            outputTokens: toSafeInt(item.outputTokens, 0),
            totalTokens: toSafeInt(item.totalTokens, 0),
            totalCostUsd: roundUsd(item.totalCostUsd),
        })),
    };
}

async function getEvents({
    userId,
    page = 1,
    pageSize = 50,
    days = 30,
    from,
    to,
    mode,
    feature,
    modality,
    model,
    status,
} = {}) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
        return {
            page: 1,
            pageSize: 0,
            total: 0,
            pages: 0,
            items: [],
        };
    }

    const range = buildRange({ days, from, to });
    const safePage = Math.max(1, toSafeInt(page, 1));
    const safePageSize = Math.max(1, Math.min(200, toSafeInt(pageSize, 50)));

    const filter = {
        user: normalizedUserId,
        createdAt: {
            $gte: range.fromDate,
            $lte: range.toDate,
        },
    };

    if (mode) filter.mode = String(mode).trim();
    if (feature) filter.feature = String(feature).trim();
    if (modality) filter.modality = String(modality).trim();
    if (model) filter.model = String(model).trim();
    if (status) filter.status = String(status).trim();

    const [total, docs] = await Promise.all([
        AIUsageLog.countDocuments(filter),
        AIUsageLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safePageSize)
            .limit(safePageSize)
            .lean(),
    ]);

    return {
        page: safePage,
        pageSize: safePageSize,
        total,
        pages: Math.ceil(total / safePageSize),
        items: docs.map((doc) => ({
            id: String(doc._id),
            provider: doc.provider,
            modality: doc.modality,
            mode: doc.mode,
            feature: doc.feature,
            model: doc.model,
            promptLengthChars: toSafeInt(doc.promptLengthChars, 0),
            inputTokens: toSafeInt(doc.inputTokens, 0),
            outputTokens: toSafeInt(doc.outputTokens, 0),
            totalTokens: toSafeInt(doc.totalTokens, 0),
            inputCostUsd: roundUsd(doc.inputCostUsd),
            outputCostUsd: roundUsd(doc.outputCostUsd),
            totalCostUsd: roundUsd(doc.totalCostUsd),
            costEstimated: Boolean(doc.costEstimated),
            status: doc.status,
            latencyMs: toSafeInt(doc.latencyMs, 0),
            errorMessage: doc.errorMessage || '',
            metadata: doc.metadata || {},
            createdAt: doc.createdAt,
        })),
    };
}

module.exports = {
    estimatePromptLengthFromMessages,
    estimateTokensFromChars,
    trackEvent,
    runTrackedChatCompletion,
    trackEmbeddingEvent,
    getSummary,
    getEvents,
};
