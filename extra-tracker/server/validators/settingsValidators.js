/**
 * SETTINGS VALIDATORS
 * ====================
 *
 * Schemi Zod per gli endpoint di settingsController.
 * Usare con validate(schema) middleware oppure schema.parse(req.body).
 */

const { z } = require('zod');

// ==========================================
// PROFILO
// ==========================================

const updateProfileSchema = z.object({
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    displayName: z.string().max(60).optional(),
    phone: z.string().max(30).optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional().or(z.literal('')),
    company: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().optional().or(z.literal('')),
}).strict();

// ==========================================
// PREFERENZE
// ==========================================

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

// ==========================================
// NOTIFICHE
// ==========================================

const emailNotificationsSchema = z.object({
    enabled: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    projectUpdates: z.boolean().optional(),
}).strict();

const pushNotificationsSchema = z.object({
    enabled: z.boolean().optional(),
    dailyReminder: z.boolean().optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).strict();

const updateNotificationsSchema = z.object({
    email: emailNotificationsSchema.optional(),
    push: pushNotificationsSchema.optional(),
}).strict();

// ==========================================
// ACCOUNT (GDPR)
// ==========================================

const deleteAccountSchema = z.object({
    password: z.string().min(1, 'Password obbligatoria'),
    confirmation: z.string().min(1, 'Conferma obbligatoria'),
}).strict();

module.exports = {
    updateProfileSchema,
    updatePreferencesSchema,
    updateNotificationsSchema,
    deleteAccountSchema,
};
