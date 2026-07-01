/**
 * ✅ SHARED VALIDATE MIDDLEWARE
 * =============================
 * Middleware Express per validazione automatica con Zod.
 */

const { z } = require('zod');

/**
 * Valida i dati con uno schema Zod
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

module.exports = { validateMiddleware };
