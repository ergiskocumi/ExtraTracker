/**
 * 🛤️ ROUTES AUTENTICAZIONE
 * 
 * Struttura RESTful:
 * POST   /api/auth/register  - Registrazione
 * POST   /api/auth/login     - Login
 * POST   /api/auth/logout    - Logout
 * POST   /api/auth/refresh   - Rinnova token
 * GET    /api/auth/me        - Profilo utente
 * PUT    /api/auth/password  - Cambia password
 * GET    /api/auth/check     - Verifica autenticazione
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Validators
const { 
    validateMiddleware, 
    registerSchema, 
    loginSchema,
    changePasswordSchema,
    resetPasswordRequestSchema,
    resetPasswordConfirmSchema,
} = require('../validators/authValidators');

// ==========================================
// PUBLIC ROUTES (no auth required)
// ==========================================

/**
 * @route   POST /api/auth/register
 * @desc    Registra nuovo utente
 * @access  Public
 */
router.post(
    '/register',
    authLimiter,                          // Rate limit anti-brute force
    validateMiddleware(registerSchema),   // Validazione Zod
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login utente
 * @access  Public
 */
router.post(
    '/login',
    authLimiter,                        // Rate limit anti-brute force
    validateMiddleware(loginSchema),    // Validazione Zod
    authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Rinnova access token
 * @access  Public (richiede refresh token cookie)
 * @security Protetto con rate limiting per evitare token refresh attacks
 */
router.post(
    '/refresh',
    authLimiter,                   // Rate limit anti-brute force
    authController.refresh
);

// ==========================================
// PROTECTED ROUTES (auth required)
// ==========================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout utente
 * @access  Private
 */
router.post(
    '/logout',
    optionalAuth,  // Opzionale perché vogliamo cancellare i cookie anche se token scaduto
    authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Ottieni profilo utente corrente
 * @access  Private
 */
router.get(
    '/me',
    requireAuth,
    authController.getProfile
);

/**
 * @route   PUT /api/auth/password
 * @desc    Cambia password
 * @access  Private
 */
router.put(
    '/password',
    requireAuth,
    validateMiddleware(changePasswordSchema),
    authController.changePassword
);

/**
 * @route   GET /api/auth/check
 * @desc    Verifica se utente è autenticato
 * @access  Private
 */
router.get(
    '/check',
    requireAuth,
    authController.checkAuth
);

// ==========================================
// EMAIL VERIFICATION ROUTES
// ==========================================

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verifica indirizzo email con token
 * @access  Public
 */
router.post(
    '/verify-email',
    authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Reinvia email di verifica
 * @access  Private
 */
router.post(
    '/resend-verification',
    requireAuth,
    authController.resendVerification
);

// ==========================================
// PASSWORD RESET ROUTES
// ==========================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Richiedi reset password (invia email)
 * @access  Public
 */
router.post(
    '/forgot-password',
    authLimiter, // Rate limit per prevenire spam
    validateMiddleware(resetPasswordRequestSchema),
    authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Completa reset password con nuovo password
 * @access  Public
 */
router.post(
    '/reset-password',
    authLimiter,
    validateMiddleware(resetPasswordConfirmSchema),
    authController.resetPassword
);

module.exports = router;
