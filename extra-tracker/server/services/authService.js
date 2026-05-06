/**
 * 🔧 AUTH SERVICE — Domain Logic
 * ================================
 *
 * Contiene SOLO operazioni di dominio: register, login, logout,
 * changePassword, getProfile, verifyEmailToken.
 *
 * JWT e blacklist → tokenService
 * Session management → sessionService
 */

const argon2 = require('argon2');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');
const auditService = require('./auditService');
const tokenService = require('./tokenService');
const sessionService = require('./sessionService');
const logger = require('../utils/logger');

/**
 * Utility per estrarre informazioni dispositivo da request
 */
const getDeviceInfo = (req) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.socket?.remoteAddress || 'Unknown';

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

    const components = [
        userAgent,
        acceptLanguage,
        ip.replace('::ffff:', ''),
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
};

class AuthService {
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
    // DELEGATIONS — tokenService
    // ==========================================

    generateAccessToken(user, options = {}) {
        return tokenService.generateAccessToken(user, options);
    }

    async generateRefreshToken(user, deviceInfo = {}) {
        return tokenService.generateRefreshToken(user, deviceInfo);
    }

    verifyToken(token, expectedType = 'access') {
        return tokenService.verifyToken(token, expectedType);
    }

    async addToBlacklist(token, ttlSeconds) {
        return tokenService.addToBlacklist(token, ttlSeconds);
    }

    async isTokenBlacklisted(token) {
        return tokenService.isTokenBlacklisted(token);
    }

    async blacklistUserTokens(userId) {
        return tokenService.blacklistUserTokens(userId);
    }

    async isUserBlacklisted(userId) {
        return tokenService.isUserBlacklisted(userId);
    }

    // ==========================================
    // 2FA / TOTP METHODS
    // ==========================================

    generateTwoFactorSecret() {
        const secret = authenticator.generateSecret();
        const backupCodes = this.generateBackupCodes();
        return { secret, backupCodes };
    }

    generateTotpUrl(secret, email, appName = 'Silvi AI') {
        return authenticator.keyuri(email, appName, secret);
    }

    verifyTwoFactorCode(secret, code) {
        try {
            return authenticator.verify({ token: code, secret });
        } catch {
            return false;
        }
    }

    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
        }
        return codes;
    }

    async hashBackupCodes(codes) {
        const hashed = [];
        for (const code of codes) {
            const hash = await this.hashPassword(code.replace(/-/g, ''));
            hashed.push(hash);
        }
        return hashed;
    }

    async verifyBackupCode(code, hashedCodes) {
        const cleanCode = code.replace(/-/g, '').toUpperCase();
        for (let i = 0; i < hashedCodes.length; i++) {
            if (await this.verifyPassword(hashedCodes[i], cleanCode)) {
                return i; // Return index so caller can remove used code
            }
        }
        return -1;
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
        const accessToken = tokenService.generateAccessToken(user, { deviceFingerprint });
        const { token: refreshToken, sessionData } = await tokenService.generateRefreshToken(user, deviceInfo);

        await sessionService.addSession(user._id, sessionData);

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

        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                throw AppError.unauthorized('REQUIRES_2FA');
            }

            const isValid2FA = this.verifyTwoFactorCode(user.twoFactorSecret, twoFactorCode);

            if (!isValid2FA) {
                const backupIndex = await this.verifyBackupCode(
                    twoFactorCode,
                    user.twoFactorBackupCodes || []
                );

                if (backupIndex === -1) {
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

                // Burn after use: rimuovi il codice di backup usato
                user.twoFactorBackupCodes.splice(backupIndex, 1);
                await user.save();

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
        const accessToken = tokenService.generateAccessToken(user, { deviceFingerprint });
        const { token: refreshToken, sessionData } = await tokenService.generateRefreshToken(user, deviceInfo);

        await sessionService.addSession(user._id, sessionData);

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
        return sessionService.refreshSession(refreshToken, deviceInfo);
    }

    async logout(userId, refreshToken = null, accessToken = null, req = null) {
        const user = await User.findById(userId).select('email');

        if (accessToken) {
            await tokenService.addToBlacklist(accessToken);
        }

        if (refreshToken) {
            await sessionService.revokeSession(userId, refreshToken);

            if (req && user) {
                await auditService.logLogout({
                    userId,
                    userEmail: user.email,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    allDevices: false,
                });
            }
        } else {
            await sessionService.revokeAllSessions(userId);

            if (req && user) {
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
        await user.addToPasswordHistory(user.password);

        // Blacklist current access token so stolen tokens are invalidated
        if (req) {
            const token = req.cookies?.[securityConfig.cookie.name];
            if (token) {
                await tokenService.addToBlacklist(token);
            }
        }

        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    password: hashedPassword,
                    refreshTokens: [],
                    passwordChangedAt: new Date(),
                },
            }
        );

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

    /**
     * Verifica token email e segna l'utente come verificato
     * @param {string} hashedToken - Token hashato con hashToken()
     * @returns {Promise<object|null>} User o null se token non valido
     */
    async verifyEmailToken(hashedToken) {
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() },
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) return null;

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        return user;
    }
}

const authService = new AuthService();

module.exports = authService;
module.exports.getDeviceInfo = getDeviceInfo;
module.exports.generateDeviceFingerprint = generateDeviceFingerprint;
