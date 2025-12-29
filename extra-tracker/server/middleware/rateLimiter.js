/**
 * 🚦 RATE LIMITER MIDDLEWARE
 * 
 * Protegge contro:
 * - Brute Force attacks
 * - DDoS (parzialmente)
 * - Enumeration attacks
 */

const rateLimit = require('express-rate-limit');
const securityConfig = require('../config/security');

/**
 * Rate limiter generale per tutte le API
 * 100 richieste per 15 minuti per IP
 */
const generalLimiter = rateLimit({
    ...securityConfig.rateLimit.general,
    // Handler custom per errore
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppe richieste. Riprova tra qualche minuto.',
                code: 'TOO_MANY_REQUESTS',
            },
        });
    },
});

/**
 * Rate limiter stringente per autenticazione
 * Solo 5 tentativi per 15 minuti per IP
 */
const authLimiter = rateLimit({
    ...securityConfig.rateLimit.auth,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppi tentativi di accesso. Account temporaneamente bloccato.',
                code: 'TOO_MANY_ATTEMPTS',
                retryAfter: 15 * 60, // secondi
            },
        });
    },
});

/**
 * Rate limiter per reset password
 * Evita email bombing
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 3, // solo 3 richieste per ora
    message: {
        success: false,
        error: {
            message: 'Troppi tentativi di reset password. Riprova tra un\'ora.',
            code: 'TOO_MANY_RESET_ATTEMPTS',
        },
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
};
