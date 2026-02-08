/**
 * 🔐 TWO FACTOR AUTHENTICATION CONTROLLER
 * 
 * Gestisce setup, verifica e gestione 2FA/TOTP
 */

const QRCode = require('qrcode');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/auth/2fa/setup
 * Inizia setup 2FA (genera secret e QR code)
 * Richiede autenticazione
 */
const setup2FA = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
        throw AppError.notFound('Utente');
    }

    if (user.twoFactorEnabled) {
        return res.status(400).json({
            success: false,
            error: {
                message: '2FA è già abilitato. Disabilitalo prima di configurarlo nuovamente.',
                code: '2FA_ALREADY_ENABLED',
            },
        });
    }

    const { secret, backupCodes } = authService.generateTwoFactorSecret();
    const otpauthUrl = authService.generateTotpUrl(secret, user.email);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = await authService.hashBackupCodes(backupCodes);
    await user.save();

    await auditService.log2FA({
        userId,
        userEmail: user.email,
        action: '2FA_SETUP',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
    });

    res.status(200).json({
        success: true,
        message: 'Scansiona il QR code con la tua app di autenticazione',
        data: {
            qrCode: qrCodeDataUrl,
            secret,
            backupCodes,
        },
    });
});

/**
 * POST /api/auth/2fa/verify-setup
 * Verifica codice 2FA e abilita 2FA
 */
const verifyAndEnable2FA = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
        throw AppError.badRequest('Codice 2FA obbligatorio');
    }

    const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user) {
        throw AppError.notFound('Utente');
    }

    if (!user.twoFactorSecret) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Setup 2FA non iniziato. Chiama /setup prima.',
                code: '2FA_SETUP_NOT_STARTED',
            },
        });
    }

    const isValid = authService.verifyTwoFactorCode(user.twoFactorSecret, code);

    if (!isValid) {
        await auditService.log2FA({
            userId,
            userEmail: user.email,
            action: '2FA_VERIFICATION',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: false,
            failureReason: 'Codice non valido durante setup',
        });

        return res.status(400).json({
            success: false,
            error: {
                message: 'Codice non valido. Riprova.',
                code: 'INVALID_2FA_CODE',
            },
        });
    }

    user.twoFactorEnabled = true;
    user.twoFactorSetupAt = new Date();
    await user.save();

    await auditService.log2FA({
        userId,
        userEmail: user.email,
        action: '2FA_ENABLED',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
    });

    logger.info('2FA Enabled', { userId, email: user.email });

    res.status(200).json({
        success: true,
        message: 'Autenticazione a due fattori abilitata con successo',
    });
});

/**
 * POST /api/auth/2fa/disable
 * Disabilita 2FA
 */
const disable2FA = asyncHandler(async (req, res) => {
    const { code, password } = req.body;
    const userId = req.user.id;

    if (!code || !password) {
        throw AppError.badRequest('Codice 2FA e password obbligatori');
    }

    const user = await User.findById(userId).select('+password +twoFactorSecret +twoFactorBackupCodes');

    if (!user) {
        throw AppError.notFound('Utente');
    }

    if (!user.twoFactorEnabled) {
        return res.status(400).json({
            success: false,
            error: {
                message: '2FA non è abilitato',
                code: '2FA_NOT_ENABLED',
            },
        });
    }

    const isValidPassword = await authService.verifyPassword(user.password, password);
    if (!isValidPassword) {
        await auditService.log2FA({
            userId,
            userEmail: user.email,
            action: '2FA_DISABLED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: false,
            failureReason: 'Password non corretta',
        });

        throw AppError.unauthorized('Password non corretta');
    }

    const isValidCode = authService.verifyTwoFactorCode(user.twoFactorSecret, code);
    let isBackupCode = false;

    if (!isValidCode) {
        isBackupCode = await authService.verifyBackupCode(code, user.twoFactorBackupCodes);
        
        if (!isBackupCode) {
            await auditService.log2FA({
                userId,
                userEmail: user.email,
                action: '2FA_DISABLED',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                success: false,
                failureReason: 'Codice 2FA non valido',
            });

            return res.status(400).json({
                success: false,
                error: {
                    message: 'Codice non valido',
                    code: 'INVALID_2FA_CODE',
                },
            });
        }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    user.twoFactorSetupAt = undefined;
    await user.save();

    await user.removeAllSessions();

    await auditService.log2FA({
        userId,
        userEmail: user.email,
        action: '2FA_DISABLED',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        metadata: {
            usedBackupCode: isBackupCode,
        },
    });

    logger.warn('2FA Disabled', { userId, email: user.email });

    res.status(200).json({
        success: true,
        message: 'Autenticazione a due fattori disabilitata',
    });
});

/**
 * GET /api/auth/2fa/status
 * Ottieni stato 2FA
 */
const get2FAStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+twoFactorEnabled twoFactorSetupAt');

    if (!user) {
        throw AppError.notFound('Utente');
    }

    res.status(200).json({
        success: true,
        data: {
            enabled: user.twoFactorEnabled,
            setupAt: user.twoFactorSetupAt,
        },
    });
});

module.exports = {
    setup2FA,
    verifyAndEnable2FA,
    disable2FA,
    get2FAStatus,
};
