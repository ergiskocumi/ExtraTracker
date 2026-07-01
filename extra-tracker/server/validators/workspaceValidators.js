/**
 * ✅ WORKSPACE VALIDATORS
 * ======================
 * Schema Zod per la validazione delle route workspace (todo).
 */

const { z } = require('zod');

const createTodoSchema = z.object({
    project: z.string().min(1, 'Il progetto è obbligatorio'),
    title: z.string().min(1, 'Il titolo è obbligatorio').max(200),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (usa YYYY-MM-DD)').optional(),
    order: z.number().int().min(0).optional(),
});

const updateTodoSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido').optional().nullable(),
    order: z.number().int().min(0).optional(),
    project: z.string().min(1).optional(),
});

module.exports = {
    createTodoSchema,
    updateTodoSchema,
};
