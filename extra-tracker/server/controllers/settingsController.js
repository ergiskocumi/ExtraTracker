/**
 * ⚙️ CONTROLLER IMPOSTAZIONI UTENTE
 *
 * Espone solo la lettura delle impostazioni e l'aggiornamento delle
 * preferenze (usato dal cambio tema nell'header). Nessuna UI di gestione
 * dedicata: SettingsContext lo consuma come provider silenzioso.
 */

const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');
const { decryptFields } = require('../utils/encryption');

const PROFILE_SENSITIVE_FIELDS = ['phone', 'bio', 'company', 'jobTitle', 'location', 'website'];

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

/**
 * PUT /api/settings/preferences
 * Aggiorna preferenze utente (es. cambio tema)
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

module.exports = {
    getAllSettings,
    updatePreferences,
};
