/**
 * 📊 AUDIT CONTROLLER
 * 
 * Gestione log di sicurezza e dispositivi
 */

const auditService = require('../services/auditService');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/auth/audit-logs
 * Ottieni log di audit dell'utente
 */
const getUserAuditLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 50, skip = 0, action, startDate, endDate } = req.query;

    const options = {
        limit: parseInt(limit),
        skip: parseInt(skip),
        startDate,
        endDate,
    };

    const logs = await auditService.getUserLoginHistory(userId, options);

    // Filtra per action se specificato
    const filteredLogs = action 
        ? logs.filter(log => log.action === action)
        : logs;

    res.status(200).json({
        success: true,
        data: {
            logs: filteredLogs,
            total: filteredLogs.length,
        },
    });
});

/**
 * GET /api/auth/audit-logs/stats
 * Ottieni statistiche di sicurezza
 */
const getUserSecurityStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await auditService.getUserSecurityStats(userId);

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * GET /api/auth/devices
 * Ottieni lista dispositivi dell'utente
 */
const getUserDevices = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId).select('+refreshTokens trustedDevices');

    if (!user) {
        throw AppError.notFound('Utente');
    }

    // Formatta sessioni attive
    const activeSessions = user.refreshTokens?.map(session => ({
        id: session.hash,
        device: session.device,
        userAgent: session.userAgent,
        ip: session.ip,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        isCurrent: false, // Sarà aggiornato dal middleware se corrisponde
    })) || [];

    // Formatta dispositivi trusted
    const trustedDevices = user.trustedDevices?.map(device => ({
        fingerprint: device.fingerprint,
        name: device.name,
        browser: device.browser,
        os: device.os,
        trustedAt: device.trustedAt,
        lastUsedAt: device.lastUsedAt,
    })) || [];

    res.status(200).json({
        success: true,
        data: {
            activeSessions,
            trustedDevices,
        },
    });
});

/**
 * DELETE /api/auth/devices/:fingerprint
 * Revoca un dispositivo trusted
 */
const revokeDevice = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { fingerprint } = req.params;

    const user = await User.findById(userId);

    if (!user) {
        throw AppError.notFound('Utente');
    }

    await user.revokeTrustedDevice(fingerprint);

    // Audit log
    await auditService.log({
        userId,
        userEmail: user.email,
        action: 'DEVICE_REVOKED',
        description: 'Dispositivo revocato',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        metadata: { fingerprint },
        severity: 'HIGH',
    });

    res.status(200).json({
        success: true,
        message: 'Dispositivo revocato con successo',
    });
});

/**
 * POST /api/auth/devices/:fingerprint/trust
 * Aggiungi dispositivo ai trusted
 */
const trustDevice = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { fingerprint } = req.params;
    const { name, browser, os } = req.body;

    const user = await User.findById(userId);

    if (!user) {
        throw AppError.notFound('Utente');
    }

    await user.addTrustedDevice({
        fingerprint,
        name: name || 'Dispositivo',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        ip: req.ip,
    });

    // Audit log
    await auditService.log({
        userId,
        userEmail: user.email,
        action: 'DEVICE_TRUSTED',
        description: 'Dispositivo aggiunto ai trusted',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        metadata: { fingerprint, name },
        severity: 'MEDIUM',
    });

    res.status(200).json({
        success: true,
        message: 'Dispositivo aggiunto ai trusted',
    });
});

module.exports = {
    getUserAuditLogs,
    getUserSecurityStats,
    getUserDevices,
    revokeDevice,
    trustDevice,
};
