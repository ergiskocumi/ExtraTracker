/**
 * 🔧 ENVIRONMENT CONFIGURATION - PRODUCTION
 * 
 * Configurazione per ambiente di produzione
 * Tutti i valori sono ottimizzati per sicurezza e performance in produzione
 */

module.exports = {
    // ==========================================
    // Server Configuration
    // ==========================================
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: 'production',
        trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
    },

    // ==========================================
    // Database Configuration
    // ==========================================
    database: {
        mongoUri: process.env.MONGO_URI, // OBBLIGATORIO in produzione
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
        serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
    },

    // ==========================================
    // Redis Configuration
    // ==========================================
    redis: {
        url: process.env.REDIS_URL, // Consigliato in produzione
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
    },

    // ==========================================
    // JWT Configuration
    // ==========================================
    jwt: {
        secret: process.env.JWT_SECRET, // OBBLIGATORIO in produzione (min 32 caratteri)
        accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
    },

    // ==========================================
    // Argon2 Configuration (Password Hashing)
    // ==========================================
    argon2: {
        type: parseInt(process.env.ARGON2_TYPE || '2', 10), // 2 = argon2id
        memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10), // 64MB
        timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
        parallelism: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),
        hashLength: parseInt(process.env.ARGON2_HASH_LENGTH || '32', 10),
    },

    // ==========================================
    // Cookie Configuration
    // ==========================================
    cookie: {
        name: process.env.COOKIE_NAME || 'accessToken',
        refreshName: process.env.COOKIE_REFRESH_NAME || 'refreshToken',
        sameSite: process.env.COOKIE_SAME_SITE || 'lax', // 'lax', 'strict', o 'none'
        secure: process.env.COOKIE_SECURE !== 'false', // true in produzione (HTTPS richiesto)
        accessTokenMaxAge: parseInt(process.env.COOKIE_ACCESS_TOKEN_MAX_AGE || '900000', 10), // 15 minuti in ms
        refreshTokenMaxAge: parseInt(process.env.COOKIE_REFRESH_TOKEN_MAX_AGE || '604800000', 10), // 7 giorni in ms
        refreshTokenPath: process.env.COOKIE_REFRESH_TOKEN_PATH || '/api/auth/refresh',
    },

    // ==========================================
    // CSRF Configuration
    // ==========================================
    csrf: {
        cookieName: process.env.CSRF_COOKIE_NAME || 'csrfToken',
        headerName: process.env.CSRF_HEADER_NAME || 'X-CSRF-Token',
        tokenBytes: parseInt(process.env.CSRF_TOKEN_BYTES || '32', 10),
        cookieMaxAge: parseInt(process.env.CSRF_COOKIE_MAX_AGE || '604800000', 10),
    },

    // ==========================================
    // Encryption Configuration
    // ==========================================
    encryption: {
        key: process.env.DATA_ENCRYPTION_KEY || '',
    },

    // ==========================================
    // Rate Limiting Configuration
    // ==========================================
    rateLimit: {
        // Rate limiter generale - molto permissivo per non bloccare utenti normali
        // Applicato solo se esplicitamente richiesto (non più globale)
        general: {
            windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '900000', 10), // 15 minuti
            max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '1000', 10), // Molto permissivo: 1000 richieste per 15 minuti
            enabled: process.env.RATE_LIMIT_GENERAL_ENABLED !== 'false', // Abilitato di default in produzione
        },
        // Rate limiter per autenticazione - previene brute force
        auth: {
            windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // 15 minuti
            max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '15', 10),
            skipSuccessfulRequests: process.env.RATE_LIMIT_AUTH_SKIP_SUCCESS !== 'false',
        },
        // Rate limiter per chiamate AI - molto restrittivo per prevenire abusi
        // Le chiamate AI sono costose e devono essere limitate severamente
        ai: {
            windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS || '3600000', 10), // 1 ora
            max: parseInt(process.env.RATE_LIMIT_AI_MAX || '10', 10), // Solo 10 chiamate AI per ora per utente
            keyGenerator: 'userId', // Usa userId invece di IP per limitare per utente autenticato
        },
    },

    // ==========================================
    // CORS Configuration
    // ==========================================
    cors: {
        allowAllOrigins: false, // In produzione usa whitelist
        allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
            ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
            : [],
        allowedOriginPatterns: process.env.CORS_ALLOWED_ORIGIN_PATTERNS
            ? process.env.CORS_ALLOWED_ORIGIN_PATTERNS.split(',').map(pattern => pattern.trim())
            : ['.netlify.app', '.vercel.app'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Origin', 'X-Request-ID'],
    },

    // ==========================================
    // Helmet Security Headers Configuration
    // ==========================================
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        frameguard: {
            action: process.env.HELMET_FRAMEGUARD_ACTION || 'deny',
        },
        hsts: {
            maxAge: parseInt(process.env.HELMET_HSTS_MAX_AGE || '31536000', 10), // 1 anno
            includeSubDomains: process.env.HELMET_HSTS_INCLUDE_SUBDOMAINS !== 'false',
            preload: process.env.HELMET_HSTS_PRELOAD !== 'false',
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: {
            policy: process.env.HELMET_CORP_POLICY || 'cross-origin',
        },
        referrerPolicy: {
            policy: process.env.HELMET_REFERRER_POLICY || 'strict-origin-when-cross-origin',
        },
        permissionsPolicy: {
            features: {
                camera: ["'none'"],
                microphone: ["'none'"],
                geolocation: ["'none'"],
            },
        },
    },

    // ==========================================
    // Session Management Configuration
    // ==========================================
    session: {
        maxActiveSessions: parseInt(process.env.SESSION_MAX_ACTIVE_SESSIONS || '10', 10),
        refreshTokenExpiryDays: parseInt(process.env.SESSION_REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
    },

    // ==========================================
    // Body Parser Configuration
    // ==========================================
    bodyParser: {
        jsonLimit: process.env.BODY_PARSER_JSON_LIMIT || '10kb',
        urlencodedLimit: process.env.BODY_PARSER_URLENCODED_LIMIT || '10kb',
        importJsonLimit: process.env.BODY_PARSER_IMPORT_JSON_LIMIT || '50mb',
    },

    // ==========================================
    // URLs Configuration
    // ==========================================
    urls: {
        frontendUrl: process.env.FRONTEND_URL, // OBBLIGATORIO in produzione
        backendUrl: process.env.BACKEND_URL, // OBBLIGATORIO in produzione
    },

    // ==========================================
    // Monitoring & Logging Configuration
    // ==========================================
    monitoring: {
        eventMetricsInterval: parseInt(process.env.MONITORING_EVENT_METRICS_INTERVAL || '300000', 10), // 5 minuti
        enableEventMetricsLogging: process.env.MONITORING_ENABLE_EVENT_METRICS_LOGGING !== 'false',
    },
};
