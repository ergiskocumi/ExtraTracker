/**
 * 🔧 SERVIZIO AUTENTICAZIONE
 * 
 * Questo layer contiene la logica PURA (no HTTP, no Express)
 * Vantaggi:
 * 1. Testabile: puoi testare senza simulare richieste HTTP
 * 2. Riutilizzabile: può essere usato da CLI, worker, etc.
 * 3. Separazione responsabilità: controller gestisce HTTP, service la logica
 */

const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');

/**
 * Utility per estrarre informazioni dispositivo da request
 * @param {object} req - Express request object
 * @returns {object} - { device, userAgent, ip }
 */
const getDeviceInfo = (req) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.socket?.remoteAddress || 'Unknown';
    
    // Estrai tipo dispositivo da User-Agent
    let device = 'Unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        device = 'Tablet';
    } else if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
        device = 'Desktop';
    }
    
    return { device, userAgent, ip };
};

class AuthService {
    // ==========================================
    // PASSWORD HASHING (Argon2)
    // ==========================================

    /**
     * Hash password con Argon2id
     * 
     * Perché Argon2id?
     * - Resiste a GPU attacks (memory-hard)
     * - Resiste a side-channel attacks
     * - Vincitore Password Hashing Competition 2015
     * 
     * @param {string} password - Password in chiaro
     * @returns {Promise<string>} - Hash della password
     */
    async hashPassword(password) {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: securityConfig.argon2.memoryCost,
            timeCost: securityConfig.argon2.timeCost,
            parallelism: securityConfig.argon2.parallelism,
            hashLength: securityConfig.argon2.hashLength,
        });
    }

    /**
     * Verifica password contro hash
     * 
     * @param {string} hash - Hash salvato nel DB
     * @param {string} password - Password da verificare
     * @returns {Promise<boolean>}
     */
    async verifyPassword(hash, password) {
        try {
            return await argon2.verify(hash, password);
        } catch {
            // In caso di errore (hash corrotto), ritorna false
            return false;
        }
    }

    // ==========================================
    // JWT TOKEN MANAGEMENT
    // ==========================================

    /**
     * Genera Access Token (breve durata)
     * 
     * @param {object} user - Oggetto utente
     * @returns {string} - JWT token
     */
    generateAccessToken(user) {
        const payload = {
            sub: user._id.toString(), // Subject: ID utente
            email: user.email,
            type: 'access',
        };

        return jwt.sign(payload, securityConfig.jwt.secret, {
            expiresIn: securityConfig.jwt.accessTokenExpiry,
            algorithm: securityConfig.jwt.algorithm,
        });
    }

    /**
     * Genera Refresh Token (lunga durata)
     * Il refresh token è un JWT + random string per extra sicurezza
     * 
     * @param {object} user - Oggetto utente
     * @param {object} deviceInfo - { device, userAgent, ip }
     * @returns {{ token: string, hash: string, sessionData: object }}
     */
    async generateRefreshToken(user, deviceInfo = {}) {
        // Parte random per unicità
        const randomPart = crypto.randomBytes(32).toString('hex');

        const payload = {
            sub: user._id.toString(),
            type: 'refresh',
            jti: randomPart, // JWT ID unico
        };

        const token = jwt.sign(payload, securityConfig.jwt.secret, {
            expiresIn: securityConfig.jwt.refreshTokenExpiry,
            algorithm: securityConfig.jwt.algorithm,
        });

        // Hash del token per salvarlo nel DB (non salvare mai token in chiaro!)
        const hash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Dati sessione da salvare nel DB
        const sessionData = {
            hash,
            device: deviceInfo.device || 'Unknown',
            userAgent: deviceInfo.userAgent || 'Unknown',
            ip: deviceInfo.ip || 'Unknown',
            createdAt: new Date(),
            lastUsedAt: new Date(),
        };

        return { token, hash, sessionData };
    }

    /**
     * Verifica un token JWT
     * 
     * @param {string} token - Token da verificare
     * @param {string} expectedType - 'access' o 'refresh'
     * @returns {object} - Payload decodificato
     */
    verifyToken(token, expectedType = 'access') {
        try {
            const payload = jwt.verify(token, securityConfig.jwt.secret, {
                algorithms: [securityConfig.jwt.algorithm],
            });

            // Verifica tipo token
            if (payload.type !== expectedType) {
                throw AppError.unauthorized('Token non valido');
            }

            return payload;
        } catch (error) {
            if (error instanceof AppError) throw error;
            
            if (error.name === 'TokenExpiredError') {
                throw AppError.unauthorized('Sessione scaduta, effettua nuovamente il login');
            }
            if (error.name === 'JsonWebTokenError') {
                throw AppError.unauthorized('Token non valido');
            }
            
            throw AppError.unauthorized('Errore verifica token');
        }
    }

    // ==========================================
    // BUSINESS LOGIC
    // ==========================================

    /**
     * Registra nuovo utente
     * 
     * @param {object} data - { email, password, acceptTerms }
     * @param {object} deviceInfo - { device, userAgent, ip } (opzionale)
     * @returns {Promise<{ user: User, accessToken: string, refreshToken: string }>}
     */
    async register(data, deviceInfo = {}) {
        const { email, password, acceptTerms } = data;

        // Verifica email non esistente
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Messaggio generico per non rivelare se email esiste
            throw AppError.conflict('Impossibile completare la registrazione');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Crea utente
        const user = new User({
            email,
            password: hashedPassword,
            consent: {
                termsAccepted: acceptTerms,
                termsAcceptedAt: new Date(),
                privacyVersion: '1.0',
            },
            refreshTokens: [], // Inizializza array vuoto
        });

        await user.save();

        // Genera token con device info
        const accessToken = this.generateAccessToken(user);
        const { token: refreshToken, sessionData } = await this.generateRefreshToken(user, deviceInfo);

        // Aggiungi nuova sessione all'array
        user.refreshTokens.push(sessionData);
        await user.save();

        return { user, accessToken, refreshToken };
    }

    /**
     * Login utente
     * 
     * @param {object} data - { email, password }
     * @param {object} deviceInfo - { device, userAgent, ip } (opzionale)
     * @returns {Promise<{ user: User, accessToken: string, refreshToken: string }>}
     */
    async login(data, deviceInfo = {}) {
        const { email, password } = data;

        // Trova utente con campi nascosti
        const user = await User.findForLogin(email);

        // Messaggio generico per non rivelare se email esiste
        if (!user) {
            throw AppError.unauthorized('Email o password non corretti');
        }

        // Verifica se account bloccato
        if (user.isLocked) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw AppError.unauthorized(
                `Account temporaneamente bloccato. Riprova tra ${minutesLeft} minuti`
            );
        }

        // Verifica password
        const isValidPassword = await this.verifyPassword(user.password, password);

        if (!isValidPassword) {
            // Incrementa tentativi falliti
            await user.incrementFailedAttempts();
            throw AppError.unauthorized('Email o password non corretti');
        }

        // Login riuscito: resetta contatore
        await user.resetFailedAttempts();

        // Assicurati che refreshTokens sia un array
        if (!user.refreshTokens) {
            user.refreshTokens = [];
        }

        // Genera token con device info
        const accessToken = this.generateAccessToken(user);
        const { token: refreshToken, sessionData } = await this.generateRefreshToken(user, deviceInfo);

        // Aggiungi nuova sessione all'array (non sovrascrive sessioni esistenti!)
        user.refreshTokens.push(sessionData);
        await user.save();

        return { user, accessToken, refreshToken };
    }

    /**
     * Refresh access token usando refresh token
     * 
     * @param {string} refreshToken - Refresh token attuale
     * @param {object} deviceInfo - { device, userAgent, ip } (opzionale)
     * @returns {Promise<{ user: User, accessToken: string, newRefreshToken: string }>}
     */
    async refreshAccessToken(refreshToken, deviceInfo = {}) {
        // Verifica refresh token
        const payload = this.verifyToken(refreshToken, 'refresh');

        // Trova utente con array refreshTokens
        const user = await User.findByRefreshToken(payload.sub);
        if (!user) {
            throw AppError.unauthorized('Sessione non valida');
        }

        // Verifica hash del refresh token
        const tokenHash = crypto
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // Trova sessione specifica nell'array
        const session = user.findSessionByHash(tokenHash);
        
        if (!session) {
            // Token non trovato: possibile furto o token già invalidato
            // Invalida tutte le sessioni per sicurezza
            await user.removeAllSessions();
            throw AppError.unauthorized('Sessione non valida o scaduta');
        }

        // Aggiorna lastUsedAt per questa sessione
        session.lastUsedAt = new Date();

        // Genera nuovi token (rotation) - mantieni stesso device info
        const newAccessToken = this.generateAccessToken(user);
        const { token: newRefreshToken, sessionData: newSessionData } = 
            await this.generateRefreshToken(user, {
                device: session.device,
                userAgent: deviceInfo.userAgent || session.userAgent,
                ip: deviceInfo.ip || session.ip,
            });

        // Rimuovi vecchia sessione e aggiungi nuova (rotation)
        user.refreshTokens = user.refreshTokens.filter(
            s => s.hash !== tokenHash
        );
        user.refreshTokens.push(newSessionData);
        await user.save();

        return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    /**
     * Logout utente (invalida refresh token specifico o tutti)
     * 
     * @param {string} userId - ID utente
     * @param {string} refreshToken - Refresh token da invalidare (opzionale, se non fornito invalida tutti)
     * @returns {Promise<void>}
     */
    async logout(userId, refreshToken = null) {
        const user = await User.findById(userId).select('+refreshTokens');
        
        if (!user) {
            return; // Utente non trovato, niente da fare
        }

        if (refreshToken) {
            // Invalida solo la sessione specifica
            const tokenHash = crypto
                .createHash('sha256')
                .update(refreshToken)
                .digest('hex');
            await user.removeSessionByHash(tokenHash);
        } else {
            // Invalida tutte le sessioni (logout da tutti i dispositivi)
            await user.removeAllSessions();
        }
    }

    /**
     * Cambia password
     * 
     * @param {string} userId - ID utente
     * @param {string} currentPassword - Password attuale
     * @param {string} newPassword - Nuova password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');
        
        if (!user) {
            throw AppError.notFound('Utente');
        }

        // Verifica password attuale
        const isValid = await this.verifyPassword(user.password, currentPassword);
        if (!isValid) {
            throw AppError.unauthorized('Password attuale non corretta');
        }

        // Hash nuova password
        user.password = await this.hashPassword(newPassword);
        
        // Invalida tutti i refresh token (force re-login da tutti i dispositivi)
        user.refreshTokens = [];
        
        await user.save();
    }

    /**
     * Ottieni profilo utente corrente
     * 
     * @param {string} userId - ID utente
     * @returns {Promise<User>}
     */
    async getProfile(userId) {
        const user = await User.findById(userId);
        
        if (!user) {
            throw AppError.notFound('Utente');
        }

        return user;
    }
}

// Crea singleton
const authService = new AuthService();

// Esporta singleton e utility
module.exports = authService;
module.exports.getDeviceInfo = getDeviceInfo;