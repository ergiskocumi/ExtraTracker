/**
 * 🔧 ENVIRONMENT CONFIGURATION - DEVELOPMENT
 * 
 * Configurazione per ambiente di sviluppo locale
 * Tutti i valori sono ottimizzati per sviluppo locale
 */

module.exports = {
    // ==========================================
    // Server Configuration
    // ==========================================
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: 'development',
        trustProxy: 1, // Per Vite proxy in sviluppo
    },

    // ==========================================
    // Database Configuration
    // ==========================================
    database: {
        mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/extratracker',
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
        serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
    },

    // ==========================================
    // Redis Configuration
    // ==========================================
    redis: {
        url: process.env.REDIS_URL || null, // Opzionale in sviluppo
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
    },

    // ==========================================
    // JWT Configuration
    // ==========================================
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-use-at-least-32-chars',
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
        sameSite: process.env.COOKIE_SAME_SITE || 'lax', // In dev usa 'lax'
        secure: process.env.COOKIE_SECURE === 'true' || false, // false in dev
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
            enabled: process.env.RATE_LIMIT_GENERAL_ENABLED === 'true' || false, // Disabilitato di default
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
        // In sviluppo permette tutto
        allowAllOrigins: true,
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
        contentSecurityPolicy: false, // Disabilitato in sviluppo
        frameguard: {
            action: process.env.HELMET_FRAMEGUARD_ACTION || 'deny',
        },
        hsts: false, // Disabilitato in sviluppo (HTTP locale)
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
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    },

    // ==========================================
    // Monitoring & Logging Configuration
    // ==========================================
    monitoring: {
        eventMetricsInterval: parseInt(process.env.MONITORING_EVENT_METRICS_INTERVAL || '300000', 10), // 5 minuti
        enableEventMetricsLogging: process.env.MONITORING_ENABLE_EVENT_METRICS_LOGGING !== 'false',
    },
};
