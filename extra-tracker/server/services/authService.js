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
const { MAX_ACTIVE_SESSIONS } = require('../config/security');
const { MAX_ACTIVE_SESSIONS } = require('../config/security');

// Durata grace period per race condition (30 secondi)
const GRACE_PERIOD_MS = 30 * 1000;

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
    // SESSION MANAGEMENT
    // ==========================================

    /**
     * Pulisci sessioni scadute (refresh token scaduti oltre 7 giorni)
     * @param {User} user - Oggetto utente
     */
    cleanExpiredSessions(user) {
        if (!user.refreshTokens || user.refreshTokens.length === 0) {
            return;
        }

        const now = Date.now();
        const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry 
            ? this.parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
            : 7 * 24 * 60 * 60 * 1000; // Default 7 giorni

        // Rimuovi sessioni scadute (createdAt + expiry < now)
        user.refreshTokens = user.refreshTokens.filter(session => {
            const createdAt = new Date(session.createdAt).getTime();
            return (createdAt + refreshTokenExpiryMs) > now;
        });
    }

    /**
     * Converte stringa expiry (es. '7d') in millisecondi
     * @param {string} expiry - Stringa tipo '7d', '15m', etc.
     * @returns {number} - Millisecondi
     */
    parseExpiryToMs(expiry) {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 giorni

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 7 * 24 * 60 * 60 * 1000;
        }
    }

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

        // Aggiungi nuova sessione usando operatore atomico (evita conflitti di versione)
        await User.updateOne(
            { _id: user._id },
            {
                $push: { refreshTokens: sessionData }
            }
        );

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

        // Genera token con device info
        const accessToken = this.generateAccessToken(user);
        const { token: refreshToken, sessionData } = await this.generateRefreshToken(user, deviceInfo);

        // Usa operatori atomici MongoDB per evitare conflitti di versione
        // Pulisci sessioni scadute e aggiungi nuova sessione atomicamente
        const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry 
            ? this.parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
            : 7 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(Date.now() - refreshTokenExpiryMs);

        // Operazione atomica: pulisci scadute e aggiungi nuova
        await User.updateOne(
            { _id: user._id },
            {
                $push: { refreshTokens: sessionData },
                $pull: {
                    refreshTokens: {
                        createdAt: { $lt: expiryDate }
                    }
                }
            }
        );

        // Applica limite FIFO se necessario (operazione separata ma atomica)
        // Usa findOneAndUpdate con aggregation pipeline per garantire atomicità
        const result = await User.findOneAndUpdate(
            { _id: user._id },
            [
                {
                    $set: {
                        refreshTokens: {
                            $cond: {
                                if: { $gt: [{ $size: '$refreshTokens' }, MAX_ACTIVE_SESSIONS] },
                                then: {
                                    $slice: [
                                        {
                                            $sortArray: {
                                                input: '$refreshTokens',
                                                sortBy: { lastUsedAt: 1, createdAt: 1 }
                                            }
                                        },
                                        -MAX_ACTIVE_SESSIONS
                                    ]
                                },
                                else: '$refreshTokens'
                            }
                        }
                    }
                }
            ],
            { new: true }
        );

        // Aggiorna oggetto user locale con risultato
        if (result) {
            Object.assign(user, result.toObject());
        }

        return { user, accessToken, refreshToken };
    }

    /**
     * Refresh access token usando refresh token
     * Implementa grace period per gestire race conditions
     * 
     * @param {string} refreshToken - Refresh token attuale
     * @param {object} deviceInfo - { device, userAgent, ip } (opzionale)
     * @returns {Promise<{ user: User, accessToken: string, newRefreshToken: string }>}
     */
    async refreshAccessToken(refreshToken, deviceInfo = {}) {
        // Verifica refresh token
        const payload = this.verifyToken(refreshToken, 'refresh');

        // Trova utente con array refreshTokens e gracePeriodTokens
        const user = await User.findByRefreshToken(payload.sub);
        if (!user) {
            throw AppError.unauthorized('Sessione non valida');
        }

        // Verifica hash del refresh token
        const tokenHash = crypto
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // Pulisci token scaduti dal grace period
        user.cleanExpiredGracePeriodTokens();

        // Pulisci sessioni scadute (refresh token scaduti)
        this.cleanExpiredSessions(user);

        // Trova sessione specifica nell'array
        const session = user.findSessionByHash(tokenHash);
        
        // Se non trovato nelle sessioni attive, controlla grace period
        if (!session) {
            const graceToken = user.findInGracePeriod(tokenHash);
            
            if (graceToken) {
                // Token nel grace period: è una race condition legittima
                // Genera nuovi token senza invalidare nulla
                const newAccessToken = this.generateAccessToken(user);
                const { token: newRefreshToken } = await this.generateRefreshToken(user, deviceInfo);
                
                // Rimuovi dal grace period (già usato)
                await user.removeFromGracePeriod(tokenHash);
                
                return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
            }
            
            // Token non trovato né in sessioni attive né in grace period
            // Possibile furto o token già invalidato
            // Invalida tutte le sessioni per sicurezza (usa operatori atomici)
            await User.updateOne(
                { _id: user._id },
                {
                    $set: { 
                        refreshTokens: [],
                        gracePeriodTokens: []
                    }
                }
            );
            throw AppError.unauthorized('Sessione non valida o scaduta');
        }

        // Aggiorna lastUsedAt per questa sessione (operatore atomico)
        await User.updateOne(
            { 
                _id: user._id,
                'refreshTokens.hash': tokenHash
            },
            {
                $set: {
                    'refreshTokens.$.lastUsedAt': new Date()
                }
            }
        );

        // Genera nuovi token (rotation) - mantieni stesso device info
        const newAccessToken = this.generateAccessToken(user);
        const { token: newRefreshToken, sessionData: newSessionData } = 
            await this.generateRefreshToken(user, {
                device: session.device,
                userAgent: deviceInfo.userAgent || session.userAgent,
                ip: deviceInfo.ip || session.ip,
            });

        // IMPORTANTE: Aggiungi vecchio token al grace period PRIMA di rimuoverlo
        // Questo previene race conditions se arrivano richieste concorrenti
        // Usa operatori atomici per evitare conflitti di versione
        const graceExpiresAt = new Date(Date.now() + GRACE_PERIOD_MS);
        await User.updateOne(
            { _id: user._id },
            {
                $push: {
                    gracePeriodTokens: {
                        hash: tokenHash,
                        expiresAt: graceExpiresAt,
                    }
                },
                $pull: {
                    gracePeriodTokens: {
                        expiresAt: { $lt: new Date() } // Pulisci scaduti
                    }
                }
            }
        );

        // Rimuovi vecchia sessione e aggiungi nuova (rotation) usando operatori atomici
        // Usa aggregation pipeline per garantire atomicità e limite FIFO
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id },
            [
                {
                    // Rimuovi vecchia sessione
                    $set: {
                        refreshTokens: {
                            $filter: {
                                input: '$refreshTokens',
                                as: 'session',
                                cond: { $ne: ['$$session.hash', tokenHash] }
                            }
                        }
                    }
                },
                {
                    // Aggiungi nuova sessione
                    $set: {
                        refreshTokens: {
                            $concatArrays: ['$refreshTokens', [newSessionData]]
                        }
                    }
                },
                {
                    // Applica limite FIFO se necessario
                    $set: {
                        refreshTokens: {
                            $cond: {
                                if: { $gt: [{ $size: '$refreshTokens' }, MAX_ACTIVE_SESSIONS] },
                                then: {
                                    $slice: [
                                        {
                                            $sortArray: {
                                                input: '$refreshTokens',
                                                sortBy: { lastUsedAt: 1, createdAt: 1 }
                                            }
                                        },
                                        -MAX_ACTIVE_SESSIONS
                                    ]
                                },
                                else: '$refreshTokens'
                            }
                        }
                    }
                }
            ],
            { new: true }
        );

        // Aggiorna oggetto user locale per coerenza
        if (updatedUser) {
            Object.assign(user, updatedUser.toObject());
        }

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
        const hashedPassword = await this.hashPassword(newPassword);
        
        // Invalida tutti i refresh token (force re-login da tutti i dispositivi)
        // Usa operatore atomico per evitare conflitti di versione
        await User.updateOne(
            { _id: userId },
            {
                $set: { 
                    password: hashedPassword,
                    refreshTokens: []
                }
            }
        );
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