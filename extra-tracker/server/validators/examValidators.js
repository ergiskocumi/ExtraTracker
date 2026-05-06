/**
 * 🎓 EXAM VALIDATORS
 * ==================
 * Schema Zod per la validazione delle route esami (CRUD).
 */

const { z } = require('zod');

const createExamSchema = z.object({
    title: z.string().min(1, 'Il titolo è obbligatorio').max(200),
    description: z.string().max(1000).optional().default(''),
    deadline: z.string().or(z.date()).transform(v => new Date(v)),
    status: z.enum(['active', 'completed', 'archived']).optional().default('active'),
    outcome: z.enum(['passed', 'failed']).nullable().optional().default(null),
});

const updateExamSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    deadline: z.string().or(z.date()).transform(v => new Date(v)).optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    outcome: z.enum(['passed', 'failed']).nullable().optional(),
});

// ==========================================
// Funzione Helper per Validazione
// ==========================================

/**
 * Valida i dati con uno schema Zod
 * @param {z.ZodSchema} schema - Schema Zod
 * @param {object} data - Dati da validare
 * @returns {{ success: boolean, data?: object, errors?: array }}
 */
const validate = (schema, data) => {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));

    return { success: false, errors };
};

/**
 * Middleware Express per validazione automatica
 * @param {z.ZodSchema} schema - Schema Zod
 */
const validateMiddleware = (schema) => {
    return (req, res, next) => {
        const result = validate(schema, req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Errore di validazione',
                    code: 'VALIDATION_ERROR',
                    details: result.errors,
                },
            });
        }

        req.body = result.data;
        next();
    };
};

module.exports = {
    createExamSchema,
    updateExamSchema,
    validateMiddleware,
};
