/**
 * 🔐 CONFIGURAZIONE SICUREZZA CENTRALIZZATA
 * 
 * Perché centralizzare?
 * 1. Single Source of Truth: tutte le config in un posto
 * 2. Environment-aware: diversi valori per dev/staging/prod
 * 3. Facile auditing: un security engineer può verificare tutto qui
 */

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    // ==========================================
    // JWT Configuration
    // ==========================================
    jwt: {
        // In produzione DEVE essere una stringa lunga e random (32+ caratteri)
        // Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_use_at_least_32_chars',
        
        // Durata token di accesso (breve per sicurezza)
        accessTokenExpiry: '15m',
        
        // Durata refresh token (più lunga, ma conservata sicuramente)
        refreshTokenExpiry: '7d',
        
        // Algoritmo di firma (HS256 è simmetrico, RS256 per microservizi)
        algorithm: 'HS256',
    },

    // ==========================================
    // Argon2 Configuration (Password Hashing)
    // ==========================================
    argon2: {
        // Tipo: argon2id è il più sicuro (resiste a side-channel + GPU)
        type: 2, // argon2id
        
        // Memoria in KB (64MB - aumenta resistenza a GPU attacks)
        memoryCost: 65536,
        
        // Iterazioni (più alto = più lento = più sicuro)
        timeCost: 3,
        
        // Parallelismo (usa più core CPU)
        parallelism: 4,
        
        // Lunghezza hash in bytes
        hashLength: 32,
    },

    // ==========================================
    // Cookie Configuration
    // ==========================================
    cookie: {
        // Nome del cookie
        name: 'accessToken',
        refreshName: 'refreshToken',
        
        options: {
            // HttpOnly: JavaScript NON può leggere il cookie (anti-XSS)
            httpOnly: true,
            
            // Secure: invia solo su HTTPS (OBBLIGATORIO in produzione)
            secure: isProduction,
            
            // SameSite: previene CSRF
            // 'strict': cookie inviato solo se la richiesta proviene dallo stesso sito
            // 'lax': permette navigazione top-level (link esterni)
            // 'none': richiede secure=true, per cross-site
            sameSite: isProduction ? 'strict' : 'lax',
            
            // Path: il cookie è valido solo per queste routes
            path: '/',
            
            // MaxAge in millisecondi (15 minuti per access token)
            maxAge: 15 * 60 * 1000,
        },
        
        refreshOptions: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/auth/refresh', // Solo per endpoint refresh!
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
        },
    },

    // ==========================================
    // Rate Limiting Configuration
    // ==========================================
    rateLimit: {
        // Limite generale API
        general: {
            windowMs: 15 * 60 * 1000, // 15 minuti
            max: 100, // max 100 richieste per IP
            message: {
                status: 429,
                message: 'Troppe richieste, riprova tra 15 minuti',
            },
            standardHeaders: true,
            legacyHeaders: false,
        },
        
        // Limite stringente per login (anti brute-force)
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minuti
            max: 5, // solo 5 tentativi di login
            message: {
                status: 429,
                message: 'Troppi tentativi di accesso, riprova tra 15 minuti',
            },
            skipSuccessfulRequests: true, // Non contare i login riusciti
        },
    },

    // ==========================================
    // CORS Configuration
    // ==========================================
    cors: {
        // In produzione: specifica il dominio esatto del frontend
        origin: isProduction 
            ? process.env.FRONTEND_URL 
            : ['http://localhost:5173', 'http://localhost:5174'],
        
        // IMPORTANTE: necessario per inviare cookies cross-origin
        credentials: true,
        
        // Headers permessi
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        
        // Metodi permessi
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },

    // ==========================================
    // Helmet Security Headers
    // ==========================================
    helmet: {
        // Content Security Policy
        contentSecurityPolicy: isProduction ? {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Per CSS inline
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        } : false,
        
        // Cross-Origin-Embedder-Policy
        crossOriginEmbedderPolicy: isProduction,
    },
};
