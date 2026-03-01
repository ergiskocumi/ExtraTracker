/**
 * 📝 REQUEST LOGGER MIDDLEWARE
 * ============================
 *
 * Logga le richieste HTTP con informazioni strutturate.
 * Esclude endpoint rumorosi o non informativi (auth check, health, asset).
 */

const logger = require('../utils/logger');

/** Path da non loggare (chiamate frequenti o non informative) */
const SKIP_LOG_PATHS = [
    '/health',
    '/favicon.ico',
    '/api/auth/check', // 401 atteso quando non loggato; evita log inutili
];

const shouldSkipLog = (path) => {
    if (path.includes('/assets/')) return true;
    return SKIP_LOG_PATHS.some((p) => path === p || path.startsWith(p + '?'));
};

/**
 * Middleware per loggare le richieste HTTP
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path || req.url;
    const userId = req.user?.id || req.tenantScope?.userId?.toString() || null;
    const skip = shouldSkipLog(path);

    if (!skip) {
        logger.debug('HTTP', `${method} ${path}`, { userId, ip: req.ip });
    }

    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        if (!skip && !path.includes('/assets/') && path !== '/health' && path !== '/favicon.ico') {
            logger.request(method, path, userId, statusCode, duration);
        }

        return originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
