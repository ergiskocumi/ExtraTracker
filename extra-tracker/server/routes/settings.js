/**
 * 🛤️ ROUTES IMPOSTAZIONI UTENTE
 *
 * Solo lettura impostazioni e aggiornamento preferenze (cambio tema).
 * GET /api/settings              - Ottieni tutte le impostazioni
 * PUT /api/settings/preferences  - Aggiorna preferenze
 */

const express = require('express');
const router = express.Router();

// Controllers
const settingsController = require('../controllers/settingsController');

// Middleware
const { requireAuth } = require('../middleware/auth');

// Validators
const { validateMiddleware } = require('../validators/validate');
const { updatePreferencesSchema } = require('../validators/settingsValidators');

// Tutte le route richiedono autenticazione
router.use(requireAuth);

/**
 * @route   GET /api/settings
 * @desc    Ottieni tutte le impostazioni utente
 * @access  Private
 */
router.get('/', settingsController.getAllSettings);

/**
 * @route   PUT /api/settings/preferences
 * @desc    Aggiorna preferenze utente
 * @access  Private
 */
router.put('/preferences', validateMiddleware(updatePreferencesSchema), settingsController.updatePreferences);

module.exports = router;
