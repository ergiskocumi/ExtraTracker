/**
 * 🔐 CONFIGURAZIONE SICUREZZA CENTRALIZZATA
 * 
 * Perché centralizzare?
 * 1. Single Source of Truth: tutte le config in un posto
 * 2. Environment-aware: diversi valori per dev/staging/prod
 * 3. Facile auditing: un security engineer può verificare tutto qui
 */

const isProduction = process.env.NODE_ENV === 'production';

// Limite massimo sessioni attive per utente (previene DoS e crescita infinita array)
const MAX_ACTIVE_SESSIONS = 10;

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
            // Normalizza FRONTEND_URL (rimuove trailing slash se presente)
            const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
            
            // Log per debug in produzione
            if (isProduction && origin) {
                console.log(`🔍 CORS check - Origin: ${origin}, FRONTEND_URL: ${frontendUrl}`);
            }
            
            // Lista completa di domini permessi per sviluppo
            const allowedOrigins = [
                frontendUrl,
                // Anche con trailing slash per sicurezza
                frontendUrl ? `${frontendUrl}/` : null,
                // Vite default ports
                'http://localhost:5173',
                'http://localhost:5174',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5174',
                // React/Next.js default ports
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                // Altri porti comuni
                'http://localhost:8080',
                'http://127.0.0.1:8080',
            ].filter(Boolean); // Rimuove undefined/null
            
            // In sviluppo, permetti anche qualsiasi localhost (per flessibilità)
            const isDevelopment = !isProduction;
            
            // Permetti richieste senza origin (Postman, curl, mobile apps, same-origin requests)
            if (!origin) {
                return callback(null, true);
            }
            
            // In sviluppo: permetti qualsiasi localhost/127.0.0.1 per facilitare debugging
            if (isDevelopment) {
                try {
                    const url = new URL(origin);
                    const isLocalhost = 
                        url.hostname === 'localhost' || 
                        url.hostname === '127.0.0.1' ||
                        url.hostname === '::1' ||
                        url.hostname.startsWith('192.168.') || // Rete locale
                        url.hostname.startsWith('10.') || // Rete locale
                        url.hostname.startsWith('172.16.'); // Rete locale
                    
                    if (isLocalhost) {
                        return callback(null, true);
                    }
                } catch (e) {
                    // Se l'URL non è valido, continua con i controlli normali
                }
            }
            
            // Permetti tutti i preview deployments di Vercel del tuo progetto
            if (origin.includes('ergiskocumis-projects.vercel.app')) {
                return callback(null, true);
            }
            
            // Permetti il dominio principale Vercel
            if (origin === 'https://extra-tracker.vercel.app') {
                return callback(null, true);
            }
            
            // Permetti tutti i domini Vercel (preview deployments inclusi)
            if (origin && origin.includes('vercel.app')) {
                return callback(null, true);
            }
            
            // Controlla la lista esplicita
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            
            // In produzione, logga l'origin bloccato per debug
            console.warn(`⚠️  CORS: Origin bloccato: ${origin}`);
            console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
            console.warn(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'NON CONFIGURATO'}`);
            console.warn(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            
            // Blocca altri domini
            callback(new Error('Not allowed by CORS'));
        },
        
        // IMPORTANTE: necessario per inviare cookies cross-origin
        credentials: true,
        
        // Headers permessi (include tutti gli header necessari per preflight)
        allowedHeaders: [
            'Content-Type', 
            'Authorization', 
            'X-CSRF-Token',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-Request-ID',
        ],
        
        // Metodi permessi
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        
        // Headers esposti al frontend
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        
        // Max age per preflight requests (in secondi)
        maxAge: 86400, // 24 ore
    },

    // ==========================================
    // Helmet Security Headers
    // ==========================================
    helmet: {
        // Rimuove X-Powered-By: Express (nasconde tecnologia usata)
        // Helmet lo fa di default, ma lo esplicitiamo per chiarezza
        
        // Content Security Policy (previene XSS)
        contentSecurityPolicy: isProduction ? {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Per CSS inline
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [], // Forza HTTPS
            },
        } : false, // Disabilitato in sviluppo per facilitare debugging
        
        // X-Frame-Options: previene clickjacking (iframe embedding)
        // Helmet usa 'SAMEORIGIN' di default, ma possiamo essere più restrittivi
        frameguard: {
            action: 'deny', // Blocca completamente embedding in iframe
        },
        
        // X-Content-Type-Options: previene MIME type sniffing
        // Helmet lo imposta a 'nosniff' di default
        
        // X-XSS-Protection: attiva protezione XSS del browser (legacy, ma utile)
        // Helmet lo imposta di default
        
        // Strict-Transport-Security (HSTS): forza HTTPS
        hsts: isProduction ? {
            maxAge: 31536000, // 1 anno
            includeSubDomains: true,
            preload: true,
        } : false, // Disabilitato in sviluppo (HTTP locale)
        
        // Cross-Origin-Embedder-Policy: isola il contesto di esecuzione
        crossOriginEmbedderPolicy: isProduction,
        
        // Cross-Origin-Opener-Policy: previene attacchi cross-origin
        crossOriginOpenerPolicy: {
            policy: 'same-origin',
        },
        
        // Cross-Origin-Resource-Policy: controlla chi può caricare risorse
        // Cambiato a 'cross-origin' per permettere richieste da Vercel frontend
        crossOriginResourcePolicy: {
            policy: 'cross-origin',
        },
        
        // Referrer-Policy: controlla quanto del referrer viene inviato
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },
        
        // Permissions-Policy: disabilita feature del browser non necessarie
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
        // Limite massimo sessioni attive per utente
        // Previene DoS: array refreshTokens non può crescere indefinitamente
        maxActiveSessions: MAX_ACTIVE_SESSIONS,
        
        // Durata refresh token (7 giorni)
        refreshTokenExpiryDays: 7,
    },
};

// Esporta anche costanti utili
module.exports.MAX_ACTIVE_SESSIONS = MAX_ACTIVE_SESSIONS;
