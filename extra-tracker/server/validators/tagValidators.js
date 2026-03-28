/**
 * 🏷️ TAG VALIDATORS
 * =================
 * Schema Zod per la validazione delle route tags.
 */

const { z } = require('zod');

const createTagSchema = z.object({
    name: z.string().min(1, 'Il nome del tag è obbligatorio').max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido').optional(),
    icon: z.string().max(10).optional(),
});

const updateTagSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido').optional(),
    icon: z.string().max(10).optional(),
    order: z.number().int().min(0).optional(),
});

module.exports = {
    createTagSchema,
    updateTagSchema,
};
