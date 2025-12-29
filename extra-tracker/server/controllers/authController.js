/**
 * 🎮 CONTROLLER AUTENTICAZIONE
 * 
 * Responsabilità:
 * 1. Gestire request/response HTTP
 * 2. Chiamare il service appropriato
 * 3. Impostare cookies sicuri
 * 4. Formattare risposte
 * 
 * NON contiene logica di business (quella è nel service)
 */

const authService = require('../services/authService');
const securityConfig = require('../config/security');
const { asyncHandler } = require('../middleware/errorHandler');
const { emailService, generateToken, hashToken } = require('../services/emailService');
const User = require('../models/User');

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Helper per impostare i cookie di autenticazione
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    // Access token cookie
    res.cookie(
        securityConfig.cookie.name,
        accessToken,
        securityConfig.cookie.options
    );

    // Refresh token cookie (path specifico!)
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
 * Registra un nuovo utente
 */
const register = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    // Genera token di verifica email
    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    
    // Salva token hashato nel DB
    await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpires,
    });

    // Invia email di verifica (non blocca la risposta)
    emailService.sendVerificationEmail(user.email, verificationToken)
        .catch(err => console.error('Errore invio email verifica:', err));

    // Imposta cookies sicuri
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
        success: true,
        message: 'Registrazione completata con successo. Controlla la tua email per verificare l\'account.',
        data: {
            user: {
                id: user._id,
                email: user.email,
            },
        },
    });
});

/**
 * POST /api/auth/login
 * Effettua il login
 */
const login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    // Imposta cookies sicuri
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
        success: true,
        message: 'Login effettuato con successo',
        data: {
            user: {
                id: user._id,
                email: user.email,
            },
        },
    });
});

/**
 * POST /api/auth/refresh
 * Rinnova l'access token usando il refresh token
 */
const refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[securityConfig.cookie.refreshName];

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Sessione scaduta, effettua nuovamente il login',
                code: 'NO_REFRESH_TOKEN',
            },
        });
    }

    const { accessToken, refreshToken: newRefreshToken } = 
        await authService.refreshAccessToken(refreshToken);

    // Ruota i token (refresh token rotation per sicurezza)
    setAuthCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
        success: true,
        message: 'Token rinnovato',
    });
});

/**
 * POST /api/auth/logout
 * Effettua il logout
 */
const logout = asyncHandler(async (req, res) => {
    // Invalida refresh token nel DB (se utente autenticato)
    if (req.user?.id) {
        await authService.logout(req.user.id);
    }

    // Cancella cookies
    clearAuthCookies(res);

    res.status(200).json({
        success: true,
        message: 'Logout effettuato con successo',
    });
});

/**
 * GET /api/auth/me
 * Ottieni profilo utente corrente
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt,
            },
        },
    });
});

/**
 * PUT /api/auth/password
 * Cambia password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    // Cancella tutti i cookie per forzare re-login
    clearAuthCookies(res);

    res.status(200).json({
        success: true,
        message: 'Password aggiornata. Effettua nuovamente il login.',
    });
});

/**
 * GET /api/auth/check
 * Verifica se l'utente è autenticato (per il frontend)
 */
const checkAuth = asyncHandler(async (req, res) => {
    // Se arriviamo qui, il middleware requireAuth ha già verificato il token
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            isAuthenticated: true,
            user: {
                id: user._id,
                email: user.email,
            },
        },
    });
});

// ==========================================
// VERIFICA EMAIL
// ==========================================

/**
 * POST /api/auth/verify-email
 * Verifica l'indirizzo email con il token
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Token di verifica mancante',
                code: 'MISSING_TOKEN',
            },
        });
    }

    // Hash del token per confronto
    const hashedToken = hashToken(token);

    // Trova utente con questo token
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

    // Aggiorna utente
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Email verificata con successo!',
    });
});

/**
 * POST /api/auth/resend-verification
 * Reinvia email di verifica
 */
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

    // Genera nuovo token
    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await User.findByIdAndUpdate(userId, {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpires,
    });

    // Invia email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    res.status(200).json({
        success: true,
        message: 'Email di verifica inviata',
    });
});

// ==========================================
// RESET PASSWORD
// ==========================================

/**
 * POST /api/auth/forgot-password
 * Richiedi reset password
 */
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

    // Cerca utente (non rivelare se esiste o meno per sicurezza)
    const user = await User.findOne({ email: email.toLowerCase() });

    // Rispondi sempre con successo per non rivelare se l'email esiste
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'Se l\'email è registrata, riceverai le istruzioni per il reset.',
        });
    }

    // Genera token con scadenza (1 ora)
    const resetToken = generateToken();
    const hashedToken = hashToken(resetToken);

    await User.findByIdAndUpdate(user._id, {
        passwordResetToken: hashedToken,
        passwordResetExpires: Date.now() + 60 * 60 * 1000, // 1 ora
    });

    // Invia email
    try {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
        // Se l'invio fallisce, pulisci il token
        await User.findByIdAndUpdate(user._id, {
            $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
        });
        throw error;
    }

    res.status(200).json({
        success: true,
        message: 'Se l\'email è registrata, riceverai le istruzioni per il reset.',
    });
});

/**
 * POST /api/auth/reset-password
 * Completa il reset password con nuovo password
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    // Hash del token
    const hashedToken = hashToken(token);

    // Trova utente con token valido e non scaduto
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

    // Aggiorna password
    user.password = await authService.hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined; // Invalida sessioni esistenti
    await user.save();

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
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
};
