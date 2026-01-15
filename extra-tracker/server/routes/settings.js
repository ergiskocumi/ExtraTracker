/**
 * 🛤️ ROUTES IMPOSTAZIONI UTENTE
 * 
 * Struttura RESTful:
 * GET    /api/settings              - Ottieni tutte le impostazioni
 * GET    /api/settings/profile      - Ottieni profilo
 * PUT    /api/settings/profile      - Aggiorna profilo
 * GET    /api/settings/preferences  - Ottieni preferenze
 * PUT    /api/settings/preferences  - Aggiorna preferenze
 * GET    /api/settings/notifications - Ottieni preferenze notifiche
 * PUT    /api/settings/notifications - Aggiorna preferenze notifiche
 * GET    /api/settings/export       - Esporta dati (GDPR)
 * DELETE /api/settings/account      - Elimina account (GDPR)
 */

const express = require('express');
const router = express.Router();

// Controllers
const settingsController = require('../controllers/settingsController');

// Middleware
const { requireAuth } = require('../middleware/auth');
const { largeBodyParser } = require('../middleware/largeBodyParser');

// Tutte le route richiedono autenticazione
router.use(requireAuth);

// ==========================================
// IMPOSTAZIONI COMPLETE
// ==========================================

/**
 * @route   GET /api/settings
 * @desc    Ottieni tutte le impostazioni utente
 * @access  Private
 */
router.get('/', settingsController.getAllSettings);

// ==========================================
// PROFILO
// ==========================================

/**
 * @route   GET /api/settings/profile
 * @desc    Ottieni profilo utente
 * @access  Private
 */
router.get('/profile', settingsController.getProfile);

/**
 * @route   PUT /api/settings/profile
 * @desc    Aggiorna profilo utente
 * @access  Private
 */
router.put('/profile', settingsController.updateProfile);

// ==========================================
// PREFERENZE
// ==========================================

/**
 * @route   GET /api/settings/preferences
 * @desc    Ottieni preferenze utente
 * @access  Private
 */
router.get('/preferences', settingsController.getPreferences);

/**
 * @route   PUT /api/settings/preferences
 * @desc    Aggiorna preferenze utente
 * @access  Private
 */
router.put('/preferences', settingsController.updatePreferences);

// ==========================================
// NOTIFICHE
// ==========================================

/**
 * @route   GET /api/settings/notifications
 * @desc    Ottieni preferenze notifiche
 * @access  Private
 */
router.get('/notifications', settingsController.getNotifications);

/**
 * @route   PUT /api/settings/notifications
 * @desc    Aggiorna preferenze notifiche
 * @access  Private
 */
router.put('/notifications', settingsController.updateNotifications);

// ==========================================
// GDPR
// ==========================================

/**
 * @route   GET /api/settings/export
 * @desc    Esporta tutti i dati "lavoro" utente (GDPR)
 * @access  Private
 */
router.get('/export', settingsController.exportData);

/**
 * @route   POST /api/settings/import/check
 * @desc    Verifica dati da importare senza importarli (confronto)
 * @access  Private
 */
router.post('/import/check', largeBodyParser('50mb'), settingsController.checkImportData);

/**
 * @route   POST /api/settings/import
 * @desc    Importa dati utente da file JSON (validato e sicuro)
 * @access  Private
 */
router.post('/import', largeBodyParser('50mb'), settingsController.importData);

/**
 * @route   DELETE /api/settings/account
 * @desc    Elimina account e tutti i dati (GDPR)
 * @access  Private
 */
router.delete('/account', settingsController.deleteAccount);

module.exports = router;
