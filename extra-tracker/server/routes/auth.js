/**
 * 🛤️ ROUTES AUTENTICAZIONE - Enhanced Security Version
 * 
 * Aggiunte:
 * - Routes 2FA
 * - Audit logging endpoints
 * - Device management
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const twoFactorController = require('../controllers/twoFactorController');
const auditController = require('../controllers/auditController');

// Middleware
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

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
// PUBLIC ROUTES
// ==========================================

router.post(
    '/register',
    authLimiter,
    validateMiddleware(registerSchema),
    authController.register
);

router.get('/csrf', authController.getCsrfToken);

router.post(
    '/login',
    authLimiter,
    validateMiddleware(loginSchema),
    authController.login
);

router.post('/refresh', authLimiter, authController.refresh);

// ==========================================
// 2FA ROUTES
// ==========================================

router.post(
    '/2fa/setup',
    requireAuth,
    twoFactorController.setup2FA
);

router.post(
    '/2fa/verify-setup',
    requireAuth,
    twoFactorController.verifyAndEnable2FA
);

router.post(
    '/2fa/disable',
    requireAuth,
    twoFactorController.disable2FA
);

router.get(
    '/2fa/status',
    requireAuth,
    twoFactorController.get2FAStatus
);

// ==========================================
// PROTECTED ROUTES
// ==========================================

router.post('/logout', optionalAuth, authController.logout);

router.get('/me', requireAuth, authController.getProfile);

router.put(
    '/password',
    requireAuth,
    validateMiddleware(changePasswordSchema),
    authController.changePassword
);

router.get('/check', requireAuth, authController.checkAuth);

// ==========================================
// EMAIL VERIFICATION
// ==========================================

router.post('/verify-email', authLimiter, authController.verifyEmail);

router.post(
    '/resend-verification',
    requireAuth,
    passwordResetLimiter,
    authController.resendVerification
);

// ==========================================
// PASSWORD RESET
// ==========================================

router.post(
    '/forgot-password',
    authLimiter,
    validateMiddleware(resetPasswordRequestSchema),
    authController.forgotPassword
);

router.post(
    '/reset-password',
    authLimiter,
    validateMiddleware(resetPasswordConfirmSchema),
    authController.resetPassword
);

// ==========================================
// AUDIT LOG ROUTES
// ==========================================

router.get(
    '/audit-logs',
    requireAuth,
    auditController.getUserAuditLogs
);

router.get(
    '/audit-logs/stats',
    requireAuth,
    auditController.getUserSecurityStats
);

// ==========================================
// DEVICE MANAGEMENT
// ==========================================

router.get(
    '/devices',
    requireAuth,
    auditController.getUserDevices
);

router.delete(
    '/devices/:fingerprint',
    requireAuth,
    auditController.revokeDevice
);

router.post(
    '/devices/:fingerprint/trust',
    requireAuth,
    auditController.trustDevice
);

module.exports = router;
