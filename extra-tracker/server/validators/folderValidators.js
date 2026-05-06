/**
 * 📁 FOLDER VALIDATORS
 * ====================
 * Schema Zod per la validazione delle route folders.
 */

const { z } = require('zod');

const createFolderSchema = z.object({
    name: z.string().min(1, 'Il nome della cartella è obbligatorio').max(100),
    parentId: z.string().nullable().optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido').optional(),
});

const updateFolderSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    parentId: z.string().nullable().optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido').optional(),
    order: z.number().int().min(0).optional(),
});

const moveDecksSchema = z.object({
    deckIds: z.array(z.string()).min(1, 'Devi specificare almeno un mazzo'),
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
    createFolderSchema,
    updateFolderSchema,
    moveDecksSchema,
    validateMiddleware,
};
