/**
 * 🛡️ CLASSE ERRORI CUSTOM
 * 
 * Perché una classe custom?
 * 1. Distingue errori operazionali (previsti) da bug (imprevisti)
 * 2. Contiene info strutturate per il logging
 * 3. Permette di decidere cosa mostrare al client
 */

class AppError extends Error {
    /**
     * @param {string} message - Messaggio SICURO da mostrare al client
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Codice errore (per il frontend)
     * @param {object} details - Dettagli aggiuntivi (NON inviati al client in prod)
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
        super(message);
        
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        
        // isOperational = true significa errore "previsto" (es. validazione)
        // isOperational = false significa bug (errore programmazione)
        this.isOperational = true;
        
        // Cattura stack trace (utile per debugging, MAI mostrato al client)
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Serializza l'errore per la risposta HTTP
     * @param {boolean} includeDetails - Include dettagli (solo in dev)
     */
    toJSON(includeDetails = false) {
        const response = {
            success: false,
            error: {
                message: this.message,
                code: this.code,
            },
        };

        if (includeDetails && Object.keys(this.details).length > 0) {
            response.error.details = this.details;
        }

        return response;
    }
}

// ==========================================
// Factory functions per errori comuni
// ==========================================

/**
 * Errore di validazione (400)
 */
AppError.validation = (message, details = {}) => {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
};

/**
 * Credenziali non valide (401) - messaggio generico per sicurezza
 */
AppError.unauthorized = (message = 'Credenziali non valide') => {
    return new AppError(message, 401, 'UNAUTHORIZED');
};

/**
 * Accesso negato (403)
 */
AppError.forbidden = (message = 'Accesso negato') => {
    return new AppError(message, 403, 'FORBIDDEN');
};

/**
 * Risorsa non trovata (404)
 */
AppError.notFound = (resource = 'Risorsa') => {
    return new AppError(`${resource} non trovata`, 404, 'NOT_FOUND');
};

/**
 * Conflitto (409) - es. email già esistente
 */
AppError.conflict = (message) => {
    return new AppError(message, 409, 'CONFLICT');
};

/**
 * Rate limit exceeded (429)
 */
AppError.tooManyRequests = (message = 'Troppe richieste, riprova più tardi') => {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
};

/**
 * Errore interno (500) - messaggio generico per sicurezza
 */
AppError.internal = (details = {}) => {
    return new AppError(
        'Si è verificato un errore interno. Riprova più tardi.',
        500,
        'INTERNAL_ERROR',
        details
    );
};

module.exports = AppError;
