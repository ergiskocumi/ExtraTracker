/**
 * SETTINGS VALIDATORS
 * ====================
 *
 * Schema Zod per l'aggiornamento delle preferenze utente.
 * Usare con validateMiddleware(schema) oppure schema.parse(req.body).
 */

const { z } = require('zod');

const updatePreferencesSchema = z.object({
    language: z.enum(['it', 'en', 'es', 'de', 'fr']).optional(),
    timezone: z.string().max(60).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    timeFormat: z.enum(['24h', '12h']).optional(),
    currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).optional(),
    defaultHourlyRate: z.number().min(0).max(10000).optional(),
    theme: z.enum(['dark', 'light', 'system']).optional(),
    compactMode: z.boolean().optional(),
    dashboardLayout: z.enum(['default', 'compact', 'expanded']).optional(),
    showMotivationalMessages: z.boolean().optional(),
    defaultView: z.literal('dashboard').optional(),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    dailyGoalHours: z.number().min(0).max(24).optional(),
    weeklyGoalHours: z.number().min(0).max(168).optional(),
}).strict();

module.exports = {
    updatePreferencesSchema,
};
