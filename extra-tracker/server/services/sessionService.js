/**
 * SESSION SERVICE
 * ================
 *
 * Gestisce creazione, rinnovo e revoca sessioni utente (refresh token).
 * Estratto da authService per separazione delle responsabilità.
 */

const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');
const { MAX_ACTIVE_SESSIONS } = require('../config/security');
const { decryptString } = require('../utils/encryption');
const tokenService = require('./tokenService');
const logger = require('../utils/logger');

const GRACE_PERIOD_MS = 30 * 1000;

// ==========================================
// HELPERS
// ==========================================

/**
 * Converte stringa di scadenza JWT in millisecondi
 * @param {string} expiry - es. '7d', '24h', '30m'
 * @returns {number}
 */
const parseExpiryToMs = (expiry) => {
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
};

/**
 * Rimuove sessioni scadute dall'oggetto user (in-memory)
 * @param {object} user - documento User
 */
const cleanExpiredSessions = (user) => {
    if (!user.refreshTokens || user.refreshTokens.length === 0) return;

    const now = Date.now();
    const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry
        ? parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
        : 7 * 24 * 60 * 60 * 1000;

    user.refreshTokens = user.refreshTokens.filter(session => {
        const createdAt = new Date(session.createdAt).getTime();
        return (createdAt + refreshTokenExpiryMs) > now;
    });
};

// ==========================================
// SESSION CREATION (used at login/register)
// ==========================================

/**
 * Aggiunge sessione al DB con gestione MAX_ACTIVE_SESSIONS
 * @param {string} userId
 * @param {object} sessionData - da tokenService.generateRefreshToken
 */
const addSession = async (userId, sessionData) => {
    const refreshTokenExpiryMs = securityConfig.jwt.refreshTokenExpiry
        ? parseExpiryToMs(securityConfig.jwt.refreshTokenExpiry)
        : 7 * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(Date.now() - refreshTokenExpiryMs);

    // 1. Rimuovi sessioni scadute
    await User.updateOne(
        { _id: userId },
        { $pull: { refreshTokens: { createdAt: { $lt: expiryDate } } } }
    );

    // 2. Aggiungi nuova sessione e limita al massimo
    await User.findOneAndUpdate(
        { _id: userId },
        [
            { $set: { refreshTokens: { $concatArrays: ['$refreshTokens', [sessionData]] } } },
            {
                $set: {
                    refreshTokens: {
                        $cond: {
                            if: { $gt: [{ $size: '$refreshTokens' }, MAX_ACTIVE_SESSIONS] },
                            then: {
                                $slice: [
                                    { $sortArray: { input: '$refreshTokens', sortBy: { lastUsedAt: 1, createdAt: 1 } } },
                                    -MAX_ACTIVE_SESSIONS,
                                ],
                            },
                            else: '$refreshTokens',
                        },
                    },
                },
            },
        ],
        { new: true }
    );
};

// ==========================================
// SESSION REFRESH
// ==========================================

/**
 * Rinnova i token (access + refresh) per una sessione esistente.
 * Implementa grace period anti-race-condition.
 *
 * @param {string} refreshToken
 * @param {object} deviceInfo
 * @returns {Promise<{ accessToken: string; refreshToken: string }>}
 */
const refreshSession = async (refreshToken, deviceInfo = {}) => {
    const payload = tokenService.verifyToken(refreshToken, 'refresh');
    const user = await User.findByRefreshToken(payload.sub);

    if (!user) {
        throw AppError.unauthorized('Sessione non valida');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.cleanExpiredGracePeriodTokens();
    cleanExpiredSessions(user);

    const session = user.findSessionByHash(tokenHash);

    if (!session) {
        const graceToken = user.findInGracePeriod(tokenHash);

        if (graceToken) {
            const newAccessToken = tokenService.generateAccessToken(user);
            const { token: newRefreshToken } = await tokenService.generateRefreshToken(user, deviceInfo);
            await user.removeFromGracePeriod(tokenHash);
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }

        await User.updateOne(
            { _id: user._id },
            { $set: { refreshTokens: [], gracePeriodTokens: [] } }
        );
        throw AppError.unauthorized('Sessione non valida o scaduta');
    }

    const sessionUserAgent = decryptString(session.userAgent);
    const sessionIp = decryptString(session.ip);

    const newAccessToken = tokenService.generateAccessToken(user);
    const { token: newRefreshToken, sessionData: newSessionData } =
        await tokenService.generateRefreshToken(user, {
            device: session.device,
            userAgent: deviceInfo.userAgent || sessionUserAgent,
            ip: deviceInfo.ip || sessionIp,
        });

    const result = await User.findOneAndUpdate(
        { _id: user._id },
        [
            { $set: { 'refreshTokens.$[elem].lastUsedAt': new Date() } },
            {
                $set: {
                    gracePeriodTokens: {
                        $filter: {
                            input: { $ifNull: ['$gracePeriodTokens', []] },
                            as: 'gt',
                            cond: { $gt: ['$$gt.expiresAt', new Date()] },
                        },
                    },
                },
            },
            {
                $set: {
                    gracePeriodTokens: {
                        $concatArrays: [
                            { $ifNull: ['$gracePeriodTokens', []] },
                            [{ hash: tokenHash, expiresAt: new Date(Date.now() + GRACE_PERIOD_MS) }],
                        ],
                    },
                },
            },
            {
                $set: {
                    refreshTokens: {
                        $filter: {
                            input: '$refreshTokens',
                            as: 'session',
                            cond: { $ne: ['$$session.hash', tokenHash] },
                        },
                    },
                },
            },
            { $set: { refreshTokens: { $concatArrays: ['$refreshTokens', [newSessionData]] } } },
            {
                $set: {
                    refreshTokens: {
                        $cond: {
                            if: { $gt: [{ $size: '$refreshTokens' }, MAX_ACTIVE_SESSIONS] },
                            then: {
                                $slice: [
                                    { $sortArray: { input: '$refreshTokens', sortBy: { lastUsedAt: 1, createdAt: 1 } } },
                                    -MAX_ACTIVE_SESSIONS,
                                ],
                            },
                            else: '$refreshTokens',
                        },
                    },
                },
            },
        ],
        {
            arrayFilters: [{ 'elem.hash': tokenHash }],
            new: true,
        }
    );

    if (!result) {
        throw AppError.unauthorized('Sessione non valida o già utilizzata');
    }

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ==========================================
// SESSION REVOCATION (logout)
// ==========================================

/**
 * Revoca una singola sessione (logout singolo device)
 * @param {string} userId
 * @param {string} refreshToken
 */
const revokeSession = async (userId, refreshToken) => {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await user.removeSessionByHash(tokenHash);
};

/**
 * Revoca tutte le sessioni (logout tutti i device)
 * @param {string} userId
 */
const revokeAllSessions = async (userId) => {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    await user.removeAllSessions();
    await tokenService.blacklistUserTokens(userId);
};

module.exports = {
    parseExpiryToMs,
    cleanExpiredSessions,
    addSession,
    refreshSession,
    revokeSession,
    revokeAllSessions,
};
