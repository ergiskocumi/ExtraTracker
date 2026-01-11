/**
 * 📝 REQUEST LOGGER MIDDLEWARE
 * ============================
 * 
 * Logga tutte le richieste HTTP con informazioni strutturate.
 */

const logger = require('../utils/logger');

/**
 * Middleware per loggare le richieste HTTP
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path || req.url;
    const userId = req.user?.id || req.tenantScope?.userId?.toString() || null;

    // Log della richiesta in arrivo
    logger.debug('HTTP', `${method} ${path}`, { userId, ip: req.ip });

    // Intercetta la risposta per loggare il risultato
    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Log solo se non è una richiesta di asset statici o health check
        if (!path.includes('/assets/') && path !== '/health' && path !== '/favicon.ico') {
            logger.request(method, path, userId, statusCode, duration);
        }
        
        return originalSend.call(this, body);
    };

    next();
};

module.exports = requestLogger;
