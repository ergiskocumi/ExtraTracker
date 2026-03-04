/**
 * 🔧 SERVIZIO AUTENTICAZIONE - Enhanced Security Version
 * 
 * Aggiornamenti:
 * - JWT con jti, iss, aud claims
 * - Audit logging integrato
 * - Supporto 2FA/TOTP
 * - Device fingerprinting
 */

const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');
const { MAX_ACTIVE_SESSIONS } = require('../config/security');
const { getRedisClient, getRedisAvailable } = require('../config/redis');
const { encryptString, decryptString } = require('../utils/encryption');
const auditService = require('./auditService');
const logger = require('../utils/logger');

// Durata grace period per race condition (30 secondi)
const GRACE_PERIOD_MS = 30 * 1000;

// JWT Claims Constants
const JWT_ISSUER = 'silvi-api';
const JWT_AUDIENCE = 'silvi-app';

/**
 * Utility per estrarre informazioni dispositivo da request
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

/**
 * Genera device fingerprint univoco
 */
const generateDeviceFingerprint = (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const ip = req.ip || req.socket?.remoteAddress || '';
    
    // Crea fingerprint da componenti stabili
    const components = [
        userAgent,
        acceptLanguage,
        ip.replace('::ffff:', ''), // Normalizza IPv6
    ].join('|');
    
    return crypto.createHash('sha256').update(components).digest('hex');
};

class AuthService {
    // ==========================================
    // TOKEN BLACKLIST (Redis)
    // ==========================================

    async addToBlacklist(token, ttlSeconds = 15 * 60) {
        if (!getRedisAvailable()) return;

        try {
            const redisClient = getRedisClient();
            if (!redisClient) return;

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            await redisClient.setEx(`blacklist:${tokenHash}`, ttlSeconds, '1');
        } catch (error) {
            logger.error('AuthService', 'Errore aggiunta token a blacklist Redis', { error: error.message });
        }
    }

    async isTokenBlacklisted(token) {
        if (!getRedisAvailable()) return false;

        try {
            const redisClient = getRedisClient();
            if (!redisClient) return false;

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const result = await redisClient.get(`blacklist:${tokenHash}`);
            return result === '1';
        } catch (error) {
            logger.error('AuthService', 'Errore verifica blacklist token Redis', { error: error.message });
            return false;
        }
    }

    async blacklistUserTokens(userId) {
        if (!getRedisAvailable()) return;

        try {
            const redisClient = getRedisClient();
            if (!redisClient) return;

            await redisClient.setEx(`blacklist:user:${userId}`, 15 * 60, '1');
        } catch (error) {
            logger.error('AuthService', 'Errore blacklist utente Redis', { error: error.message });
        }
    }

    async isUserBlacklisted(userId) {
        if (!getRedisAvailable()) {
            const user = await User.findById(userId).select('isActive');
            return user ? !user.isActive : false;
        }

        try {
            const redisClient = getRedisClient();
            if (!redisClient) {
                const user = await User.findById(userId).select('isActive');
                return user ? !user.isActive : false;
            }

            const result = await redisClient.get(`blacklist:user:${userId}`);
            if (result === '1') return true;

            const user = await User.findById(userId).select('isActive');
            const isBanned = user ? !user.isActive : false;

            if (isBanned) {
                await redisClient.setEx(`blacklist:user:${userId}`, 15 * 60, '1');
            }

            return isBanned;
        } catch (error) {
            logger.error('AuthService', 'Errore verifica blacklist utente Redis', { error: error.message });
            const user = await User.findById(userId).select('isActive');
            return user ? !user.isActive : false;
        }
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

    cleanExpiredSessions(user) {
        if (!user.refreshTokens || user.refreshTokens.length === 0) return;

        const now = Date.now();
        const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry 
            ? this.parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
            : 7 * 24 * 60 * 60 * 1000;

        user.refreshTokens = user.refreshTokens.filter(session => {
            const createdAt = new Date(session.createdAt).getTime();
            return (createdAt + refreshTokenExpiryMs) > now;
        });
    }

    parseExpiryToMs(expiry) {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000;

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

    async hashPassword(password) {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: securityConfig.argon2.memoryCost,
            timeCost: securityConfig.argon2.timeCost,
            parallelism: securityConfig.argon2.parallelism,
            hashLength: securityConfig.argon2.hashLength,
        });
    }

    async verifyPassword(hash, password) {
        try {
            return await argon2.verify(hash, password);
        } catch {
            return false;
        }
    }

    // ==========================================
    // JWT TOKEN MANAGEMENT (Enhanced)
    // ==========================================

    generateAccessToken(user, options = {}) {
        const payload = {
            iss: JWT_ISSUER,           // Issuer
            aud: JWT_AUDIENCE,         // Audience
            sub: user._id.toString(),  // Subject
            email: user.email,
            type: 'access',
            jti: crypto.randomUUID(),  // JWT ID univoco per tracciamento
            iat: Math.floor(Date.now() / 1000),
            ...(options.deviceFingerprint && { dfp: options.deviceFingerprint }),
        };

        return jwt.sign(payload, securityConfig.jwt.secret, {
            expiresIn: securityConfig.jwt.accessTokenExpiry,
            algorithm: securityConfig.jwt.algorithm,
        });
    }

    async generateRefreshToken(user, deviceInfo = {}) {
        const randomPart = crypto.randomBytes(32).toString('hex');
        const jti = crypto.randomUUID();

        const payload = {
            iss: JWT_ISSUER,
            aud: JWT_AUDIENCE,
            sub: user._id.toString(),
            type: 'refresh',
            jti,
            iat: Math.floor(Date.now() / 1000),
        };

        const token = jwt.sign(payload, securityConfig.jwt.secret, {
            expiresIn: securityConfig.jwt.refreshTokenExpiry,
            algorithm: securityConfig.jwt.algorithm,
        });

        const hash = crypto.createHash('sha256').update(token).digest('hex');

        const sessionData = {
            hash,
            jti, // Salva jti per correlazione
            device: deviceInfo.device || 'Unknown',
            userAgent: encryptString(deviceInfo.userAgent || 'Unknown'),
            ip: encryptString(deviceInfo.ip || 'Unknown'),
            createdAt: new Date(),
            lastUsedAt: new Date(),
        };

        return { token, hash, sessionData, jti };
    }

    verifyToken(token, expectedType = 'access') {
        try {
            const payload = jwt.verify(token, securityConfig.jwt.secret, {
                algorithms: [securityConfig.jwt.algorithm],
            });

            // Verifica issuer e audience
            if (payload.iss !== JWT_ISSUER) {
                throw AppError.unauthorized('Token issuer non valido');
            }
            
            if (payload.aud !== JWT_AUDIENCE) {
                throw AppError.unauthorized('Token audience non valido');
            }

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
    // 2FA / TOTP METHODS
    // ==========================================

    /**
     * Genera secret TOTP per setup 2FA
     */
    generateTwoFactorSecret() {
        const secret = authenticator.generateSecret();
        const backupCodes = this.generateBackupCodes();
        
        return {
            secret,
            backupCodes,
        };
    }

    /**
     * Genera URL per QR code
     */
    generateTotpUrl(secret, email, appName = 'Silvi AI') {
        return authenticator.keyuri(email, appName, secret);
    }

    /**
     * Verifica codice TOTP
     */
    verifyTwoFactorCode(secret, code) {
        try {
            return authenticator.verify({ token: code, secret });
        } catch (error) {
            return false;
        }
    }

    /**
     * Genera backup codes (10 codici monouso)
     */
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            // 8 caratteri alfanumerici, formattati come XXXX-XXXX
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
        }
        return codes;
    }

    /**
     * Hash backup codes per salvataggio sicuro
     */
    async hashBackupCodes(codes) {
        const hashed = [];
        for (const code of codes) {
            const hash = await this.hashPassword(code.replace('-', ''));
            hashed.push(hash);
        }
        return hashed;
    }

    /**
     * Verifica backup code
     */
    async verifyBackupCode(code, hashedCodes) {
        const cleanCode = code.replace(/-/g, '').toUpperCase();
        
        for (const hash of hashedCodes) {
            if (await this.verifyPassword(hash, cleanCode)) {
                return true;
            }
        }
        return false;
    }

    // ==========================================
    // BUSINESS LOGIC
    // ==========================================

    async register(data, deviceInfo = {}, req = null) {
        const { email, password, acceptTerms } = data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw AppError.conflict('Impossibile completare la registrazione');
        }

        const hashedPassword = await this.hashPassword(password);

        const user = new User({
            email,
            password: hashedPassword,
            consent: {
                termsAccepted: acceptTerms,
                termsAcceptedAt: new Date(),
                privacyVersion: '1.0',
            },
            refreshTokens: [],
        });

        await user.save();

        const deviceFingerprint = req ? generateDeviceFingerprint(req) : null;
        const accessToken = this.generateAccessToken(user, { deviceFingerprint });
        const { token: refreshToken, sessionData } = await this.generateRefreshToken(user, deviceInfo);

        await User.updateOne(
            { _id: user._id },
            { $push: { refreshTokens: sessionData } }
        );

        // Audit log
        if (req) {
            await auditService.log({
                userId: user._id,
                userEmail: user.email,
                action: 'REGISTER',
                description: 'Nuovo account registrato',
                ip: deviceInfo.ip || req.ip,
                userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                deviceFingerprint,
                success: true,
                sessionId: sessionData.jti,
            });
        }

        return { user, accessToken, refreshToken };
    }

    async login(data, deviceInfo = {}, req = null) {
        const { email, password, twoFactorCode } = data;

        const user = await User.findForLogin(email);

        if (!user) {
            // Audit log per tentativo fallito
            if (req) {
                await auditService.logLogin({
                    userEmail: email,
                    ip: deviceInfo.ip || req.ip,
                    userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                    success: false,
                    failureReason: 'Email non trovata',
                });
            }
            throw AppError.unauthorized('Email o password non corretti');
        }

        if (user.isLocked) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            throw AppError.unauthorized(
                `Account temporaneamente bloccato. Riprova tra ${minutesLeft} minuti`
            );
        }

        const isValidPassword = await this.verifyPassword(user.password, password);

        if (!isValidPassword) {
            await user.incrementFailedAttempts();
            
            // Audit log
            if (req) {
                await auditService.logLogin({
                    userId: user._id,
                    userEmail: user.email,
                    ip: deviceInfo.ip || req.ip,
                    userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                    success: false,
                    failureReason: 'Password non corretta',
                });
            }
            
            throw AppError.unauthorized('Email o password non corretti');
        }

        // Verifica 2FA se abilitato
        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                throw AppError.unauthorized('REQUIRES_2FA');
            }

            const isValid2FA = this.verifyTwoFactorCode(user.twoFactorSecret, twoFactorCode);
            
            if (!isValid2FA) {
                // Prova con backup codes
                const isValidBackup = await this.verifyBackupCode(
                    twoFactorCode, 
                    user.twoFactorBackupCodes || []
                );

                if (!isValidBackup) {
                    await auditService.log2FA({
                        userId: user._id,
                        userEmail: user.email,
                        action: '2FA_VERIFICATION',
                        ip: deviceInfo.ip || req.ip,
                        userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                        success: false,
                        failureReason: 'Codice non valido',
                    });
                    
                    throw AppError.unauthorized('Codice 2FA non valido');
                }

                // Backup code usato con successo
                await auditService.log2FA({
                    userId: user._id,
                    userEmail: user.email,
                    action: '2FA_BACKUP_USED',
                    ip: deviceInfo.ip || req.ip,
                    userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                    success: true,
                });
            }
        }

        await user.resetFailedAttempts();

        const deviceFingerprint = req ? generateDeviceFingerprint(req) : null;
        const accessToken = this.generateAccessToken(user, { deviceFingerprint });
        const { token: refreshToken, sessionData } = await this.generateRefreshToken(user, deviceInfo);

        // Gestione sessioni
        const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry 
            ? this.parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
            : 7 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(Date.now() - refreshTokenExpiryMs);

        await User.updateOne(
            { _id: user._id },
            {
                $pull: {
                    refreshTokens: { createdAt: { $lt: expiryDate } }
                }
            }
        );

        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id },
            [
                {
                    $set: {
                        refreshTokens: {
                            $concatArrays: ['$refreshTokens', [sessionData]]
                        }
                    }
                },
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

        if (updatedUser) {
            Object.assign(user, updatedUser.toObject());
        }

        // Audit log
        if (req) {
            await auditService.logLogin({
                userId: user._id,
                userEmail: user.email,
                ip: deviceInfo.ip || req.ip,
                userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                deviceFingerprint,
                success: true,
                sessionId: sessionData.jti,
            });

            // Verifica attività sospetta
            const suspiciousCheck = await auditService.detectSuspiciousActivity(
                user._id,
                deviceInfo.ip || req.ip,
                deviceFingerprint
            );

            if (suspiciousCheck.isSuspicious) {
                await auditService.logSuspiciousActivity({
                    userId: user._id,
                    userEmail: user.email,
                    ip: deviceInfo.ip || req.ip,
                    userAgent: deviceInfo.userAgent || req.headers['user-agent'],
                    reason: 'Login da nuovo dispositivo o location insolita',
                    metadata: suspiciousCheck.details,
                });
            }
        }

        return { user, accessToken, refreshToken };
    }

    async refreshAccessToken(refreshToken, deviceInfo = {}) {
        const payload = this.verifyToken(refreshToken, 'refresh');
        const user = await User.findByRefreshToken(payload.sub);
        
        if (!user) {
            throw AppError.unauthorized('Sessione non valida');
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        user.cleanExpiredGracePeriodTokens();
        this.cleanExpiredSessions(user);

        const session = user.findSessionByHash(tokenHash);
        
        if (!session) {
            const graceToken = user.findInGracePeriod(tokenHash);
            
            if (graceToken) {
                const newAccessToken = this.generateAccessToken(user);
                const { token: newRefreshToken } = await this.generateRefreshToken(user, deviceInfo);
                await user.removeFromGracePeriod(tokenHash);
                return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
            }
            
            await User.updateOne(
                { _id: user._id },
                { $set: { refreshTokens: [], gracePeriodTokens: [] } }
            );
            throw AppError.unauthorized('Sessione non valida o scaduta');
        }

        await User.updateOne(
            { _id: user._id, 'refreshTokens.hash': tokenHash },
            { $set: { 'refreshTokens.$.lastUsedAt': new Date() } }
        );

        const newAccessToken = this.generateAccessToken(user);
        const sessionUserAgent = decryptString(session.userAgent);
        const sessionIp = decryptString(session.ip);

        const { token: newRefreshToken, sessionData: newSessionData } = 
            await this.generateRefreshToken(user, {
                device: session.device,
                userAgent: deviceInfo.userAgent || sessionUserAgent,
                ip: deviceInfo.ip || sessionIp,
            });

        const graceExpiresAt = new Date(Date.now() + GRACE_PERIOD_MS);
        
        await User.updateOne(
            { _id: user._id },
            { $pull: { gracePeriodTokens: { expiresAt: { $lt: new Date() } } } }
        );
        
        await User.updateOne(
            { _id: user._id },
            {
                $push: {
                    gracePeriodTokens: {
                        hash: tokenHash,
                        expiresAt: graceExpiresAt,
                    }
                }
            }
        );

        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id },
            [
                {
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
                    $set: {
                        refreshTokens: {
                            $concatArrays: ['$refreshTokens', [newSessionData]]
                        }
                    }
                },
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

        if (updatedUser) {
            Object.assign(user, updatedUser.toObject());
        }

        return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async logout(userId, refreshToken = null, accessToken = null, req = null) {
        const user = await User.findById(userId).select('+refreshTokens');
        
        if (!user) return;

        if (accessToken) {
            await this.addToBlacklist(accessToken);
        }

        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await user.removeSessionByHash(tokenHash);
            
            // Audit log
            if (req) {
                await auditService.logLogout({
                    userId,
                    userEmail: user.email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    allDevices: false,
                });
            }
        } else {
            await user.removeAllSessions();
            await this.blacklistUserTokens(userId);
            
            // Audit log
            if (req) {
                await auditService.logLogout({
                    userId,
                    userEmail: user.email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    allDevices: true,
                });
            }
        }
    }

    async changePassword(userId, currentPassword, newPassword, req = null) {
        const user = await User.findById(userId).select('+password +passwordHistory');
        
        if (!user) {
            throw AppError.notFound('Utente');
        }

        const isValid = await this.verifyPassword(user.password, currentPassword);
        if (!isValid) {
            if (req) {
                await auditService.logPasswordChange({
                    userId,
                    userEmail: user.email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    success: false,
                    failureReason: 'Password attuale non corretta',
                });
            }
            throw AppError.unauthorized('Password attuale non corretta');
        }

        // Verifica che nuova password non sia nello storico
        const isInHistory = await user.isPasswordInHistory(newPassword);
        if (isInHistory) {
            if (req) {
                await auditService.logPasswordChange({
                    userId,
                    userEmail: user.email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    success: false,
                    failureReason: 'Password già utilizzata in precedenza',
                });
            }
            throw AppError.badRequest('Non puoi riutilizzare una password precedente');
        }

        const hashedPassword = await this.hashPassword(newPassword);
        
        // Aggiungi password attuale allo storico prima di aggiornare
        await user.addToPasswordHistory(user.password);
        
        await User.updateOne(
            { _id: userId },
            { $set: { 
                password: hashedPassword, 
                refreshTokens: [],
                passwordChangedAt: new Date(),
            }}
        );

        // Audit log
        if (req) {
            await auditService.logPasswordChange({
                userId,
                userEmail: user.email,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                success: true,
            });
        }
    }

    async getProfile(userId) {
        const user = await User.findById(userId);
        if (!user) throw AppError.notFound('Utente');
        return user;
    }
}

const authService = new AuthService();

module.exports = authService;
module.exports.getDeviceInfo = getDeviceInfo;
module.exports.generateDeviceFingerprint = generateDeviceFingerprint;
