/**
 * 🛡️ ENV SCHEMA - Validazione variabili di ambiente con Zod
 * ==========================================================
 * Fail-fast: se una variabile critica è assente o invalida, il server
 * non parte. Elimina tutti i parseInt/string parse manuali sparsi nel codice.
 */

const { z } = require('zod');
const logger = require('../utils/logger');

const envSchema = z.object({
    // Database
    MONGO_URI: z.string().min(1, 'MONGO_URI è obbligatoria'),

    // Auth
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve essere almeno 32 caratteri'),

    // DeepSeek (Anthropic-compatible) — primary AI backend
    ANTHROPIC_AUTH_TOKEN: z.string().min(1, 'ANTHROPIC_AUTH_TOKEN è obbligatoria'),
    ANTHROPIC_MODEL: z.string().optional(),
    ANTHROPIC_BASE_URL: z.string().url().optional(),

    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().positive().default(3000),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Study generation
    STUDY_GENERATION_MAX_CARDS: z.coerce.number().positive().optional(),

    // URLs (obbligatorie in produzione, opzionali in sviluppo)
    FRONTEND_URL: z.string().url().optional(),
    BACKEND_URL: z.string().url().optional(),
}).superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
        if (!data.FRONTEND_URL) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['FRONTEND_URL'],
                message: 'FRONTEND_URL è obbligatoria in produzione',
            });
        }
        if (!data.BACKEND_URL) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['BACKEND_URL'],
                message: 'BACKEND_URL è obbligatoria in produzione',
            });
        }
    }
});

/**
 * Valida le variabili di ambiente all'avvio.
 * In caso di errore, logga e termina il processo (fail-fast).
 */
function validateEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.errors
            .map(e => `  - ${e.path.join('.')}: ${e.message}`)
            .join('\n');

        logger.error('EnvSchema', `Variabili di ambiente non valide:\n${errors}`);
        process.exit(1);
    }

    return result.data;
}

module.exports = { validateEnv, envSchema };
