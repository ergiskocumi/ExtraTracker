/**
 * CSRF PROTECTION (Double Submit Cookie)
 *
 * - Sets a CSRF cookie if missing
 * - Requires matching header for state-changing requests
 */

const crypto = require('crypto');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const tokenBytes = Number.isFinite(securityConfig.csrf.tokenBytes)
    ? securityConfig.csrf.tokenBytes
    : 32;

const generateToken = () => crypto.randomBytes(tokenBytes).toString('hex');

const setCsrfCookie = (res, token = null) => {
    const csrfToken = token || generateToken();
    res.cookie(
        securityConfig.csrf.cookieName,
        csrfToken,
        securityConfig.csrf.cookieOptions
    );
    return csrfToken;
};

const clearCsrfCookie = (res) => {
    res.clearCookie(securityConfig.csrf.cookieName, {
        httpOnly: securityConfig.csrf.cookieOptions.httpOnly,
        secure: securityConfig.csrf.cookieOptions.secure,
        sameSite: securityConfig.csrf.cookieOptions.sameSite,
        path: securityConfig.csrf.cookieOptions.path,
    });
};

const ensureCsrfCookie = (req, res, next) => {
    const existing = req.cookies?.[securityConfig.csrf.cookieName];
    if (existing) {
        req.csrfToken = existing;
        return next();
    }

    req.csrfToken = setCsrfCookie(res);
    return next();
};

const timingSafeEquals = (a, b) => {
    if (!a || !b) return false;
    const aBuf = Buffer.from(String(a));
    const bBuf = Buffer.from(String(b));
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
};

const requireCsrf = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const cookieToken = req.cookies?.[securityConfig.csrf.cookieName];
    const headerToken = req.get(securityConfig.csrf.headerName);

    if (!cookieToken || !headerToken) {
        return next(AppError.forbidden('CSRF token mancante'));
    }

    if (!timingSafeEquals(cookieToken, headerToken)) {
        return next(AppError.forbidden('CSRF token non valido'));
    }

    return next();
};

module.exports = {
    ensureCsrfCookie,
    requireCsrf,
    setCsrfCookie,
    clearCsrfCookie,
};
