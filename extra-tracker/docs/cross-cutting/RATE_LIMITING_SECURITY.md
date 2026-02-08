# Rate Limiting & Security - Documentazione Cross-Cutting

**Silvi - Sistema di Protezione e Rate Limiting**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Rate Limiting Architecture](#rate-limiting-architecture)
3. [Rate Limiters](#rate-limiters)
4. [CSRF Protection](#csrf-protection)
5. [Auth Middleware](#auth-middleware)
6. [Security Configuration](#security-configuration)
7. [Best Practices](#best-practices)

---

## Panoramica

### Filosofia di Sicurezza

Il sistema di sicurezza di Silvi segue questi principi:

1. **Difesa in profondità** - Molteplici layer di protezione
2. **Fail secure** - Se il security layer fallisce, il sistema è sicuro
3. **Least privilege** - Accesso minimo necessario
4. **Rate limiting selettivo** - Limiti solo dove necessario
5. **User-friendly** - Sicurezza che non ostacola l'UX

### Stack Sicurezza

| Componente | Tecnologia | Scopo |
|------------|------------|-------|
| Rate Limiting | `express-rate-limit` + Redis | Prevenzione abuse |
| Password Hashing | Argon2id | Protezione credenziali |
| JWT Tokens | `jsonwebtoken` | Stateless auth |
| CSRF Protection | Double Submit Cookie | Protezione state-changing ops |
| Session Management | HttpOnly Cookies | Secure token storage |
| Input Validation | Mongoose + Joi/Zod | Sanitizzazione input |
| HTTPS/TLS | Let's Encrypt | Transport encryption |

---

## Rate Limiting Architecture

### Design Principle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING STRATEGY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

🎯 FILOSOFIA:
- Gli utenti normali devono poter usare l'app liberamente
- Solo le chiamate AI e autenticazione necessitano rate limiting severo
- Rate limiting basato su userId per utenti autenticati (più equo)
- Rate limiting basato su IP per autenticazione (previene attacchi)

🔴 AI Rate Limiter:        10 chiamate/ora per utente (costi elevati)
🔐 Auth Rate Limiter:      15 tentativi/15min per IP (brute force)
🔒 Password Reset:         3 richieste/ora per IP (email bombing)
⚠️  General Limiter:       DISABILITATO di default (1000 req/15min)
```

### Architettura Distribuita

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING DISTRIBUITO                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    [Client Request]
          │
          ▼
┌──────────────────┐
│   Load Balancer  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Server1│ │Server2│
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │ Redis (shared state)
         ▼
┌──────────────────┐
│  Redis Store     │  ← Rate limit counters condivisi
│  Keys: rl:*      │
└──────────────────┘
```

---

## Rate Limiters

### AI Rate Limiter

```javascript
// server/middleware/rateLimiter.js

/**
 * 🤖 AI RATE LIMITER
 * 
 * Limite: 10 chiamate per ora per utente
 * Basato su userId (non IP) per essere equo tra utenti
 * Previene abusi e costi eccessivi
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 ora
    max: 10,                    // 10 chiamate
    store: createRateLimitStore(), // Redis se disponibile
    keyGenerator: (req) => {
        // Usa userId se disponibile, altrimenti IP
        return req.tenantScope?.userId 
            ? `user:${req.tenantScope.userId}` 
            : getClientIpForRateLimit(req);
    },
    standardHeaders: true,  // X-RateLimit-*
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Hai raggiunto il limite di chiamate AI (10 per ora). ' +
                         'Le chiamate AI sono costose e devono essere limitate.',
                code: 'AI_RATE_LIMIT_EXCEEDED',
                retryAfter: 3600, // 1 ora in secondi
            },
        });
    },
    skip: (req) => !req.tenantScope?.userId, // Skip se non autenticato
});

// Applicazione nelle routes
router.post('/:id/generate-pdf', aiLimiter, studyController.generateFromPDF);
router.post('/:id/chat', aiLimiter, studyController.chatWithTutor);
router.post('/goals/suggest', aiLimiter, goalController.suggestGoals);
```

### Auth Rate Limiter

```javascript
/**
 * 🔐 AUTH RATE LIMITER
 * 
 * Limite: 15 tentativi per 15 minuti per IP
 * Basato su IP (non userId) perché l'utente non è ancora autenticato
 * Skip richieste di successo (non conta login riusciti)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minuti
    max: 15,                    // 15 tentativi
    store: createRateLimitStore(),
    keyGenerator: (req) => getClientIpForRateLimit(req),
    skipSuccessfulRequests: true,  // Non contare i successi
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppi tentativi di accesso. ' +
                         'Account temporaneamente bloccato per 15 minuti.',
                code: 'TOO_MANY_ATTEMPTS',
                retryAfter: 900, // 15 minuti in secondi
            },
        });
    },
});

// Applicazione
router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
```

### Password Reset Limiter

```javascript
/**
 * 🔒 PASSWORD RESET RATE LIMITER
 * 
 * Limite: 3 richieste per ora per IP
 * Previene email bombing
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 ora
    max: 3,                     // Solo 3 richieste
    store: createRateLimitStore(),
    keyGenerator: (req) => getClientIpForRateLimit(req),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                message: 'Troppi tentativi di reset password. Riprova tra un\'ora.',
                code: 'TOO_MANY_RESET_ATTEMPTS',
                retryAfter: 3600,
            },
        });
    },
});

// Applicazione
router.post('/forgot-password', passwordResetLimiter, authLimiter, 
    authController.forgotPassword);
```

### General Rate Limiter (Opzionale)

```javascript
/**
 * ⚠️ GENERAL RATE LIMITER
 * 
 * Limite: 1000 richieste per 15 minuti per IP
 * DISABILITATO di default - molto permissivo
 */
const generalLimiter = securityConfig.rateLimit.general.enabled
    ? rateLimit({
          windowMs: 15 * 60 * 1000,
          max: 1000,
          store: createRateLimitStore(),
          keyGenerator: (req) => getClientIpForRateLimit(req),
          skip: (req) => {
              // Skip endpoint a basso rischio
              const url = req.originalUrl || '';
              if (req.method === 'GET' && url.startsWith('/api/auth/check')) {
                  return true; // Skip check auth
              }
              if (url === '/health') {
                  return true; // Skip health check
              }
              return false;
          },
          standardHeaders: true,
          legacyHeaders: false,
      })
    : null; // Disabilitato
```

### Store Configuration

```javascript
/**
 * Crea store per rate limiter
 * Usa Redis se disponibile, altrimenti memoria locale
 */
const createRateLimitStore = () => {
    if (getRedisAvailable()) {
        const redisClient = getRedisClient();
        if (redisClient) {
            console.log('✅ Rate limiter usando Redis (distribuito)');
            return new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
                prefix: 'rl:', // Keys: rl:IP_ADDRESS
            });
        }
    }
    
    // Fallback a memoria locale (non funziona con multipli server!)
    console.log('⚠️  Rate limiter usando memoria locale (non distribuito)');
    return undefined;
};
```

---

## CSRF Protection

### Double Submit Cookie Pattern

```javascript
// server/middleware/csrf.js

/**
 * CSRF PROTECTION (Double Submit Cookie)
 * 
 * - Setta un CSRF cookie se mancante
 * - Richiede header corrispondente per state-changing requests
 * 
 * FLOW:
 * 1. Server setta cookie CSRF (non HttpOnly, quindi leggibile da JS)
 * 2. Frontend legge cookie e invia come header X-CSRF-Token
 * 3. Server confronta cookie e header (devono matchare)
 * 4. Se match → proceed; altrimenti → 403 Forbidden
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Genera token casuale
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Setta CSRF cookie
const setCsrfCookie = (res, token = null) => {
    const csrfToken = token || generateToken();
    res.cookie(
        'XSRF-TOKEN',      // Nome cookie ( Angular/Axios lo leggono automaticamente)
        csrfToken,
        {
            httpOnly: false,    // DEVE essere leggibile da JS
            secure: isProduction,
            sameSite: getSameSitePolicy(),
            path: '/',
            maxAge: 24 * 60 * 60 * 1000, // 24h
        }
    );
    return csrfToken;
};

// Middleware: assicura CSRF cookie esista
const ensureCsrfCookie = (req, res, next) => {
    const existing = req.cookies?.['XSRF-TOKEN'];
    if (existing) {
        req.csrfToken = existing;
        return next();
    }
    
    // Genera nuovo token
    req.csrfToken = setCsrfCookie(res);
    return next();
};

// Middleware: verifica CSRF token per unsafe methods
const requireCsrf = (req, res, next) => {
    // Safe methods non richiedono CSRF
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }
    
    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.get('X-CSRF-Token') || req.get('X-XSRF-TOKEN');
    
    if (!cookieToken || !headerToken) {
        return next(AppError.forbidden('CSRF token mancante'));
    }
    
    // Timing-safe comparison (previene timing attacks)
    if (!timingSafeEquals(cookieToken, headerToken)) {
        return next(AppError.forbidden('CSRF token non valido'));
    }
    
    return next();
};

// Timing-safe string comparison
const timingSafeEquals = (a, b) => {
    if (!a || !b) return false;
    const aBuf = Buffer.from(String(a));
    const bBuf = Buffer.from(String(b));
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
};
```

### Frontend Integration

```javascript
// Axios config per inviare CSRF token automaticamente
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-CSRF-Token';

// O fetch manuale
const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

fetch('/api/decks', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
});
```

---

## Auth Middleware

### Require Auth

```javascript
// server/middleware/auth.js

/**
 * 🔒 MIDDLEWARE AUTENTICAZIONE JWT
 * 
 * Verifica che le richieste abbiano un token valido
 * Legge token dal cookie HttpOnly
 * Verifica blacklist per revoca immediata
 */
const requireAuth = async (req, res, next) => {
    try {
        // 1. Estrai token dal cookie
        const token = req.cookies?.['accessToken'];
        
        if (!token) {
            throw AppError.unauthorized('Accesso negato. Effettua il login.');
        }
        
        // 2. Verifica token (firma JWT)
        const payload = authService.verifyToken(token, 'access');
        
        // 3. Verifica blacklist: token revocato?
        const isTokenBlacklisted = await authService.isTokenBlacklisted(token);
        if (isTokenBlacklisted) {
            throw AppError.unauthorized('Token revocato. Effettua il login.');
        }
        
        // 4. Verifica blacklist: utente bannato?
        const isUserBlacklisted = await authService.isUserBlacklisted(payload.sub);
        if (isUserBlacklisted) {
            throw AppError.unauthorized('Account disattivato. Contatta il supporto.');
        }
        
        // 5. Aggiungi dati utente alla request
        req.user = {
            id: payload.sub,
            email: payload.email,
        };
        
        next();
    } catch (error) {
        next(error);
    }
};
```

### Optional Auth

```javascript
/**
 * Middleware opzionale: aggiunge user se autenticato, altrimenti continua
 * Utile per endpoint pubblici che supportano funzionalità extra per utenti loggati
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.['accessToken'];
        
        if (token) {
            const payload = authService.verifyToken(token, 'access');
            req.user = {
                id: payload.sub,
                email: payload.email,
            };
        }
    } catch {
        // Ignora errori, utente semplicemente non è autenticato
        req.user = null;
    }
    
    next();
};
```

### Require Ownership

```javascript
/**
 * Verifica ownership di una risorsa
 * Esempio: solo il proprietario può modificare i propri dati
 */
const requireOwnership = (getOwnerId) => {
    return async (req, res, next) => {
        try {
            const ownerId = await getOwnerId(req);
            
            if (!req.user || req.user.id !== ownerId.toString()) {
                throw AppError.forbidden('Non hai i permessi per questa azione');
            }
            
            next();
        } catch (error) {
            next(error);
        }
    };
};

// Utilizzo
router.delete('/decks/:id', 
    requireAuth,
    requireOwnership(async (req) => {
        const deck = await Deck.findById(req.params.id);
        return deck?.user;
    }),
    deckController.delete
);
```

---

## Security Configuration

### Centralized Config

```javascript
// server/config/security.js

module.exports = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET,
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        algorithm: 'HS256',
    },
    
    // Argon2 Configuration (OWASP recommended)
    argon2: {
        type: argon2id,
        memoryCost: 65536,    // 64MB
        timeCost: 3,          // 3 iterations
        parallelism: 4,       // 4 parallel threads
        hashLength: 32,
    },
    
    // Cookie Configuration
    cookie: {
        name: 'accessToken',
        refreshName: 'refreshToken',
        sameSitePolicy: 'lax',  // o 'none' per cross-origin
        requiresSecure: true,
        options: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60 * 1000,  // 15 minuti
        },
        refreshOptions: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/api/auth/refresh',
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 giorni
        },
    },
    
    // CSRF Configuration
    csrf: {
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-CSRF-Token',
        tokenBytes: 32,
    },
    
    // Rate Limiting
    rateLimit: {
        ai: {
            windowMs: 60 * 60 * 1000,  // 1 ora
            max: 10,
        },
        auth: {
            windowMs: 15 * 60 * 1000,  // 15 minuti
            max: 15,
            skipSuccessfulRequests: true,
        },
        general: {
            enabled: false,  // Disabilitato di default
            windowMs: 15 * 60 * 1000,
            max: 1000,
        },
    },
    
    // CORS Configuration
    cors: {
        origin: createCorsOriginValidator(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    },
    
    // Helmet Security Headers
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    },
};
```

---

## Best Practices

### 1. Cookie Security

```javascript
// ✅ CORRETTO: Cookie HttpOnly, Secure, SameSite
res.cookie('accessToken', token, {
    httpOnly: true,     // Non leggibile da JS (XSS protection)
    secure: true,       // Solo HTTPS
    sameSite: 'lax',    // CSRF protection
    maxAge: 15 * 60 * 1000,
});

// ❌ SBAGLIATO: Cookie insicuro
res.cookie('accessToken', token); // No security flags!
```

### 2. Token Blacklist

```javascript
// Implementa blacklist per revoca immediata
const blacklistToken = async (token, expiresAt) => {
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    await redis.setex(`bl:token:${token}`, ttl, '1');
};

// Verifica in requireAuth
const isBlacklisted = await redis.get(`bl:token:${token}`);
if (isBlacklisted) throw AppError.unauthorized('Token revocato');
```

### 3. Password Security

```javascript
// ✅ CORRETTO: Argon2id con parametri OWASP
const hashPassword = async (password) => {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
    });
};

// Verifica con timing-safe comparison integrata
const valid = await argon2.verify(hash, password);
```

### 4. Input Validation

```javascript
// ✅ CORRETTO: Validazione multi-layer
// 1. Schema Mongoose
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        match: /^\S+@\S+\.\S+$/,  // Regex validation
    },
});

// 2. Validation middleware
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        throw AppError.validation('Email non valida');
    }
    next();
};
```

### 5. Security Headers

```javascript
// Usa Helmet per security headers
app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true,
}));
```

---

## Checklist Sicurezza

- [ ] HTTPS in produzione
- [ ] Cookie HttpOnly, Secure, SameSite
- [ ] CSRF protection per state-changing ops
- [ ] Rate limiting su auth e AI endpoints
- [ ] Argon2id per password hashing
- [ ] JWT blacklist per logout/revoca
- [ ] Input validation su tutti gli endpoint
- [ ] Error messages generici in produzione
- [ ] Security headers (Helmet)
- [ ] CORS configurato correttamente
- [ ] Dependency scanning (npm audit)

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
