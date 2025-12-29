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

    // Imposta cookies sicuri
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
        success: true,
        message: 'Registrazione completata con successo',
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

module.exports = {
    register,
    login,
    refresh,
    logout,
    getProfile,
    changePassword,
    checkAuth,
};
