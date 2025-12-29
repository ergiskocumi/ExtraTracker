/**
 * 🚨 ERROR HANDLER MIDDLEWARE
 * 
 * Gestisce TUTTI gli errori dell'applicazione
 * 
 * Principi:
 * 1. Mai esporre stack trace in produzione
 * 2. Loggare tutto internamente
 * 3. Messaggi utente-friendly al client
 * 4. Distinguere errori operazionali da bug
 */

const AppError = require('../utils/AppError');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Handler per errori Mongoose (Validation, Cast, Duplicate)
 */
const handleMongooseError = (err) => {
    // Errore di validazione Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        return AppError.validation('Errore di validazione', { errors });
    }

    // Errore chiave duplicata (es. email già esistente)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        // Non rivelare quale campo è duplicato in produzione
        return AppError.conflict(
            isProduction 
                ? 'Impossibile completare la registrazione'
                : `Il campo '${field}' esiste già`
        );
    }

    // Errore Cast (ID non valido)
    if (err.name === 'CastError') {
        return AppError.validation(`ID non valido: ${err.value}`);
    }

    return null;
};

/**
 * Logger interno (in produzione usa un servizio come Winston/Sentry)
 */
const logError = (err, req) => {
    const logData = {
        timestamp: new Date().toISOString(),
        error: {
            message: err.message,
            code: err.code,
            stack: err.stack,
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            // NON loggare body con password!
            body: req.body?.password ? { ...req.body, password: '[REDACTED]' } : req.body,
        },
        // In produzione potresti aggiungere: request ID, user ID (se autenticato)
    };

    // In produzione, invia a servizio di logging (Sentry, LogRocket, etc.)
    if (isProduction) {
        // TODO: Integrare con servizio di logging
        console.error('[ERROR]', JSON.stringify(logData));
    } else {
        console.error('\n🚨 ERROR:', logData.error.message);
        console.error('Stack:', logData.error.stack);
    }
};

/**
 * Middleware principale di gestione errori
 * DEVE avere 4 parametri per essere riconosciuto da Express come error handler
 */
const errorHandler = (err, req, res, _next) => {
    // Log interno
    logError(err, req);

    // Prova a convertire errori Mongoose
    const mongooseError = handleMongooseError(err);
    if (mongooseError) {
        err = mongooseError;
    }

    // Se è un AppError (errore previsto), usa i suoi dati
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON(!isProduction));
    }

    // Errore imprevisto (bug) - risposta generica
    const statusCode = err.statusCode || 500;
    
    const response = {
        success: false,
        error: {
            message: isProduction 
                ? 'Si è verificato un errore interno. Riprova più tardi.'
                : err.message,
            code: 'INTERNAL_ERROR',
        },
    };

    // In sviluppo, aggiungi stack trace
    if (!isProduction) {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
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
