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

module.exports = {
    createExamSchema,
    updateExamSchema,
};
