/**
 * 🚨 ERROR HANDLER MIDDLEWARE - Sistema Centralizzato Avanzato
 * 
 * Gestisce TUTTI gli errori dell'applicazione
 * 
 * Principi:
 * 1. Mai esporre stack trace in produzione
 * 2. Loggare tutto internamente con context
 * 3. Messaggi utente-friendly al client
 * 4. Distinguere errori operazionali da bug
 * 5. Tracciamento errori per monitoring
 * 6. Request ID per correlazione log
 */

const AppError = require('../utils/AppError');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const ERROR_CATEGORIES = AppError.CATEGORIES;

/**
 * Genera Request ID se non presente
 * Usa crypto.randomUUID() (nativo Node.js 14.17.0+)
 */
const getRequestId = (req) => {
    if (!req.requestId) {
        // Usa header esistente o genera nuovo UUID
        req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    }
    return req.requestId;
};

/**
 * Gestione errori DB specifici per renderli leggibili
 */
const handleCastErrorDB = (err) => {
    const message = `Dato non valido: ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    // Estrae il valore tra virgolette dal messaggio di errore di Mongo
    const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || 'valore';
    const message = `Valore duplicato: ${value}. Per favore usa un altro valore.`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Dati non validi: ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Token non valido. Effettua nuovamente il login.', 401);

const handleJWTExpiredError = () =>
    new AppError('Il tuo token è scaduto. Effettua nuovamente il login.', 401);

/**
 * Risposta per l'ambiente di SVILUPPO
 * Mostra dettagli utili per debugging MA NON lo stack trace nella risposta HTTP
 * Lo stack trace è già nei log del server, non serve esporlo al frontend
 */
const sendErrorDev = (err, res, requestId = null) => {
    const response = {
        success: false,
        status: err.status || 'error',
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR',
            category: err.category,
        },
        message: err.message,
        // NON includere stack trace nella risposta HTTP
        // Lo stack trace è già loggato nel server per il developer
    };

    // Aggiungi dettagli se presenti
    if (err.details && Object.keys(err.details).length > 0) {
        response.error.details = err.details;
    }

    // Aggiungi suggerimento se presente
    if (err.suggestion) {
        response.error.suggestion = err.suggestion;
    }

    // Aggiungi request ID per tracciamento
    if (requestId) {
        response.error.requestId = requestId;
    }

    res.status(err.statusCode || 500).json(response);
};

/**
 * Risposta per l'ambiente di PRODUZIONE (Pulita per l'utente)
 * Mostra solo messaggi user-friendly, mai stack trace o dettagli tecnici
 */
const sendErrorProd = (err, res, requestId = null) => {
    // A) Errore Operazionale, fidato: manda il messaggio al client
    if (err.isOperational) {
        const response = {
            success: false,
            status: err.status || 'error',
            message: err.message,
            error: {
                code: err.code || 'ERROR',
            },
        };

        // Aggiungi suggerimento se presente (utile per UX)
        if (err.suggestion) {
            response.error.suggestion = err.suggestion;
        }

        // Aggiungi request ID per supporto (utente può riferirlo)
        if (requestId) {
            response.error.requestId = requestId;
        }

        res.status(err.statusCode || 500).json(response);
    } 
    // B) Errore di Programmazione o sconosciuto: non rivelare dettagli
    else {
        // 1) Logga l'errore nella console del server (per te)
        console.error('ERROR 💥', err.toLog ? err.toLog() : err);

        // 2) Manda messaggio generico all'utente
        const response = {
            success: false,
            status: 'error',
            message: 'Qualcosa è andato storto!',
            error: {
                code: 'INTERNAL_ERROR',
            },
        };

        // Aggiungi request ID per supporto
        if (requestId) {
            response.error.requestId = requestId;
        }

        res.status(500).json(response);
    }
};

/**
 * Logger avanzato con context
 * 
 * 🎓 LOGICA DI SILENZIAMENTO:
 * Non loggare come errore i 401 operazionali su endpoint di controllo sessione.
 * Questi sono normali quando un utente anonimo visita il sito.
 */
const logError = (err, req) => {
    const requestId = getRequestId(req);
    const requestUrl = req.originalUrl || req.path || '';
    
    // Endpoint che possono ricevere 401 in modo normale (utente anonimo)
    const isAuthCheckEndpoint = 
        requestUrl.includes('/auth/check') || 
        requestUrl.includes('/auth/refresh');
    
    // Se è un 401 operazionale su endpoint di check/refresh, è uno stato normale
    // Non loggare come errore (solo info silenzioso se necessario)
    const isNormalUnauthorized = 
        err.isOperational && 
        err.statusCode === 401 && 
        isAuthCheckEndpoint;
    
    // Se è un errore normale (utente anonimo), salta il logging dettagliato
    if (isNormalUnauthorized) {
        // Log silenzioso (solo in sviluppo per debug, opzionale)
        if (!isProduction) {
            // Opzionale: log info leggero (non errore)
            // console.log(`ℹ️  Utente anonimo visitato: ${requestUrl}`);
        }
        return; // Non loggare come errore
    }
    
    const logData = {
        timestamp: new Date().toISOString(),
        requestId,
        error: err.toLog ? err.toLog() : {
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            category: err.category,
            stack: err.stack,
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            path: req.path,
            query: req.query,
            // NON loggare body con password!
            body: req.body?.password 
                ? { ...req.body, password: '[REDACTED]' }
                : req.body,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        },
        user: req.user ? {
            id: req.user.id,
            email: req.user.email,
        } : null,
    };

    // In produzione, log strutturato (pronto per servizi esterni)
    if (isProduction) {
        // TODO: Integrare con servizio di logging (Sentry, LogRocket, Winston, etc.)
        console.error(JSON.stringify(logData, null, 2));
    } else {
        // In sviluppo, log leggibile
        // Distingui tra warning (operazionali) e error (bug)
        if (err.isOperational) {
            console.warn(`\n⚠️  WARNING (${err.statusCode}):`, err.message);
            console.warn('Code:', err.code || 'N/A');
            console.warn('Category:', err.category || 'N/A');
            console.warn('Request ID:', requestId);
            console.warn('URL:', requestUrl);
        } else {
            console.error('\n🚨 ERROR 💥:', err.message);
            console.error('Code:', err.code || 'N/A');
            console.error('Category:', err.category || 'N/A');
            console.error('Request ID:', requestId);
            console.error('URL:', requestUrl);
            if (err.stack) {
                console.error('Stack:', err.stack);
            }
        }
        
        if (err.metadata && Object.keys(err.metadata).length > 0) {
            console.error('Metadata:', err.metadata);
        }
    }
};

/**
 * Middleware principale di gestione errori
 * DEVE avere 4 parametri per essere riconosciuto da Express come error handler
 * 
 * Questo è il "Cameriere" che decide cosa dire al cliente (frontend)
 * e cosa urlare in cucina (console/terminal)
 */
const errorHandler = (err, req, res, next) => {
    // Gestisci errore "request entity too large" (file troppo grande)
    if (err.type === 'entity.too.large' || 
        err.message?.includes('request entity too large') || 
        err.message?.includes('PayloadTooLargeError') ||
        err.status === 413 ||
        err.statusCode === 413) {
        err = AppError.payloadTooLarge(
            'Il file da importare è troppo grande. Il limite massimo è 50MB. Prova a esportare solo i dati necessari o contatta il supporto.',
            '50MB',
            { category: ERROR_CATEGORIES.VALIDATION }
        );
        err.isOperational = true;
    }

    // Se l'errore non è un'istanza di AppError, convertilo
    if (!(err instanceof AppError)) {
        // Se è un errore di validazione Mongoose, convertilo
        if (err.name === 'ValidationError') {
            err = handleValidationErrorDB(err);
        } else if (err.name === 'CastError') {
            err = handleCastErrorDB(err);
        } else if (err.code === 11000) {
            err = handleDuplicateFieldsDB(err);
        } else {
            // Crea un AppError generico
            // Nota: AppError.internal ha firma (details, originalError, options)
            err = AppError.internal(
                { message: err.message || 'Errore interno del server' },
                err,
                {}
            );
        }
    }

    // Imposta valori di default se mancanti
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Aggiungi request ID all'errore se non presente (solo se è AppError)
    const requestId = getRequestId(req);
    if (!err.requestId && typeof err.setRequestId === 'function') {
        err.setRequestId(requestId);
    } else if (!err.requestId) {
        err.requestId = requestId;
    }

    // Aggiungi metadata dalla request (solo se è AppError)
    if (req.user) {
        if (typeof err.addMetadata === 'function') {
            err.addMetadata('userId', req.user.id);
        } else {
            err.metadata = err.metadata || {};
            err.metadata.userId = req.user.id;
        }
    }
    if (req.ip) {
        if (typeof err.addMetadata === 'function') {
            err.addMetadata('ip', req.ip);
        } else {
            err.metadata = err.metadata || {};
            err.metadata.ip = req.ip;
        }
    }

    // Log errore con context completo
    logError(err, req);

    if (isProduction) {
        // PRODUZIONE: Trasforma errori tecnici in messaggi umani
        // Nota: err è già un AppError a questo punto (convertito sopra)
        let error = err;

        // Trasforma errori tecnici di Mongoose in messaggi umani (se non già convertiti)
        if (err.name === 'CastError' && !(err instanceof AppError)) {
            error = handleCastErrorDB(err);
        } else if (err.code === 11000 && !(err instanceof AppError)) {
            error = handleDuplicateFieldsDB(err);
        } else if (err.name === 'ValidationError' && !(err instanceof AppError)) {
            error = handleValidationErrorDB(err);
        } else if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        } else if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        // Gestisci errori di connessione MongoDB
        if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
            error = AppError.database('Errore di connessione al database', err);
        }

        // Gestisci errori di connessione Redis
        if (err.message?.includes('Redis') || err.code === 'ECONNREFUSED') {
            error = AppError.redis('Errore di connessione a Redis', err);
        }

        // Gestisci timeout
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
            error = AppError.timeout('Timeout della richiesta', null);
        }

        sendErrorProd(error, res, requestId);
    } else {
        // SVILUPPO: Mostra tutto per debugging
        sendErrorDev(err, res, requestId);
    }
};

/**
 * Handler per route non trovate (404)
 */
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.originalUrl} non trovata`,
            code: 'NOT_FOUND',
        },
    });
};

/**
 * Wrapper per async route handlers
 * Cattura automaticamente errori Promise rejected
 * 
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
};
