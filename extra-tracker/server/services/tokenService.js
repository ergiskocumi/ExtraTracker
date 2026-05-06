/**
 * TOKEN SERVICE
 * ==============
 *
 * Gestisce JWT access/refresh token e blacklist Redis.
 * Estratto da authService per separazione delle responsabilità.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');
const { getRedisClient, getRedisAvailable } = require('../config/redis');
const { encryptString } = require('../utils/encryption');
const logger = require('../utils/logger');

const JWT_ISSUER = 'silvi-api';
const JWT_AUDIENCE = 'silvi-app';

// ==========================================
// TOKEN BLACKLIST (Redis)
// ==========================================

const addToBlacklist = async (token, ttlSeconds = 15 * 60) => {
    if (!getRedisAvailable()) return;

    try {
        const redisClient = getRedisClient();
        if (!redisClient) return;

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await redisClient.setEx(`blacklist:${tokenHash}`, ttlSeconds, '1');
    } catch (error) {
        logger.error('TokenService', 'Errore aggiunta token a blacklist Redis', { error: error.message });
    }
};

const isTokenBlacklisted = async (token) => {
    if (!getRedisAvailable()) {
        logger.warn('TokenService', 'Redis non disponibile — token rifiutato per sicurezza');
        return true;
    }

    try {
        const redisClient = getRedisClient();
        if (!redisClient) return false;

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const result = await redisClient.get(`blacklist:${tokenHash}`);
        return result === '1';
    } catch (error) {
        logger.error('TokenService', 'Errore verifica blacklist token Redis', { error: error.message });
        return false;
    }
};

const blacklistUserTokens = async (userId) => {
    if (!getRedisAvailable()) return;

    try {
        const redisClient = getRedisClient();
        if (!redisClient) return;

        await redisClient.setEx(`blacklist:user:${userId}`, 15 * 60, '1');
    } catch (error) {
        logger.error('TokenService', 'Errore blacklist utente Redis', { error: error.message });
    }
};

const isUserBlacklisted = async (userId) => {
    const User = require('../models/User');

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
        logger.error('TokenService', 'Errore verifica blacklist utente Redis', { error: error.message });
        const User = require('../models/User');
        const user = await User.findById(userId).select('isActive');
        return user ? !user.isActive : false;
    }
};

// ==========================================
// JWT GENERATION & VERIFICATION
// ==========================================

const generateAccessToken = (user, options = {}) => {
    const payload = {
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: user._id.toString(),
        email: user.email,
        type: 'access',
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        ...(options.deviceFingerprint && { dfp: options.deviceFingerprint }),
    };

    return jwt.sign(payload, securityConfig.jwt.secret, {
        expiresIn: securityConfig.jwt.accessTokenExpiry,
        algorithm: securityConfig.jwt.algorithm,
    });
};

const generateRefreshToken = async (user, deviceInfo = {}) => {
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
        jti,
        device: deviceInfo.device || 'Unknown',
        userAgent: encryptString(deviceInfo.userAgent || 'Unknown'),
        ip: encryptString(deviceInfo.ip || 'Unknown'),
        createdAt: new Date(),
        lastUsedAt: new Date(),
    };

    return { token, hash, sessionData, jti };
};

const verifyToken = (token, expectedType = 'access') => {
    try {
        const payload = jwt.verify(token, securityConfig.jwt.secret, {
            algorithms: [securityConfig.jwt.algorithm],
        });

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
};

module.exports = {
    addToBlacklist,
    isTokenBlacklisted,
    blacklistUserTokens,
    isUserBlacklisted,
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
};
