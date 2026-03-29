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

module.exports = {
    createFolderSchema,
    updateFolderSchema,
    moveDecksSchema,
};
