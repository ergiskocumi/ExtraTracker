# Error Handling & Logging - Documentazione Cross-Cutting

**Silvi - Sistema Centralizzato di Gestione Errori**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Classe AppError](#classe-apperror)
3. [Error Handler Middleware](#error-handler-middleware)
4. [Error Categories](#error-categories)
5. [Logging Strategy](#logging-strategy)
6. [Best Practices](#best-practices)

---

## Panoramica

### Principi Fondamentali

Il sistema di gestione errori di Silvi segue questi principi:

1. **Mai esporre stack trace in produzione** - Sicurezza prima di tutto
2. **Loggare tutto internamente con context** - Debugging efficace
3. **Messaggi user-friendly al client** - UX ottimale
4. **Distinguere errori operazionali da bug** - Gestione differenziata
5. **Tracciamento errori per monitoring** - Observability
6. **Request ID per correlazione log** - Tracciamento distribuito

### Architettura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    [Route Handler] throws error
            │
            ▼
    ┌──────────────┐
    │   asyncHandler │  Cattura Promise rejected
    └──────┬───────┘
            │
            ▼
    ┌──────────────┐
    │ errorHandler │  Middleware Express (4 params)
    └──────┬───────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌──────────┐  ┌──────────┐
│Production│  │Development│
│sendError │  │ sendError │
│   Prod   │  │    Dev    │
└────┬─────┘  └────┬─────┘
     │             │
     ▼             ▼
┌──────────┐  ┌──────────┐
│  User    │  │ Developer │
│ Friendly │  │ Detailed  │
│ Response │  │ Response  │
└──────────┘  └──────────┘
```

---

## Classe AppError

### Overview

`AppError` è una classe custom che estende `Error` e fornisce:

- **Categorizzazione** errori per tipo (VALIDATION, AUTH, DATABASE, etc.)
- **HTTP Status Code** integrato
- **Error Code** per il frontend (es. 'VALIDATION_ERROR')
- **Metadata** per debugging contestuale
- **Suggerimenti** per risolvere l'errore
- **Operational vs Bug** distinzione critica

```javascript
// server/utils/AppError.js

class AppError extends Error {
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
            isOperational = true,      // true = errore previsto
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
        
        // 4xx = 'fail', 5xx = 'error'
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    // Metodi helper
    addMetadata(key, value) { /* ... */ }
    setRequestId(requestId) { /* ... */ }
    toJSON(includeDetails = false) { /* ... */ }
    toLog() { /* ... */ }
}
```

### Factory Methods

```javascript
// Errori di validazione (400)
AppError.validation('Email non valida', { field: 'email' });

// Autenticazione fallita (401)
AppError.unauthorized('Credenziali non valide');

// Accesso negato (403)
AppError.forbidden('Non hai i permessi per questa risorsa');

// Risorsa non trovata (404)
AppError.notFound('Deck');  // "Deck non trovato"

// Conflitto (409) - es. email già esistente
AppError.conflict('Email già registrata');

// Rate limit (429)
AppError.tooManyRequests('Troppe richieste', 3600); // retryAfter: 1h

// Errore interno (500) - BUG, non operazionale
AppError.internal({ message: 'Dettagli interni' }, originalError);

// Errore database (503)
AppError.database('Connessione persa', originalError);

// Errore servizio esterno (502)
AppError.externalAPI('OpenAI', 'API timeout', originalError);

// Errore upload file (400/413)
AppError.fileUpload('File troppo grande', { sizeExceeded: true });

// Errore AI (502)
AppError.ai('GPT-4 timeout', originalError);
```

### Error Categories

```javascript
const ERROR_CATEGORIES = {
    VALIDATION: 'VALIDATION',       // Dati input non validi
    AUTHENTICATION: 'AUTHENTICATION', // Login fallito
    AUTHORIZATION: 'AUTHORIZATION',  // Permessi insufficienti
    NOT_FOUND: 'NOT_FOUND',         // Risorsa mancante
    CONFLICT: 'CONFLICT',           // Conflitto dati (duplicati)
    RATE_LIMIT: 'RATE_LIMIT',       // Too many requests
    DATABASE: 'DATABASE',           // Errore MongoDB
    NETWORK: 'NETWORK',             // Problemi connessione
    EXTERNAL_API: 'EXTERNAL_API',   // OpenAI, Pinecone, etc.
    FILE_UPLOAD: 'FILE_UPLOAD',     // Upload fallito
    EMAIL: 'EMAIL',                 // Invio email fallito
    INTERNAL: 'INTERNAL',           // Bug interno
};
```

---

## Error Handler Middleware

### Flusso di Gestione

```javascript
// server/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
    // 1. Gestione errore payload troppo grande
    if (err.type === 'entity.too.large' || err.status === 413) {
        err = AppError.payloadTooLarge('Il file è troppo grande (max 50MB)', '50MB');
    }

    // 2. Conversione errori non-AppError
    if (!(err instanceof AppError)) {
        if (err.name === 'ValidationError') {
            err = handleValidationErrorDB(err);
        } else if (err.name === 'CastError') {
            err = handleCastErrorDB(err);
        } else if (err.code === 11000) {
            err = handleDuplicateFieldsDB(err);
        } else {
            err = AppError.internal({ message: err.message }, err);
        }
    }

    // 3. Imposta Request ID per tracciamento
    const requestId = getRequestId(req);
    err.setRequestId(requestId);

    // 4. Aggiungi metadata dalla request
    if (req.user) {
        err.addMetadata('userId', req.user.id);
    }
    err.addMetadata('ip', req.ip);

    // 5. Log dell'errore
    logError(err, req);

    // 6. Invia risposta appropriata (dev vs prod)
    if (isProduction) {
        sendErrorProd(err, res, requestId);
    } else {
        sendErrorDev(err, res, requestId);
    }
};
```

### Errori MongoDB Specifici

```javascript
// CastError: ID malformato (es. "abc" invece di ObjectId)
const handleCastErrorDB = (err) => {
    const message = `Dato non valido: ${err.path}: ${err.value}`;
    return AppError.validation(message);
};

// Duplicate Fields: email già esistente (code 11000)
const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg?.match(/(["'])(\?.)*?\1/)?.[0] || 'valore';
    const message = `Valore duplicato: ${value}. Usa un altro valore.`;
    return AppError.conflict(message);
};

// ValidationError: validazione schema Mongoose fallita
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Dati non validi: ${errors.join('. ')}`;
    return AppError.validation(message);
};

// JWT Errors
const handleJWTError = () =>
    AppError.unauthorized('Token non valido. Effettua nuovamente il login.');

const handleJWTExpiredError = () =>
    AppError.unauthorized('Il tuo token è scaduto. Effettua nuovamente il login.');
```

### Risposta in Sviluppo vs Produzione

```javascript
// Sviluppo: dettagli completi (ma NO stack trace in HTTP)
const sendErrorDev = (err, res, requestId) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        error: {
            message: err.message,
            code: err.code,
            category: err.category,
            details: err.details,
            suggestion: err.suggestion,
            requestId,
        },
        message: err.message,
        // Stack trace è nei log del server, NON nella risposta HTTP
    });
};

// Produzione: solo messaggi user-friendly
const sendErrorProd = (err, res, requestId) => {
    if (err.isOperational) {
        // Errore previsto: mostra messaggio utile
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            error: {
                code: err.code,
                suggestion: err.suggestion,
                requestId, // Per supporto tecnico
            },
        });
    } else {
        // Bug: messaggio generico, logga internamente
        console.error('ERROR 💥', err.toLog());
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Qualcosa è andato storto!',
            error: {
                code: 'INTERNAL_ERROR',
                requestId,
            },
        });
    }
};
```

---

## Logging Strategy

### Logger Avanzato con Context

```javascript
const logError = (err, req) => {
    const requestId = getRequestId(req);
    const requestUrl = req.originalUrl || req.path || '';
    
    // Silenzia 401 su endpoint di check (utente anonimo è normale)
    const isAuthCheckEndpoint = 
        requestUrl.includes('/auth/check') || 
        requestUrl.includes('/auth/refresh');
    
    const isNormalUnauthorized = 
        err.isOperational && 
        err.statusCode === 401 && 
        isAuthCheckEndpoint;
    
    if (isNormalUnauthorized) return; // Non loggare
    
    const logData = {
        timestamp: new Date().toISOString(),
        requestId,
        error: err.toLog ? err.toLog() : {
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            stack: err.stack,
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            // Maschera password!
            body: req.body?.password 
                ? { ...req.body, password: '[REDACTED]' }
                : req.body,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        },
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
    };

    if (isProduction) {
        // Log strutturato JSON per servizi esterni (Sentry, etc.)
        console.error(JSON.stringify(logData, null, 2));
    } else {
        // Log leggibile in sviluppo
        if (err.isOperational) {
            console.warn(`\n⚠️  WARNING (${err.statusCode}):`, err.message);
        } else {
            console.error('\n🚨 ERROR 💥:', err.message);
            if (err.stack) console.error('Stack:', err.stack);
        }
    }
};
```

### Request ID Generation

```javascript
const crypto = require('crypto');

const getRequestId = (req) => {
    if (!req.requestId) {
        // Usa header esistente (per tracing distribuito) o genera nuovo
        req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    }
    return req.requestId;
};
```

---

## Best Practices

### 1. Usare asyncHandler per Route

```javascript
const { asyncHandler } = require('../middleware/errorHandler');

// ✅ CORRETTO: Errori Promise vengono catturati
router.get('/decks', asyncHandler(async (req, res) => {
    const decks = await Deck.find(); // Se fallisce, va all'error handler
    res.json(decks);
}));

// ❌ SBAGLIATO: Errori async non catturati
router.get('/decks', async (req, res) => {
    const decks = await Deck.find(); // UnhandledPromiseRejection!
    res.json(decks);
});
```

### 2. Sempre Usare AppError per Errori Operazionali

```javascript
// ✅ CORRETTO: Errore operazionale gestito
if (!deck) {
    throw AppError.notFound('Deck');
}

// ❌ SBAGLIATO: Errore generico
if (!deck) {
    throw new Error('Deck non trovato'); // Diventa 500 in produzione!
}
```

### 3. Wrappare Errori Esterni

```javascript
// ✅ CORRETTO: Wrappa errore esterno con context
try {
    const result = await openai.chat.completions.create({...});
} catch (err) {
    throw AppError.ai('Errore nella generazione', err);
}

// ❌ SBAGLIATO: Lascia propagare errore raw
const result = await openai.chat.completions.create({...}); // Espone dettagli API
```

### 4. Aggiungere Metadata per Debugging

```javascript
const error = AppError.validation('Email non valida', { field: 'email' })
    .addMetadata('attemptedEmail', email)
    .addMetadata('userId', req.user?.id)
    .setRequestId(req.requestId);

throw error;
```

### 5. Non Esporre Dettagli Sensibili

```javascript
// ✅ CORRETTO: Messaggio generico in produzione
AppError.unauthorized('Credenziali non valide'); // Stesso msg per email/password errati

// ❌ SBAGLIATO: Informazioni troppo specifiche
if (!user) throw new Error('Email non trovata');      // Email enumeration attack
if (!validPassword) throw new Error('Password errata'); // Info per attacker
```

### 6. Gestire Errori Specifici di MongoDB

```javascript
// L'errorHandler converte automaticamente:
// - CastError → 400 VALIDATION_ERROR
// - 11000 duplicate → 409 CONFLICT
// - ValidationError → 400 VALIDATION_ERROR
```

---

## Tabella di Riferimento HTTP Status Codes

| Status | Code | Uso |
|--------|------|-----|
| 400 | `VALIDATION_ERROR` | Dati input non validi |
| 401 | `UNAUTHORIZED` | Autenticazione richiesta/fallita |
| 403 | `FORBIDDEN` | Autenticato ma non autorizzato |
| 404 | `NOT_FOUND` | Risorsa non esiste |
| 409 | `CONFLICT` | Conflitto stato (duplicati) |
| 413 | `PAYLOAD_TOO_LARGE` | File/body troppo grande |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Bug del server |
| 502 | `EXTERNAL_API_ERROR` | Servizio esterno down |
| 503 | `DATABASE_ERROR` | MongoDB/Redis non disponibile |
| 504 | `TIMEOUT_ERROR` | Request timeout |

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
