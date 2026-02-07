/**
 * CONTROLLER AUTENTICAZIONE - Enhanced Security Version
 * 
 * Aggiornamenti:
 * - Audit logging integrato
 * - Device fingerprinting
 * - Enhanced JWT claims
 */

const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { getDeviceInfo, generateDeviceFingerprint } = require('../services/authService');
const securityConfig = require('../config/security');
const { setCsrfCookie } = require('../middleware/csrf');
const { asyncHandler } = require('../middleware/errorHandler');
const { emailService, generateToken, hashToken } = require('../services/emailService');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const logger = require('../utils/logger');

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Helper per impostare i cookie di autenticazione
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie(
        securityConfig.cookie.name,
        accessToken,
        securityConfig.cookie.options
    );

    res.cookie(
        securityConfig.cookie.refreshName,
        refreshToken,
        securityConfig.cookie.refreshOptions
    );
};

/**
 * Helper per cancellare i cookie di autenticazione
 */
const clearAuthCookies = (res) => {
    res.clearCookie(securityConfig.cookie.name, {
        httpOnly: true,
        secure: securityConfig.cookie.options.secure,
        sameSite: securityConfig.cookie.options.sameSite,
        path: '/',
    });
    
    res.clearCookie(securityConfig.cookie.refreshName, {
        httpOnly: true,
        secure: securityConfig.cookie.refreshOptions.secure,
        sameSite: securityConfig.cookie.refreshOptions.sameSite,
        path: '/api/auth/refresh',
    });
};

// ==========================================
// CONTROLLER METHODS
// ==========================================

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const deviceInfo = getDeviceInfo(req);
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    const { user, accessToken, refreshToken } = await authService.register(
        req.body, 
        deviceInfo,
        req
    );

    // Genera token di verifica email
    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    
    await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpires,
    });

    // Invia email di verifica
    emailService.sendVerificationEmail(user.email, verificationToken)
        .catch(err => {
            logger.error('AuthController', 'Invio email verifica fallito', {
                userId: user._id.toString(),
                error: err.message
            });
        });

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
        success: true,
        message: 'Registrazione completata con successo. Controlla la tua email per verificare l\'account.',
        data: {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
        },
    });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const deviceInfo = getDeviceInfo(req);
    const { twoFactorCode } = req.body;

    try {
        const { user, accessToken, refreshToken } = await authService.login(
            req.body,
            deviceInfo,
            req
        );

        // Se 2FA richiesto, genera temp token
        if (user.twoFactorEnabled && !twoFactorCode) {
            const tempToken = authService.generateAccessToken(user, { 
                type: 'temp',
                expiresIn: '5m'
            });

            return res.status(200).json({
                success: true,
                requiresTwoFactor: true,
                message: 'Inserisci il codice 2FA',
                data: {
                    tempToken,
                },
            });
        }

        setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login effettuato con successo',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    twoFactorEnabled: user.twoFactorEnabled,
                },
            },
        });
    } catch (error) {
        // Audit login failure è già fatto nel service
        throw error;
    }
});

/**
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies?.[securityConfig.cookie.refreshName];

    if (!refreshToken) {
        return next(new AppError('Sessione scaduta, effettua nuovamente il login', 401));
    }

    const deviceInfo = getDeviceInfo(req);
    const { accessToken, refreshToken: newRefreshToken } = 
        await authService.refreshAccessToken(refreshToken, deviceInfo);

    setAuthCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
        success: true,
        message: 'Token rinnovato',
    });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    if (req.user?.id) {
        const refreshToken = req.cookies?.[securityConfig.cookie.refreshName];
        const accessToken = req.cookies?.[securityConfig.cookie.name];
        
        await authService.logout(req.user.id, refreshToken || null, accessToken || null, req);
    }

    clearAuthCookies(res);

    res.status(200).json({
        success: true,
        message: 'Logout effettuato con successo',
    });
});

/**
 * GET /api/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                twoFactorEnabled: user.twoFactorEnabled,
                createdAt: user.createdAt,
            },
        },
    });
});

/**
 * PUT /api/auth/password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword, req);

    clearAuthCookies(res);

    res.status(200).json({
        success: true,
        message: 'Password aggiornata. Effettua nuovamente il login.',
    });
});

/**
 * GET /api/auth/check
 */
const checkAuth = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            isAuthenticated: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
        },
    });
});

/**
 * GET /api/auth/csrf
 */
const getCsrfToken = asyncHandler(async (req, res) => {
    const csrfToken = req.csrfToken || setCsrfCookie(res);

    res.status(200).json({
        success: true,
        data: {
            csrfToken,
        },
    });
});

// ==========================================
// VERIFICA EMAIL
// ==========================================

const verifyEmail = asyncHandler(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return next(new AppError('Token di verifica mancante', 400));
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Token non valido o scaduto',
                code: 'INVALID_TOKEN',
            },
        });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Audit log
    await auditService.log({
        userId: user._id,
        userEmail: user.email,
        action: 'EMAIL_VERIFIED',
        description: 'Email verificata con successo',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
    });

    res.status(200).json({
        success: true,
        message: 'Email verificata con successo!',
    });
});

const resendVerification = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Devi essere autenticato',
                code: 'UNAUTHORIZED',
            },
        });
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: {
                message: 'Utente non trovato',
                code: 'USER_NOT_FOUND',
            },
        });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Email già verificata',
                code: 'ALREADY_VERIFIED',
            },
        });
    }

    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await User.findByIdAndUpdate(userId, {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpires,
    });

    await emailService.sendVerificationEmail(user.email, verificationToken);

    res.status(200).json({
        success: true,
        message: 'Email di verifica inviata',
    });
});

// ==========================================
// RESET PASSWORD
// ==========================================

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Email obbligatoria',
                code: 'MISSING_EMAIL',
            },
        });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'Se l\'email è registrata, riceverai le istruzioni per il reset.',
        });
    }

    const resetToken = generateToken();
    const hashedToken = hashToken(resetToken);

    await User.findByIdAndUpdate(user._id, {
        passwordResetToken: hashedToken,
        passwordResetExpires: Date.now() + 60 * 60 * 1000,
    });

    try {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
        await User.findByIdAndUpdate(user._id, {
            $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
        });
        throw error;
    }

    // Audit log
    await auditService.log({
        userId: user._id,
        userEmail: user.email,
        action: 'PASSWORD_RESET_REQUEST',
        description: 'Richiesta reset password',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
    });

    res.status(200).json({
        success: true,
        message: 'Se l\'email è registrata, riceverai le istruzioni per il reset.',
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const hashedToken = hashToken(token);

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Token non valido o scaduto. Richiedi un nuovo reset.',
                code: 'INVALID_TOKEN',
            },
        });
    }

    // Hash nuova password
    const hashedPassword = await authService.hashPassword(newPassword);
    
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined;
    await user.save();

    // Audit log
    await auditService.log({
        userId: user._id,
        userEmail: user.email,
        action: 'PASSWORD_RESET_COMPLETE',
        description: 'Password resettata con successo',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        severity: 'HIGH',
    });

    // Invia email di conferma
    emailService.sendPasswordChangedEmail(user.email)
        .catch(err => console.error('Errore invio email conferma:', err));

    res.status(200).json({
        success: true,
        message: 'Password aggiornata con successo. Puoi effettuare il login.',
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    getProfile,
    changePassword,
    checkAuth,
    getCsrfToken,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
};
