/**
 * 🧠 DeepSeek Client via Anthropic-compatible API
 * ================================================
 * Uses @anthropic-ai/sdk pointed at https://api.deepseek.com/anthropic
 *
 * Provides createCompletion(params) with OpenAI-compatible signature
 * to minimize changes in call sites.
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

// =========================================
// CLIENT CONFIG
// =========================================

const DEEPSEEK_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const DEEPSEEK_API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';
const DEEPSEEK_DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro[1m]';
const DEEPSEEK_FLASH_MODEL = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || process.env.CLAUDE_CODE_SUBAGENT_MODEL || 'deepseek-v4-flash';

let clientLogSent = false;

const anthropic = new Anthropic({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey: DEEPSEEK_API_KEY,
});

if (!clientLogSent) {
    logger.info('DeepSeekClient', `Endpoint: ${DEEPSEEK_BASE_URL} | Model: ${DEEPSEEK_DEFAULT_MODEL} | Flash: ${DEEPSEEK_FLASH_MODEL}`);
    clientLogSent = true;
}

// =========================================
// MODEL RESOLUTION
// =========================================

const KNOWN_DEEPSEEK_MODELS = new Set([
    'deepseek-v4-pro[1m]',
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'deepseek-v3',
    'deepseek-chat',
    'deepseek-reasoner',
]);

function resolveModel(requestedModel) {
    if (!requestedModel) return DEEPSEEK_DEFAULT_MODEL;
    const trimmed = String(requestedModel).trim();
    if (KNOWN_DEEPSEEK_MODELS.has(trimmed)) return trimmed;
    // Fallback: if it looks like an OpenAI model, use default
    if (trimmed.startsWith('gpt-') || trimmed.startsWith('o1')) return DEEPSEEK_DEFAULT_MODEL;
    return trimmed;
}

// =========================================
// ADAPTER: OpenAI format → Anthropic Messages
// =========================================

/**
 * Convert OpenAI-style chat completion params to Anthropic Messages params.
 *
 * @param {object} params — OpenAI-style: { model, messages, temperature, max_tokens, response_format }
 * @returns {object} — { model, system, messages, max_tokens, temperature }
 */
function toAnthropicParams(params = {}) {
    const {
        model: requestedModel,
        messages: openaiMessages = [],
        temperature,
        max_tokens: maxTokens,
        max_completion_tokens: maxCompletionTokens,
        response_format: responseFormat,
        top_p: topP,
    } = params;

    const model = resolveModel(requestedModel);

    // Extract system message(s) from OpenAI messages
    const systemMessages = openaiMessages
        .filter((m) => m.role === 'system')
        .map((m) => {
            if (typeof m.content === 'string') return m.content;
            if (Array.isArray(m.content)) {
                return m.content
                    .filter((c) => c.type === 'text')
                    .map((c) => c.text)
                    .join('\n');
            }
            return '';
        })
        .filter(Boolean);

    const system = systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined;

    // Convert non-system messages to Anthropic format
    const messages = openaiMessages
        .filter((m) => m.role !== 'system')
        .map((m) => {
            let content = m.content;
            if (typeof content === 'string') content = content;
            else if (Array.isArray(content)) {
                content = content
                    .filter((c) => c.type === 'text')
                    .map((c) => c.text)
                    .join('\n');
            }
            return { role: m.role === 'assistant' ? 'assistant' : 'user', content };
        })
        .filter((m) => m.content);

    // Model-specific max_tokens handling
    // deepseek-v4-pro[1m] supports up to 1M tokens context but output limit varies
    const effectiveMaxTokens = maxTokens || maxCompletionTokens || 4096;

    const anthropicParams = {
        model,
        max_tokens: effectiveMaxTokens,
        messages,
    };

    if (system) anthropicParams.system = system;
    if (temperature !== undefined) anthropicParams.temperature = temperature;
    if (topP !== undefined) anthropicParams.top_p = topP;

    // Handle structured output (JSON schema) via system prompt + prefill
    if (responseFormat) {
        const formatInstruction = buildJsonInstruction(responseFormat);
        anthropicParams.system = anthropicParams.system
            ? `${anthropicParams.system}\n\n${formatInstruction}`
            : formatInstruction;
    }

    return anthropicParams;
}

/**
 * Build JSON format instruction for the system prompt.
 * Anthropic doesn't have native json_schema mode, so we instruct via prompt.
 */
function buildJsonInstruction(responseFormat) {
    if (!responseFormat) return '';

    if (responseFormat.type === 'json_schema' && responseFormat.json_schema) {
        const schema = responseFormat.json_schema;
        const schemaName = schema.name || 'output';
        const schemaStr = JSON.stringify(schema.schema || schema, null, 2);
        return [
            'IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, no code fences.',
            `The JSON must conform to this schema (name: "${schemaName}"):`,
            '```json',
            schemaStr,
            '```',
            'Your response must be a single JSON object. Start with { and end with }.',
            'Do NOT wrap in ```json fences. Output raw JSON only.',
        ].join('\n');
    }

    if (responseFormat.type === 'json_object') {
        return [
            'IMPORTANT: You MUST respond with ONLY a valid JSON object.',
            'No markdown, no explanation, no code fences.',
            'Start with { and end with }. Output raw JSON only.',
        ].join('\n');
    }

    return '';
}

/**
 * Normalize Anthropic response to OpenAI-compatible shape.
 * This allows existing code that reads `completion.choices[0].message.content`
 * and `completion.usage` to keep working.
 */
function normalizeResponse(anthropicResponse) {
    // Anthropic Messages response structure
    const content = anthropicResponse.content || [];
    const textContent = content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

    return {
        id: anthropicResponse.id,
        model: anthropicResponse.model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: textContent,
                },
                finish_reason: anthropicResponse.stop_reason || 'stop',
            },
        ],
        usage: {
            prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
            completion_tokens: anthropicResponse.usage?.output_tokens || 0,
            total_tokens: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0),
            // Keep original Anthropic fields for reference
            input_tokens: anthropicResponse.usage?.input_tokens || 0,
            output_tokens: anthropicResponse.usage?.output_tokens || 0,
        },
        // Keep raw response for advanced use
        _raw: anthropicResponse,
    };
}

// =========================================
// MAIN CREATE COMPLETION (OpenAI-compatible signature)
// =========================================

/**
 * Create a chat completion using DeepSeek via Anthropic-compatible API.
 *
 * Signature is OpenAI-compatible: createCompletion(params, options?)
 * where options may include { timeout, signal }.
 *
 * Returns an OpenAI-shaped response object.
 */
async function createCompletion(params, options = {}) {
    const anthropicParams = toAnthropicParams(params);
    const { timeout, signal } = options;

    const requestOptions = {};
    if (timeout) requestOptions.timeout = timeout;
    if (signal) requestOptions.signal = signal;

    logger.debug('DeepSeekClient', 'createCompletion', {
        model: anthropicParams.model,
        systemLen: (anthropicParams.system || '').length,
        messageCount: anthropicParams.messages.length,
        maxTokens: anthropicParams.max_tokens,
    });

    const response = await anthropic.messages.create(anthropicParams, requestOptions);
    return normalizeResponse(response);
}

/**
 * Create a streaming completion. Returns an async iterable of SSE-like chunks.
 * Each chunk is OpenAI-shaped: { choices: [{ delta: { content } }] }
 */
async function* createStreamingCompletion(params, options = {}) {
    const anthropicParams = toAnthropicParams(params);
    const { signal } = options;

    const stream = anthropic.messages.stream(anthropicParams, { signal });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            yield {
                choices: [{ delta: { content: event.delta.text } }],
            };
        } else if (event.type === 'message_stop') {
            // Final message — not yielded as content
        }
    }
}

// =========================================
// EXPORTS
// =========================================

module.exports = {
    // Client
    anthropic,
    // Config
    DEEPSEEK_BASE_URL,
    DEEPSEEK_DEFAULT_MODEL,
    DEEPSEEK_FLASH_MODEL,
    KNOWN_DEEPSEEK_MODELS,
    // Core functions
    createCompletion,
    createStreamingCompletion,
    resolveModel,
    toAnthropicParams,
    normalizeResponse,
};
