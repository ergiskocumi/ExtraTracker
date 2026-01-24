/**
 * 🔐 CONFIGURAZIONE SICUREZZA CENTRALIZZATA
 * 
 * Perché centralizzare?
 * 1. Single Source of Truth: tutte le config in un posto
 * 2. Environment-aware: diversi valori per dev/staging/prod
 * 3. Facile auditing: un security engineer può verificare tutto qui
 * 
 * NOTA: Tutti i valori vengono caricati da ENVIRONMENTS/config
 * Nessun valore hardcoded - tutto configurabile via variabili d'ambiente
 */

const { config: envConfig, isProduction } = require('../ENVIRONMENTS');

/**
 * Determina se frontend e backend sono sullo stesso dominio
 * Se FRONTEND_URL e BACKEND_URL hanno lo stesso dominio, possiamo usare SameSite: 'lax' o 'strict'
 * Altrimenti dobbiamo usare SameSite: 'none' (richiede HTTPS)
 */
const isSameOrigin = () => {
    const frontendUrl = envConfig.urls.frontendUrl || '';
    const backendUrl = envConfig.urls.backendUrl || '';
    
    if (!frontendUrl || !backendUrl) {
        // Se non configurato, assume cross-origin (usa 'none')
        return false;
    }
    
    try {
        const frontendDomain = new URL(frontendUrl).hostname;
        const backendDomain = new URL(backendUrl).hostname;
        
        // Stesso dominio (es: app.example.com e api.example.com sono considerati cross-site)
        // Ma se usi reverse proxy (es: example.com/app e example.com/api), sono same-site
        // Per semplicità, consideriamo same-origin solo se dominio esatto identico
        // In produzione, usa reverse proxy per far sembrare tutto stesso dominio
        return frontendDomain === backendDomain;
    } catch {
        return false;
    }
};

/**
 * Determina SameSite policy ottimale
 * - 'strict': Massima sicurezza, cookie solo same-site (stesso dominio)
 * - 'lax': Cookie inviato per navigazione top-level (default moderno, buon compromesso)
 * - 'none': Cookie sempre inviato (richiede Secure: true, solo se cross-origin necessario)
 */
const getSameSitePolicy = () => {
    // Se configurato esplicitamente, usa quello
    if (envConfig.cookie.sameSite) {
        return envConfig.cookie.sameSite;
    }
    
    // In sviluppo: usa 'lax' perché Vite proxy fa sembrare tutto same-origin
    if (!isProduction) {
        return 'lax';
    }
    
    // In produzione: se stesso dominio, usa 'lax' (più sicuro di 'none')
    if (isSameOrigin()) {
        return 'lax'; // o 'strict' se vuoi massima sicurezza
    }
    
    // Cross-origin in produzione: devi usare 'none' (richiede HTTPS)
    return 'none';
};

/**
 * Determina se Secure cookie è richiesto
 */
const getSecureCookie = () => {
    // Se configurato esplicitamente, usa quello
    if (envConfig.cookie.secure !== undefined) {
        return envConfig.cookie.secure;
    }
    
    // Secure: true è richiesto se SameSite: 'none'
    if (getSameSitePolicy() === 'none') {
        return true;
    }
    
    // In produzione sempre true (HTTPS richiesto)
    return isProduction;
};

/**
 * CORS Origin Validator
 * Valida le richieste CORS basandosi sulla configurazione
 */
const createCorsOriginValidator = () => {
    return (origin, callback) => {
        // 1. Permetti richieste senza 'origin' (es. app mobile, curl, postman)
        if (!origin) {
            return callback(null, true);
        }

        // 2. In sviluppo, se allowAllOrigins è true, permetti tutto
        if (envConfig.cors.allowAllOrigins) {
            return callback(null, true);
        }

        // 3. Pulisci l'origin (rimuovi slash finale)
        const requestOrigin = origin.replace(/\/$/, '');
        const envFrontendUrl = (envConfig.urls.frontendUrl || '').replace(/\/$/, '');

        // 4. Controlla whitelist esplicita
        const allowedOrigins = envConfig.cors.allowedOrigins || [];
        if (allowedOrigins.includes(requestOrigin) || requestOrigin === envFrontendUrl) {
            return callback(null, true);
        }

        // 5. Controlla pattern (es: .netlify.app, .vercel.app)
        const allowedPatterns = envConfig.cors.allowedOriginPatterns || [];
        const matchesPattern = allowedPatterns.some(pattern => {
            if (pattern.startsWith('.')) {
                // Pattern come '.netlify.app' - matcha qualsiasi sottodominio
                return requestOrigin.endsWith(pattern);
            }
            // Pattern personalizzato (regex supporto futuro)
            return requestOrigin.includes(pattern);
        });

        if (matchesPattern) {
            return callback(null, true);
        }

        console.warn(`🛑 CORS BLOCCATO: ${requestOrigin}`);
        callback(new Error('Bloccato dalla policy CORS'));
    };
};

module.exports = {
    // ==========================================
    // JWT Configuration
    // ==========================================
    jwt: {
        secret: envConfig.jwt.secret,
        accessTokenExpiry: envConfig.jwt.accessTokenExpiry,
        refreshTokenExpiry: envConfig.jwt.refreshTokenExpiry,
        algorithm: envConfig.jwt.algorithm,
    },

    // ==========================================
    // Argon2 Configuration (Password Hashing)
    // ==========================================
    argon2: {
        type: envConfig.argon2.type,
        memoryCost: envConfig.argon2.memoryCost,
        timeCost: envConfig.argon2.timeCost,
        parallelism: envConfig.argon2.parallelism,
        hashLength: envConfig.argon2.hashLength,
    },

    // ==========================================
    // Cookie Configuration
    // ==========================================
    cookie: {
        name: envConfig.cookie.name,
        refreshName: envConfig.cookie.refreshName,
        sameSitePolicy: getSameSitePolicy(),
        requiresSecure: getSameSitePolicy() === 'none',
        options: {
            httpOnly: true,
            secure: getSecureCookie(),
            sameSite: getSameSitePolicy(),
            path: '/',
            maxAge: envConfig.cookie.accessTokenMaxAge,
        },
        refreshOptions: {
            httpOnly: true,
            secure: getSecureCookie(),
            sameSite: getSameSitePolicy(),
            path: envConfig.cookie.refreshTokenPath,
            maxAge: envConfig.cookie.refreshTokenMaxAge,
        },
    },

    // ==========================================
    // CSRF Configuration
    // ==========================================
    csrf: {
        cookieName: envConfig.csrf.cookieName,
        headerName: envConfig.csrf.headerName,
        tokenBytes: envConfig.csrf.tokenBytes,
        cookieOptions: {
            httpOnly: false,
            secure: getSecureCookie(),
            sameSite: getSameSitePolicy(),
            path: '/',
            maxAge: envConfig.csrf.cookieMaxAge,
        },
    },

    // ==========================================
    // Rate Limiting Configuration
    // ==========================================
    rateLimit: {
        general: {
            windowMs: envConfig.rateLimit.general.windowMs,
            max: envConfig.rateLimit.general.max,
            enabled: envConfig.rateLimit.general.enabled,
            message: {
                status: 429,
                message: 'Troppe richieste, riprova tra 15 minuti',
            },
            standardHeaders: true,
            legacyHeaders: false,
        },
        auth: {
            windowMs: envConfig.rateLimit.auth.windowMs,
            max: envConfig.rateLimit.auth.max,
            message: {
                status: 429,
                message: 'Troppi tentativi di accesso, riprova tra 15 minuti',
            },
            skipSuccessfulRequests: envConfig.rateLimit.auth.skipSuccessfulRequests,
        },
        ai: {
            windowMs: envConfig.rateLimit.ai.windowMs,
            max: envConfig.rateLimit.ai.max,
            keyGenerator: envConfig.rateLimit.ai.keyGenerator,
            message: {
                status: 429,
                message: 'Hai raggiunto il limite di chiamate AI. Riprova tra un\'ora.',
            },
        },
    },

    // ==========================================
    // CORS Configuration
    // ==========================================
    cors: {
        origin: createCorsOriginValidator(),
        credentials: envConfig.cors.credentials,
        methods: envConfig.cors.methods,
        allowedHeaders: envConfig.cors.allowedHeaders,
    },

    // ==========================================
    // Helmet Security Headers
    // ==========================================
    helmet: envConfig.helmet,

    // ==========================================
    // Session Management Configuration
    // ==========================================
    session: {
        maxActiveSessions: envConfig.session.maxActiveSessions,
        refreshTokenExpiryDays: envConfig.session.refreshTokenExpiryDays,
    },
};

// Esporta anche costanti utili
module.exports.MAX_ACTIVE_SESSIONS = envConfig.session.maxActiveSessions;
