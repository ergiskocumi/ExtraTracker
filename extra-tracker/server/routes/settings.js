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

// ==========================================
// AVATAR
// ==========================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Assicurati che la cartella esista
const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
    fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// Configurazione multer per avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato file non supportato. Usa JPG, PNG, WebP o GIF.'), false);
        }
    },
});

/**
 * @route   POST /api/settings/avatar
 * @desc    Upload avatar utente
 * @access  Private
 */
router.post('/avatar', avatarUpload.single('avatar'), settingsController.uploadAvatar);

/**
 * @route   DELETE /api/settings/avatar
 * @desc    Elimina avatar utente
 * @access  Private
 */
router.delete('/avatar', settingsController.deleteAvatar);

module.exports = router;
