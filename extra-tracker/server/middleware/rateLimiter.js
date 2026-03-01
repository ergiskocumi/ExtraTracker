/**
 * 🚦 RATE LIMITER MIDDLEWARE - Sistema Intelligente di Rate Limiting
 * 
 * Questo sistema applica rate limiting selettivo:
 * - 🔴 AI Rate Limiter: Molto restrittivo per chiamate AI (costi elevati)
 * - 🔐 Auth Rate Limiter: Previene brute force attacks
 * - ⚠️ General Rate Limiter: Opzionale, molto permissivo (disabilitato di default)
 * 
 * 🎯 FILOSOFIA:
 * - Gli utenti normali devono poter usare l'app liberamente
 * - Solo le chiamate AI e autenticazione necessitano rate limiting severo
 * - Rate limiting basato su userId per utenti autenticati (più equo)
 * - Rate limiting basato su IP per autenticazione (previene attacchi)
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

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Estrae l'IP del client per rate limiting
 * 
 * Con trust proxy configurato, req.ip è già corretto (gestisce automaticamente X-Forwarded-For)
 * Questa funzione è mantenuta per compatibilità e come fallback
 * 
 * @param {object} req - Express request object
 * @returns {string} - IP address del client
 */
const getClientIpForRateLimit = (req) => {
    // Con trust proxy configurato, req.ip è già corretto
    // Express gestisce automaticamente X-Forwarded-For quando trust proxy è attivo
    if (req.ip && req.ip !== '::ffff:127.0.0.1' && req.ip !== '127.0.0.1' && req.ip !== '::1') {
        return req.ip;
    }

    // Fallback per casi edge (sviluppo locale senza proxy)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
        // XFF può essere una lista: client, proxy1, proxy2...
        return xForwardedFor.split(',')[0].trim();
    }

    // Ultimo fallback
    return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * Estrae l'ID utente dalla richiesta per rate limiting basato su utente
 * 
 * @param {object} req - Express request object
 * @returns {string} - User ID o 'anonymous' se non autenticato
 */
const getUserIdForRateLimit = (req) => {
    // Prova a ottenere userId da tenantScope (sistema multi-tenant)
    if (req.tenantScope?.userId) {
        return `user:${req.tenantScope.userId}`;
    }
    
    // Fallback a user ID diretto se presente
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }
    
    // Se non autenticato, usa IP come fallback
    return getClientIpForRateLimit(req);
};

/**
 * Store condiviso per tutti i rate limiter (evita log duplicati e riuso Redis)
 * Inizializzato una sola volta al caricamento del modulo.
 */
const sharedRateLimitStore = (() => {
    if (getRedisAvailable()) {
        const redisClient = getRedisClient();
        if (redisClient) {
            console.log('✅ Rate limiter usando Redis (distribuito)');
            return new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
                prefix: 'rl:',
            });
        }
    }
    console.log('⚠️  Rate limiter usando memoria locale (non distribuito)');
    return undefined;
})();

// ==========================================
// RATE LIMITERS
// ==========================================

/**
 * 🤖 AI RATE LIMITER
 * 
 * Rate limiter molto restrittivo per chiamate AI (costi elevati)
 * 
 * Caratteristiche:
 * - Limite: 10 chiamate per ora per utente
 * - Basato su userId (non IP) per essere equo tra utenti
 * - Previene abusi e costi eccessivi
 * 
 * Applicato a:
 * - /api/goals/suggest (generazione goal AI)
 * - /api/study/:id/generate-pdf (generazione flashcards da PDF)
 * - /api/study/:id/chat (chat con AI tutor)
 */
const aiLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.ai.windowMs,
    max: securityConfig.rateLimit.ai.max,
    store: sharedRateLimitStore,
    keyGenerator: (req) => {
        // Usa userId se disponibile, altrimenti IP
        return getUserIdForRateLimit(req);
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const windowMinutes = Math.floor(securityConfig.rateLimit.ai.windowMs / 60000);
        res.status(429).json({
            success: false,
            error: {
                message: `Hai raggiunto il limite di chiamate AI (${securityConfig.rateLimit.ai.max} per ${windowMinutes} minuti). Le chiamate AI sono costose e devono essere limitate. Riprova più tardi.`,
                code: 'AI_RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(securityConfig.rateLimit.ai.windowMs / 1000),
            },
        });
    },
    // Skip se non autenticato (dovrebbe essere gestito da auth middleware)
    skip: (req) => {
        // Se non c'è userId, probabilmente non è autenticato
        // In questo caso, l'auth middleware dovrebbe già aver bloccato la richiesta
        return !req.tenantScope?.userId && !req.user?.id;
    },
});

/**
 * 🔐 AUTH RATE LIMITER
 * 
 * Rate limiter stringente per autenticazione (previene brute force)
 * 
 * Caratteristiche:
 * - Limite: 15 tentativi per 15 minuti per IP
 * - Basato su IP (non userId) perché l'utente non è ancora autenticato
 * - Skip richieste di successo (non conta login riusciti)
 * 
 * Applicato a:
 * - /api/auth/login
 * - /api/auth/register
 * - /api/auth/forgot-password
 * - /api/auth/reset-password
 */
const authLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.auth.windowMs,
    max: securityConfig.rateLimit.auth.max,
    store: sharedRateLimitStore,
    keyGenerator: (req) => getClientIpForRateLimit(req),
    skipSuccessfulRequests: securityConfig.rateLimit.auth.skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const windowMinutes = Math.floor(securityConfig.rateLimit.auth.windowMs / 60000);
        res.status(429).json({
            success: false,
            error: {
                message: `Troppi tentativi di accesso. Account temporaneamente bloccato per ${windowMinutes} minuti.`,
                code: 'TOO_MANY_ATTEMPTS',
                retryAfter: Math.ceil(securityConfig.rateLimit.auth.windowMs / 1000),
            },
        });
    },
});

/**
 * ⚠️ GENERAL RATE LIMITER (Opzionale)
 * 
 * Rate limiter generale molto permissivo per tutte le API
 * 
 * Caratteristiche:
 * - Limite: 1000 richieste per 15 minuti per IP (molto permissivo)
 * - Disabilitato di default (enabled: false)
 * - Da usare solo se necessario per protezione DDoS
 * 
 * NOTA: Questo limiter è DISABILITATO di default perché:
 * - Gli utenti normali devono poter usare l'app liberamente
 * - Le chiamate AI hanno già il loro limiter specifico
 * - L'autenticazione ha già il suo limiter specifico
 * - 200 richieste per 15 minuti erano troppo poche per utenti normali
 */
const generalLimiter = securityConfig.rateLimit.general.enabled
    ? rateLimit({
          windowMs: securityConfig.rateLimit.general.windowMs,
          max: securityConfig.rateLimit.general.max,
          store: sharedRateLimitStore,
          keyGenerator: (req) => getClientIpForRateLimit(req),
          // Skip endpoint a basso rischio che vengono chiamati frequentemente
          skip: (req) => {
              const url = req.originalUrl || '';
              // Skip check auth (chiamato spesso da frontend)
              if (req.method === 'GET' && url.startsWith('/api/auth/check')) {
                  return true;
              }
              // Skip health check
              if (url === '/health') {
                  return true;
              }
              return false;
          },
          standardHeaders: true,
          legacyHeaders: false,
          handler: (req, res) => {
              res.status(429).json({
                  success: false,
                  error: {
                      message: 'Troppe richieste. Riprova tra qualche minuto.',
                      code: 'TOO_MANY_REQUESTS',
                  },
              });
          },
      })
    : null; // Se disabilitato, ritorna null

/**
 * 🔒 PASSWORD RESET RATE LIMITER
 * 
 * Rate limiter per reset password (previene email bombing)
 * 
 * Caratteristiche:
 * - Limite: 3 richieste per ora per IP
 * - Basato su IP (non userId) perché l'utente potrebbe non essere autenticato
 * 
 * Applicato a:
 * - /api/auth/forgot-password
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 3, // Solo 3 richieste per ora
    store: sharedRateLimitStore,
    keyGenerator: (req) => getClientIpForRateLimit(req),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppi tentativi di reset password. Riprova tra un\'ora.',
                code: 'TOO_MANY_RESET_ATTEMPTS',
                retryAfter: 3600, // 1 ora in secondi
            },
        });
    },
});

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    aiLimiter,
    authLimiter,
    generalLimiter,
    passwordResetLimiter,
};
