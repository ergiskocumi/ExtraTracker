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
const { exportUserData, importUserData } = require('../services/dataExportImportService');
const authService = require('../services/authService');
const { encryptFields, decryptFields } = require('../utils/encryption');

const PROFILE_SENSITIVE_FIELDS = ['phone', 'bio', 'company', 'jobTitle', 'location', 'website'];

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
            profile: decryptFields(
                user.profile?.toObject?.() || user.profile || {},
                PROFILE_SENSITIVE_FIELDS
            ),
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
    const encryptedBody = encryptFields(req.body || {}, PROFILE_SENSITIVE_FIELDS);
    const updates = {};
    for (const field of allowedFields) {
        if (encryptedBody[field] !== undefined) {
            updates[`profile.${field}`] = encryptedBody[field];
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
            profile: decryptFields(
                user.profile?.toObject?.() || user.profile || {},
                PROFILE_SENSITIVE_FIELDS
            ),
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
            profile: decryptFields(
                user.profile?.toObject?.() || user.profile || {},
                PROFILE_SENSITIVE_FIELDS
            ),
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
 * Esporta tutti i dati "lavoro" dell'utente (GDPR compliance)
 * NON include: email, password, tokens (solo dati lavoro)
 */
const exportData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Usa il service per esportare solo dati "lavoro"
    const exportData = await exportUserData(req.user.id);

    // Imposta header per download file JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="extra-tracker-export-${new Date().toISOString().split('T')[0]}.json"`);

    res.status(200).json(exportData);
});

/**
 * POST /api/settings/import/check
 * Verifica i dati da importare senza importarli
 * Restituisce confronto con dati esistenti
 */
const checkImportData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    const importData = req.body;

    if (!importData) {
        throw new AppError('Dati di import non forniti', 400, 'MISSING_DATA');
    }

    const { compareImportData } = require('../services/dataExportImportService');
    const comparison = await compareImportData(req.user.id, importData);

    res.status(200).json({
        success: true,
        data: comparison,
    });
});

/**
 * POST /api/settings/import
 * Importa dati utente da file JSON
 * Valida e importa in modo sicuro (non permette modifiche a dati sensibili)
 */
const importData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    const importData = req.body.data || req.body;
    const force = req.body.force || false; // Se true, ignora warning

    if (!importData) {
        throw new AppError('Dati di import non forniti', 400, 'MISSING_DATA');
    }

    try {
        // Importa i dati usando il service
        const result = await importUserData(req.user.id, importData, {
            merge: req.body.merge || false,
            force: force,
        });

        res.status(200).json({
            success: true,
            message: 'Dati importati con successo',
            data: result,
        });
    } catch (error) {
        // Se è un errore di dati identici o minori, restituisci info dettagliate
        if (error.code === 'IDENTICAL_DATA' || error.code === 'LESS_DATA_WARNING') {
            const { compareImportData } = require('../services/dataExportImportService');
            const comparison = await compareImportData(req.user.id, importData);
            
            res.status(400).json({
                success: false,
                error: {
                    message: error.message,
                    code: error.code,
                },
                data: {
                    comparison,
                    requiresConfirmation: error.code === 'LESS_DATA_WARNING',
                },
            });
            return;
        }
        
        // Rilancia altri errori
        throw error;
    }
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

    const isValidPassword = await authService.verifyPassword(user.password, password);

    if (!isValidPassword) {
        throw new AppError('Password non corretta', 401, 'INVALID_PASSWORD');
    }

    // Elimina tutti i dati dell'utente
    const WorkLog = require('../models/WorkLog');
    const Exam = require('../models/Exam');
    const Deck = require('../models/Deck');
    const Folder = require('../models/Folder');
    const Tag = require('../models/Tag');
    const WorkTodo = require('../models/WorkTodo');
    const Feedback = require('../models/Feedback');

    await Promise.all([
        WorkLog.deleteMany({ user: req.user.id }),
        Exam.deleteMany({ user: req.user.id }),
        Deck.deleteMany({ user: req.user.id }),
        Folder.deleteMany({ user: req.user.id }),
        Tag.deleteMany({ user: req.user.id }),
        WorkTodo.deleteMany({ user: req.user.id }),
        Feedback.deleteMany({ user: req.user.id }),
        User.findByIdAndDelete(req.user.id),
    ]);

    res.status(200).json({
        success: true,
        message: 'Account e tutti i dati eliminati con successo',
    });
});

// ==========================================
// AVATAR
// ==========================================

const path = require('path');
const fs = require('fs').promises;

/**
 * POST /api/settings/avatar
 * Upload avatar utente
 */
const uploadAvatar = asyncHandler(async (req, res) => {
    // req.file è popolato da multer middleware
    if (!req.file) {
        throw new AppError('Nessun file caricato', 400, 'NO_FILE');
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
        // Elimina il file caricato se l'utente non esiste
        await fs.unlink(req.file.path).catch(() => {});
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Elimina avatar precedente se esiste
    if (user.profile?.avatar) {
        const oldAvatarPath = path.join(__dirname, '..', 'uploads', 'avatars', path.basename(user.profile.avatar));
        await fs.unlink(oldAvatarPath).catch(() => {});
    }

    // Costruisci URL dell'avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Aggiorna il profilo utente
    user.profile = user.profile || {};
    user.profile.avatar = avatarUrl;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Avatar caricato con successo',
        data: { avatarUrl },
    });
});

/**
 * DELETE /api/settings/avatar
 * Elimina avatar utente
 */
const deleteAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError('Utente non trovato', 404, 'USER_NOT_FOUND');
    }

    // Se c'è un avatar, elimina il file
    if (user.profile?.avatar) {
        const avatarPath = path.join(__dirname, '..', 'uploads', 'avatars', path.basename(user.profile.avatar));
        await fs.unlink(avatarPath).catch(() => {});
        
        // Rimuovi il riferimento dal profilo
        user.profile.avatar = undefined;
        await user.save();
    }

    res.status(200).json({
        success: true,
        message: 'Avatar eliminato con successo',
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
    checkImportData,
    importData,
    deleteAccount,
    uploadAvatar,
    deleteAvatar,
};
