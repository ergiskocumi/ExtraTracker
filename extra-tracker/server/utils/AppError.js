/**
 * 🛡️ CLASSE ERRORI CUSTOM - Sistema Centralizzato
 * 
 * Perché una classe custom?
 * 1. Distingue errori operazionali (previsti) da bug (imprevisti)
 * 2. Contiene info strutturate per il logging
 * 3. Permette di decidere cosa mostrare al client
 * 4. Supporta error tracking e monitoring
 * 5. Fornisce context e metadata per debugging
 */

// Error categories per classificazione
const ERROR_CATEGORIES = {
    VALIDATION: 'VALIDATION',
    AUTHENTICATION: 'AUTHENTICATION',
    AUTHORIZATION: 'AUTHORIZATION',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT: 'RATE_LIMIT',
    DATABASE: 'DATABASE',
    NETWORK: 'NETWORK',
    EXTERNAL_API: 'EXTERNAL_API',
    FILE_UPLOAD: 'FILE_UPLOAD',
    EMAIL: 'EMAIL',
    INTERNAL: 'INTERNAL',
};

class AppError extends Error {
    /**
     * @param {string} message - Messaggio SICURO da mostrare al client
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Codice errore (per il frontend)
     * @param {object} options - Opzioni aggiuntive
     * @param {object} options.details - Dettagli aggiuntivi (NON inviati al client in prod)
     * @param {string} options.category - Categoria errore (per logging/filtering)
     * @param {string} options.requestId - ID richiesta per tracciamento
     * @param {object} options.metadata - Metadata aggiuntivi (user ID, IP, etc.)
     * @param {string} options.suggestion - Suggerimento per risolvere l'errore
     * @param {boolean} options.isOperational - Se true, errore previsto (default: true)
     * @param {Error} options.originalError - Errore originale (se wrapping)
     */
    constructor(
        message, 
        statusCode = 500, 
        code = 'INTERNAL_ERROR', 
        options = {}
    ) {
        super(message);
        
        const {
            details = {},
            category = ERROR_CATEGORIES.INTERNAL,
            requestId = null,
            metadata = {},
            suggestion = null,
            isOperational = true,
            originalError = null,
        } = options;
        
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.category = category;
        this.requestId = requestId;
        this.metadata = metadata;
        this.suggestion = suggestion;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
        
        // Se inizia con 4xx è 'fail', se 5xx è 'error'
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        
        // isOperational = true significa errore "previsto" (es. validazione, password sbagliata)
        // isOperational = false significa bug (errore programmazione, Redis crashato, etc.)
        this.isOperational = isOperational;
        
        // Cattura stack trace (utile per debugging, MAI mostrato al client in produzione)
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Aggiunge metadata all'errore (utile per logging contestuale)
     */
    addMetadata(key, value) {
        this.metadata[key] = value;
        return this;
    }

    /**
     * Imposta request ID per tracciamento
     */
    setRequestId(requestId) {
        this.requestId = requestId;
        return this;
    }

    /**
     * Serializza l'errore per la risposta HTTP
     * @param {boolean} includeDetails - Include dettagli (solo in dev)
     */
    toJSON(includeDetails = false) {
        const response = {
            success: false,
            status: this.status,
            error: {
                message: this.message,
                code: this.code,
            },
        };

        // In sviluppo, aggiungi dettagli e suggerimenti
        if (includeDetails) {
            if (Object.keys(this.details).length > 0) {
                response.error.details = this.details;
            }
            if (this.suggestion) {
                response.error.suggestion = this.suggestion;
            }
            if (this.requestId) {
                response.error.requestId = this.requestId;
            }
        }

        return response;
    }

    /**
     * Serializza per logging (include tutto, anche metadata sensibili)
     */
    toLog() {
        return {
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            category: this.category,
            status: this.status,
            isOperational: this.isOperational,
            requestId: this.requestId,
            metadata: this.metadata,
            details: this.details,
            suggestion: this.suggestion,
            timestamp: this.timestamp,
            stack: this.stack,
            originalError: this.originalError ? {
                message: this.originalError.message,
                name: this.originalError.name,
                stack: this.originalError.stack,
            } : null,
        };
    }
}

// ==========================================
// Factory functions per errori comuni
// ==========================================

/**
 * Richiesta malformata (400)
 */
AppError.badRequest = (message, options = {}) => {
    return new AppError(
        message,
        400,
        'BAD_REQUEST',
        {
            ...options,
            category: ERROR_CATEGORIES.VALIDATION,
            suggestion: 'Controlla i dati inviati e riprova',
        }
    );
};

/**
 * Errore di validazione (400)
 */
AppError.validation = (message, details = {}, options = {}) => {
    return new AppError(
        message, 
        400, 
        'VALIDATION_ERROR', 
        {
            ...options,
            details,
            category: ERROR_CATEGORIES.VALIDATION,
            suggestion: 'Controlla i dati inseriti e riprova',
        }
    );
};

/**
 * Credenziali non valide (401) - messaggio generico per sicurezza
 */
AppError.unauthorized = (message = 'Credenziali non valide', options = {}) => {
    return new AppError(
        message, 
        401, 
        'UNAUTHORIZED',
        {
            ...options,
            category: ERROR_CATEGORIES.AUTHENTICATION,
            suggestion: 'Verifica le tue credenziali e riprova',
        }
    );
};

/**
 * Accesso negato (403)
 */
AppError.forbidden = (message = 'Accesso negato', options = {}) => {
    return new AppError(
        message, 
        403, 
        'FORBIDDEN',
        {
            ...options,
            category: ERROR_CATEGORIES.AUTHORIZATION,
            suggestion: 'Non hai i permessi necessari per questa azione',
        }
    );
};

/**
 * Risorsa non trovata (404)
 */
AppError.notFound = (resource = 'Risorsa', options = {}) => {
    return new AppError(
        `${resource} non trovata`, 
        404, 
        'NOT_FOUND',
        {
            ...options,
            category: ERROR_CATEGORIES.NOT_FOUND,
            suggestion: 'Verifica che la risorsa esista e che tu abbia accesso',
        }
    );
};

/**
 * Conflitto (409) - es. email già esistente
 */
AppError.conflict = (message, options = {}) => {
    return new AppError(
        message, 
        409, 
        'CONFLICT',
        {
            ...options,
            category: ERROR_CATEGORIES.CONFLICT,
            suggestion: 'La risorsa potrebbe già esistere. Controlla e riprova',
        }
    );
};

/**
 * Rate limit exceeded (429)
 */
AppError.tooManyRequests = (message = 'Troppe richieste, riprova più tardi', retryAfter = null, options = {}) => {
    const details = retryAfter ? { retryAfter } : {};
    return new AppError(
        message, 
        429, 
        'TOO_MANY_REQUESTS',
        {
            ...options,
            details,
            category: ERROR_CATEGORIES.RATE_LIMIT,
            suggestion: retryAfter 
                ? `Riprova tra ${retryAfter} secondi`
                : 'Attendi qualche minuto prima di riprovare',
        }
    );
};

/**
 * Errore interno (500) - messaggio generico per sicurezza
 */
AppError.internal = (details = {}, originalError = null, options = {}) => {
    return new AppError(
        'Si è verificato un errore interno. Riprova più tardi.',
        500,
        'INTERNAL_ERROR',
        {
            ...options,
            details,
            originalError,
            category: ERROR_CATEGORIES.INTERNAL,
            isOperational: false, // Bug, non errore previsto
        }
    );
};

/**
 * Errore database (503)
 */
AppError.database = (message = 'Errore di connessione al database', originalError = null, options = {}) => {
    return new AppError(
        message,
        503,
        'DATABASE_ERROR',
        {
            ...options,
            originalError,
            category: ERROR_CATEGORIES.DATABASE,
            suggestion: 'Il servizio è temporaneamente non disponibile. Riprova tra qualche minuto',
            isOperational: false,
        }
    );
};

/**
 * Errore connessione Redis (503)
 */
AppError.redis = (message = 'Errore di connessione a Redis', originalError = null, options = {}) => {
    return new AppError(
        message,
        503,
        'REDIS_ERROR',
        {
            ...options,
            originalError,
            category: ERROR_CATEGORIES.DATABASE,
            suggestion: 'Il servizio è temporaneamente non disponibile. Riprova tra qualche minuto',
            isOperational: false,
        }
    );
};

/**
 * Errore API esterna (502)
 */
AppError.externalAPI = (service, message = 'Errore nel servizio esterno', originalError = null, options = {}) => {
    return new AppError(
        message,
        502,
        'EXTERNAL_API_ERROR',
        {
            ...options,
            details: { service },
            originalError,
            category: ERROR_CATEGORIES.EXTERNAL_API,
            suggestion: 'Il servizio esterno è temporaneamente non disponibile. Riprova più tardi',
            isOperational: false,
        }
    );
};

/**
 * Errore upload file (400/413)
 */
AppError.fileUpload = (message, details = {}, options = {}) => {
    const statusCode = details.sizeExceeded ? 413 : 400;
    return new AppError(
        message,
        statusCode,
        'FILE_UPLOAD_ERROR',
        {
            ...options,
            details,
            category: ERROR_CATEGORIES.FILE_UPLOAD,
            suggestion: details.sizeExceeded 
                ? 'Il file è troppo grande. Riduci le dimensioni e riprova'
                : 'Controlla il formato del file e riprova',
        }
    );
};

/**
 * Errore invio email (502)
 */
AppError.email = (message = 'Errore nell\'invio dell\'email', originalError = null, options = {}) => {
    return new AppError(
        message,
        502,
        'EMAIL_ERROR',
        {
            ...options,
            originalError,
            category: ERROR_CATEGORIES.EMAIL,
            suggestion: 'L\'email non è stata inviata. Riprova più tardi o contatta il supporto',
            isOperational: false,
        }
    );
};

/**
 * Errore AI/OpenAI (502)
 */
AppError.ai = (message = 'Errore nel servizio AI', originalError = null, options = {}) => {
    return new AppError(
        message,
        502,
        'AI_SERVICE_ERROR',
        {
            ...options,
            originalError,
            category: ERROR_CATEGORIES.EXTERNAL_API,
            suggestion: 'Il servizio AI è temporaneamente non disponibile. Riprova più tardi',
            isOperational: false,
        }
    );
};

/**
 * Errore rete (503)
 */
AppError.network = (message = 'Errore di connessione', originalError = null, options = {}) => {
    return new AppError(
        message,
        503,
        'NETWORK_ERROR',
        {
            ...options,
            originalError,
            category: ERROR_CATEGORIES.NETWORK,
            suggestion: 'Controlla la tua connessione internet e riprova',
            isOperational: false,
        }
    );
};

/**
 * Errore timeout (504)
 */
AppError.timeout = (message = 'Timeout della richiesta', service = null, options = {}) => {
    return new AppError(
        message,
        504,
        'TIMEOUT_ERROR',
        {
            ...options,
            details: service ? { service } : {},
            category: ERROR_CATEGORIES.NETWORK,
            suggestion: 'La richiesta ha impiegato troppo tempo. Riprova più tardi',
            isOperational: false,
        }
    );
};

/**
 * Errore formato dati non supportato (415)
 */
AppError.unsupportedMediaType = (message = 'Formato dati non supportato', options = {}) => {
    return new AppError(
        message,
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        {
            ...options,
            category: ERROR_CATEGORIES.VALIDATION,
            suggestion: 'Verifica il formato dei dati e riprova',
        }
    );
};

/**
 * Errore payload troppo grande (413)
 */
AppError.payloadTooLarge = (message = 'Payload troppo grande', maxSize = null, options = {}) => {
    return new AppError(
        message,
        413,
        'PAYLOAD_TOO_LARGE',
        {
            ...options,
            details: maxSize ? { maxSize } : {},
            category: ERROR_CATEGORIES.VALIDATION,
            suggestion: maxSize 
                ? `Riduci le dimensioni del payload (massimo ${maxSize})`
                : 'Riduci le dimensioni del payload e riprova',
        }
    );
};

/**
 * Errore servizio non disponibile (503)
 */
AppError.serviceUnavailable = (message = 'Servizio temporaneamente non disponibile', retryAfter = null, options = {}) => {
    return new AppError(
        message,
        503,
        'SERVICE_UNAVAILABLE',
        {
            ...options,
            details: retryAfter ? { retryAfter } : {},
            category: ERROR_CATEGORIES.INTERNAL,
            suggestion: retryAfter 
                ? `Riprova tra ${retryAfter} secondi`
                : 'Riprova tra qualche minuto',
            isOperational: false,
        }
    );
};

// Export categories per uso esterno
AppError.CATEGORIES = ERROR_CATEGORIES;

module.exports = AppError;
