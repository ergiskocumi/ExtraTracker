/**
 * ⚙️ CONTROLLER IMPOSTAZIONI UTENTE
 * 
 * Gestisce:
 * - Profilo utente (dati personali)
 * - Preferenze generali
 * - Preferenze notifiche
 * - Export/Delete dati (GDPR)
 */

const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');

// ==========================================
// PROFILO UTENTE
// ==========================================

/**
 * GET /api/settings/profile
 * Ottieni profilo completo utente
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        data: {
            profile: user.profile || {},
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
        },
    });
});

/**
 * PUT /api/settings/profile
 * Aggiorna profilo utente
 */
const updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        'firstName',
        'lastName', 
        'displayName',
        'phone',
        'bio',
        'avatar',
        'company',
        'jobTitle',
        'location',
        'website',
    ];

    // Filtra solo i campi permessi
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[`profile.${field}`] = req.body[field];
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        message: 'Profilo aggiornato con successo',
        data: {
            profile: user.profile,
        },
    });
});

// ==========================================
// PREFERENZE
// ==========================================

/**
 * GET /api/settings/preferences
 * Ottieni preferenze utente
 */
const getPreferences = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Ritorna preferenze con valori di default se non impostati
    const defaultPreferences = {
        language: 'it',
        timezone: 'Europe/Rome',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        defaultHourlyRate: 0,
        theme: 'dark',
        compactMode: false,
        dashboardLayout: 'default',
        showMotivationalMessages: true,
        defaultView: 'dashboard',
        weekStartsOn: 1,
        workingDays: [1, 2, 3, 4, 5],
        dailyGoalHours: 8,
        weeklyGoalHours: 40,
    };

    res.status(200).json({
        success: true,
        data: {
            preferences: {
                ...defaultPreferences,
                ...user.preferences?.toObject?.() || user.preferences || {},
            },
        },
    });
});

/**
 * PUT /api/settings/preferences
 * Aggiorna preferenze utente
 */
const updatePreferences = asyncHandler(async (req, res) => {
    const allowedFields = [
        'language',
        'timezone',
        'dateFormat',
        'timeFormat',
        'currency',
        'defaultHourlyRate',
        'theme',
        'compactMode',
        'dashboardLayout',
        'showMotivationalMessages',
        'defaultView',
        'weekStartsOn',
        'workingDays',
        'dailyGoalHours',
        'weeklyGoalHours',
    ];

    // Filtra solo i campi permessi
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[`preferences.${field}`] = req.body[field];
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        message: 'Preferenze aggiornate con successo',
        data: {
            preferences: user.preferences,
        },
    });
});

// ==========================================
// NOTIFICHE
// ==========================================

/**
 * GET /api/settings/notifications
 * Ottieni preferenze notifiche
 */
const getNotifications = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Valori di default per notifiche
    const defaultNotifications = {
        email: {
            enabled: true,
            weeklyReport: true,
            goalReminders: true,
            projectUpdates: false,
        },
        push: {
            enabled: false,
            dailyReminder: false,
            reminderTime: '09:00',
        },
    };

    res.status(200).json({
        success: true,
        data: {
            notifications: {
                ...defaultNotifications,
                ...user.notifications?.toObject?.() || user.notifications || {},
            },
        },
    });
});

/**
 * PUT /api/settings/notifications
 * Aggiorna preferenze notifiche
 */
const updateNotifications = asyncHandler(async (req, res) => {
    const { email, push } = req.body;
    const updates = {};

    // Aggiorna preferenze email
    if (email) {
        if (email.enabled !== undefined) updates['notifications.email.enabled'] = email.enabled;
        if (email.weeklyReport !== undefined) updates['notifications.email.weeklyReport'] = email.weeklyReport;
        if (email.goalReminders !== undefined) updates['notifications.email.goalReminders'] = email.goalReminders;
        if (email.projectUpdates !== undefined) updates['notifications.email.projectUpdates'] = email.projectUpdates;
    }

    // Aggiorna preferenze push
    if (push) {
        if (push.enabled !== undefined) updates['notifications.push.enabled'] = push.enabled;
        if (push.dailyReminder !== undefined) updates['notifications.push.dailyReminder'] = push.dailyReminder;
        if (push.reminderTime !== undefined) updates['notifications.push.reminderTime'] = push.reminderTime;
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        message: 'Preferenze notifiche aggiornate',
        data: {
            notifications: user.notifications,
        },
    });
});

// ==========================================
// IMPOSTAZIONI COMPLETE
// ==========================================

/**
 * GET /api/settings
 * Ottieni tutte le impostazioni utente
 */
const getAllSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        data: {
            profile: user.profile || {},
            preferences: user.preferences || {},
            notifications: user.notifications || {},
            account: {
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
        },
    });
});

// ==========================================
// GDPR - EXPORT E DELETE
// ==========================================

/**
 * GET /api/settings/export
 * Esporta tutti i dati utente (GDPR compliance)
 */
const exportData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Raccogli tutti i dati dell'utente
    const WorkLog = require('../models/WorkLog');
    const Project = require('../models/Project');
    const Goal = require('../models/Goal');
    const CheckIn = require('../models/CheckIn');

    const [workLogs, projects, goals, checkIns] = await Promise.all([
        WorkLog.find({ user: req.user.id }),
        Project.find({ user: req.user.id }),
        Goal.find({ user: req.user.id }),
        CheckIn.find({ user: req.user.id }),
    ]);

    const exportData = {
        exportDate: new Date().toISOString(),
        user: {
            email: user.email,
            profile: user.profile,
            preferences: user.preferences,
            notifications: user.notifications,
            consent: user.consent,
            createdAt: user.createdAt,
        },
        workLogs,
        projects,
        goals,
        checkIns,
    };

    res.status(200).json({
        success: true,
        message: 'Dati esportati con successo',
        data: exportData,
    });
});

/**
 * DELETE /api/settings/account
 * Elimina account utente (GDPR compliance)
 */
const deleteAccount = asyncHandler(async (req, res) => {
    const { password, confirmation } = req.body;

    if (confirmation !== 'ELIMINA IL MIO ACCOUNT') {
        throw new AppError(
            'Per confermare, scrivi "ELIMINA IL MIO ACCOUNT"',
            400,
            'CONFIRMATION_REQUIRED'
        );
    }

    // Verifica password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        throw new AppError('Password non corretta', 401, 'INVALID_PASSWORD');
    }

    // Elimina tutti i dati dell'utente
    const WorkLog = require('../models/WorkLog');
    const Project = require('../models/Project');
    const Goal = require('../models/Goal');
    const CheckIn = require('../models/CheckIn');

    await Promise.all([
        WorkLog.deleteMany({ user: req.user.id }),
        Project.deleteMany({ user: req.user.id }),
        Goal.deleteMany({ user: req.user.id }),
        CheckIn.deleteMany({ user: req.user.id }),
        User.findByIdAndDelete(req.user.id),
    ]);

    res.status(200).json({
        success: true,
        message: 'Account e tutti i dati eliminati con successo',
    });
});

module.exports = {
    getProfile,
    updateProfile,
    getPreferences,
    updatePreferences,
    getNotifications,
    updateNotifications,
    getAllSettings,
    exportData,
    deleteAccount,
};
