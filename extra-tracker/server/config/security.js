/**
 * 🔐 CONFIGURAZIONE SICUREZZA CENTRALIZZATA
 * 
 * Perché centralizzare?
 * 1. Single Source of Truth: tutte le config in un posto
 * 2. Environment-aware: diversi valori per dev/staging/prod
 * 3. Facile auditing: un security engineer può verificare tutto qui
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determina se frontend e backend sono sullo stesso dominio
 * Se FRONTEND_URL e BACKEND_URL hanno lo stesso dominio, possiamo usare SameSite: 'lax' o 'strict'
 * Altrimenti dobbiamo usare SameSite: 'none' (richiede HTTPS)
 */
const isSameOrigin = () => {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const backendUrl = process.env.BACKEND_URL || '';
    
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
        name: 'accessToken',
        refreshName: 'refreshToken',
        
        // Determina SameSite policy ottimale
        sameSitePolicy: getSameSitePolicy(),
        
        // Secure: true è richiesto se SameSite: 'none'
        // In produzione sempre true (HTTPS), in sviluppo false (HTTP locale)
        // NOTA: Se SameSite: 'none', Secure DEVE essere true
        requiresSecure: getSameSitePolicy() === 'none',
        
        options: {
            httpOnly: true,
            // Secure: true se produzione O se SameSite: 'none' (richiesto)
            secure: isProduction || getSameSitePolicy() === 'none',
            sameSite: getSameSitePolicy(),
            path: '/',
            maxAge: 15 * 60 * 1000, // 15 minuti
        },
        
        refreshOptions: {
            httpOnly: true,
            // Secure: true se produzione O se SameSite: 'none' (richiesto)
            secure: isProduction || getSameSitePolicy() === 'none',
            sameSite: getSameSitePolicy(),
            path: '/api/auth/refresh',
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
            max: 200, // ← AUMENTATO da 100 a 200
            message: {
                status: 429,
                message: 'Troppe richieste, riprova tra 15 minuti',
            },
            standardHeaders: true,
            legacyHeaders: false,
        },
        
        // Limite per login (anti brute-force)
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minuti
            max: 15, // ← AUMENTATO da 5 a 15
            message: {
                status: 429,
                message: 'Troppi tentativi di accesso, riprova tra 15 minuti',
            },
            skipSuccessfulRequests: true,
        },
    },

    // ==========================================
// CORS Configuration
// ==========================================
cors: {
    // Funzione per validare origin dinamicamente
    origin: (origin, callback) => {
        // Lista di domini permessi
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:5173',
            'http://localhost:5174',
        ].filter(Boolean);
        
        // Permetti richieste senza origin (Postman, curl, mobile apps)
        if (!origin) {
            return callback(null, true);
        }
        
        // Permetti tutti i preview deployments di Vercel del tuo progetto
        if (origin.includes('ergiskocumis-projects.vercel.app')) {
            return callback(null, true);
        }
        
        // Permetti il dominio principale
        if (origin === 'https://extra-tracker.vercel.app') {
            return callback(null, true);
        }
        
        // Controlla la lista
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Blocca altri domini
        callback(new Error('Not allowed by CORS'));
    },
    
    // IMPORTANTE: necessario per inviare cookies cross-origin
    credentials: true,
    
    // Headers permessi
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    
    // Metodi permessi
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
