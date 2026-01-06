/**
 * 🚦 RATE LIMITER MIDDLEWARE
 * 
 * Protegge contro:
 * - Brute Force attacks
 * - DDoS (parzialmente)
 * - Enumeration attacks
 * 
 * 🎯 SCALABILITÀ DISTRIBUITA:
 * - Usa Redis per rate limiting condiviso tra tutte le istanze
 * - Fallback a memoria locale se Redis non disponibile
 * - Funziona in cluster, Kubernetes, multiple istanze
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const securityConfig = require('../config/security');
const { getRedisAvailable, getRedisClient } = require('../config/redis');

const getClientIpForRateLimit = (req) => {
    // In dev, when requests are proxied (e.g., Vite), the backend sees the proxy as localhost.
    // Accept X-Forwarded-For only when the direct peer is loopback to avoid header spoofing.
    const remoteAddress = req?.socket?.remoteAddress;
    const isLoopback =
        remoteAddress === '127.0.0.1' ||
        remoteAddress === '::1' ||
        remoteAddress === '::ffff:127.0.0.1';

    const xForwardedFor = req.headers['x-forwarded-for'];
    if (isLoopback && typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
        // XFF can be a list: client, proxy1, proxy2...
        return xForwardedFor.split(',')[0].trim();
    }

    return req.ip;
};

/**
 * Crea store per rate limiter (Redis se disponibile, altrimenti memoria locale)
 * @returns {object|undefined} - Store config o undefined per memoria locale
 */
const createRateLimitStore = () => {
    if (getRedisAvailable()) {
        const redisClient = getRedisClient();
        if (redisClient) {
            console.log('✅ Rate limiter usando Redis (distribuito)');
            return new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
                prefix: 'rl:', // Prefix per chiavi Redis (rate-limit)
            });
        }
    }
    
    // Fallback a memoria locale
    console.log('⚠️  Rate limiter usando memoria locale (non distribuito)');
    return undefined; // undefined = usa memoria locale di default
};

/**
 * Rate limiter generale per tutte le API
 * 200 richieste per 15 minuti per IP
 * Usa Redis se disponibile (distribuito), altrimenti memoria locale
 */
const generalLimiter = rateLimit({
    ...securityConfig.rateLimit.general,
    store: createRateLimitStore(), // Redis se disponibile, altrimenti memoria locale
    keyGenerator: (req) => getClientIpForRateLimit(req),
    // In dev (Vite/HMR + React StrictMode) the frontend can trigger many session checks.
    // This endpoint is low-risk (requires auth) and should not be rate-limited like write endpoints.
    skip: (req) => {
        const url = req.originalUrl || '';
        return req.method === 'GET' && url.startsWith('/api/auth/check');
    },
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
 * 15 tentativi per 15 minuti per IP
 * Usa Redis se disponibile (distribuito), altrimenti memoria locale
 */
const authLimiter = rateLimit({
    ...securityConfig.rateLimit.auth,
    store: createRateLimitStore(), // Redis se disponibile, altrimenti memoria locale
    keyGenerator: (req) => getClientIpForRateLimit(req),
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
 * Usa Redis se disponibile (distribuito), altrimenti memoria locale
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 3, // solo 3 richieste per ora
    store: createRateLimitStore(), // Redis se disponibile, altrimenti memoria locale
    keyGenerator: (req) => getClientIpForRateLimit(req),
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppi tentativi di reset password. Riprova tra un\'ora.',
                code: 'TOO_MANY_RESET_ATTEMPTS',
            },
        });
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
};
